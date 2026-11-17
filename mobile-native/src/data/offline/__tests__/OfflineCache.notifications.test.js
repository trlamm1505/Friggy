/**
 * B3 + B4 — Cache thông báo (notifications) + cache JSON (tài chính/gia đình).
 *
 * B3: `local_notifications` — lưu, đọc, đánh dấu đã đọc, đếm chưa đọc, xoá.
 * B4: `local_json_cache` — lưu/đọc theo key (`current_plan`, `family_info`,
 *      `payment_history`, `packages`).
 *
 * Mục đích: khi offline + không có mạng, service đọc được dữ liệu THẬT đã
 * tải về trước đó thay vì trả dữ liệu BỊA (mock) hoặc màn trắng.
 */

import { offlineCache } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

describe('B3 — cache thông báo', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  it('saveNotifications -> getNotifications trả về đúng dữ liệu', async () => {
    const saved = await offlineCache.saveNotifications([
      { id: 'n1', type: 'expiring', title: 'Sữa sắp hết hạn', message: 'Còn 1 ngày', read: false },
      { id: 'n2', type: 'recipe', title: 'Gợi ý món', message: 'Cơm gà', read: true },
    ]);

    expect(saved).toBe(2);

    const list = await offlineCache.getNotifications();
    expect(list).toHaveLength(2);
    expect(list.map((n) => n.id).sort()).toEqual(['n1', 'n2']);
    expect(list.find((n) => n.id === 'n1').isRead).toBe(false);
    expect(list.find((n) => n.id === 'n2').isRead).toBe(true);
  });

  it('saveNotifications lần 2 thay thế (không nhân bản)', async () => {
    await offlineCache.saveNotifications([{ id: 'n1', type: 'system', title: 'A', read: false }]);
    await offlineCache.saveNotifications([{ id: 'n1', type: 'system', title: 'B', read: false }]);

    const list = await offlineCache.getNotifications();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('B');
  });

  it('getNotifications lọc theo type', async () => {
    await offlineCache.saveNotifications([
      { id: 'n1', type: 'expiring', title: 'A', read: false },
      { id: 'n2', type: 'recipe', title: 'B', read: false },
    ]);

    const list = await offlineCache.getNotifications({ type: 'expiring' });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('n1');
  });

  it('getNotifications lọc unreadOnly', async () => {
    await offlineCache.saveNotifications([
      { id: 'n1', type: 'system', title: 'A', read: false },
      { id: 'n2', type: 'system', title: 'B', read: true },
    ]);

    const list = await offlineCache.getNotifications({ unreadOnly: true });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('n1');
  });

  it('setNotificationRead -> đánh dấu đã đọc + đếm chưa đọc giảm', async () => {
    await offlineCache.saveNotifications([
      { id: 'n1', type: 'system', title: 'A', read: false },
      { id: 'n2', type: 'system', title: 'B', read: false },
    ]);

    expect(await offlineCache.getUnreadNotificationCount()).toBe(2);

    await offlineCache.setNotificationRead('n1', true);

    expect(await offlineCache.getUnreadNotificationCount()).toBe(1);
    const list = await offlineCache.getNotifications();
    expect(list.find((n) => n.id === 'n1').isRead).toBe(true);
  });

  it('markAllNotificationsRead -> tất cả thành đã đọc', async () => {
    await offlineCache.saveNotifications([
      { id: 'n1', type: 'system', title: 'A', read: false },
      { id: 'n2', type: 'system', title: 'B', read: false },
    ]);

    await offlineCache.markAllNotificationsRead();

    expect(await offlineCache.getUnreadNotificationCount()).toBe(0);
  });

  it('xoá 1 thông báo khỏi cache', async () => {
    await offlineCache.saveNotifications([
      { id: 'n1', type: 'system', title: 'A', read: false },
      { id: 'n2', type: 'system', title: 'B', read: false },
    ]);

    await offlineCache.removeNotification('n1');

    const list = await offlineCache.getNotifications();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('n2');
  });
});

describe('B4 — cache JSON (gói / gia đình / lịch sử thanh toán)', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  it('saveJsonCache -> getJsonCache trả về đúng object', async () => {
    await offlineCache.saveJsonCache('current_plan', { name: 'family', status: 'active' });

    const value = await offlineCache.getJsonCache('current_plan');
    expect(value).toEqual({ name: 'family', status: 'active' });
  });

  it('key chưa có -> trả fallback (null mặc định)', async () => {
    expect(await offlineCache.getJsonCache('family_info')).toBeNull();
    expect(await offlineCache.getJsonCache('packages', { default: true })).toEqual({ default: true });
  });

  it('ghi đè cùng key -> giữ bản mới nhất', async () => {
    await offlineCache.saveJsonCache('payment_history', { items: [1], total: 1 });
    await offlineCache.saveJsonCache('payment_history', { items: [1, 2], total: 2 });

    const value = await offlineCache.getJsonCache('payment_history');
    expect(value.total).toBe(2);
    expect(value.items).toHaveLength(2);
  });

  it('mỗi key độc lập', async () => {
    await offlineCache.saveJsonCache('current_plan', { name: 'free' });
    await offlineCache.saveJsonCache('family_info', { groupId: 'g1' });

    expect((await offlineCache.getJsonCache('current_plan')).name).toBe('free');
    expect((await offlineCache.getJsonCache('family_info')).groupId).toBe('g1');
  });

  it('clearCache xoá luôn cache JSON', async () => {
    await offlineCache.saveJsonCache('current_plan', { name: 'free' });

    await offlineCache.clearCache();

    expect(await offlineCache.getJsonCache('current_plan')).toBeNull();
  });
});
