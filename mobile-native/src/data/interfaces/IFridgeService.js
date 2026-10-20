/**
 * Fridge Service Interface
 *
 * Quản lý tủ lạnh: items, stats, compartments, fridge groups.
 */

/**
 * @typedef {Object} FridgeItem
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {number} quantity
 * @property {string} unit
 * @property {string} expiryDate
 * @property {'expiring'|'fresh'|'expired'} status
 * @property {string|null} [image]
 * @property {string} [compartment] - 'fridge'|'freezer'|'pantry'
 */

/**
 * @typedef {Object} FridgeSummary
 * @property {number} expiredCount
 * @property {number} availableCount
 */

/**
 * @typedef {Object} FridgeItemInput
 * @property {string} name
 * @property {string} category
 * @property {number} quantity
 * @property {string} unit
 * @property {string} expiryDate
 * @property {string|null} [image]
 * @property {string} [compartment]
 */

export class IFridgeService {
  /**
   * Lấy tất cả items trong tủ lạnh hiện tại
   * @param {Object} [filters]
   * @param {string} [filters.compartment]
   * @param {string} [filters.status]
   * @param {string} [filters.category]
   * @param {string} [filters.search] - tìm theo tên (case-insensitive)
   * @param {string} [filters.sortBy] - 'expiry'|'name'|'quantity'|'category'
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
}
