/**
 * OfflineQueuedError - lỗi đặc biệt báo "thao tác đã được lưu offline".
 *
 * ⚠️ VÌ SAO TÁCH FILE RIÊNG:
 *   `SafeService.js` (tầng API) cần import class này, còn
 *   `MutationHandlers.js` (tầng offline) cũng cần. Nếu để trong
 *   `MutationHandlers.js` thì `SafeService` -> `MutationHandlers` ->
 *   `OfflineCache` -> `DatabaseService` là chuỗi import dài, dễ gây vòng lặp.
 *   File riêng = 0 phụ thuộc.
 *
 * R7: comment tiếng Việt.
 */

export class OfflineQueuedError extends Error {
  /**
   * @param {string} opType - loại thao tác đã queue
   * @param {string} [message]
   */
  constructor(opType, message = 'Đã lưu offline, sẽ đồng bộ khi có mạng') {
    super(message);
    this.name = 'OfflineQueuedError';
    // Cờ để UI kiểm tra: `e.isOfflineQueued === true`.
    this.isOfflineQueued = true;
    this.opType = opType;
  }
}

export default OfflineQueuedError;
