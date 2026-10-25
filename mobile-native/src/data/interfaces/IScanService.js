/**
 * Scan Service Interface
 *
 * Quét ảnh / hoá đơn / barcode bằng AI rồi xác nhận để thêm vào tủ lạnh.
 *
 * Nguồn sự thật (ưu tiên BE thật):
 *   be/src/modules-api/fridge/fridge.controller.ts (POST scan/image|receipt|barcode,
 *     GET scan/:scanId, POST scan/:scanId/confirm, GET scan/history)
 *   be/src/modules-api/fridge/dto/fridge-response.dto.ts (ScanResponseDto,
 *     ScanStatusResponseDto, ScanHistoryItemDto, DetectedItemResultDto)
 *   be/src/modules-api/fridge/dto/fridge.dto.ts (ConfirmScanDto)
 *
 * ⚠️ B2 — 2 điểm lệch plan đã chốt khi đọc BE thật:
 *   1. Barcode HIỆN TẠI cũng upload ảnh (multipart `file`), giống 2 loại kia.
 *      BE chưa có endpoint nhập chuỗi mã số -> `scanBarcode(uri)` nhận URI ảnh
 *      chụp mã vạch, KHÔNG nhận chuỗi barcode.
 *   2. Trạng thái poll thật là `pending` / `success` / `failed`
 *      (prisma `processingStatus`, `ScanStatusResponseDto.status`), KHÔNG phải
 *      `processing` / `done` như ghi chú cũ trong plan.
 */

/**
 * Kết quả trả ngay sau khi upload ảnh (BE `ScanResponseDto`).
 * AI chạy bất đồng bộ qua RabbitMQ -> `detectedItems` lúc này luôn rỗng,
 * FE phải poll `getScanStatus` cho tới khi `status` là `success` / `failed`.
 *
 * @typedef {Object} ScanUploadResult
 * @property {string} scanId
 * @property {string} scanType - 'image' | 'receipt' | 'barcode'
 * @property {string} status - luôn 'pending' ở bước này
 */

/**
 * 1 món AI nhận diện được (BE `DetectedItemResultDto`).
 *
 * @typedef {Object} ScanItem
 * @property {number|null} ingredientId - null = AI không khớp danh mục,
 *   user phải chọn tay từ `GET /ingredients` (dùng `fridgeService.searchIngredients`)
 * @property {string} name
 * @property {number} quantity
 * @property {string} unit
 * @property {number|null} confidence - 0..1, null khi BE không trả
 * @property {boolean} needsConfirm - true khi confidence thấp / không match DB
 * @property {boolean} allergyWarning - true khi món này nằm trong danh sách dị ứng của user
 * @property {number|null} [estimatedExpiryDays]
 */

/**
 * Trạng thái + kết quả scan (BE `ScanStatusResponseDto`).
 *
 * @typedef {Object} ScanStatusResult
 * @property {string} scanId
 * @property {string} scanType
 * @property {'pending'|'success'|'failed'} status
 * @property {ScanItem[]} items
 * @property {string|null} errorMessage
 * @property {string} createdAt
 */

/**
 * 1 dòng lịch sử scan (BE `ScanHistoryItemDto`).
 *
 * @typedef {Object} ScanHistoryItem
 * @property {string} id
 * @property {string} scanType
 * @property {string} status
 * @property {number} detectedCount
 * @property {number|null} confirmedCount
 * @property {string} createdAt
 */

/**
 * 1 món user xác nhận để thêm vào tủ (BE `ConfirmedScanItemDto`).
 * `ingredientId` và `name` đều optional nhưng phải resolve được nguyên liệu
 * trong danh mục, ngược lại BE throw 400 (giống `AddFridgeItemDto` ở B1).
 *
 * @typedef {Object} ConfirmedScanItem
 * @property {number} [ingredientId]
 * @property {string} [name]
 * @property {number} quantity
 * @property {string} unit
 * @property {string} [expiresAt]
 * @property {string} [storageLocation] - 'fridge'|'freezer'|'pantry'
 */

export class IScanService {
  /**
   * Upload ảnh thực phẩm để AI nhận diện (POST /fridge/scan/image, multipart `file`).
   * @param {string} uri - URI cục bộ của ảnh
   * @returns {Promise<ScanUploadResult>}
   */
  async scanImage(uri) {
    throw new Error('IScanService.scanImage() must be implemented');
  }

  /**
   * Upload ảnh hoá đơn để AI parse danh sách thực phẩm (POST /fridge/scan/receipt).
   * @param {string} uri - URI cục bộ của ảnh
   * @returns {Promise<ScanUploadResult>}
   */
  async scanReceipt(uri) {
    throw new Error('IScanService.scanReceipt() must be implemented');
  }

  /**
   * Upload ảnh mã vạch để AI nhận diện sản phẩm (POST /fridge/scan/barcode).
   * BE hiện tại chỉ nhận file ảnh, KHÔNG có endpoint nhập chuỗi barcode.
   * @param {string} uri - URI cục bộ của ảnh chụp mã vạch
   * @returns {Promise<ScanUploadResult>}
   */
  async scanBarcode(uri) {
    throw new Error('IScanService.scanBarcode() must be implemented');
  }

  /**
   * Lấy trạng thái + kết quả scan 1 lần (GET /fridge/scan/:scanId).
   * @param {string} scanId
   * @returns {Promise<ScanStatusResult>}
   */
  async getScanStatus(scanId) {
    throw new Error('IScanService.getScanStatus() must be implemented');
  }

  /**
   * Poll trạng thái scan tới khi xong.
   * - Poll mỗi 2s với exponential backoff, tối đa 60s (quy tắc plan B2).
   * - Dừng khi `status` là `success` (trả kết quả) hoặc `failed` (ném lỗi với `errorMessage`).
   * - Hết 60s vẫn `pending` -> ném lỗi timeout để UI hiện "thử lại".
   * - Caller unmount giữa chừng phải huỷ poll (truyền AbortSignal), không memory leak.
   *
   * @param {string} scanId
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] - huỷ poll khi màn hình unmount
   * @returns {Promise<ScanStatusResult>} - kết quả khi `success`
   */
  async pollScanResult(scanId, options) {
    throw new Error('IScanService.pollScanResult() must be implemented');
  }

  /**
   * Xác nhận / chỉnh sửa kết quả scan -> thêm vào tủ lạnh (POST /fridge/scan/:scanId/confirm).
   * @param {string} scanId
   * @param {ConfirmedScanItem[]} items
   * @returns {Promise<object[]>} - items tủ lạnh đã tạo (shape `FridgeItem` của IFridgeService)
   */
  async confirmScan(scanId, items) {
    throw new Error('IScanService.confirmScan() must be implemented');
  }

  /**
   * Lịch sử các lần scan (GET /fridge/scan/history).
   * @returns {Promise<ScanHistoryItem[]>}
   */
  async getScanHistory() {
    throw new Error('IScanService.getScanHistory() must be implemented');
  }
}
