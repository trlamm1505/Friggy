/**
 * IAiChatService - contract cho AI Chat (Sprint B4)
 *
 * ⚠️ `useServiceHooks.js` là file IMMUTABLE -> KHÔNG thêm hook mới ở đó.
 * UI AI Chat sẽ dùng `getRegisteredService('aiChatService')` trực tiếp
 * (xem `AiChatScreen.jsx`) vì key này không có trong
 * `ServiceProvider.defaultServices` (file cũng immutable).
 *
 * Shape chuẩn hoá (R1 - Mock và Real phải cho ra CÙNG shape):
 *   ChatSession  = { id, title, status, messageCount, createdAt, updatedAt }
 *   ChatMessage  = { id, role: 'user'|'assistant', content, tokensUsed, createdAt }
 *   StreamEvent  = { event: 'chunk'|'done'|'error'|'tool_call'|..., data: any }
 */

/**
 * @typedef {Object} ChatSession
 * @property {string} id
 * @property {string|null} title
 * @property {string} status - 'active'|'closed'|'error'
 * @property {number} messageCount
 * @property {string} createdAt - ISO
 * @property {string} updatedAt - ISO
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {'user'|'assistant'} role
 * @property {string} content
 * @property {number|null} tokensUsed
 * @property {string} createdAt - ISO
 */

/**
 * @typedef {Object} ChatStreamEvent
 * @property {string} event - 'chunk' | 'done' | 'error' | 'tool_call' | 'tool_result'
 * @property {any} data
 */

/**
 * @typedef {Object} SendMessageResult
 * @property {string} messageId
 * @property {string} status
 * @property {string} streamUrl
 */

/**
 * Interface AI Chat.
 *
 * LƯU Ý VỀ `streamSession`:
 *   Là ASYNC GENERATOR - caller dùng `for await (const ev of service.streamSession(id))`.
 *   Việc mở kết nối và parse SSE đã gói trong `RealAiChatService` (dùng
 *   `SseClient`). Mock trả về một chuỗi event giả lập để UI chạy được ở
 *   chế độ mock.
 */
export class IAiChatService {
  /**
   * GET /ai-chat/sessions — danh sách phiên chat.
   * @param {{page?:number, limit?:number}} [params]
   * @returns {Promise<ChatSession[]>}
   */
  async getSessions(params) {
    throw new Error('IAiChatService.getSessions() must be implemented');
  }

  /**
   * POST /ai-chat/sessions — tạo phiên chat mới.
   * @param {string} [title]
   * @returns {Promise<ChatSession>}
   */
  async createSession(title) {
    throw new Error('IAiChatService.createSession() must be implemented');
  }

  /**
   * GET /ai-chat/sessions/{id} — chi tiết phiên + lịch sử message.
   * @param {string} sessionId
   * @returns {Promise<{session:ChatSession, messages:ChatMessage[]}>}
   */
  async getSessionDetail(sessionId) {
    throw new Error('IAiChatService.getSessionDetail() must be implemented');
  }

  /**
   * POST /ai-chat/sessions/{id}/messages — gửi tin nhắn (BE trả 202).
   * @param {string} sessionId
   * @param {string} content
   * @returns {Promise<SendMessageResult>}
   */
  async sendMessage(sessionId, content) {
    throw new Error('IAiChatService.sendMessage() must be implemented');
  }

  /**
   * Mở luồng SSE nhận response của AI.
   * @param {string} sessionId
   * @param {{signal?:AbortSignal}} [options]
   * @returns {AsyncGenerator<ChatStreamEvent>}
   */
  async streamSession(sessionId, options) {
    throw new Error('IAiChatService.streamSession() must be implemented');
  }

  /**
   * DELETE /ai-chat/sessions/{id} — xoá phiên chat.
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId) {
    throw new Error('IAiChatService.deleteSession() must be implemented');
  }
}

export default IAiChatService;
