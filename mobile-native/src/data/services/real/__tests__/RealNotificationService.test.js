/**
 * RealNotificationService - test mapper BE -> shape INotificationService + endpoint.
 *
 * Sprint B5. Theo R1: mỗi Real*Service PHẢI có test chứng minh mapper cho ra
 * đúng shape và gọi đúng endpoint.
 *
 * Trọng tâm là SỰ LỆCH SHAPE giữa BE và UI:
 *   BE `body`     -> UI `message`
 *   BE `isRead`   -> UI `read`
 *   BE `createdAt`-> UI `time`
 *   BE `type` (enum 5 giá trị) -> UI `type` (enum 3 giá trị có icon)
 *
 * KHÔNG test component render / navigation / style.
 */

jest.mock('../../../api/ApiClient', () => ({
  ApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// eslint-disable-next-line import/first
import { ApiClient } from '../../../api/ApiClient';
// eslint-disable-next-line import/first
import { RealNotificationService, toNotification, TYPE_MAP } from '../RealNotificationService';

/** `NotificationResponseDto` chuẩn của BE (`be/.../notifications-response.dto.ts`). */
const beNotification = (overrides = {}) => ({
  id: 'n-1',
  type: 'expiry_warning',
  title: 'Thịt heo sắp hết hạn',
  body: 'Còn 2 ngày nữa hết hạn',
  isRead: false,
  readAt: null,
  metadata: { ingredientId: 12 },
  createdAt: '2026-11-04T08:30:00.000Z',
  ...overrides,
});

let svc;

beforeEach(() => {
  jest.clearAllMocks();
  svc = new RealNotificationService();
});

// ══════════════════════════════════════════════════════════════════
// 1. MAPPER — tên field BE -> UI
// ══════════════════════════════════════════════════════════════════

describe('toNotification - mapper BE -> UI', () => {
  it('body -> message, isRead -> read, createdAt -> time', () => {
    const n = toNotification(beNotification());

    expect(n.message).toBe('Còn 2 ngày nữa hết hạn');
    expect(n.read).toBe(false);
    expect(n.time).toBe('2026-11-04T08:30:00.000Z');
    expect(n.title).toBe('Thịt heo sắp hết hạn');
    expect(n.id).toBe('n-1');
  });

  it('isRead = true -> read = true (không phải undefined)', () => {
    expect(toNotification(beNotification({ isRead: true })).read).toBe(true);
  });

  it('dto null -> trả null', () => {
    expect(toNotification(null)).toBeNull();
  });

  it('thiếu body/title -> trả chuỗi rỗng, KHÔNG undefined', () => {
    const n = toNotification({ id: 'x' });

    expect(n.message).toBe('');
    expect(n.title).toBe('');
    expect(n.read).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. ENUM `type` — BE có 5 loại, UI chỉ có 3 (có icon)
// ══════════════════════════════════════════════════════════════════

describe('TYPE_MAP - enum type BE -> enum type UI', () => {
  it('expiry_warning -> expiring (UI có icon cảnh báo)', () => {
    expect(toNotification(beNotification({ type: 'expiry_warning' })).type).toBe('expiring');
  });

  it('plan_ready -> recipe (UI có icon đầu bếp)', () => {
    expect(toNotification(beNotification({ type: 'plan_ready' })).type).toBe('recipe');
  });

  it('system -> system', () => {
    expect(toNotification(beNotification({ type: 'system' })).type).toBe('system');
  });

  it('budget_alert / promo -> system (fallback an toàn)', () => {
    expect(toNotification(beNotification({ type: 'budget_alert' })).type).toBe('system');
    expect(toNotification(beNotification({ type: 'promo' })).type).toBe('system');
  });

  it('type LẠ (BE thêm loại mới) -> system, KHÔNG undefined', () => {
    // UI `ICON_MAP` chỉ có expiring/recipe/system; type lạ rơi về Bell mặc định.
    // Nhưng `type` undefined -> `counts.expiring` đếm sai -> số liệu UI lệch.
    const n = toNotification(beNotification({ type: 'flash_sale_2026' }));

    expect(n.type).toBe('system');
    expect(TYPE_MAP.flash_sale_2026).toBeUndefined();
  });

  it('giữ type gốc của BE trong rawType (không mất thông tin)', () => {
    const n = toNotification(beNotification({ type: 'budget_alert' }));

    expect(n.rawType).toBe('budget_alert');
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. ENDPOINT — đúng URL + đúng shape response
// ══════════════════════════════════════════════════════════════════

describe('getNotifications - GET /notifications (phân trang)', () => {
  it('BE trả envelope phân trang -> đọc payload.data', () => {
    ApiClient.get.mockResolvedValue({
      data: [beNotification()],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      unreadCount: 1,
    });

    return svc.getNotifications().then((list) => {
      expect(list).toHaveLength(1);
      expect(list[0].title).toBe('Thịt heo sắp hết hạn');
      expect(ApiClient.get).toHaveBeenCalledWith('/notifications', {
        params: { page: 1, limit: 20 },
      });
    });
  });

  it('BE trả mảng thẳng -> vẫn xử lý được', () => {
    ApiClient.get.mockResolvedValue([beNotification()]);

    return svc.getNotifications().then((list) => {
      expect(list).toHaveLength(1);
    });
  });

  it('payload.data rỗng -> trả mảng rỗng (KHÔNG crash)', () => {
    ApiClient.get.mockResolvedValue({ data: [], total: 0 });

    return svc.getNotifications().then((list) => {
      expect(list).toEqual([]);
    });
  });

  it('unreadOnly -> gửi isRead=false (BE dùng isRead, không phải unreadOnly)', () => {
    ApiClient.get.mockResolvedValue({ data: [] });

    return svc.getNotifications({ unreadOnly: true }).then(() => {
      expect(ApiClient.get).toHaveBeenCalledWith('/notifications', {
        params: { page: 1, limit: 20, isRead: false },
      });
    });
  });

  it('KHÔNG unreadOnly -> KHÔNG gửi isRead (lấy tất cả)', () => {
    ApiClient.get.mockResolvedValue({ data: [] });

    return svc.getNotifications().then(() => {
      const params = ApiClient.get.mock.calls[0][1].params;
      expect(params.isRead).toBeUndefined();
    });
  });

  it('filter theo type -> lọc CLIENT-SIDE (BE không có param type)', () => {
    ApiClient.get.mockResolvedValue({
      data: [
        beNotification({ id: 'n-1', type: 'expiry_warning' }),
        beNotification({ id: 'n-2', type: 'system' }),
      ],
    });

    return svc.getNotifications({ type: 'expiring' }).then((list) => {
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('n-1');
      // BE không có param type -> KHÔNG gửi lên.
      const params = ApiClient.get.mock.calls[0][1].params;
      expect(params.type).toBeUndefined();
    });
  });

  it('filter type = "all" -> trả về tất cả', () => {
    ApiClient.get.mockResolvedValue({
      data: [
        beNotification({ id: 'n-1', type: 'expiry_warning' }),
        beNotification({ id: 'n-2', type: 'system' }),
      ],
    });

    return svc.getNotifications({ type: 'all' }).then((list) => {
      expect(list).toHaveLength(2);
    });
  });
});

describe('markAsRead - PATCH /notifications/:id/read', () => {
  it('gọi đúng endpoint + map kết quả', () => {
    ApiClient.patch.mockResolvedValue(beNotification({ isRead: true }));

    return svc.markAsRead('n-1').then((n) => {
      expect(ApiClient.patch).toHaveBeenCalledWith('/notifications/n-1/read');
      expect(n.read).toBe(true);
    });
  });

  it('id rỗng -> KHÔNG gọi API', () => {
    return svc.markAsRead('').then((n) => {
      expect(ApiClient.patch).not.toHaveBeenCalled();
      expect(n).toBeNull();
    });
  });
});

describe('markAllAsRead - PATCH /notifications/read-all', () => {
  it('gọi đúng endpoint + trả số đã cập nhật', () => {
    ApiClient.patch.mockResolvedValue({ updated: 5 });

    return svc.markAllAsRead().then((n) => {
      expect(ApiClient.patch).toHaveBeenCalledWith('/notifications/read-all');
      expect(n).toBe(5);
    });
  });

  it('response không có `updated` -> trả 0 (không undefined)', () => {
    ApiClient.patch.mockResolvedValue({});

    return svc.markAllAsRead().then((n) => {
      expect(n).toBe(0);
    });
  });
});

describe('deleteNotification - DELETE /notifications/:id', () => {
  it('gọi đúng endpoint', () => {
    ApiClient.delete.mockResolvedValue(undefined);

    return svc.deleteNotification('n-1').then(() => {
      expect(ApiClient.delete).toHaveBeenCalledWith('/notifications/n-1');
    });
  });

  it('id rỗng -> KHÔNG gọi API', () => {
    return svc.deleteNotification('').then(() => {
      expect(ApiClient.delete).not.toHaveBeenCalled();
    });
  });
});

describe('getUnreadCount - GET /notifications/unread-count', () => {
  it('BE trả { count } -> trả về số', () => {
    ApiClient.get.mockResolvedValue({ count: 3 });

    return svc.getUnreadCount().then((n) => {
      expect(ApiClient.get).toHaveBeenCalledWith('/notifications/unread-count');
      expect(n).toBe(3);
    });
  });

  it('response rỗng -> trả 0', () => {
    ApiClient.get.mockResolvedValue(null);

    return svc.getUnreadCount().then((n) => {
      expect(n).toBe(0);
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// 4. FCM TOKEN
// ══════════════════════════════════════════════════════════════════

describe('FCM token', () => {
  it('registerFcmToken gửi token + platform', () => {
    ApiClient.post.mockResolvedValue({ id: 'fcm-1' });

    return svc.registerFcmToken('tok-abc', 'android').then(() => {
      expect(ApiClient.post).toHaveBeenCalledWith('/notifications/fcm-token', {
        token: 'tok-abc',
        platform: 'android',
      });
    });
  });

  it('registerFcmToken token rỗng -> ném lỗi, KHÔNG gọi API', () => {
    return svc.registerFcmToken('').then(
      () => {
        throw new Error('phải ném lỗi');
      },
      (e) => {
        expect(ApiClient.post).not.toHaveBeenCalled();
        expect(e.message).toMatch(/token/i);
      }
    );
  });

  it('removeFcmToken gọi DELETE', () => {
    ApiClient.delete.mockResolvedValue({});

    return svc.removeFcmToken().then(() => {
      expect(ApiClient.delete).toHaveBeenCalledWith('/notifications/fcm-token');
    });
  });
});
