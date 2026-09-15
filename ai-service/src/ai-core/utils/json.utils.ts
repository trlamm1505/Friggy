/**
 * stripJsonFences — Loại bỏ markdown code fence và preamble text khỏi JSON response của AI
 *
 * Một số LLM provider:
 * 1. Bọc JSON trong markdown code block: ```json { ... } ```
 * 2. Thêm preamble text trước JSON: "Vui lòng đợi...\n\n```json\n{...}"
 * 3. Trả về JSON thuần không có wrapper
 *
 * Hàm này xử lý cả 3 trường hợp trên, ưu tiên extract JSON object/array đầu tiên.
 */
export function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();

  // Bước 1: Thử extract JSON từ trong markdown code fence (```json ... ```)
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    const inner = fenceMatch[1].trim();
    if (inner.startsWith('{') || inner.startsWith('[')) return inner;
  }

  // Bước 2: Thử tìm JSON object hoặc array bắt đầu từ { hoặc [ đầu tiên trong chuỗi
  // (xử lý preamble text kiểu "Vui lòng đợi...\n\n{...}")
  const jsonStart = trimmed.search(/[{[]/);
  if (jsonStart !== -1) {
    const candidate = trimmed.slice(jsonStart);
    // Tìm đóng ngoặc tương ứng ở cuối
    const jsonEnd = findJsonEnd(candidate);
    if (jsonEnd !== -1) return candidate.slice(0, jsonEnd + 1);
    return candidate; // fallback: trả từ { đến hết
  }

  // Bước 3: Không tìm thấy JSON — trả về nguyên bản để JSON.parse throw lỗi đúng
  return trimmed;
}

/**
 * Tìm vị trí kết thúc của JSON object/array đầu tiên trong chuỗi.
 * Xử lý đúng nested braces/brackets và string literals.
 */
function findJsonEnd(s: string): number {
  if (!s.startsWith('{') && !s.startsWith('[')) return -1;

  const open = s[0] === '{' ? '{' : '[';
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
