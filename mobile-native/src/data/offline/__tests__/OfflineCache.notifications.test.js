/**
 * OfflineCache - cache thông báo.
 *
 * ⚠️ MỤC ĐÍCH:
 *   Chốt lại SHAPE của thông báo đọc từ cache offline.
 *
 *   Bug đã gặp: `getNotifications()` chỉ trả `isRead`, trong khi UI
 *   (`NotificationItem`) đọc `item.read` -> MỌI thông báo offline hiển thị
 *   là CHƯA ĐỌC (chấm xanh + viền highlight) dù user đã đọc.
 *
 *   Hàm nay trả CẢ `read` (shape UI) lẫn `isRead` (shape service).
 */

import { offlineCache } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

describe('OfflineCache - thông báo', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  it('lưu và đọc lại danh sách thông báo', async () => {
    await offlineCache.saveNotifications([
      {
        id: 'n1',
        type: 'expiring',
        title: 'Sữa sắp hết hạn',
        message: 'Còn 2 ngày',
        time: '2026-11-19T08:00:00.000Z',
        read: false,
      },
      {
        id: 'n2',
        type: 'system',
        title: 'Thực đơn đã sẵn sàng',
        message: 'Tuần này có 5 món',
        time: '2026-11-18T08:00:00.000Z',
        read: true,
      },
    ]);

    const list = await offlineCache.getNotifications();
    expect(list).toHaveLength(2);
    // ⚠️ KHÔNG assert thứ tự: fake SQLite của test KHÔNG implement `ORDER BY`
    //   -> thứ tự trả về là thứ tự insert. Sắp xếp thật do DB lo (BE cũng vậy).
    expect(list.map((n) => n.id).sort()).toEqual(['n1', 'n2']);
  });

  it('trả CẢ `read` (shape UI) lẫn `isRead` (shape service)', async () => {
    await offlineCache.saveNotifications([
      { id: 'n1', type: 'expiring', title: 'A', message: 'B', time: '2026-11-19T08:00:00.000Z', read: false },
      { id: 'n2', type: 'system', title: 'C', message: 'D', time: '2026-11-18T08:00:00.000Z', read: true },
    ]);

    const list = await offlineCache.getNotifications();
    const byId = Object.fromEntries(list.map((n) => [n.id, n]));

    // UI đọc `read` -> phải đúng, nếu không mọi thông báo hiện chưa đọc.
    expect(byId.n1.read).toBe(false);
    expect(byId.n2.read).toBe(true);

    // Service đọc `isRead` -> cũng phải có.
    expect(byId.n1.isRead).toBe(false);
    expect(byId.n2.isRead).toBe(true);
  });

  it('lọc unreadOnly dựa trên cờ read', async () => {
    await offlineCache.saveNotifications([
      { id: 'n1', type: 'expiring', title: 'A', message: 'B', time: '2026-11-19T08:00:00.000Z', read: false },
      { id: 'n2', type: 'system', title: 'C', message: 'D', time: '2026-11-18T08:00:00.000Z', read: true },
    ]);

    const unread = await offlineCache.getNotifications({ unreadOnly: true });
    expect(unread).toHaveLength(1);
    expect(unread[0].id).toBe('n1');
  });

  it('đếm số chưa đọc khớp với danh sách', async () => {
    await offlineCache.saveNotifications([
      { id: 'n1', type: 'expiring', title: 'A', message: 'B', time: '2026-11-19T08:00:00.000Z', read: false },
      { id: 'n2', type: 'system', title: 'C', message: 'D', time: '2026-11-18T08:00:00.000Z', read: false },
      { id: 'n3', type: 'system', title: 'E', message: 'F', time: '2026-11-17T08:00:00.000Z', read: true },
    ]);

    const count = await offlineCache.getUnreadNotificationCount();
    expect(count).toBe(2);
  });

  it('đánh dấu đã đọc 1 thông báo -> `read` cập nhật', async () => {
    await offlineCache.saveNotifications([
      { id: 'n1', type: 'expiring', title: 'A', message: 'B', time: '2026-11-19T08:00:00.000Z', read: false },
    ]);

    await offlineCache.setNotificationRead('n1', true);

    const list = await offlineCache.getNotifications();
    expect(list[0].read).toBe(true);
    expect(list[0].isRead).toBe(true);
  });

  it('đánh dấu tất cả đã đọc -> `read` cập nhật', async () => {
    await offlineCache.saveNotifications([
      { id: 'n1', type: 'expiring', title: 'A', message: 'B', time: '2026-11-19T08:00:00.000Z', read: false },
      { id: 'n2', type: 'system', title: 'C', message: 'D', time: '2026-11-18T08:00:00.000Z', read: false },
    ]);

    await offlineCache.markAllNotificationsRead();

    const list = await offlineCache.getNotifications();
    expect(list.every((n) => n.read === true)).toBe(true);
    expect(await offlineCache.getUnreadNotificationCount()).toBe(0);
  });

  it('xoá 1 thông báo khỏi cache', async () => {
    await offlineCache.saveNotifications([
      { id: 'n1', type: 'expiring', title: 'A', message: 'B', time: '2026-11-19T08:00:00.000Z', read: false },
      { id: 'n2', type: 'system', title: 'C', message: 'D', time: '2026-11-18T08:00:00.000Z', read: false },
    ]);

    await offlineCache.removeNotification('n1');

    const list = await offlineCache.getNotifications();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('n2');
  });
});
