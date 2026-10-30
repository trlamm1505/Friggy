/**
 * SseClient — test Sprint B4
 *
 * Kiểm tra 3 tầng logic (không cần network thật):
 *   1. `parseSseBlock()` — tách event theo chuẩn SSE (event:, data:, comment)
 *   2. `normalizeSsePayload()` — unwrap 2 lớp envelope NestJS
 *   3. `streamSse()` — parse stream byte -> event, xử lý lỗi HTTP / mạng
 */

import { parseSseBlock, normalizeSsePayload, streamSse } from '../SseClient';
import { ApiException } from '../ApiException';

// ── Mock `expo/fetch` (native) ──
jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('../../storage/TokenStorage', () => ({
  TokenStorage: {
    getAccessToken: jest.fn(() => 'test-token'),
  },
}));

const { fetch: expoFetch } = require('expo/fetch');
const { TokenStorage } = require('../../storage/TokenStorage');

/**
 * Tạo Response giả với body là ReadableStream (web ReadableStream có sẵn
 * trong Node 18+ / jest jsdom).
 */
const makeStreamResponse = (chunks, { ok = true, status = 200 } = {}) => {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(encoder.encode(c)));
      controller.close();
    },
  });

  return {
    ok,
    status,
    body,
    text: async () => (ok ? '' : JSON.stringify({ message: 'Lỗi server' })),
  };
};

// ═══════════════ 1. parseSseBlock ═══════════════

describe('1. parseSseBlock — chuẩn SSE', () => {
  it('tách event: và data:', () => {
    const result = parseSseBlock('event: chunk\ndata: {"a":1}');
    expect(result).toEqual({ event: 'chunk', data: '{"a":1}' });
  });

  it('bỏ 1 space tuỳ chọn sau dấu ":"', () => {
    const result = parseSseBlock('data: hello');
    expect(result.data).toBe('hello');
  });

  it('gộp nhiều dòng data: bằng \\n', () => {
    const result = parseSseBlock('data: dòng 1\ndata: dòng 2');
    expect(result.data).toBe('dòng 1\ndòng 2');
  });

  it('bỏ qua comment (heartbeat) bắt đầu bằng ":"', () => {
    const result = parseSseBlock(': ping\ndata: x');
    expect(result.data).toBe('x');
    expect(result.event).toBeNull();
  });

  it('không có data và không có event -> null', () => {
    expect(parseSseBlock('id: 1\nretry: 100')).toBeNull();
  });

  it('chuẩn hoá \\r\\n (Windows)', () => {
    const result = parseSseBlock('event: done\r\ndata: {"ok":true}\r');
    expect(result.event).toBe('done');
    expect(result.data).toBe('{"ok":true}');
  });
});

// ═══════════════ 2. normalizeSsePayload — unwrap envelope NestJS ═══════════════

describe('2. normalizeSsePayload — unwrap 2 lớp envelope', () => {
  it('payload đã có `event` -> giữ nguyên', () => {
    expect(normalizeSsePayload({ event: 'chunk', data: 'abc' })).toEqual({
      event: 'chunk',
      data: 'abc',
    });
  });

  it('NestJS @Sse(): { type:"message", data:"<json>" } -> unwrap 1 lớp', () => {
    const inner = JSON.stringify({ event: 'chunk', data: 'x' });
    expect(normalizeSsePayload({ type: 'message', data: inner })).toEqual({
      event: 'chunk',
      data: 'x',
    });
  });

  it('NestJS @Sse() + interceptor wrapper -> unwrap 2 lớp', () => {
    const inner = JSON.stringify({ event: 'chunk', data: 'y' });
    const payload = { type: 'message', data: JSON.stringify({ statusCode: 200, data: inner }) };
    expect(normalizeSsePayload(payload)).toEqual({ event: 'chunk', data: 'y' });
  });

  it('interceptor wrapper { statusCode, message, data } -> unwrap', () => {
    expect(
      normalizeSsePayload({ statusCode: 200, message: 'ok', data: { event: 'done', data: 1 } })
    ).toEqual({
      event: 'done',
      data: 1,
    });
  });

  it('chuỗi JSON -> parse rồi unwrap tiếp', () => {
    expect(normalizeSsePayload('{"event":"chunk","data":"z"}')).toEqual({
      event: 'chunk',
      data: 'z',
    });
  });

  it('chuỗi KHÔNG phải JSON -> coi như chunk text thô', () => {
    expect(normalizeSsePayload('hello world')).toEqual({ event: 'chunk', data: 'hello world' });
  });

  it('null/undefined -> unknown, data null', () => {
    expect(normalizeSsePayload(null)).toEqual({ event: 'unknown', data: null });
  });

  it('Meal Planning: payload { event, ...fields } KHÔNG có key `data` -> giữ nguyên payload', () => {
    // ⚠️ BE meal-planning gửi `{ event: 'done', slotId, suggestions, message }`
    //   (xem `ai-service/src/rabbitmq/slot-regenerate.consumer.ts:127`).
    //   Nếu trả `data: null` sẽ MẤT `suggestions` -> user không đổi được món.
    const payload = {
      event: 'done',
      slotId: 'slot-1',
      suggestions: '1. Canh rau\n2. Trứng xào\n3. Salad',
      message: 'AI đã tìm được 3 gợi ý món thay thế',
    };
    const result = normalizeSsePayload(payload);

    expect(result.event).toBe('done');
    expect(result.data.suggestions).toBe('1. Canh rau\n2. Trứng xào\n3. Salad');
    expect(result.data.slotId).toBe('slot-1');
  });
});

