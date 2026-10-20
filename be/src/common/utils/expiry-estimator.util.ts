/**
 * ExpiryEstimator — Tự động tính ngày hết hạn khi người dùng không nhập
 *
 * Ưu tiên:
 * 1. Tra DB field tương ứng với storageLocation từ IngredientCategory
 * 2. Nhân hệ số từ defaultShelfLifeDays nếu field freezer/pantry null
 * 3. Bảng hardcode SHELF_LIFE_TABLE phân theo location + loại thực phẩm
 * 4. Keyword match tên nguyên liệu × hệ số location
 * 5. DEFAULT fallback theo location
 *
 * Shelf-life là ước tính dựa trên tiêu chuẩn an toàn thực phẩm.
 */

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type StorageLocation = 'fridge' | 'freezer' | 'pantry';

export interface ShelfLifeCategory {
  defaultShelfLifeDays?: number | null;   // ngăn mát
  freezerShelfLifeDays?: number | null;   // ngăn đông
  pantryShelfLifeDays?: number | null;    // tủ bếp/nhiệt độ phòng
  name?: string | null;                   // tên category (dùng tier 3 lookup)
}

// ─────────────────────────────────────────────────────────
// Hệ số nhân fallback theo vị trí (khi DB null)
// ─────────────────────────────────────────────────────────
const LOCATION_MULTIPLIER: Record<StorageLocation, number> = {
  fridge:  1.0,
  freezer: 20.0,  // Đông lạnh kéo dài ~20x so với ngăn mát
  pantry:  0.7,   // Nhiệt độ phòng ngắn hơn ~30%
};

// ─────────────────────────────────────────────────────────
// DEFAULT fallback theo location (tier 5)
// ─────────────────────────────────────────────────────────
const DEFAULT_DAYS: Record<StorageLocation, number> = {
  fridge:  7,
  freezer: 180,
  pantry:  14,
};

// ─────────────────────────────────────────────────────────
// Bảng shelf-life theo loại category × location (tier 3)
// ─────────────────────────────────────────────────────────
const SHELF_LIFE_TABLE: Record<string, Record<StorageLocation, number | null>> = {
  // Thịt
  'thịt':  { fridge: 3, freezer: 180, pantry: null },
  'thit':  { fridge: 3, freezer: 180, pantry: null },
  'meat':  { fridge: 3, freezer: 180, pantry: null },
  // Hải sản
  'hải sản': { fridge: 2, freezer: 90, pantry: null },
  'hai san': { fridge: 2, freezer: 90, pantry: null },
  'seafood': { fridge: 2, freezer: 90, pantry: null },
  'cá': { fridge: 2, freezer: 90, pantry: null },
  'ca': { fridge: 2, freezer: 90, pantry: null },
  // Rau củ
  'rau củ':   { fridge: 7, freezer: 30, pantry: 3 },
  'rau cu':   { fridge: 7, freezer: 30, pantry: 3 },
  'vegetable':{ fridge: 7, freezer: 30, pantry: 3 },
  'rau':      { fridge: 7, freezer: 30, pantry: 3 },
  // Trái cây
  'trái cây': { fridge: 7, freezer: 30, pantry: 5 },
  'trai cay': { fridge: 7, freezer: 30, pantry: 5 },
  'fruit':    { fridge: 7, freezer: 30, pantry: 5 },
  // Sữa & Trứng
  'sữa':  { fridge: 7,  freezer: 90,  pantry: null },
  'sua':  { fridge: 7,  freezer: 90,  pantry: null },
  'dairy':{ fridge: 7,  freezer: 90,  pantry: null },
  'trứng':{ fridge: 21, freezer: 180, pantry: 14 },
  'trung':{ fridge: 21, freezer: 180, pantry: 14 },
  'egg':  { fridge: 21, freezer: 180, pantry: 14 },
  // Đông lạnh
  'đông lạnh': { fridge: 7, freezer: 365, pantry: null },
  'dong lanh': { fridge: 7, freezer: 365, pantry: null },
  'frozen':    { fridge: 7, freezer: 365, pantry: null },
  // Đóng hộp / khô
  'đồ hộp': { fridge: 30, freezer: null, pantry: 365 },
  'do hop':  { fridge: 30, freezer: null, pantry: 365 },
  'canned':  { fridge: 30, freezer: null, pantry: 365 },
  'gia vị':  { fridge: 30, freezer: null, pantry: 180 },
  'gia vi':  { fridge: 30, freezer: null, pantry: 180 },
  'spice':   { fridge: 30, freezer: null, pantry: 180 },
  // Bánh & Đồ uống
  'bánh mì': { fridge: 7, freezer: 60,   pantry: 3 },
  'banh mi': { fridge: 7, freezer: 60,   pantry: 3 },
  'bakery':  { fridge: 7, freezer: 60,   pantry: 3 },
  'đồ uống': { fridge: 3, freezer: null, pantry: 7 },
  'do uong': { fridge: 3, freezer: null, pantry: 7 },
  'beverage':{ fridge: 3, freezer: null, pantry: 7 },
};

