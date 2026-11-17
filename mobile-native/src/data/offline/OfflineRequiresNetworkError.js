/**
 * OfflineRequiresNetworkError - lỗi đặc biệt báo "tính năng này cần mạng".
 *
 * ⚠️ VÌ SAO CẦN LỖI RIÊNG (không dùng chung lỗi 500):
 *   Theo chính sách Option B: khi user GHI offline mà KHÔNG có mutation
 *   handler (nhóm tài chính / gia đình: thanh toán, mời thành viên, huỷ
 *   nhóm...), app KHÔNG ĐƯỢC:
 *     - trả mock  -> báo "thành công giả" (user tưởng đã thanh toán)
 *     - im lặng   -> user không hiểu vì sao không có gì xảy ra
 *   => Phải ném lỗi TƯỜNG MINH, UI hiển thị "Tính năng này cần kết nối mạng".
 *
 * ⚠️ VÌ SAO TÁCH FILE RIÊNG:
 *   `SafeService.js` (tầng API) import lỗi này; giữ file riêng = 0 phụ thuộc
 *   (không kéo theo OfflineCache / DatabaseService) -> tránh vòng lặp import.
 *
 * R7: comment tiếng Việt.
 */

export class OfflineRequiresNetworkError extends Error {
  /**
   * @param {string} methodName - tên method bị chặn
   * @param {string} [serviceKey] - key của service (vd 'userService')
   * @param {string} [message]
   */
  constructor(methodName, serviceKey, message = 'Tính năng này cần kết nối mạng') {
    super(message);
    this.name = 'OfflineRequiresNetworkError';
    // Cờ để UI kiểm tra: `e.isOfflineRequiresNetwork === true`.
    this.isOfflineRequiresNetwork = true;
    this.methodName = methodName;
    this.serviceKey = serviceKey;
  }
}

/**
 * Kiểm tra lỗi có phải `OfflineRequiresNetworkError` không.
 *
 * @param {any} e
 * @returns {boolean}
 */
export const isOfflineRequiresNetworkError = (e) =>
  !!e && e.isOfflineRequiresNetwork === true;

export default OfflineRequiresNetworkError;