// ═══════════════ 3. streamSse — parse stream thật ═══════════════

describe('3. streamSse — parse stream byte -> event', () => {
  beforeEach(() => {
    expoFetch.mockReset();
    TokenStorage.getAccessToken.mockReturnValue('test-token');
  });

  it('parse nhiều event trong 1 stream, tách theo \\n\\n', async () => {
    expoFetch.mockResolvedValue(
      makeStreamResponse([
        'data: {"event":"chunk","data":"Xin"}\n\n',
        'data: {"event":"chunk","data":" chào"}\n\n',
        'data: {"event":"done","data":{"tokensUsed":5}}\n\n',
      ])
    );

    const events = [];
    for await (const evt of streamSse('/ai-chat/sessions/s1/stream')) {
      events.push(evt);
    }

    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({ event: 'chunk', data: 'Xin' });
    expect(events[1]).toEqual({ event: 'chunk', data: ' chào' });
    expect(events[2]).toEqual({ event: 'done', data: { tokensUsed: 5 } });
  });

  it('giữ header Authorization: Bearer (R5)', async () => {
    expoFetch.mockResolvedValue(makeStreamResponse(['data: {"event":"done"}\n\n']));

    for await (const _evt of streamSse('/ai-chat/sessions/s1/stream')) {
    }

    const [, init] = expoFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(init.headers.Accept).toBe('text/event-stream');
  });

  it('không có token -> KHÔNG gắn Authorization', async () => {
    TokenStorage.getAccessToken.mockReturnValue(null);
    expoFetch.mockResolvedValue(makeStreamResponse(['data: {"event":"done"}\n\n']));

    for await (const _evt of streamSse('/ai-chat/sessions/s1/stream')) {
    }

    const [, init] = expoFetch.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('chunk bị cắt giữa chừng -> vẫn ghép đúng (buffer qua nhiều lần read)', async () => {
    expoFetch.mockResolvedValue(
      makeStreamResponse(['data: {"event":"chu', 'nk","data":"héllo"}\n\n'])
    );

    const events = [];
    for await (const evt of streamSse('/ai-chat/sessions/s1/stream')) {
      events.push(evt);
    }

    expect(events).toEqual([{ event: 'chunk', data: 'héllo' }]);
  });

  it('event cuối không có \\n\\n cuối -> vẫn yield', async () => {
    expoFetch.mockResolvedValue(makeStreamResponse(['data: {"event":"done","data":1}']));

    const events = [];
    for await (const evt of streamSse('/ai-chat/sessions/s1/stream')) {
      events.push(evt);
    }

    expect(events).toEqual([{ event: 'done', data: 1 }]);
  });

  it('HTTP 429 -> ném ApiException với message của BE', async () => {
    expoFetch.mockResolvedValue(makeStreamResponse([], { ok: false, status: 429 }));

    await expect(async () => {
      for await (const _evt of streamSse('/ai-chat/sessions/s1/stream')) {
        // không có event nào
      }
    }).rejects.toBeInstanceOf(ApiException);

    try {
      for await (const _evt of streamSse('/ai-chat/sessions/s1/stream')) {
        // không có event nào
      }
    } catch (e) {
      expect(e.statusCode).toBe(429);
      expect(e.message).toBe('Lỗi server');
    }
  });

  it('lỗi mạng -> ApiException với isNetworkError=true', async () => {
    expoFetch.mockRejectedValue(new Error('Network request failed'));

    try {
      for await (const _evt of streamSse('/ai-chat/sessions/s1/stream')) {
        // không có event nào
      }
      throw new Error('phải ném lỗi');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiException);
      expect(e.isNetworkError).toBe(true);
    }
  });

  it('URL tuyệt đối -> dùng nguyên, không nối base URL', async () => {
    expoFetch.mockResolvedValue(makeStreamResponse(['data: {"event":"done"}\n\n']));

    for await (const _evt of streamSse('https://other.host/stream')) {
    }

    expect(expoFetch.mock.calls[0][0]).toBe('https://other.host/stream');
  });
});
