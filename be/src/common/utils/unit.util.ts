/**
 * unit.util.ts — Chuyển đổi đơn vị về đơn vị cơ bản (gram / ml)
 *
 * Dùng cho fridge gap analysis: so sánh nguyên liệu trong tủ lạnh
 * với nguyên liệu cần dùng trong công thức nấu ăn.
 *
 * Base units:
 *   - Khối lượng → gram (g)
 *   - Thể tích   → milliliter (ml)
 *   - Đếm (quả, củ, lá...) → giữ nguyên unit gốc
 *
 * Policy khi không convert được:
 *   - Unit giống nhau (quả vs quả) → compare trực tiếp ✅
 *   - Unit khác loại (quả vs g)    → fridgeStatus: 'missing' (conservative) ⚠️
 */

/** Bảng convert khối lượng → gram */
const WEIGHT_TO_GRAM: Record<string, number> = {
  g: 1,
  gram: 1,
  'g.': 1,
  gam: 1,
  kg: 1000,
  kilogram: 1000,
  'kg.': 1000,
  mg: 0.001,
  miligram: 0.001,
  'lạng': 100,
  'cân': 500,
  lb: 453.592,
  pound: 453.592,
  oz: 28.3495,
  ounce: 28.3495,
};

/** Bảng convert thể tích → milliliter */
const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  'ml.': 1,
  mL: 1,
  milliliter: 1,
  l: 1000,
  'lít': 1000,
  lit: 1000,
  liter: 1000,
  'l.': 1000,
  dl: 100,
  cl: 10,
  tbsp: 15,
  tablespoon: 15,
  tsp: 5,
  teaspoon: 5,
  cup: 240,
  'chén': 200,
  'bát': 250,
};

export interface NormalizedUnit {
  quantity: number;
  baseUnit: string; // 'g', 'ml', hoặc unit gốc (đơn vị đếm)
}

/**
 * normalizeToBaseUnit — Convert số lượng về đơn vị cơ bản
 *
 * @param quantity - Số lượng nguyên liệu
 * @param unit     - Đơn vị (g, kg, ml, l, quả, củ, ...)
 * @returns { quantity: số đã convert, baseUnit: 'g' | 'ml' | unit-gốc }
 *
 * @example
 *   normalizeToBaseUnit(1, 'kg')   → { quantity: 1000, baseUnit: 'g' }
 *   normalizeToBaseUnit(0.5, 'l')  → { quantity: 500,  baseUnit: 'ml' }
 *   normalizeToBaseUnit(2, 'quả')  → { quantity: 2,    baseUnit: 'quả' }
 */
export function normalizeToBaseUnit(quantity: number, unit: string): NormalizedUnit {
  const u = unit.trim().toLowerCase();

  if (WEIGHT_TO_GRAM[u] !== undefined) {
    return { quantity: quantity * WEIGHT_TO_GRAM[u], baseUnit: 'g' };
  }

  if (VOLUME_TO_ML[u] !== undefined) {
    return { quantity: quantity * VOLUME_TO_ML[u], baseUnit: 'ml' };
  }

  // Không convert được (quả, củ, nhánh, lá, miếng, ...)
  return { quantity, baseUnit: u };
}

/**
 * canCompare — Kiểm tra 2 baseUnit có thể so sánh được không
 * Chỉ compare được nếu khớp chính xác (g vs g, ml vs ml, quả vs quả)
 */
export function canCompare(baseUnit1: string, baseUnit2: string): boolean {
  return baseUnit1 === baseUnit2;
}
