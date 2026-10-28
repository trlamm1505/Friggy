/**
 * RealAiChatService — test bắt buộc Sprint B4
 *
 * Quy tắc R1 — mapper BE -> shape UI phải khớp `MockAiChatService`.
 * R3 — lỗi 429 (hết lượt AI) phải ném lên UI, KHÔNG nuốt, KHÔNG fallback mock.
 *
 * Chỉ test logic KHÔNG NHÌN THẤY:
 *   1. Mapper session / message
 *   2. Endpoint đúng (URL + method + body)
 *   3. SSE stream -> yield `{ event, data }` đúng shape
 *   4. 429 -> ApiException statusCode 429
 */

import { ApiClient } from '../../../api/ApiClient';
import { RealAiChatService } from '../RealAiChatService';
import { MockAiChatService } from '../../mock/MockAiChatService';
import { ApiException } from '../../../api/ApiException';

jest.mock('../../../api/ApiClient', () => ({
  ApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock SseClient: `streamSse` là generator, thay bằng generator giả để test
// phần mapping của service (không test lại SseClient - đã có test riêng).
jest.mock('../../../api/SseClient', () => ({
  streamSse: jest.fn(),
}));

const api = ApiClient;
const { streamSse } = require('../../../api/SseClient');

let svc;
let mockSvc;

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
  api.patch.mockReset();
  api.delete.mockReset();
  streamSse.mockReset();
  svc = new RealAiChatService();
  mockSvc = new MockAiChatService();
});

/** BE `SessionDto` nguyên bản. */
const beSession = (over = {}) => ({
  id: 'sess-1',
  title: 'Hỏi về trứng',
  status: 'active',
  messageCount: 4,
  createdAt: '2026-10-20T10:00:00Z',
  updatedAt: '2026-10-20T10:05:00Z',
  ...over,
});

/** BE `MessageDto` nguyên bản. */
const beMessage = (over = {}) => ({
  id: 'msg-1',
  role: 'assistant',
  content: 'Bạn có thể làm trứng xào cà chua',
  tokensUsed: 42,
  createdAt: '2026-10-20T10:05:00Z',
  ...over,
});

// ═══════════════ 1. MAPPER ═══════════════

describe('1. Mapper BE -> shape UI', () => {
  it('map session đủ field, thiếu field -> giá trị mặc định', () => {
    const s = svc._toSession(beSession());
    expect(s).toEqual({
      id: 'sess-1',
      title: 'Hỏi về trứng',
      status: 'active',
      messageCount: 4,
      createdAt: '2026-10-20T10:00:00Z',
      updatedAt: '2026-10-20T10:05:00Z',
    });

    const sparse = svc._toSession({ id: 'x' });
    expect(sparse.title).toBeNull();
    expect(sparse.status).toBe('active');
    expect(sparse.messageCount).toBe(0);
  });

  it('map message, role lạ -> user', () => {
    const m = svc._toMessage(beMessage());
    expect(m.role).toBe('assistant');
    expect(m.content).toBe('Bạn có thể làm trứng xào cà chua');
    expect(m.tokensUsed).toBe(42);

    expect(svc._toMessage(beMessage({ role: 'system' })).role).toBe('user');
  });

  it('null -> null', () => {
    expect(svc._toSession(null)).toBeNull();
    expect(svc._toMessage(null)).toBeNull();
  });
});

// ═══════════════ 2. ENDPOINT ═══════════════

describe('2. Endpoint đúng', () => {
  it('getSessions gọi GET /ai-chat/sessions, trả mảng phẳng', async () => {
    api.get.mockResolvedValue([beSession()]);

    const sessions = await svc.getSessions();

    expect(api.get).toHaveBeenCalledWith('/ai-chat/sessions', { params: undefined });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('sess-1');
  });

  it('getSessions với page/limit -> truyền params', async () => {
    api.get.mockResolvedValue([]);

    await svc.getSessions({ page: 2, limit: 10 });

    expect(api.get).toHaveBeenCalledWith('/ai-chat/sessions', { params: { page: 2, limit: 10 } });
  });

  it('createSession KHÔNG gửi body rỗng, có title thì gửi title đã trim', async () => {
    api.post.mockResolvedValue(beSession());

    await svc.createSession();
    expect(api.post).toHaveBeenCalledWith('/ai-chat/sessions', {});

    api.post.mockClear();
    await svc.createSession('  Hỏi về trứng  ');
    expect(api.post).toHaveBeenCalledWith('/ai-chat/sessions', { title: 'Hỏi về trứng' });
  });

  it('getSessionDetail trả { session, messages }', async () => {
    api.get.mockResolvedValue({ ...beSession(), messages: [beMessage()] });

    const detail = await svc.getSessionDetail('sess-1');

    expect(api.get).toHaveBeenCalledWith('/ai-chat/sessions/sess-1');
    expect(detail.session.id).toBe('sess-1');
    expect(detail.messages).toHaveLength(1);
    expect(detail.messages[0].role).toBe('assistant');
  });

  it('sendMessage gửi content đã trim, trả messageId + streamUrl', async () => {
    api.post.mockResolvedValue({
      messageId: 'msg-9',
      status: 'pending',
      streamUrl: '/ai-chat/sessions/sess-1/stream',
    });

    const result = await svc.sendMessage('sess-1', '  Xin chào  ');

    expect(api.post).toHaveBeenCalledWith('/ai-chat/sessions/sess-1/messages', {
      content: 'Xin chào',
    });
    expect(result.messageId).toBe('msg-9');
    expect(result.streamUrl).toBe('/ai-chat/sessions/sess-1/stream');
  });

  it('sendMessage với nội dung rỗng -> ném lỗi, KHÔNG gọi API', async () => {
    await expect(svc.sendMessage('sess-1', '   ')).rejects.toThrow(/không được để trống/i);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('deleteSession gọi DELETE, không gửi body', async () => {
    api.delete.mockResolvedValue(undefined);

    await svc.deleteSession('sess-1');

    expect(api.delete).toHaveBeenCalledWith('/ai-chat/sessions/sess-1');
  });

  it('deleteSession với id rỗng -> không gọi API', async () => {
    await svc.deleteSession('');
    expect(api.delete).not.toHaveBeenCalled();
  });
});

// ═══════════════ 3. SSE STREAM ═══════════════

describe('3. streamSession — yield shape { event, data }', () => {
  it('chunk -> data là string, done -> data là object', async () => {
    streamSse.mockImplementation(async function* () {
      yield { event: 'chunk', data: 'Xin chào' };
      yield { event: 'chunk', data: ' bạn' };
      yield { event: 'done', data: { tokensUsed: 12 } };
    });

    const events = [];
    for await (const evt of svc.streamSession('sess-1')) {
      events.push(evt);
    }

    expect(events).toEqual([
      { event: 'chunk', data: 'Xin chào' },
      { event: 'chunk', data: ' bạn' },
      { event: 'done', data: { tokensUsed: 12 } },
    ]);
  });

  it('done với data là STRING JSON -> parse ra object', async () => {
    // ⚠️ BE gửi `data: JSON.stringify({ tokensUsed })` (string, không phải object).
    // Xem `ai-service/src/ai-core/single-agent.service.ts:615`.
    streamSse.mockImplementation(async function* () {
      yield { event: 'done', data: '{"tokensUsed":420}' };
    });

    const events = [];
    for await (const evt of svc.streamSession('sess-1')) {
      events.push(evt);
    }

    expect(events[0]).toEqual({ event: 'done', data: { tokensUsed: 420 } });
  });

  it('done với data là string JSON không hợp lệ -> tokensUsed null, KHÔNG crash', async () => {
    streamSse.mockImplementation(async function* () {
      yield { event: 'done', data: 'không-phải-json' };
    });

    const events = [];
    for await (const evt of svc.streamSession('sess-1')) {
      events.push(evt);
    }

    expect(events[0]).toEqual({ event: 'done', data: { tokensUsed: null } });
  });

  it('gọi đúng path stream', async () => {
    streamSse.mockImplementation(async function* () {
      yield { event: 'done', data: {} };
    });

    for await (const _evt of svc.streamSession('sess-42')) {
    }

    expect(streamSse).toHaveBeenCalledWith('/ai-chat/sessions/sess-42/stream', {
      signal: undefined,
    });
  });

  it('truyền xuyên signal xuống SseClient', async () => {
    const controller = new AbortController();
    streamSse.mockImplementation(async function* () {
      yield { event: 'done', data: {} };
    });

    for await (const _evt of svc.streamSession('sess-1', { signal: controller.signal })) {
    }

    expect(streamSse).toHaveBeenCalledWith('/ai-chat/sessions/sess-1/stream', {
      signal: controller.signal,
    });
  });

  it('event lạ (tool_call) -> giữ nguyên event + data', async () => {
    streamSse.mockImplementation(async function* () {
      yield { event: 'tool_call', data: { tool: 'search_recipes' } };
    });

    const events = [];
    for await (const evt of svc.streamSession('sess-1')) {
      events.push(evt);
    }

    expect(events[0].event).toBe('tool_call');
    expect(events[0].data).toEqual({ tool: 'search_recipes' });
  });

  it('sessionId rỗng -> không yield gì, không gọi SseClient', async () => {
    const events = [];
    for await (const evt of svc.streamSession('')) {
      events.push(evt);
    }

    expect(events).toHaveLength(0);
    expect(streamSse).not.toHaveBeenCalled();
  });
});

// ═══════════════ 4. R3 — LỖI 429 / LỖI MẠNG ═══════════════

describe('4. R3 — lỗi phải ném lên UI, KHÔNG fallback mock', () => {
  it('SSE trả lỗi 429 -> ApiException statusCode 429, message của BE', async () => {
    streamSse.mockImplementation(async function* () {
      throw new ApiException('Bạn đã dùng hết lượt AI tuần này', {
        statusCode: 429,
        isNetworkError: false,
      });
    });

    try {
      for await (const _evt of svc.streamSession('sess-1')) {
        // không có event nào
      }
      throw new Error('phải ném lỗi');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiException);
      expect(e.statusCode).toBe(429);
      expect(e.message).toBe('Bạn đã dùng hết lượt AI tuần này');
    }
  });

  it('sendMessage lỗi 429 -> ném lên, KHÔNG trả fallback', async () => {
    api.post.mockRejectedValue(
      new ApiException('Bạn đã dùng hết lượt AI tuần này', { statusCode: 429 })
    );

    await expect(svc.sendMessage('sess-1', 'x')).rejects.toBeInstanceOf(ApiException);
  });
});

// ═══════════════ 5. R1 — Mock và Real cho shape giống nhau ═══════════════

describe('5. R1 — Mock và Real cùng shape', () => {
  it('session shape giống nhau', async () => {
    const realSession = svc._toSession(beSession());
    const mockSession = await mockSvc.createSession('Hỏi về trứng');

    expect(Object.keys(realSession).sort()).toEqual(Object.keys(mockSession).sort());
  });

  it('message shape giống nhau', async () => {
    const realMessage = svc._toMessage(beMessage());

    // Mock: phải gửi message trước thì session mới có lịch sử.
    const mockSession = await mockSvc.createSession();
    await mockSvc.sendMessage(mockSession.id, 'xin chào');
    const mockDetail = await mockSvc.getSessionDetail(mockSession.id);

    expect(mockDetail.messages).toHaveLength(1);
    expect(Object.keys(realMessage).sort()).toEqual(
      Object.keys(mockDetail.messages[0]).sort()
    );
  });

  it('sendMessage shape giống nhau', async () => {
    api.post.mockResolvedValue({
      messageId: 'msg-9',
      status: 'pending',
      streamUrl: '/ai-chat/sessions/sess-1/stream',
    });

    const realResult = await svc.sendMessage('sess-1', 'xin chào');
    const mockSession = await mockSvc.createSession();
    const mockResult = await mockSvc.sendMessage(mockSession.id, 'xin chào');

    expect(Object.keys(realResult).sort()).toEqual(Object.keys(mockResult).sort());
  });
});
