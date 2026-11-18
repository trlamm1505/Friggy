/**
 * Mock Notification Service
 *
 * ⚠️ SERVICE PARITY (`ServiceParity.test.js`):
 *   Mọi method public của Mock phải có trong Real và ngược lại. Vì vậy khi
 *   thêm method mới vào `RealNotificationService` (vd `getNotificationsPage`,
 *   `getNotificationSettings`) thì Mock PHẢI có nốt, nếu không proxy sẽ
 *   thiếu method -> UI gọi ra "undefined is not a function" lúc runtime.
 *
 * ⚠️ Mock KHÔNG giữ state đọc được giống thật:
 *   `MockNotificationService` chỉ mô phỏng để app chạy được ở chế độ demo
 *   (USE_MOCKS=true). Trong app thật, domain này dùng `RealNotificationService`.
 */

import { INotificationService } from '../../interfaces/INotificationService';
import notificationsMock from '../../../shared/mocks/notifications.json';

const MOCK_DELAY = 150;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

let notifications = JSON.parse(JSON.stringify(notificationsMock.notifications));

/**
 * Chuẩn hoá 1 notification của mock sang shape UI đầy đủ.
 *
 * ⚠️ Mock data cũ chỉ có `read` / `time` / `type` (3 nhóm cũ). Bổ sung
 *   `uiType` / `rawType` để UI dùng chung 1 shape với dữ liệu thật.
 */
const toShape = (n) => ({
  ...n,
  uiType: n.uiType ?? n.type ?? 'system',
  rawType: n.rawType ?? n.type ?? null,
  readAt: n.readAt ?? null,
  metadata: n.metadata ?? null,
});

export class MockNotificationService extends INotificationService {
  async getNotifications(filters = {}) {
    await sleep(MOCK_DELAY);
    let result = [...notifications];
    if (filters.type) {
      result = result.filter((n) => n.type === filters.type);
    }
    if (filters.unreadOnly) {
      result = result.filter((n) => !n.read);
    }
    return result.map(toShape);
  }

  /**
   * Bản có phân trang — khớp `RealNotificationService.getNotificationsPage`.
   */
  async getNotificationsPage(filters = {}) {
    await sleep(MOCK_DELAY);
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(filters.limit) || DEFAULT_LIMIT));

    const all = await this.getNotifications(filters);
    const start = (page - 1) * limit;
    const data = all.slice(start, start + limit);

    return {
      data,
      total: all.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(all.length / limit)),
      unreadCount: all.filter((n) => !n.read).length,
    };
  }

  async markAsRead(id) {
    await sleep(MOCK_DELAY / 2);
    const idx = notifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      notifications[idx] = { ...notifications[idx], read: true };
    }
  }

  async markAllAsRead() {
    await sleep(MOCK_DELAY);
    notifications = notifications.map((n) => ({ ...n, read: true }));
  }

  async deleteNotification(id) {
    await sleep(MOCK_DELAY);
    const idx = notifications.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('Notification không tồn tại');
    notifications.splice(idx, 1);
  }

  async getUnreadCount() {
    await sleep(MOCK_DELAY / 4);
    return notifications.filter((n) => !n.read).length;
  }

  // ═══════════════ FCM token (mock — không push thật) ═══════════════
  //
  // ⚠️ VÌ SAO CẦN 2 method này ở MOCK:
  //   `ServiceParity.test.js` đòi mọi method public của Mock phải được Real
  //   implement và ngược lại (contract đồng bộ 2 chiều). Real có
  //   `registerFcmToken` / `removeFcmToken` (đăng ký FCM token cho push) ->
  //   Mock cũng phải có để không lệch.
  //   Mock KHÔNG push thật (không có Firebase) -> chỉ mô phỏng trả về.
  //
  // ⚠️ `registerFcmToken` KHÔNG tự bịa token:
  //   Token giả -> nếu sau này RN nối Firebase, token giả có thể được gửi lên BE
  //   và gán cho user -> user nhận push của thiết bị khác. Nên caller phải
  //   truyền token thật, mock chỉ echo lại.

  async registerFcmToken(token, platform = 'android') {
    await sleep(MOCK_DELAY / 4);
    if (!token) throw new Error('Thiếu FCM token');
    return { token, platform };
  }

  async removeFcmToken(token) {
    await sleep(MOCK_DELAY / 4);
    // Khớp Real: không có token -> no-op (BE cần body `{ token }` -> 400 nếu thiếu).
    return { removed: Boolean(token) };
  }

  // ═══════════════ Cài đặt thông báo (mock) ═══════════════
  //
  // ⚠️ Mock giữ state trong RAM để toggle bật/tắt có phản hồi ngay
  //   (giống hành vi mong đợi của UI).

  async getNotificationSettings() {
    await sleep(MOCK_DELAY / 4);
    return { ...MockNotificationService._settings };
  }

  async updateNotificationSettings(settings = {}) {
    await sleep(MOCK_DELAY / 4);
    MockNotificationService._settings = {
      pushNotifications:
        typeof settings.pushNotifications === 'boolean'
          ? settings.pushNotifications
          : MockNotificationService._settings.pushNotifications,
      expiryAlert:
        typeof settings.expiryAlert === 'boolean'
          ? settings.expiryAlert
          : MockNotificationService._settings.expiryAlert,
      shoppingReminder:
        typeof settings.shoppingReminder === 'boolean'
          ? settings.shoppingReminder
          : MockNotificationService._settings.shoppingReminder,
    };
    return { ...MockNotificationService._settings };
  }
}

// State cài đặt dùng chung cho mọi instance (khớp hành vi "server").
MockNotificationService._settings = {
  pushNotifications: true,
  expiryAlert: true,
  shoppingReminder: false,
};
