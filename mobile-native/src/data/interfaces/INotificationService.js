/**
 * Notification Service Interface
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {'expiring'|'recipe'|'system'|'shopping'|'promo'|'budget_alert'} type
 * @property {string} title
 * @property {string} message
 * @property {string} time
 * @property {boolean} read
 */

export class INotificationService {
  /**
   * Lấy danh sách notifications
   * @param {Object} [filters]
   * @param {string} [filters.type]
   * @param {boolean} [filters.unreadOnly]
   * @returns {Promise<Notification[]>}
   */
  async getNotifications(filters) {
    throw new Error('INotificationService.getNotifications() must be implemented');
  }

  /**
   * Đánh dấu đã đọc
   * @param {string} id
   * @returns {Promise<void>}
   */
  async markAsRead(id) {
    throw new Error('INotificationService.markAsRead() must be implemented');
  }

  /**
   * Đánh dấu tất cả đã đọc
   * @returns {Promise<void>}
   */
  async markAllAsRead() {
    throw new Error('INotificationService.markAllAsRead() must be implemented');
  }

  /**
   * Xóa notification
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteNotification(id) {
    throw new Error('INotificationService.deleteNotification() must be implemented');
  }

  /**
   * Lấy số unread
   * @returns {Promise<number>}
   */
  async getUnreadCount() {
    throw new Error('INotificationService.getUnreadCount() must be implemented');
  }
}
