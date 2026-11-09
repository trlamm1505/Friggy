/**
 * Mock Notification Service
 */

import { INotificationService } from '../../interfaces/INotificationService';
import notificationsMock from '../../../shared/mocks/notifications.json';

const MOCK_DELAY = 150;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let notifications = JSON.parse(JSON.stringify(notificationsMock.notifications));

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
    return result;
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
  //   Token giả -> nếu sau này RN nối Firebase, token giả có thể bị gửi lên BE
  //   và gán cho user -> user nhận push của thiết bị khác. Nên caller phải
  //   truyền token thật, mock chỉ echo lại.

  async registerFcmToken(token, platform = 'android') {
    await sleep(MOCK_DELAY / 4);
    if (!token) throw new Error('Thiếu FCM token');
    return { token, platform };
  }

  async removeFcmToken() {
    await sleep(MOCK_DELAY / 4);
  }
}
