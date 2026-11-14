/**
 * aiDishSuggestions
 *
 * Tiện ích parse nội dung gợi ý món từ AI (slot regenerate) về tên món
 * để đối chiếu với catalog công thức trong DB.
 *
 * ── VÌ SAO CẦN ────────────────────────────────────────────────────────────
 * `ai-service/src/rabbitmq/slot-regenerate.consumer.ts` yêu cầu AI trả về
 * đúng 3 dòng, mỗi dòng theo format:
 *
 *   `1. Canh rau cải thịt băm - canh ngọt thanh, dùng cải thảo và thịt băm - 25.000đ`
 *
 * Nhưng AI là LLM -> không tuân thủ format 100%. Nếu RN chỉ bỏ tiền tố
 * "1." rồi đưa cả đoạn mô tả + giá vào `GET /recipes?search=`, thì
 * `search` không bao giờ khớp tên món -> nút "Đổi món bằng AI" luôn báo
 * "không tìm thấy món".
 *
 * Hàm này tách từng dòng thành 3 phần:
 *   1. `dishName`  — tên món (phần trước dấu phân cách đầu tiên)
 *   2. `description` — mô tả (nếu có)
 *   3. `price` — giá ước tính (nếu có)
 *
 * ⚠️ Tên món PHẢI khớp CHÍNH XÁC tên trong catalog (`recipes.title`) —
 *   đó là yêu cầu của prompt cho AI. Nếu không khớp, `matchDishToRecipes`
 *   sẽ thử khớp "mềm" (bỏ dấu / bỏ chữ thừa) trước khi báo lỗi.
 */

// Số tiền kiểu Việt Nam: "25.000đ", "150.000 đồng", "25k", "1.2 triệu"
// ⚠️ Thứ tự alternation PHẢI dài trước ngắn: "đồng" trước "đ", nếu không
//    "35.000 đồng" sẽ bị match thành "35.000 đ" và còn sót lại "ồng".
const PRICE_RE = /(\d[\d.,]*)\s*(đồng|triệu|million|vnd|đ|k|d)/i;

/**
 * Chuẩn hoá chuỗi để so khớp tên: bỏ dấu tiếng Việt, lowercase, gộp space,
 * bỏ các ký tự phụ trừ chữ cái/số.
 *
 * @param {string} str
 * @returns {string}
 */
export const normalizeDishName = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Tách 1 dòng gợi ý AI thành `{ dishName, description, price }`.
 *
 * @param {string} line - dòng gợi ý (đã bỏ tiền tố "1." hoặc chưa)
 * @returns {{dishName:string, description:string, price:string|null}}
 */
export const parseAiSuggestionLine = (line) => {
  const raw = String(line ?? '').trim();
  if (!raw) return { dishName: '', description: '', price: null };

  // Bỏ tiền tố đánh số: "1." / "1)" / "- " / "* "
  const withoutPrefix = raw.replace(/^\s*(?:\d+\s*[).\-]|[•*\-–—])\s*/, '');

  // Tách giá trước (giá thường nằm cuối dòng).
  let price = null;
  let rest = withoutPrefix;

  const priceMatch = withoutPrefix.match(PRICE_RE);
  if (priceMatch) {
    price = priceMatch[0].trim();
    rest = withoutPrefix.replace(PRICE_RE, '').trim();
    // Dấu phân cách cuối cùng trước giá hay bị sót (" - ").
    rest = rest.replace(/[\s\-–—:|]+$/, '').trim();
  }

  // Tách tên món / mô tả bằng dấu phân cách đầu tiên.
  //   "Canh rau cải thịt băm - canh ngọt thanh, dùng cải thảo" -> 2 phần
  const parts = rest.split(/\s+[-–—|]\s+/);
  const dishName = (parts.shift() ?? '').trim();
  const description = parts.join(' - ').trim();

  return { dishName, description, price };
};

/**
 * Parse toàn bộ nội dung gợi ý AI thành danh sách món.
 *
 * @param {string} suggestions - nội dung text từ AI (nhiều dòng)
 * @returns {Array<{dishName:string, description:string, price:string|null, raw:string}>}
 */
export const parseAiDishSuggestions = (suggestions) => {
  const text = String(suggestions ?? '').trim();
  if (!text) return [];

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    // Bỏ dòng tiêu đề / dòng trống / dòng chỉ chứa ký tự.
    .filter((line) => !/^[-=_*#]{2,}$/.test(line))
    // Dòng tiêu đề kiểu "Gợi ý cho bạn:", "Các món phù hợp:" -> không phải món.
    .filter((line) => !/^(gợi ý|suggestions?|đây là|các món|dưới đây)\b/i.test(line))
    .filter((line) => !/:$/.test(line))
    .map((line) => {
      const parsed = parseAiSuggestionLine(line);
      return { ...parsed, raw: line };
    })
    .filter((item) => item.dishName.length > 0);
};

/**
 * Tìm công thức trong catalog khớp với tên món AI gợi ý.
 *
 * Ưu tiên:
 *   1. Khớp chính xác (sau khi chuẩn hoá: bỏ dấu, bỏ ký tự phụ).
 *   2. Khớp tiền tố/suffix — VD catalog "Canh rau cải thịt băm" vs gợi ý
 *      "Canh rau cải thịt băm với thịt bò" -> cùng một món.
 *   3. Khớp "chứa" — chỉ dùng khi KHÔNG có món nào khớp tốt hơn, tránh
 *      chọn nhầm ("Cá kho" khớp "Cá kho tộ").
 *
 * @param {string} dishName - tên món do AI gợi ý
 * @param {Array<{id:string,name?:string,title?:string}>} recipes - catalog công thức
 * @returns {object|null} công thức khớp nhất
 */
export const matchDishToRecipes = (dishName, recipes) => {
  const target = normalizeDishName(dishName);
  if (!target || !Array.isArray(recipes) || recipes.length === 0) return null;

  const nameOf = (r) => r?.name ?? r?.title ?? '';

  // 1. Khớp chính xác.
  const exact = recipes.find((r) => normalizeDishName(nameOf(r)) === target);
  if (exact) return exact;

  // 2. Khớp có biên (tiền tố/suffix).
  const bounded = recipes.find((r) => {
    const other = normalizeDishName(nameOf(r));
    if (!other) return false;
    if (!target.includes(other) && !other.includes(target)) return false;
    const shorter = target.length <= other.length ? target : other;
    const longer = target.length <= other.length ? other : target;
    return shorter.split(' ').every((w) => longer.includes(w));
  });
  if (bounded) return bounded;

  // 3. Khớp "chứa" — yếu hơn, chỉ dùng khi chưa có kết quả nào.
  const contained = recipes.find((r) => {
    const other = normalizeDishName(nameOf(r));
    return other.length >= 4 && target.includes(other);
  });

  return contained ?? null;
};
