/**
 * RealAiChatService - nối AI Chat với BE thật (Sprint B4)
 *
 * Nguồn sự thật (đọc file BE, không đoán):
 *   be/src/modules-api/ai-chat/ai-chat.controller.ts
 *   be/src/modules-api/ai-chat/ai-chat.service.ts
 *   be/src/modules-api/ai-chat/dto/ai-chat.dto.ts
 *   be/src/modules-api/ai-chat/dto/ai-chat-response.dto.ts
 *
 * ⚠️ LUỒNG 2 BƯỚC (bắt buộc, không gộp):
 *   1. POST /ai-chat/sessions/{id}/messages  -> BE trả 202 `{ messageId, status, streamUrl }`
 *   2. Mở SSE GET /ai-chat/sessions/{id}/stream -> nhận `{ event, data }`:
 *        `chunk`      -> text AI đang viết (nối vào message đang stream)
 *        `tool_call`  -> AI đang gọi tool
 *        `tool_result`-> kết quả tool
 *        `done`       -> hoàn thành, data = `{ tokensUsed }`
 *        `error`      -> lỗi, data = message
 *
 * ⚠️ SSE của NestJS `@Sse()` BỌC payload 2 lớp:
 *   dòng raw: `data: {"type":"message","data":"{\"event\":\"chunk\",\"data\":\"...\"}"}`
 *   => `SseClient.normalizeSsePayload()` đã unwrap 2 cấp này.
 *
 * ⚠️ 429 (hết lượt AI tuần):
 *   Guard `AiUsageLimitGuard` trả 429 với message tiếng Việt sẵn.
 *   Service KHÔNG nuốt lỗi này -> ném lên UI để hiện rõ "đã dùng hết lượt".
 *
 * Quy tắc tuân thủ:
 *   R1 - mapper có test (RealAiChatService.test.js)
 *   R3 - lỗi mạng / lỗi server để ApiException tự phân loại
 *   R4 - service này không import service khác, chỉ qua ApiClient + SseClient
 *   R5 - token chỉ đọc qua TokenStorage (SseClient lo)
 *   R6 - đăng ký bằng side-effect ở cuối file
 *   R7 - comment tiếng Việt
 */

import { ApiClient } from '../../api/ApiClient';
import { registerService } from '../../api/ServiceRegistry';
import { streamSse } from '../../api/SseClient';
import { IAiChatService } from '../../interfaces/IAiChatService';

export class RealAiChatService extends IAiChatService {
  constructor() {
    super();
    this.client = ApiClient;
  }

  // ═══════════════ Mapper ═══════════════

  /**
   * BE `SessionDto` -> UI `ChatSession`.
   * @param {object} dto
   * @returns {object|null}
   */
  _toSession(dto) {
    if (!dto) return null;
    return {
      id: dto.id,
      title: dto.title ?? null,
      status: dto.status ?? 'active',
      messageCount: dto.messageCount ?? 0,
      createdAt: dto.createdAt ?? null,
      updatedAt: dto.updatedAt ?? null,
    };
  }

  /**
   * BE `MessageDto` -> UI `ChatMessage`.
   * @param {object} dto
   * @returns {object|null}
   */
  _toMessage(dto) {
    if (!dto) return null;
    return {
      id: dto.id,
      role: dto.role === 'assistant' ? 'assistant' : 'user',
      content: dto.content ?? '',
      tokensUsed: dto.tokensUsed ?? null,
      createdAt: dto.createdAt ?? null,
    };
  }

  // ═══════════════ Sessions ═══════════════

  /**
   * `GET /ai-chat/sessions` — danh sách phiên chat.
   *
   * BE trả mảng trực tiếp (không phân trang trong response).
   *
   * @param {{page?:number, limit?:number}} [params]
   * @returns {Promise<object[]>}
   */
  async getSessions(params = {}) {
    const { page, limit } = params ?? {};
    const query = {};
    if (page) query.page = page;
    if (limit) query.limit = limit;

    const payload = await this.client.get('/ai-chat/sessions', {
      params: Object.keys(query).length ? query : undefined,
    });

    const list = Array.isArray(payload) ? payload : (payload?.data ?? []);
    return list.map((dto) => this._toSession(dto)).filter(Boolean);
  }

  /**
   * `POST /ai-chat/sessions` — tạo phiên chat mới.
   *
   * BE `CreateSessionDto` có `title` optional -> chỉ gửi khi có.
   *
   * @param {string} [title]
   * @returns {Promise<object>}
   */
  async createSession(title) {
    const trimmed = (title ?? '').trim();
    const payload = await this.client.post('/ai-chat/sessions', trimmed ? { title: trimmed } : {});
    return this._toSession(payload);
  }

