/**
 * Fridge date helpers
 *
 * Hàm dùng chung cho các màn + component trong nhóm "fridge". Trước đây
 * `getDaysToExpiry` bị COPY ở 4 file (AllAvailableItemsScreen,
 * AllExpiredItemsScreen, FridgeListScreen, FridgeItem) -> cùng 1 logic nhưng
 * 4 chỗ, dễ lệch khi sửa.
 *
 * QUAN TRỌNG — vì sao hàm này trả `null` thay vì `NaN`:
 * `new Date(undefined)` = Invalid Date -> phép trừ ra `NaN` -> mọi so sánh
 * với `NaN` đều false (`NaN >= 0` là false). Hậu quả: item không có hạn dùng
 * sẽ biến mất khỏi mọi màn lọc theo hạn dùng. BE có thể trả
 * `expiresAt: null` -> cùng tình huống. Nên phải xử lý tường minh.
 */

/**
 * Số ngày còn lại tới hạn (theo ngày, bỏ qua giờ phút).
 *
 * @param {string|Date|null|undefined} expiryDate
 * @returns {number|null} số ngày (âm = đã quá hạn), `null` = không có hạn dùng
 */
export const getDaysToExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
};

/**
 * Item còn hạn chưa?
 *
 * - `days === null` (không có hạn dùng) -> coi là CÒN hạn.
 *   Thực phẩm không có hạn (mật ong, gạo, tương...) không phải là đồ đã hết
 *   hạn -> phải hiện ở màn "Nguyên liệu sẵn có".
 * - `days < 0` -> đã quá hạn.
 *
 * @param {{expiryDate?: string|null, status?: string}} item
 * @returns {boolean}
 */
export const isItemAvailable = (item) => {
  if (!item) return false;
  if (item.status === 'expired') return false;
  const days = getDaysToExpiry(item.expiryDate);
  // Không có hạn dùng -> không thể nói là đã hết hạn -> coi là còn hạn.
  if (days === null) return true;
  return days >= 0;
};

/**
 * Item đã quá hạn (dùng cho màn "Nguyên liệu hết hạn").
 *
 * @param {{expiryDate?: string|null, status?: string}} item
 * @returns {boolean}
 */
export const isItemExpired = (item) => {
  if (!item) return false;
  const days = getDaysToExpiry(item.expiryDate);
  if (days === null) return item.status === 'expired';
  return days < 0;
};
