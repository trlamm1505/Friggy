/**
 * Chat Session Title — sinh tên phiên chat từ tin nhắn đầu tiên của user.
 *
 * ⚠️ VÌ SAO CẦN FILE RIÊNG (không để trong `ai-chat.service.ts`):
 *   `ai-chat.service.ts` import `src/modules-system/prisma/prisma.service`
 *   (dùng path alias `src/...`). Jest của BE chưa cấu hình `moduleNameMapper`
 *   cho alias này -> import file service trong unit test sẽ fail.
 *
 *   Pure function không phụ thuộc gì -> tách ra util để test được độc lập.
 *   (Cùng pattern với `src/common/utils/prompt-injection.util.ts`.)
 *
 * ⚠️ VÌ SAO CẦN HÀNH NÀY:
 *   `createSession()` tạo phiên với `title = null` (user chưa nói gì lúc mở
 *   app). Nếu không set title khi gửi tin nhắn đầu tiên, danh sách LỊCH SỬ
 *   TRÒ CHUYỆN sẽ hiện toàn "Cuộc trò chuyện" cho mọi phiên -> user không
 *   phân biệt được phiên nào nói gì.
 */

/**
 * Độ dài tối đa của `title` phiên chat.
 * (Thực tế DB cho phép VarChar(255) — 80 là đủ đọc và không tràn layout.)
 */
export const AI_CHAT_TITLE_MAX_LENGTH = 80;

/**
 * Sinh `title` cho phiên chat từ tin nhắn đầu tiên của user.
 *
 * Quy tắc:
 *   - Chuẩn hoá khoảng trắng (nhiều space / newline -> 1 space).
 *   - Cắt ở ranh giới TỪ (không dính chữ, không cắt giữa từ).
 *   - Tối đa `AI_CHAT_TITLE_MAX_LENGTH` ký tự.
 *   - Chuỗi rỗng -> trả '' (không set title).
 *
 * @param {string} content - Nội dung tin nhắn đầu tiên của user.
 * @returns {string} Title đã chuẩn hoá, hoặc '' nếu content rỗng.
 */
export const buildSessionTitle = (content: string): string => {
  const flat = (content ?? '').replace(/\s+/g, ' ').trim();
  if (!flat) return '';

  if (flat.length <= AI_CHAT_TITLE_MAX_LENGTH) return flat;

  const clipped = flat.slice(0, AI_CHAT_TITLE_MAX_LENGTH);
  const lastSpace = clipped.lastIndexOf(' ');
  // Không có khoảng trắng (một từ rất dài) -> cắt thẳng, chấp nhận dính chữ.
  return (lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trim();
};