  /**
   * `GET /ai-chat/sessions/{id}` — chi tiết phiên + lịch sử message.
   *
   * @param {string} sessionId
   * @returns {Promise<{session:object, messages:object[]}|null>}
   */
  async getSessionDetail(sessionId) {
    if (!sessionId) return null;

    const payload = await this.client.get(`/ai-chat/sessions/${sessionId}`);
    if (!payload) return null;

    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    return {
      session: this._toSession(payload),
      messages: messages.map((dto) => this._toMessage(dto)).filter(Boolean),
    };
  }

  /**
   * `POST /ai-chat/sessions/{id}/messages` — gửi tin nhắn.
   *
   * BE trả 202 -> đây chỉ là "đã nhận", phần trả lời đến qua SSE.
   *
   * @param {string} sessionId
   * @param {string} content
   * @returns {Promise<{messageId:string, status:string, streamUrl:string}>}
   */
  async sendMessage(sessionId, content) {
    const trimmed = (content ?? '').trim();
    if (!trimmed) {
      throw new Error('Nội dung tin nhắn không được để trống');
    }

    const payload = await this.client.post(`/ai-chat/sessions/${sessionId}/messages`, {
      content: trimmed,
    });

    return {
      messageId: payload?.messageId ?? null,
      status: payload?.status ?? 'pending',
      streamUrl: payload?.streamUrl ?? `/ai-chat/sessions/${sessionId}/stream`,
    };
  }

  /**
   * Mở luồng SSE nhận response của AI.
   *
   * Yield đúng shape `{ event, data }`:
   *   - `chunk`  : data là string text
   *   - `done`   : data là `{ tokensUsed }`
   *   - `error`  : data là message
   *
   * ⚠️ Lỗi HTTP (401/429/5xx) hoặc lỗi mạng -> ném `ApiException` ra khỏi
   * generator. UI bắt qua `try/catch` quanh `for await` hoặc dùng
   * `SseClient.openSse()` (callback-style).
   *
   * @param {string} sessionId
   * @param {{signal?:AbortSignal}} [options]
   */
  async *streamSession(sessionId, options = {}) {
    if (!sessionId) return;

    const path = `/ai-chat/sessions/${sessionId}/stream`;

    for await (const event of streamSse(path, { signal: options.signal })) {
      // Chuẩn hoá `data` của `chunk` về string cho UI nối vào message.
      if (event.event === 'chunk') {
        const text =
          typeof event.data === 'string'
            ? event.data
            : (event.data?.content ?? event.data?.text ?? '');
        yield { event: 'chunk', data: text };
        continue;
      }

      if (event.event === 'done') {
        // ⚠️ BE gửi `data` là STRING JSON: `{ event: 'done', data: '{"tokensUsed":420}' }`
        //   (xem `ai-service/src/ai-core/single-agent.service.ts:615`).
        //   => Phải parse string JSON, không lấy thẳng làm object.
        let doneData = event.data;
        if (typeof doneData === 'string') {
          try {
            doneData = JSON.parse(doneData);
          } catch (_e) {
            doneData = { tokensUsed: null };
          }
        }

        yield {
          event: 'done',
          data: typeof doneData === 'object' && doneData !== null ? doneData : { tokensUsed: null },
        };
        continue;
      }

      if (event.event === 'error') {
        const message =
          typeof event.data === 'string'
            ? event.data
            : (event.data?.message ?? 'Đã xảy ra lỗi khi xử lý tin nhắn');
        yield { event: 'error', data: message };
        continue;
      }

      // `tool_call` / `tool_result` -> UI có thể hiển thị trạng thái "đang tra cứu".
      yield { event: event.event, data: event.data };
    }
  }

  /**
   * `DELETE /ai-chat/sessions/{id}` — xoá phiên chat.
   * BE trả 204 No Content -> không có body.
   *
   * @param {string} sessionId
   */
  async deleteSession(sessionId) {
    if (!sessionId) return;
    await this.client.delete(`/ai-chat/sessions/${sessionId}`);
  }
}

// R6: đăng ký bằng side-effect.
//
// ⚠️ Key `aiChatService` KHÔNG có trong `ServiceProvider.defaultServices`
// (file immutable từ P0.5). Vì vậy:
//   - `resolveServices()` KHÔNG tự động bọc service này bằng `withFallback`.
//   - UI gọi qua `getRegisteredService('aiChatService')` (xem `AiChatScreen.jsx`)
//     và TỰ fallback sang `MockAiChatService` khi `isMockMode()`.
//
// → Đây là chủ ý: AI Chat là flow AI thật, không được fallback sang dữ liệu giả
//   khi BE lỗi (nếu không user sẽ tưởng AI thật đang trả lời).
registerService('aiChatService', new RealAiChatService());

export default RealAiChatService;
