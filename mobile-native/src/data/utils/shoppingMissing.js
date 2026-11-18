/**
 * Tính lượng nguyên liệu cần MUA theo khẩu phần — dùng chung cho online/offline.
 *
 * ⚠️ VÌ SAO CẦN (yêu cầu của user):
 *   Khi thêm nguyên liệu thiếu vào danh sách mua từ plan ngày/tuần, lượng
 *   mặc định là theo `slot.servings` của kế hoạch. User muốn chọn khẩu phần
 *   khác (Stepper) -> lượng phải scale theo.
 *
 * ⚠️ CÔNG THỨC ĐÚNG (xử lý được cả 2 trường hợp):
 *   lượngCầnMới  = quantityNeeded * scale
 *   lượngThiếuMới = max(0, lượngCầnMới - fridgeQuantity)
 *
 * ⚠️ KHÔNG dùng `missingQuantity * scale`:
 *   `missingQuantity = quantityNeeded - fridgeQuantity`, mà `fridgeQuantity`
 *   (lượng đang có trong tủ) KHÔNG đổi khi đổi khẩu phần -> nhân cả nó vào
 *   sẽ tính sai.
 *   Ví dụ: cần 200g, tủ có sẵn 150g -> thiếu 50g. Tăng gấp đôi khẩu phần:
 *     - SAI  (`missingQuantity * 2` = 100g): thực tế cần 400g, có sẵn 150g
 *             -> phải mua 250g.
 *     - ĐÚNG (`400 - 150` = 250g).
 *
 * 📌 ĐỐI CHIẾU BE (phải giống hệt):
 *   `be/src/modules-api/meal-planning/meal-planning.service.ts`
 *     -> `computeMissingPurchaseQuantity()`
 */

/**
 * Tính lượng cần mua (base unit) của 1 nguyên liệu.
 *
 * @param {object} item - `{ quantityNeeded, fridgeQuantity, missingQuantity }`
 * @param {number} scale - hệ số `servingsUserChon / slotServings`
 * @returns {number} lượng cần mua (>= 0)
 */
export const computeMissingPurchaseQuantity = (item, scale) => {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const needed = Number(item?.quantityNeeded);
  const fridgeQty = Number(item?.fridgeQuantity) || 0;

  // Cache cũ / dữ liệu thiếu `quantityNeeded` -> fallback về `missingQuantity`.
  if (!Number.isFinite(needed)) {
    return Math.max(0, (Number(item?.missingQuantity) || 0) * safeScale);
  }

  return Math.max(0, needed * safeScale - fridgeQty);
};

/**
 * Hệ số scale giữa khẩu phần user chọn và khẩu phần của slot trong kế hoạch.
 *
 * @param {number|null|undefined} targetServings - khẩu phần user chọn
 * @param {number|null|undefined} slotServings - khẩu phần của slot (kế hoạch)
 * @returns {number} hệ số (>= 0)
 */
export const computeServingsScale = (targetServings, slotServings) => {
  const base = Math.max(1, Number(slotServings) || 1);
  const target = Number(targetServings);
  if (!Number.isFinite(target) || target <= 0) return 1;
  return target / base;
};

export default computeMissingPurchaseQuantity;
