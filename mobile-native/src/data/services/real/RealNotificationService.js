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
 *   BE (`NotificationTypeEnum` trong DTO) chỉ khai báo 5 giá trị, NHƯNG
 *   `prisma/schema.prisma` (`enum NotificationType`) có TẤT CẢ 17:
 *     expiry_warning | budget_alert | plan_ready | system | promo
 *     | subscription_reminder | family_invite | family_joined
 *     | family_rejected | family_removed | family_dissolved
 *     | supplier_package_activated | supplier_package_expiring
 *     | supplier_package_expired | ingredient_approved | ingredient_rejected
 *
 *   BE tạo notification với type ngoài 5 giá trị đầu (vd `family_invite`,
 *   `subscription_reminder`, `supplier_package_expiring`) -> nếu UI chỉ map
 *   5 loại thì 12 loại còn lại rơi về `system` -> mất phân biệt, và quan
 *   trọng nhất là "gia đình mời bạn tham gia" bị hiện như thông báo hệ thống
 *   vô nghĩa.
 *
 *   => `TYPE_MAP` dịch ĐẦY ĐỦ 17 loại sang nhóm UI có icon, có fallback
 *      về `system` cho type BE thêm mới sau này.
 *   => `rawType` GIỮ NGUYÊN type gốc của BE (không mất thông tin).
 *
 * ⚠️ NHÓM UI (`uiType`) và `type` CŨ (3 giá trị) là 2 khái niệm khác nhau:
 *   - `type` (cũ) = 3 nhóm cũ: expiring | recipe | system -> GIỮ NGUYÊN để
 *     các màn lọc theo `type` cũ không bị hỏng (và `ICON_MAP` cũ vẫn chạy).
 *   - `uiType` (mới) = nhóm chi tiết hơn, dùng để chọn ICON + MÀU.
 *   `NotificationItem` ưu tiên `uiType`, fallback về `type`.
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
 *
 * ⚠️ Giữ NGUYÊN bảng này (3 giá trị) vì:
 *   - `NotificationsScreen` lọc theo `it.type` với key 'expiring'/'recipe'/'system'.
 *   - `INotificationService` typedef khai báo `type` là 1 trong 3 giá trị này.
 *   Bảng chi tiết hơn nằm ở `UI_TYPE_MAP` (-> `uiType`).
 */
const TYPE_MAP = {
  expiry_warning: 'expiring',
  plan_ready: 'recipe',
  system: 'system',
  budget_alert: 'system',
  promo: 'system',
};

/**
 * Nhóm UI CHI TIẾT (dùng để chọn ICON + MÀU trong `NotificationItem`).
 *
 * ⚠️ VÌ SAO CẦN (ngoài `TYPE_MAP`):
 *   `TYPE_MAP` gộp 17 type của BE về 3 nhóm -> "gia đình mời bạn" và
 *   "gói nhà cung cấp sắp hết hạn" đều thành `system` -> user không phân
 *   biệt được thông báo nào cần hành động.
 *
 *   `UI_TYPE_MAP` giữ 9 nhóm có ý nghĩa riêng:
 *     expiring | recipe | system | promo | budget | subscription
 *     | family | supplier | ingredient
 *
 *   Type BE chưa biết -> fallback `system` (an toàn, không crash).
 */
export const UI_TYPE_MAP = {
  // Nguyên liệu sắp hết hạn — cần hành động ngay.
  expiry_warning: 'expiring',

  // Thực đơn tuần đã sẵn sàng -> gợi ý công thức.
  plan_ready: 'recipe',

  // Gói đăng ký sắp hết hạn / tự gia hạn.
  subscription_reminder: 'subscription',

  // Ngân sách vượt mức.
  budget_alert: 'budget',

  // Khuyến mãi.
  promo: 'promo',

  // Gia đình (mời / tham gia / từ chối / bị xoá / giải thể).
  family_invite: 'family',
  family_joined: 'family',
  family_rejected: 'family',
  family_removed: 'family',
  family_dissolved: 'family',

  // Gói nhà cung cấp (kích hoạt / sắp hết hạn / đã hết hạn).
  supplier_package_activated: 'supplier',
  supplier_package_expiring: 'supplier',
  supplier_package_expired: 'supplier',

  // Nguyên liệu của nhà cung cấp được duyệt / bị từ chối.
  ingredient_approved: 'ingredient',
  ingredient_rejected: 'ingredient',

  // Hệ thống.
  system: 'system',
};

