/**
 * MockAiChatService - dữ liệu giả cho AI Chat (Sprint B4)
 *
 * ⚠️ VÌ SAO CẦN MOCK AI CHAT (khác với scan AI ở B2):
 *   Scan AI là flow NHẬN DIỆN - bịa kết quả scan thì nguy hiểm (user tưởng
 *   đã nhập đúng nguyên liệu thật). AI Chat chỉ là trợ lý hội thoại -
 *   mock ở đây CHỈ phục vụ chế độ `USE_MOCKS=true` (demo UI), không bao giờ
 *   được dùng như fallback khi lỗi mạng/5xx xảy ra ở chế độ thật.
 *
 *   Vì vậy: KHÔNG đăng ký key `aiChatService` trong registry -> `useServices()`
 *   không có domain này -> UI tự fallback sang instance này khi
 *   `isMockMode()` (xem `AiChatScreen.jsx`).
 *
 * Quy tắc tuân thủ:
 *   R1 - shape giống hệt `RealAiChatService` (mock cùng input -> cùng output)
 *   R7 - comment tiếng Việt
 */

import { IAiChatService } from '../../interfaces/IAiChatService';

const MOCK_DELAY = 300;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Câu trả lời giả lập, khớp kiểu dữ liệu thật (tiếng Việt, ngắn gọn).
 */
const MOCK_REPLIES = [
  'Dựa vào tủ lạnh của bạn, hôm nay bạn có thể nấu trứng xào cà chua — nhanh, dễ và dùng hết được rau trong tủ.',
  'Món gợi ý là canh rau củ thịt. Nó dùng được cà chua, cà rốt và thịt heo đang có trong tủ của bạn.',
  'Bạn có thể làm salad cà chua cho bữa nhẹ. Nếu muốn nhiều đạm hơn, thêm một chút thịt bò nướng.',
];

/** Sinh id giả, đủ để React key hoạt động. */
let mockIdCounter = 0;
const nextId = (prefix) => {
  mockIdCounter += 1;
  return `${prefix}-mock-${mockIdCounter}`;
};

export class MockAiChatService extends IAiChatService {
  constructor() {
    super();
    // State in-memory: giữ phiên chat giữa các lần mở màn hình.
    this.sessions = [];
    this.messagesBySession = new Map();
  }

  /**
   * Tạo 1 phiên chat mới trong state mock.
   * @private
   */
  _createSessionRecord(title) {
    const now = new Date().toISOString();
    const session = {
      id: nextId('session'),
      title: title ?? null,
      status: 'active',
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.unshift(session);
    this.messagesBySession.set(session.id, []);
    return session;
  }

  async getSessions(params) {
    await sleep(MOCK_DELAY / 2);
    const { page = 1, limit = 20 } = params ?? {};
    const start = (page - 1) * limit;
    return this.sessions.slice(start, start + limit).map((s) => ({ ...s }));
  }

  async createSession(title) {
    await sleep(MOCK_DELAY / 2);
    return { ...this._createSessionRecord(title) };
  }

  async getSessionDetail(sessionId) {
    await sleep(MOCK_DELAY / 2);
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return null;

    const messages = this.messagesBySession.get(sessionId) ?? [];
    return {
      session: { ...session, messageCount: messages.length },
      messages: messages.map((m) => ({ ...m })),
    };
  }

  async sendMessage(sessionId, content) {
    await sleep(MOCK_DELAY / 2);
    const messages = this.messagesBySession.get(sessionId);
    if (!messages) {
      throw new Error('Phiên chat không tồn tại');
    }

    const now = new Date().toISOString();
    const userMessage = {
      id: nextId('msg'),
      role: 'user',
      content,
      tokensUsed: null,
      createdAt: now,
    };
    messages.push(userMessage);

    const session = this.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.messageCount = messages.length;
      session.updatedAt = now;
    }

    return {
      messageId: userMessage.id,
      status: 'pending',
      streamUrl: `/ai-chat/sessions/${sessionId}/stream`,
    };
  }

  /**
   * Giả lập luồng streaming: chia nhỏ câu trả lời thành nhiều chunk.
   *
   * Yield đúng shape `{ event, data }` như `RealAiChatService` để UI không
   * cần biết mình đang ở chế độ mock hay thật.
   */
  async *streamSession(sessionId, options = {}) {
    const { signal } = options;
    const messages = this.messagesBySession.get(sessionId) ?? [];

    // Câu trả lời chọn theo số lượng tin nhắn đã gửi -> đa dạng, không lặp.
    const reply = MOCK_REPLIES[messages.length % MOCK_REPLIES.length];

    // Chunk nhỏ để giả lập streaming từng token.
    const chunks = reply.match(/.{1,12}/gs) ?? [reply];

    for (const chunk of chunks) {
      if (signal?.aborted) return;
      await sleep(60);
      yield { event: 'chunk', data: chunk };
    }

    if (signal?.aborted) return;

    const now = new Date().toISOString();
    const assistantMessage = {
      id: nextId('msg'),
      role: 'assistant',
      content: reply,
      tokensUsed: Math.ceil(reply.length / 4),
      createdAt: now,
    };
    messages.push(assistantMessage);

    const session = this.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.messageCount = messages.length;
      session.updatedAt = now;
    }

    yield { event: 'done', data: { tokensUsed: assistantMessage.tokensUsed } };
  }

  async deleteSession(sessionId) {
    await sleep(MOCK_DELAY / 2);
    const index = this.sessions.findIndex((s) => s.id === sessionId);
    if (index === -1) return;
    this.sessions.splice(index, 1);
    this.messagesBySession.delete(sessionId);
  }
}

export default MockAiChatService;
