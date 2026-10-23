/**
 * Fridge Service Interface
 *
 * Quản lý tủ lạnh: items, stats, compartments, fridge groups.
 *
 * ⚠️ B1 — contract đã đồng bộ lại với BE thật:
 *   - XOÁ `category` khỏi `FridgeItem` / `FridgeItemInput` / `filters`.
 *     `FridgeItemResponseDto` của BE KHÔNG trả field `category` -> mọi item
 *     có `category === undefined` -> filter theo danh mục luôn ra list rỗng.
 *     Quyết định bỏ chip category: DEV_B_ONBOARDING_PROMPT.md mục 5.2 (chốt 23/10).
 *   - XOÁ `'category'` khỏi `filters.sortBy` — cùng lý do.
 *   - THÊM `searchIngredients` — BẮT BUỘC cho picker ở `ManualAddIngredientScreen`:
 *     `AddFridgeItemDto` có cả `ingredientId` lẫn `name` đều optional, nhưng
 *     `fridge.service.ts:141` throw BadRequest nếu không resolve được nguyên liệu
 *     trong danh mục -> UI nhập tên tự do sẽ lỗi 400.
 */

/**
 * @typedef {Object} FridgeItem
 * @property {string} id
 * @property {string} name
 * @property {number} quantity
 * @property {string} unit
 * @property {string} expiryDate
 * @property {'expiring'|'fresh'|'expired'} status
 * @property {string|null} [image]
 * @property {string} [compartment] - 'fridge'|'freezer'|'pantry'
 * @property {string} [compartmentLabel] - nhãn tiếng Việt của `compartment`
 * @property {number|null} [daysUntilExpiry] - BE đã tính sẵn
 * @property {number|null} [ingredientId]
 */

/**
 * @typedef {Object} FridgeSummary
 * @property {number} expiredCount
 * @property {number} availableCount
 */

/**
 * @typedef {Object} FridgeItemInput
 * @property {string} name
 * @property {number} quantity
 * @property {string} unit
 * @property {string} [expiryDate]
 * @property {string|null} [image]
 * @property {string} [compartment]
 * @property {number|null} [ingredientId]
 */

/**
 * @typedef {Object} IngredientOption
 * @property {number} id
 * @property {string} name
 * @property {string|null} defaultUnit
 * @property {string|null} image
 * @property {string} categoryName
 */

export class IFridgeService {
  /**
   * Lấy tất cả items trong tủ lạnh hiện tại
   * @param {Object} [filters]
   * @param {string} [filters.compartment]
   * @param {string} [filters.status]
   * @param {string} [filters.search] - tìm theo tên (case-insensitive)
   * @param {string} [filters.sortBy] - 'expiry'|'name'|'quantity'
   * @param {string} [filters.sortDir] - 'asc'|'desc'
   * @returns {Promise<FridgeItem[]>}
   */
  async getItems(filters) {
    throw new Error('IFridgeService.getItems() must be implemented');
  }

  /**
   * Lấy item theo id
   * @param {string} id
   * @returns {Promise<FridgeItem|null>}
   */
  async getItemById(id) {
    throw new Error('IFridgeService.getItemById() must be implemented');
  }

  /**
   * Lấy summary (expired count, available count)
   * @returns {Promise<FridgeSummary>}
   */
  async getSummary() {
    throw new Error('IFridgeService.getSummary() must be implemented');
  }

  /**
   * Thêm item mới vào tủ
   * @param {FridgeItemInput} item
   * @returns {Promise<FridgeItem>}
   */
  async addItem(item) {
    throw new Error('IFridgeService.addItem() must be implemented');
  }

  /**
   * Cập nhật item (quantity, expiry, ...)
   * @param {string} id
   * @param {Partial<FridgeItemInput>} updates
   * @returns {Promise<FridgeItem>}
   */
  async updateItem(id, updates) {
    throw new Error('IFridgeService.updateItem() must be implemented');
  }

  /**
   * Xóa item khỏi tủ
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteItem(id) {
    throw new Error('IFridgeService.deleteItem() must be implemented');
  }

  /**
   * Đánh dấu "đã dùng hết" - xóa khỏi tủ
   * @param {string} id
   * @returns {Promise<void>}
   */
  async markConsumed(id) {
    throw new Error('IFridgeService.markConsumed() must be implemented');
  }

  /**
   * Tìm nguyên liệu trong danh mục (ingredient picker).
   * @param {string} query - từ khoá tìm kiếm, rỗng -> danh sách đầu
   * @param {number} [limit] - số kết quả tối đa
   * @returns {Promise<IngredientOption[]>}
   */
  async searchIngredients(query, limit) {
    throw new Error('IFridgeService.searchIngredients() must be implemented');
  }
}
