/**
 * unitNormalize - chuyển đổi đơn vị về đơn vị cơ bản (gram / ml).
 *
 * ⚠️ PORT NGUYÊN VĂN từ BE: `be/src/common/utils/unit.util.ts`
 *   (nguồn duy nhất đang chạy production — RN và BE PHẢI dùng CÙNG bảng
 *   quy đổi, nếu không BE trừ 500g còn RN trừ 0.5kg -> tủ lạnh lệch).
 *
 * ── VÌ SAO CẦN Ở TẦNG OFFLINE ─────────────────────────────────────────────
 *   Khi user tick "đã nấu" OFFLINE, BE không chạy -> không ai trừ nguyên liệu
 *   khỏi tủ lạnh. Muốn tủ lạnh local cập nhật đúng như online thì RN phải
 *   tự làm phép tính FIFO y hệt BE (`consumeIngredientsForSlot`):
 *     1. Quy lượng cần dùng về base unit (g / ml / đơn vị đếm).
 *     2. So với lượng trong tủ (cũng phải quy về base unit).
 *     3. Trừ FIFO theo hạn dùng (expiresAt asc) — ưu tiên món sắp hết hạn.
 *
 * ── POLICY (giữ nguyên semantics BE) ───────────────────────────────────────
 *   - Khối lượng -> gram. Thể tích -> milliliter. Đếm -> giữ nguyên unit gốc.
 *   - 2 baseUnit KHÁC NHAU -> KHÔNG so được (coi như thiếu, thận trọng).
 *
 * R7: comment tiếng Việt.
 */

/** Bảng convert khối lượng → gram. */
const WEIGHT_TO_GRAM = {
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

/** Bảng convert thể tích → milliliter. */
const VOLUME_TO_ML = {
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
  'muỗng canh': 15,
  'thìa canh': 15,
  tsp: 5,
  teaspoon: 5,
  'muỗng cà phê': 5,
  'thìa cà phê': 5,
  'muỗng cafe': 5,
  'thìa cafe': 5,
  cup: 240,
  'chén': 200,
  'bát': 250,
};

/** Alias cho các đơn vị đếm tiếng Việt thông dụng. */
const COUNTABLE_UNIT_ALIASES = {
  'trái': 'quả',
  trai: 'quả',
  qua: 'quả',
  'muỗng': 'muỗng',
  'thìa': 'muỗng',
  thia: 'muỗng',
  muong: 'muỗng',
  'củ': 'củ',
  cu: 'củ',
  'tép': 'tép',
  tep: 'tép',
  'nhánh': 'nhánh',
  nhanh: 'nhánh',
  'miếng': 'miếng',
  mieng: 'miếng',
  'lát': 'lát',
  lat: 'lát',
  'bó': 'bó',
  bo: 'bó',
  'cây': 'cây',
  cay: 'cây',
  'cọng': 'cọng',
  cong: 'cọng',
  'gói': 'gói',
  goi: 'gói',
  'hộp': 'hộp',
  hop: 'hộp',
  'lon': 'lon',
  'chai': 'chai',
  'bịch': 'bịch',
  bich: 'bịch',
};

/**
 * Quy đổi số lượng về đơn vị cơ bản.
 *
 * @param {number} quantity
 * @param {string} unit
 * @returns {{quantity:number, baseUnit:string}}
 */
export const normalizeToBaseUnit = (quantity, unit) => {
  const qty = Number(quantity) || 0;
  const u = (unit || '').trim().toLowerCase();

  if (WEIGHT_TO_GRAM[u] !== undefined) {
    return { quantity: qty * WEIGHT_TO_GRAM[u], baseUnit: 'g' };
  }

  if (VOLUME_TO_ML[u] !== undefined) {
    return { quantity: qty * VOLUME_TO_ML[u], baseUnit: 'ml' };
  }

  if (COUNTABLE_UNIT_ALIASES[u] !== undefined) {
    return { quantity: qty, baseUnit: COUNTABLE_UNIT_ALIASES[u] };
  }

  // Không convert được (pcs, bắp, ...) -> giữ nguyên unit gốc.
  return { quantity: qty, baseUnit: u };
};

/**
 * 2 baseUnit có so sánh được với nhau không (g vs g, ml vs ml, quả vs quả).
 *
 * @param {string} baseUnit1
 * @param {string} baseUnit2
 * @returns {boolean}
 */
export const canCompare = (baseUnit1, baseUnit2) => {
  if (!baseUnit1 || !baseUnit2) return false;
  return baseUnit1.toLowerCase().trim() === baseUnit2.toLowerCase().trim();
};

/**
 * Quy đổi NGƯỢC: số lượng ở base unit -> số lượng ở unit gốc của tủ lạnh.
 *
 * ⚠️ Cần khi trừ một phần (tủ còn dư) — vd tủ có 1000g, cần dùng 300g
 *   -> còn 700g -> quy về 'kg' = 0.7.
 *
 * @param {number} baseQuantity - số lượng ở base unit
 * @param {string} originalUnit - unit gốc của món trong tủ (vd 'kg')
 * @returns {number} số lượng quy về unit gốc
 */
export const fromBaseUnit = (baseQuantity, originalUnit) => {
  const factor = normalizeToBaseUnit(1, originalUnit).quantity;
  if (!factor || factor <= 0) return Number(baseQuantity) || 0;
  return (Number(baseQuantity) || 0) / factor;
};

export default normalizeToBaseUnit;