/** Số trang mặc định — khớp `ListNotificationsQueryDto.limit` mặc định của BE (20). */
const DEFAULT_LIMIT = 20;

/**
 * Số trang tối đa BE cho phép (`@Max(100)` trong `ListNotificationsQueryDto`).
 * Gửi vượt -> 400 -> mất trắng danh sách.
 */
const MAX_LIMIT = 100;

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
    // `uiType` -> nhóm chi tiết (xem UI_TYPE_MAP) -> chọn ICON + MÀU.
    uiType: UI_TYPE_MAP[dto.type] ?? 'system',
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
    /**
     * Token FCM đăng ký gần nhất (giữ trong RAM).
     *
     * ⚠️ VÌ SAO CẦN:
     *   BE `DELETE /notifications/fcm-token` BẮT BUỘC body `{ token }`.
     *   Nếu không nhớ token đã đăng ký -> không biết gỡ cái gì -> bỏ qua
     *   request (thay vì gửi body rỗng -> 400).
     */
    this._lastRegisteredToken = null;
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
   * @param {number} [filters.page] - số trang (>= 1, default 1)
   * @param {number} [filters.limit] - số bản ghi/trang (<= 100, default 20)
   * @returns {Promise<object[]>}
   */
  async getNotifications(filters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(filters.limit) || DEFAULT_LIMIT));

    const params = { page, limit };
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
   * GET /notifications — LẤY KÈM THÔNG TIN PHÂN TRANG.
   *
   * ⚠️ VÌ SAO CẦN (ngoài `getNotifications`):
   *   `getNotifications` trả mảng -> UI không biết còn trang sau hay không ->
   *   user chỉ thấy 20 thông báo đầu tiên, các thông báo cũ hơn KHÔNG BAO GIỜ
   *   truy cập được (BE có phân trang sẵn nhưng client không dùng).
   *
   *   Hàm này trả nguyên envelope phân trang của BE:
   *   `{ data, total, page, limit, totalPages, unreadCount }`.
   *
   * @param {object} [filters] - xem `getNotifications`
   * @returns {Promise<{data: object[], total: number, page: number, limit: number, totalPages: number, unreadCount: number}>}
   */
  async getNotificationsPage(filters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(filters.limit) || DEFAULT_LIMIT));

    const params = { page, limit };
    if (filters.unreadOnly) {
      params.isRead = false;
    }

    const payload = await this.client.get('/notifications', { params });

    // BE trả envelope phân trang. Nếu server trả mảng thẳng -> tự đóng gói.
    const rawList = Array.isArray(payload) ? payload : (payload?.data ?? []);
    const mapped = rawList.map(toNotification).filter(Boolean);

    const total = Array.isArray(payload) ? mapped.length : (payload?.total ?? mapped.length);
    const totalPages = Array.isArray(payload)
      ? 1
      : (payload?.totalPages ?? Math.max(1, Math.ceil(total / limit)));

    return {
      data: mapped,
      total,
      page: Array.isArray(payload) ? 1 : (payload?.page ?? page),
      limit,
      totalPages,
      unreadCount: Array.isArray(payload)
        ? mapped.filter((n) => !n.read).length
        : (payload?.unreadCount ?? 0),
    };
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
    this._lastRegisteredToken = token;
    return this.client.post('/notifications/fcm-token', { token, platform });
  }

  /**
   * DELETE /notifications/fcm-token — gỡ token (gọi khi logout).
   *
   * ⚠️ BE BẮT BUỘC có body: `RemoveFcmTokenDto.token` là `@IsString()
   *   @IsNotEmpty()` -> thiếu body -> HTTP 400 (ValidationPipe).
   *   => PHẢI gửi `{ token }` kèm body cho request DELETE.
   *
   * ⚠️ Nếu không có token nào đăng ký -> KHÔNG gọi API (tránh 400 vô ích),
   *   coi như đã gỡ xong.
   *
   * @param {string} [token] - FCM token cần gỡ (bỏ trống -> dùng token đã lưu)
   * @returns {Promise<void>}
   */
  async removeFcmToken(token) {
    const target = token ?? this._lastRegisteredToken;

    if (!target) {
      // Chưa từng đăng ký token nào -> không có gì để gỡ -> no-op.
      return;
    }

    await this.client.delete('/notifications/fcm-token', { token: target });
  }

  /**
   * GET /users/me/notification-settings — cài đặt thông báo của user.
   *
   * ⚠️ Endpoint này nằm ở module `users` (không phải `notifications`) vì
   *   `UsersController` đã expose sẵn 2 route này và `NotificationsService`
   *   (module notifications) đã phụ thuộc `UsersModule` -> nếu khai báo lại ở
   *   đây sẽ trùng route.
   *
   * ⚠️ TÊN FIELD PHẢI KHỚP BE (`notifications-response.dto.ts`):
   *   `pushNotifications` / `expiryAlert` / `shoppingReminder`.
   *
   * @returns {Promise<{pushNotifications: boolean, expiryAlert: boolean, shoppingReminder: boolean}>}
   */
  async getNotificationSettings() {
    const res = await this.client.get('/users/me/notification-settings');
    return {
      pushNotifications: res?.pushNotifications === true,
      expiryAlert: res?.expiryAlert === true,
      shoppingReminder: res?.shoppingReminder === true,
    };
  }

  /**
   * PATCH /users/me/notification-settings — cập nhật cài đặt thông báo.
   *
   * ⚠️ BE `UpdateNotificationSettingsDto` — mỗi field đều `@IsOptional()`
   *   -> chỉ gửi field nào thực sự đổi (gửi `undefined` bị loại bởi
   *   `class-validator`? KHÔNG — `undefined` vẫn bị validate, nên phải
   *   lọc bằng `omitEmpty`).
   *
   * @param {object} settings
   * @param {boolean} [settings.pushNotifications]
   * @param {boolean} [settings.expiryAlert]
   * @param {boolean} [settings.shoppingReminder]
   * @returns {Promise<{pushNotifications: boolean, expiryAlert: boolean, shoppingReminder: boolean}>}
   */
  async updateNotificationSettings(settings = {}) {
    const body = {};
    if (typeof settings.pushNotifications === 'boolean') {
      body.pushNotifications = settings.pushNotifications;
    }
    if (typeof settings.expiryAlert === 'boolean') {
      body.expiryAlert = settings.expiryAlert;
    }
    if (typeof settings.shoppingReminder === 'boolean') {
      body.shoppingReminder = settings.shoppingReminder;
    }

    const res = await this.client.patch('/users/me/notification-settings', body);
    return {
      pushNotifications: res?.pushNotifications === true,
      expiryAlert: res?.expiryAlert === true,
      shoppingReminder: res?.shoppingReminder === true,
    };
  }
}

// ══════════════════════════════════════════════════════════════════
// R6: side-effect đăng ký — KHÔNG sửa file dùng chung.
// Key phải khớp `defaultServices` trong ServiceProvider.jsx.
// ══════════════════════════════════════════════════════════════════
registerService('notificationService', new RealNotificationService());

export { TYPE_MAP, DEFAULT_LIMIT, MAX_LIMIT };
