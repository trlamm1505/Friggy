/**
 * Notification Service Interface
 *
 * ⚠️ HỢP ĐỒNG (contract) — phải khớp với `MockNotificationService` và
 *   `RealNotificationService` (test `ServiceParity.test.js` kiểm tra 2 chiều).
 *
 * ⚠️ SHAPE CỦA 1 NOTIFICATION (UI):
 *   `id`      string  — id từ BE
 *   `type`    string  — nhóm CŨ (3 giá trị): 'expiring' | 'recipe' | 'system'
 *                         (giữ nguyên vì màn lọc + typedef cũ dùng key này)
 *   `uiType`  string  — nhóm MỚI (9 giá trị) dùng để chọn ICON + MÀU:
 *                         expiring | recipe | system | promo | budget
 *                         | subscription | family | supplier | ingredient
 *   `rawType` string  — type GỐC của BE (không mất thông tin)
 *   `title`   string
 *   `message` string  — BE `body` -> UI `message`
 *   `time`    string  — BE `createdAt` -> UI `time`
 *   `read`    boolean — BE `isRead` -> UI `read`
 *   `readAt`  string|null
 *   `metadata` object|null
 */

export class INotificationService {
  /**
   * Lấy danh sách notifications
   * @param {Object} [filters]
   * @param {string} [filters.type]
   * @param {boolean} [filters.unreadOnly]
   * @param {number} [filters.page] - số trang (>= 1)
   * @param {number} [filters.limit] - số bản ghi/trang (<= 100)
   * @returns {Promise<Notification[]>}
   */
  async getNotifications(filters) {
    throw new Error('INotificationService.getNotifications() must be implemented');
  }

  /**
   * Lấy danh sách notifications KÈM thông tin phân trang.
   *
   * ⚠️ Khác `getNotifications()`: hàm này trả envelope đầy đủ
   *   `{ data, total, page, limit, totalPages, unreadCount }` -> UI biết
   *   còn trang sau hay không để hiện nút "Tải thêm".
   *
   * @param {Object} [filters]
   * @returns {Promise<{data: Notification[], total: number, page: number, limit: number, totalPages: number, unreadCount: number}>}
   */
  async getNotificationsPage(filters) {
    throw new Error('INotificationService.getNotificationsPage() must be implemented');
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

  // ═══════════════ FCM token (push notification) ═══════════════

  /**
   * Đăng ký FCM token thiết bị để nhận push.
   * @param {string} token
   * @param {string} [platform] - 'android' | 'ios' | 'web'
   * @returns {Promise<object>}
   */
  async registerFcmToken(token, platform) {
    throw new Error('INotificationService.registerFcmToken() must be implemented');
  }

  /**
   * Gỡ FCM token (gọi khi logout).
   * @param {string} [token]
   * @returns {Promise<void>}
   */
  async removeFcmToken(token) {
    throw new Error('INotificationService.removeFcmToken() must be implemented');
  }

  // ═══════════════ Cài đặt thông báo ═══════════════

  /**
   * Lấy cài đặt thông báo (push / expiry alert / shopping reminder).
   * @returns {Promise<{pushNotifications: boolean, expiryAlert: boolean, shoppingReminder: boolean}>}
   */
  async getNotificationSettings() {
    throw new Error('INotificationService.getNotificationSettings() must be implemented');
  }

  /**
   * Cập nhật cài đặt thông báo.
   * @param {object} settings
   * @returns {Promise<{pushNotifications: boolean, expiryAlert: boolean, shoppingReminder: boolean}>}
   */
  async updateNotificationSettings(settings) {
    throw new Error('INotificationService.updateNotificationSettings() must be implemented');
  }
}
