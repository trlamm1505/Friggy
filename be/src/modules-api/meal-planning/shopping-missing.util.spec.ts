/**
 * Test `computeMissingPurchaseQuantity` — tính lượng cần MUA khi user chọn
 * khẩu phần khác với kế hoạch.
 *
 * ⚠️ VÌ SAO TEST NÀY QUAN TRỌNG:
 *   Khi user chỉnh khẩu phần rồi bấm "+ Thêm vào DS", lượng phải scale ĐÚNG.
 *   Sai 1 chỗ là user mua sai lượng (vd thiếu 50g thành thiếu 100g).
 *
 * 📌 ĐỐI CHIẾU RN (phải cho ra CÙNG kết quả):
 *   `mobile-native/src/data/utils/shoppingMissing.js`
 *     -> `computeMissingPurchaseQuantity()`
 */

import { computeMissingPurchaseQuantity } from './shopping-missing.util';

describe('computeMissingPurchaseQuantity', () => {
  it('tủ trống -> lượng thiếu = lượng cần (đã scale)', () => {
    expect(
      computeMissingPurchaseQuantity(
        { quantityNeeded: 500, fridgeQuantity: 0, missingQuantity: 500 },
        2,
      ),
    ).toBe(1000);
  });

  it('tủ có sẵn một phần -> lượng thiếu = cần - đang có (KHÔNG scale phần đang có)', () => {
    // Cần 200g, tủ có 150g -> thiếu 50g.
    // Tăng gấp đôi khẩu phần -> cần 400g, vẫn có sẵn 150g -> thiếu 250g.
    // ⚠️ SAI nếu nhân `missingQuantity * scale` (= 100g).
    expect(
      computeMissingPurchaseQuantity(
        { quantityNeeded: 200, fridgeQuantity: 150, missingQuantity: 50 },
        2,
      ),
    ).toBe(250);
  });

  it('tủ đã đủ -> không cần mua (0)', () => {
    expect(
      computeMissingPurchaseQuantity(
        { quantityNeeded: 200, fridgeQuantity: 300, missingQuantity: 0 },
        1,
      ),
    ).toBe(0);
  });

  it('giảm khẩu phần -> lượng thiếu có thể = 0 (tủ đã đủ)', () => {
    expect(
      computeMissingPurchaseQuantity(
        { quantityNeeded: 200, fridgeQuantity: 150, missingQuantity: 50 },
        0.5,
      ),
    ).toBe(0);
  });

  it('thiếu `quantityNeeded` -> fallback về `missingQuantity * scale`', () => {
    expect(
      computeMissingPurchaseQuantity({ missingQuantity: 100, fridgeQuantity: 0 }, 2),
    ).toBe(200);
  });

  it('scale <= 0 / không hợp lệ -> coi như 1 (không nhân sai)', () => {
    expect(
      computeMissingPurchaseQuantity({ quantityNeeded: 100, fridgeQuantity: 0 }, 0),
    ).toBe(100);
    expect(
      computeMissingPurchaseQuantity({ quantityNeeded: 100, fridgeQuantity: 0 }, -2),
    ).toBe(100);
  });

  it('item rỗng -> 0', () => {
    expect(computeMissingPurchaseQuantity(null, 2)).toBe(0);
    expect(computeMissingPurchaseQuantity({}, 2)).toBe(0);
  });
});
