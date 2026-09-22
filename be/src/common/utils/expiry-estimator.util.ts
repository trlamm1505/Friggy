/**
 * ExpiryEstimator — Tự động tính ngày hết hạn khi người dùng không nhập
 *
 * Ưu tiên:
 * 1. Tra bảng shelf-life theo tên category (từ IngredientCategory.name)
 * 2. Keyword match tên nguyên liệu (fallback khi category không khớp)
 * 3. Mặc định 7 ngày (rau củ tươi generic)
 *
 * Shelf-life là ước tính — không tính đến cách bảo quản cụ thể.
 */

// ─────────────────────────────────────────────────────────
// Bảng shelf-life theo category (ngày)
// ─────────────────────────────────────────────────────────
const CATEGORY_SHELF_LIFE: Record<string, number> = {
  // Thịt
  'thịt': 3, 'thit': 3, 'meat': 3,
  // Hải sản
  'hải sản': 2, 'hai san': 2, 'seafood': 2, 'cá': 2, 'ca': 2,
  // Rau củ
  'rau củ': 7, 'rau cu': 7, 'vegetable': 7, 'rau': 7,
  // Trái cây
  'trái cây': 7, 'trai cay': 7, 'fruit': 7,
  // Sữa & trứng
  'sữa': 7, 'sua': 7, 'dairy': 7,
  'trứng': 21, 'trung': 21, 'egg': 21,
  // Đông lạnh
  'đông lạnh': 90, 'dong lanh': 90, 'frozen': 90,
  // Đóng hộp / khô
  'đồ hộp': 365, 'do hop': 365, 'canned': 365,
  'gia vị': 180, 'gia vi': 180, 'spice': 180,
  // Bánh & đồ uống
  'bánh mì': 3, 'banh mi': 3, 'bakery': 3,
  'đồ uống': 3, 'do uong': 3, 'beverage': 3,
};

// ─────────────────────────────────────────────────────────
// Keyword rules (fallback khi category không khớp)
// ─────────────────────────────────────────────────────────
const KEYWORD_RULES: { pattern: RegExp; days: number }[] = [
  { pattern: /thịt|bò|heo|gà|vịt|lợn|pork|beef|chicken|duck/i, days: 3 },
  { pattern: /cá|tôm|mực|hải sản|ngao|sò|cua|fish|shrimp|squid/i, days: 2 },
  { pattern: /trứng|egg/i, days: 21 },
  { pattern: /sữa|phô mai|yogurt|milk|cheese|butter/i, days: 7 },
  { pattern: /đông lạnh|frozen/i, days: 90 },
  { pattern: /đóng hộp|canned|hộp thiếc/i, days: 365 },
  { pattern: /gia vị|muối|đường|bột|sauce|spice|salt|sugar/i, days: 180 },
  { pattern: /bánh mì|bread|baguette/i, days: 3 },
  { pattern: /rau|cải|xà lách|spinach|salad|cần|hành|tỏi/i, days: 5 },
  { pattern: /trái cây|quả|táo|cam|chuối|dưa|fruit|apple|orange|banana/i, days: 7 },
];

const DEFAULT_DAYS = 7;

// ─────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────

/**
 * Trả về số ngày shelf-life ước tính.
 *
 * Thứ tự ưu tiên:
 * 1. shelfLifeDays từ DB (IngredientCategory.defaultShelfLifeDays)
 * 2. Tra bảng hardcode theo tên category (fallback khi DB null)
 * 3. Keyword match tên nguyên liệu
 * 4. Mặc định 7 ngày
 */
export function estimateExpiryDays(
  shelfLifeDays: number | null | undefined,
  categoryName: string | null | undefined,
  ingredientName: string,
): number {
  // 1. Ưu tiên giá trị từ DB
  if (shelfLifeDays != null && shelfLifeDays > 0) return shelfLifeDays;

  // 2. Tra bảng theo category name
  if (categoryName) {
    const key = categoryName.toLowerCase().trim();
    if (CATEGORY_SHELF_LIFE[key] !== undefined) return CATEGORY_SHELF_LIFE[key];
    for (const [cat, days] of Object.entries(CATEGORY_SHELF_LIFE)) {
      if (key.includes(cat) || cat.includes(key)) return days;
    }
  }

  // 3. Keyword match tên nguyên liệu
  for (const { pattern, days } of KEYWORD_RULES) {
    if (pattern.test(ingredientName)) return days;
  }

  // 4. Fallback
  return DEFAULT_DAYS;
}

/**
 * Trả về Date hết hạn ước tính (cuối ngày = 23:59:59).
 */
export function estimateExpiryDate(
  shelfLifeDays: number | null | undefined,
  categoryName: string | null | undefined,
  ingredientName: string,
): Date {
  const days = estimateExpiryDays(shelfLifeDays, categoryName, ingredientName);
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 59, 0);
  return date;
}