// ─────────────────────────────────────────────────────────
// Keyword rules (tier 4 — fallback khi không khớp category)
// base days = số ngày ở ngăn mát, tự nhân hệ số cho location khác
// ─────────────────────────────────────────────────────────
const KEYWORD_BASE_DAYS: { pattern: RegExp; fridgeDays: number }[] = [
  { pattern: /thịt|bò|heo|gà|vịt|lợn|pork|beef|chicken|duck/i, fridgeDays: 3 },
  { pattern: /cá|tôm|mực|hải sản|ngao|sò|cua|fish|shrimp|squid/i, fridgeDays: 2 },
  { pattern: /trứng|egg/i, fridgeDays: 21 },
  { pattern: /sữa|phô mai|yogurt|milk|cheese|butter/i, fridgeDays: 7 },
  { pattern: /đông lạnh|frozen/i, fridgeDays: 7 },
  { pattern: /đóng hộp|canned|hộp thiếc/i, fridgeDays: 30 },
  { pattern: /gia vị|muối|đường|bột|sauce|spice|salt|sugar/i, fridgeDays: 30 },
  { pattern: /bánh mì|bread|baguette/i, fridgeDays: 7 },
  { pattern: /rau|cải|xà lách|spinach|salad|cần|hành|tỏi/i, fridgeDays: 5 },
  { pattern: /trái cây|quả|táo|cam|chuối|dưa|fruit|apple|orange|banana/i, fridgeDays: 7 },
];

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function getDbDays(
  category: ShelfLifeCategory | null | undefined,
  location: StorageLocation,
): number | null {
  if (!category) return null;
  switch (location) {
    case 'fridge':  return category.defaultShelfLifeDays ?? null;
    case 'freezer': return category.freezerShelfLifeDays ?? null;
    case 'pantry':  return category.pantryShelfLifeDays  ?? null;
  }
}

function getTableDays(
  categoryName: string | null | undefined,
  location: StorageLocation,
): number | null {
  if (!categoryName) return null;
  const key = categoryName.toLowerCase().trim();

  if (SHELF_LIFE_TABLE[key]) return SHELF_LIFE_TABLE[key][location] ?? null;

  for (const [cat, table] of Object.entries(SHELF_LIFE_TABLE)) {
    if (key.includes(cat) || cat.includes(key)) {
      return table[location] ?? null;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────

/**
 * Trả về số ngày shelf-life ước tính dựa trên category object và location.
 *
 * Thứ tự ưu tiên:
 * 1. DB field tương ứng storageLocation (defaultShelfLifeDays / freezerShelfLifeDays / pantryShelfLifeDays)
 * 2. Nhân hệ số từ defaultShelfLifeDays (khi field đặc thù null)
 * 3. Bảng SHELF_LIFE_TABLE theo category.name × location
 * 4. Keyword match tên nguyên liệu × hệ số location
 * 5. DEFAULT fallback theo location
 */
export function estimateExpiryDays(
  category: ShelfLifeCategory | null | undefined,
  ingredientName: string,
  storageLocation: StorageLocation = 'fridge',
): number {
  // 1. DB field tương ứng location
  const dbDays = getDbDays(category, storageLocation);
  if (dbDays != null && dbDays > 0) return dbDays;

  // 2. Nhân hệ số từ defaultShelfLifeDays
  if (storageLocation !== 'fridge' && category?.defaultShelfLifeDays) {
    const multiplied = Math.round(category.defaultShelfLifeDays * LOCATION_MULTIPLIER[storageLocation]);
    if (multiplied > 0) return multiplied;
  }

  // 3. Bảng hardcode theo category.name × location
  if (category?.name) {
    const tableDays = getTableDays(category.name, storageLocation);
    if (tableDays != null && tableDays > 0) return tableDays;
  }

  // 4. Keyword match tên nguyên liệu × hệ số location
  for (const { pattern, fridgeDays } of KEYWORD_BASE_DAYS) {
    if (pattern.test(ingredientName)) {
      if (storageLocation === 'fridge') return fridgeDays;
      return Math.max(1, Math.round(fridgeDays * LOCATION_MULTIPLIER[storageLocation]));
    }
  }

  // 5. DEFAULT fallback theo location
  return DEFAULT_DAYS[storageLocation];
}

/**
 * Trả về Date hết hạn ước tính (cuối ngày = 23:59:59).
 *
 * @param category  Object category từ DB kèm theo 3 shelf-life fields + name
 * @param ingredientName  Tên nguyên liệu (keyword match fallback)
 * @param storageLocation  'fridge' | 'freezer' | 'pantry' (mặc định: fridge)
 */
export function estimateExpiryDate(
  category: ShelfLifeCategory | null | undefined,
  ingredientName: string,
  storageLocation: StorageLocation = 'fridge',
): Date {
  const days = estimateExpiryDays(category, ingredientName, storageLocation);
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 59, 0);
  return date;
}
