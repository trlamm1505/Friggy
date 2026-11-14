/**
 * IngredientCatalog — tiện ích tra cứu nguyên liệu trong danh mục hệ thống.
 *
 * ── VÌ SAO CẦN FILE NÀY ───────────────────────────────────────────────────
 * BE (`be/src/modules-api/fridge/fridge.service.ts:579 resolveIngredient`) là
 * CỬA duy nhất quyết định một món có được thêm vào tủ hay không:
 *   - Không resolve được -> `BadRequestException` (HTTP 400):
 *     "Nguyên liệu 'X' chưa có trong danh mục hệ thống."
 *   - Resolve được -> tạo `fridgeItem` với `ingredientId` bắt buộc (FK).
 *
 * Vì vậy UI phải BIẾT TRƯỚC món có trong danh mục hay không, thay vì để user
 * gõ tên rồi bấm Lưu mới nhận lỗi 400 tiếng Việt thô từ server.
 *
 * ── VÌ SAO CẦN `stripAccents` ──────────────────────────────────────────────
 * BE so khớp theo tên KHÔNG DẤU (đã bỏ dấu + lowercase). Ví dụ DB có
 * "Cà chua" -> BE lưu "ca chua". Nếu RN so khớp CÓ dấu thì "ca chua" (user
 * gõ không dấu) sẽ KHÔNG khớp "Cà chua" -> UI báo "không có trong danh mục"
 * trong khi BE thực ra resolve được. Hai bên phải dùng CÙNG quy tắc.
 *
 * Quy tắc bỏ dấu PHẢI giống hệt BE (`removeAccents` trong fridge.service.ts):
 *   - Bỏ dấu thanh/dấu phụ tiếng Việt
 *   - `đ` -> `d`
 *   - lowercase
 *
 * ⚠️ LƯU Ý: BE còn có bước "word-by-word" matching (`fridge.service.ts:620`)
 * rất rộng — ví dụ "bơ" bị match nhầm thành "Thịt bò xào", "sữa chua" bị
 * match thành "Cà chua". Hàm `resolveNameInCatalog` ở đây KHÔNG lặp lại
 * lỗi đó: nó chỉ chấp nhận khớp CHÍNH XÁC (sau khi bỏ dấu) hoặc khớp
 * tiền tố/suffix có biên (tức là cùng một món, không phải món khác).
 * => UI báo "không có trong danh mục" CHÍNH KHI thật sự không có, không báo
 *    ngược với hành vi BE.
 */

/** Bỏ dấu tiếng Việt + lowercase. Giữ nguyên dấu cách (space). */
export const stripAccents = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

/** Chuẩn hoá tên để so sánh: bỏ dấu + gộp khoảng trắng. */
export const normalizeIngredientName = (str) => stripAccents(str).replace(/\s+/g, ' ');

/**
 * Tìm một nguyên liệu trong danh sách danh mục.
 *
 * Ưu tiên khớp CHÍNH XÁC (sau khi bỏ dấu). Chỉ chấp nhận khớp "cùng một
 * món" — tức là tên trong DB là tiền tố/suffix của tên cần tìm HOẶC ngược
 * lại, VÀ phần thừa chỉ là từ bổ nghĩa (vd "Cà chua" ~ "Cà chua đỏ").
 * Cố tình KHÔNG dùng `includes` thuần túy vì "cá" sẽ khớp "Cá basa" —
 * đó là 2 món khác nhau.
 *
 * @param {string} name - tên cần tìm (user gõ, hoặc AI nhận diện)
 * @param {Array<{id:number,name:string,defaultUnit?:string|null}>} catalog
 * @returns {{id:number,name:string,defaultUnit?:string|null}|null}
 */
export const resolveNameInCatalog = (name, catalog) => {
  const target = normalizeIngredientName(name);
  if (!target || !Array.isArray(catalog) || catalog.length === 0) return null;

  // 1. Khớp chính xác.
  const exact = catalog.find((it) => normalizeIngredientName(it?.name) === target);
  if (exact) return exact;

  // 2. Khớp có biên: DB có "Cà chua", user gõ "Cà chua đỏ" -> vẫn là món đó.
  //    Điều kiện: phần thừa chỉ gồm TỪ BỔ NGHĨA (không phải từ khác hoàn toàn),
  //    nên ta yêu cầu chuỗi dài hơn phải là tiền tố/suffix của chuỗi ngắn hơn
  //    VÀ mọi từ trong chuỗi ngắn hơn phải xuất hiện trong chuỗi dài hơn.
  const candidates = catalog.filter((it) => {
    const other = normalizeIngredientName(it?.name);
    if (!other) return false;
    if (!target.includes(other) && !other.includes(target)) return false;
    const shorter = target.length <= other.length ? target : other;
    const longer = target.length <= other.length ? other : target;
    // Mọi từ của chuỗi ngắn hơn phải nằm trong chuỗi dài hơn.
    return shorter.split(' ').every((w) => longer.includes(w));
  });
  if (candidates.length === 1) return candidates[0];

  return null;
};

/**
 * Resolve nhiều tên cùng lúc, dùng cho màn review kết quả scan AI.
 *
 * @param {string[]} names
 * @param {Array<{id:number,name:string}>} catalog
 * @returns {Map<string, object>} key = tên đã chuẩn hoá, value = món trong danh mục
 */
export const resolveNamesInCatalog = (names, catalog) => {
  const map = new Map();
  for (const raw of names) {
    const normalized = normalizeIngredientName(raw);
    if (!normalized || map.has(normalized)) continue;
    const found = resolveNameInCatalog(raw, catalog);
    if (found) map.set(normalized, found);
  }
  return map;
};
