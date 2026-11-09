/**
 * RealNotificationService - nối màn thông báo với BE thật.
 *
 * Nguồn sự thật:
 *   BE - be/src/modules-api/notifications/notifications.controller.ts
 *        + dto/notifications.dto.ts
 *        + dto/notifications-response.dto.ts
 *
 * ⚠️ VÌ SAO CẦN FILE NÀY:
 *   Trước đó `notificationService` CHỈ có `MockNotificationService` -> màn
 *   thông báo chạy dữ liệu giả, không đọc được gì từ BE dù BE đã có đủ 7
 *   endpoint. Đây là domain duy nhất trong 5 domain của `ServiceProvider`
 *   mà chưa có bản Real.
 *
 * ⚠️ SAI LỆCH TÊN FIELD GIỮA BE VÀ UI (bắt buộc mapper):
 *   BE `NotificationResponseDto`          UI (`INotificationService`)
 *   ---------------------------          ---------------------------
 *   `body`                              `message`
 *   `isRead`                            `read`
 *   `createdAt`                         `time`
 *   `type`                              `type`  (nhưng enum KHÁC — xem TYPE_MAP)
 *
 * ⚠️ ENUM `type` CỦA BE KHÁC HẲN ENUM CỦA UI:
 *   BE (`NotificationTypeEnum`):  expiry_warning | budget_alert | plan_ready | system | promo
 *   UI (`ICON_MAP` trong NotificationItem.jsx): expiring | recipe | system
 *   UI chỉ có 3 icon. Nếu trả thẳng `type` của BE thì mọi type lạ đều rơi
 *   về icon mặc định (Bell) -> mất phân biệt "sắp hết hạn" (quan trọng nhất).
 *   => `TYPE_MAP` dịch sang 3 loại UI, có fallback về `system` cho type lạ.
 *
 * Quy tắc tuân thủ:
 *   R1 - mapper có test (RealNotificationService.test.js)
 *   R2 - ảnh (nếu có) đi qua appConfig.getImageUrl()
 *   R3 - lỗi mạng / lỗi server để ApiException tự phân loại
 *   R4 - service này không import service khác, chỉ qua ApiClient
 *   R6 - đăng ký bằng side-effect ở cuối file
 *   R7 - comment tiếng Việt
 */

import { ApiClient } from '../../api/ApiClient';
import { registerService } from '../../api/ServiceRegistry';

/**
 * Dịch enum `type` của BE -> 3 loại mà UI có icon.
 *
 * - `expiry_warning` -> `expiring` (icon cảnh báo, màu cam)
 * - `plan_ready`     -> `recipe`   (icon đầu bếp — "thực đơn đã sẵn sàng")
 * - `system`         -> `system`
 * - `budget_alert`, `promo`, và type lạ -> `system` (fallback an toàn)
 */
const TYPE_MAP = {
  expiry_warning: 'expiring',
  plan_ready: 'recipe',
  system: 'system',
  budget_alert: 'system',
  promo: 'system',
};

/** Số trang mặc định — khớp `ListNotificationsQueryDto.limit` mặc định của BE (20). */
const DEFAULT_LIMIT = 20;

/**
 * Mapper `NotificationResponseDto` -> shape UI của `INotificationService`.
 *
 * @param {object} dto - response của BE
 * @returns {object} notification đúng shape UI
 */
export const toNotification = (dto) => {
  if (!dto) return null;

  return {
    id: dto.id,
    // `type` -> 3 loại UI (xem TYPE_MAP). Type lạ -> 'system'.
    type: TYPE_MAP[dto.type] ?? 'system',
    // Giữ luôn type gốc của BE để UI sau này cần phân biệt `budget_alert`
    // với `promo` vẫn dùng được (không mất thông tin).
    rawType: dto.type ?? null,
    title: dto.title ?? '',
    // BE `body` -> UI `message`
    message: dto.body ?? '',
    // BE `isRead` -> UI `read`
    read: Boolean(dto.isRead),
    // BE `createdAt` -> UI `time`
    time: dto.createdAt ?? null,
    readAt: dto.readAt ?? null,
    metadata: dto.metadata ?? null,
  };
};

export class RealNotificationService {
  constructor() {
    this.client = ApiClient;
  }

