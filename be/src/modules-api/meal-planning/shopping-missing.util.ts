/**
 * Tính lượng nguyên liệu cần MUA theo khẩu phần — hàm thuần (dễ test).
 *
 * ⚠️ VÌ SAO TÁCH HÀM THUẦN:
 *   `addSlotMissingToShoppingList` cần tính lại lượng thiếu khi user chọn
 *   khẩu phần khác với kế hoạch. Công thức phải ĐÚNG cho cả 2 trường hợp:
 *     - tủ trống ('missing'): thiếu = lượng cần.
 *     - tủ có sẵn một phần ('partial'): thiếu = lượng cần - lượng đang có.
 *   Tách ra để unit test được (không cần mock Prisma).
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
 * 📌 ĐỐI CHIẾU RN (phải giống hệt):
 *   `mobile-native/src/data/utils/shoppingMissing.js`
 *     -> `computeMissingPurchaseQuantity()`
 */

/**
 * Tính lượng cần mua (base unit) của 1 nguyên liệu.
 *
 * @param item - shape `IngredientAvailabilityDto` (đã scale theo `slot.servings`)
 * @param scale - hệ số `servingsUserChon / slotServings`
 * @returns lượng cần mua (base unit), 0 nếu tủ đã đủ
 */
export function computeMissingPurchaseQuantity(
  item: {
    quantityNeeded?: number | null;
    fridgeQuantity?: number | null;
    missingQuantity?: number | null;
  } | null
  | undefined,
  scale: number,
): number {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const needed = Number(item?.quantityNeeded);
  const fridgeQty = Number(item?.fridgeQuantity) || 0;

  // Cache cũ / dữ liệu thiếu `quantityNeeded` -> fallback về `missingQuantity`.
  if (!Number.isFinite(needed)) {
    return Math.max(0, (Number(item?.missingQuantity) || 0) * safeScale);
  }

  return Math.max(0, needed * safeScale - fridgeQty);
}

/**
 * Hệ số scale giữa khẩu phần user chọn và khẩu phần của slot trong kế hoạch.
 *
 * @param targetServings - khẩu phần user chọn
 * @param slotServings - khẩu phần của slot (kế hoạch)
 * @returns hệ số (>= 0)
 */
export function computeServingsScale(
  targetServings: number | null | undefined,
  slotServings: number | null | undefined,
): number {
  const base = Math.max(1, Number(slotServings) || 1);
  const target = Number(targetServings);
  if (!Number.isFinite(target) || target <= 0) return 1;
  return target / base;
}
