/**
 * stripJsonFences — Loại bỏ markdown code fence khỏi JSON response của AI
 *
 * Một số LLM provider bọc JSON trong markdown code block dù đã set
 * response_format: { type: 'json_object' }. Hàm này strip các fence đó.
 *
 * Ví dụ:
 *   Input:  "```json\n{ \"key\": 1 }\n```"
 *   Output: "{ \"key\": 1 }"
 */
export function stripJsonFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '') // Xóa ``` hoặc ```json ở đầu
    .replace(/\s*```\s*$/i, '')       // Xóa ``` ở cuối
    .trim();
}