  /**
   * GET /notifications — danh sách thông báo (có phân trang).
   *
   * ⚠️ BE trả PHÂN TRANG: `{ data, total, page, limit, totalPages, unreadCount }`.
   *   `ApiClient` đã unwrap envelope `{ success, data }` -> còn lại 1 lớp `data`
   *   của chính pagination. Vì vậy phải đọc `payload.data`, KHÔNG coi response
   *   là mảng.
   *
   * ⚠️ `filters.unreadOnly` của UI -> BE dùng `isRead` (boolean).
   *   - `unreadOnly: true`  -> `isRead: false`
   *   - `unreadOnly: false` -> không gửi `isRead` (lấy tất cả)
   *   - `filters.type` -> BE KHÔNG có filter theo type -> lọc ở client.
   *
   * @param {object} [filters]
   * @param {string} [filters.type] - lọc client-side theo type đã map
   * @param {boolean} [filters.unreadOnly]
   * @returns {Promise<object[]>}
   */
  async getNotifications(filters = {}) {
    const params = { page: 1, limit: DEFAULT_LIMIT };
    if (filters.unreadOnly) {
      params.isRead = false;
    }

    const payload = await this.client.get('/notifications', { params });
    const list = Array.isArray(payload) ? payload : (payload?.data ?? []);

    const mapped = list.map(toNotification).filter(Boolean);

    // BE không có filter theo `type` -> lọc ở client.
    if (filters.type && filters.type !== 'all') {
      return mapped.filter((n) => n.type === filters.type);
    }
    return mapped;
  }

  /**
   * PATCH /notifications/:id/read — đánh dấu 1 thông báo đã đọc.
   *
   * @param {string} id
   * @returns {Promise<object>} notification sau khi cập nhật
   */
  async markAsRead(id) {
    if (!id) return null;
    const dto = await this.client.patch(`/notifications/${id}/read`);
    return toNotification(dto);
  }

  /**
   * PATCH /notifications/read-all — đánh dấu TẤT CẢ đã đọc.
   *
   * ⚠️ Route phải là `/read-all`, KHÔNG phải `/read-all/`.
   *   BE đặt `@Patch('read-all')` TRƯỚC `@Patch(':id/read')` trong controller
   *   để không bị route param `:id` nuốt mất.
   *
   * @returns {Promise<number>} số thông báo đã cập nhật
   */
  async markAllAsRead() {
    const res = await this.client.patch('/notifications/read-all');
    return res?.updated ?? 0;
  }

  /**
   * DELETE /notifications/:id — xoá thông báo (soft delete ở BE).
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteNotification(id) {
    if (!id) return;
    await this.client.delete(`/notifications/${id}`);
  }

  /**
   * GET /notifications/unread-count — số thông báo chưa đọc.
   *
   * BE trả `{ count: N }`.
   *
   * @returns {Promise<number>}
   */
  async getUnreadCount() {
    const res = await this.client.get('/notifications/unread-count');
    return res?.count ?? 0;
  }

  // ═══════════════ FCM token (push notification) ═══════════════

  /**
   * POST /notifications/fcm-token — đăng ký token thiết bị để nhận push.
   *
   * ⚠️ Cần `@react-native-firebase/messaging` để lấy token thật. RN hiện CHƯA
   *   cài package này (xem `package.json`) -> không có nơi lấy token.
   *   => Method này để sẵn cho sau này, UI chưa gọi. Không tự bịa token giả
   *      (token giả -> BE lưu rác -> user nhận push của thiết bị khác).
   *
   * @param {string} token - FCM registration token
   * @param {string} [platform] - 'android' | 'ios'
   * @returns {Promise<object>}
   */
  async registerFcmToken(token, platform = 'android') {
    if (!token) {
      throw new Error('Thiếu FCM token');
    }
    return this.client.post('/notifications/fcm-token', { token, platform });
  }

  /**
   * DELETE /notifications/fcm-token — gỡ token (gọi khi logout).
   *
   * @returns {Promise<void>}
   */
  async removeFcmToken() {
    await this.client.delete('/notifications/fcm-token');
  }
}

// ══════════════════════════════════════════════════════════════════
// R6: side-effect đăng ký — KHÔNG sửa file dùng chung.
// Key phải khớp `defaultServices` trong ServiceProvider.jsx.
// ══════════════════════════════════════════════════════════════════
registerService('notificationService', new RealNotificationService());

export { TYPE_MAP, DEFAULT_LIMIT };
