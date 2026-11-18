/**
 * RealFridgeService - write-through cache KHÔNG được cắt cụt khi có filter.
 *
 * ⚠️ BUG ĐÃ GẬP:
 *   `getItems({ compartment: 'freezer' })` gọi BE với `storageLocation=freezer`
 *   -> response chỉ chứa TẬP CON. Nếu ghi response đó vào cache (write-through)
 *   thì `OfflineCache.saveFridgeItems` xoá hết row 'synced' rồi chỉ insert
 *   tập con -> CACHE BỊ CẮT CỤT, mất mọi món không khớp filter.
 */

import { RealFridgeService } from '../RealFridgeService';
import { offlineCache } from '../../../offline/OfflineCache';

jest.mock('../../../api/ApiClient', () => ({
  ApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../../offline/OfflineCache', () => ({
  offlineCache: {
    saveFridgeItems: jest.fn().mockResolvedValue(0),
    saveFridgeStats: jest.fn().mockResolvedValue(0),
    // P2 (offline): `getItems` đọc cache local để GỘP món đang chờ đồng bộ
    // (sync_status = 'pending') vào kết quả từ server.
    getFridgeItems: jest.fn().mockResolvedValue([]),
  },
  SYNC_STATUS: { SYNCED: 'synced', PENDING: 'pending', SHOPPING_TICK: 'shopping_tick', CONFLICT: 'conflict' },
}));

const { ApiClient } = require('../../../api/ApiClient');

const beItem = (over = {}) => ({
  id: 'uuid-1',
  ingredientId: 9,
  ingredientName: 'Cà chua',
  ingredientImagePath: null,
  quantity: 500,
  unit: 'gram',
  purchasedAt: null,
  expiresAt: '2026-10-18T00:00:00.000Z',
  storageLocation: 'fridge',
  addedBy: 'manual',
  consumedAt: null,
  daysUntilExpiry: 5,
  createdAt: '2026-10-20T00:00:00.000Z',
  version: 1,
  ...over,
});

let svc;

beforeEach(() => {
  ApiClient.get.mockReset();
  // `mockClear` (không phải `mockReset`) để GIỮ implementation `mockResolvedValue`.
  offlineCache.saveFridgeItems.mockClear();
  // Reset implementation (một số test dùng `mockImplementation`).
  offlineCache.saveFridgeItems.mockResolvedValue(0);
  offlineCache.getFridgeItems.mockClear();
  offlineCache.getFridgeItems.mockResolvedValue([]);
  svc = new RealFridgeService();
});

describe('RealFridgeService - write-through cache', () => {
  it('getItems() KHÔNG filter -> ghi cache', async () => {
    ApiClient.get.mockResolvedValue([beItem()]);

    await svc.getItems({});

    expect(offlineCache.saveFridgeItems).toHaveBeenCalledTimes(1);
    expect(offlineCache.saveFridgeItems.mock.calls[0][0]).toHaveLength(1);
  });

  it('getItems({ compartment }) -> KHÔNG ghi cache (tránh cắt cụt)', async () => {
    ApiClient.get.mockResolvedValue([beItem({ storageLocation: 'freezer' })]);

    await svc.getItems({ compartment: 'freezer' });

    expect(offlineCache.saveFridgeItems).not.toHaveBeenCalled();
    // Vẫn gửi param server-side đúng chuẩn BE.
    expect(ApiClient.get).toHaveBeenCalledWith('/fridge', {
      params: { storageLocation: 'freezer' },
    });
  });

  it('getItems({ status: "expiring" }) -> KHÔNG ghi cache', async () => {
    ApiClient.get.mockResolvedValue([beItem()]);

    await svc.getItems({ status: 'expiring' });

    expect(offlineCache.saveFridgeItems).not.toHaveBeenCalled();
    expect(ApiClient.get).toHaveBeenCalledWith('/fridge', {
      params: { expiringSoon: true },
    });
  });

  it('filter CLIENT-SIDE (search/sort) -> VẪN ghi cache (data đầy đủ)', async () => {
    ApiClient.get.mockResolvedValue([beItem(), beItem({ id: 'uuid-2', ingredientName: 'Táo' })]);

    await svc.getItems({ search: 'táo', sortBy: 'name' });

    expect(offlineCache.saveFridgeItems).toHaveBeenCalledTimes(1);
  });

  it('getItems() trả về rỗng -> vẫn gọi saveFridgeItems([]) để xoá cache cũ', async () => {
    ApiClient.get.mockResolvedValue([]);

    await svc.getItems({});

    expect(offlineCache.saveFridgeItems).toHaveBeenCalledWith([]);
  });

  it('cache đầy đủ đi qua write-through với version của BE', async () => {
    ApiClient.get.mockResolvedValue([beItem({ version: 5 })]);

    await svc.getItems({});

    expect(offlineCache.saveFridgeItems).toHaveBeenCalledTimes(1);
    expect(offlineCache.saveFridgeItems.mock.calls[0][0][0].version).toBe(5);
  });
});

// ══════════════════════════════════════════════════════════════════
// GỘP MÓN ĐANG CHỜ ĐỒNG BỘ (pending) VÀO KẾT QUẢ ONLINE
//
// ⚠️ BUG ĐÃ GẬP:
//   Đường đọc OFFLINE (`CacheFallback` -> `OfflineCache.getFridgeItems`) trả
//   về TẤT CẢ row kể cả `sync_status='pending'`, còn đường đọc ONLINE trả
//   CHỈ list server -> món vừa thêm offline BIẾN MẤT khi refetch, và hiện
//   lại khi tắt mạng.
// ══════════════════════════════════════════════════════════════════

describe('RealFridgeService - gộp món pending vào list online', () => {
  /** Món trong SQLite đang chờ đồng bộ (id `pending_*`, version null). */
  const pendingItem = (over = {}) => {
    const base = {
      id: 'pending_123',
      name: 'Cà chua',
      image: null,
      quantity: 7,
      unit: 'quả',
      compartment: 'fridge',
      expiryDate: '2026-12-01',
      daysUntilExpiry: 14,
      ingredientId: 9,
      version: null,
      _syncStatus: 'pending',
      ...over,
    };
    // `OfflineCache.getFridgeItems` TỰ TÍNH `status` từ `days_until_expiry`
    // (giống `RealFridgeService._statusFromDays`).
    if (!('status' in over)) {
      base.status =
        base.daysUntilExpiry === null || base.daysUntilExpiry === undefined
          ? null
          : base.daysUntilExpiry < 0
            ? 'expired'
            : base.daysUntilExpiry <= 3
              ? 'expiring'
              : 'fresh';
    }
    return base;
  };

  it('server có 1 món + SQLite có 1 món pending -> trả về 2 món', async () => {
    ApiClient.get.mockResolvedValue([beItem()]);
    offlineCache.getFridgeItems.mockResolvedValue([pendingItem()]);

    const result = await svc.getItems({});

    expect(result).toHaveLength(2);
    // Món pending (chưa lên server) vẫn phải hiện.
    expect(result.some((i) => i.id === 'pending_123')).toBe(true);
  });

  it('món pending KHÔNG bị ghi đè id bằng món server', async () => {
    ApiClient.get.mockResolvedValue([beItem({ id: 'uuid-1' })]);
    offlineCache.getFridgeItems.mockResolvedValue([pendingItem({ id: 'pending_123' })]);

    const result = await svc.getItems({});

    const ids = result.map((i) => i.id);
    expect(ids).toContain('uuid-1');
    expect(ids).toContain('pending_123');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('món pending TRÙNG id với món server -> chỉ 1 món, field user đã đổi thắng', async () => {
    ApiClient.get.mockResolvedValue([beItem({ id: 'uuid-1', quantity: 1, unit: 'gram' })]);
    offlineCache.getFridgeItems.mockResolvedValue([
      pendingItem({ id: 'uuid-1', quantity: 9, unit: 'quả', expiryDate: '2026-12-05' }),
    ]);

    const result = await svc.getItems({});

    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(9);
    expect(result[0].unit).toBe('quả');
    expect(result[0].expiryDate).toBe('2026-12-05');
    // Field danh tính vẫn lấy từ server.
    expect(result[0].version).toBe(1);
  });

  it('đọc pending TRƯỚC khi ghi cache (món pending trùng id không bị mất)', async () => {
    // `saveFridgeItems` INSERT OR REPLACE với sync_status='synced' -> nếu đọc
    // cache SAU khi ghi, món pending trùng id sẽ bị ghi đè -> mất bản local.
    const order = [];
    offlineCache.getFridgeItems.mockImplementation(async () => {
      order.push('read');
      return [pendingItem({ id: 'uuid-1', quantity: 9 })];
    });
    offlineCache.saveFridgeItems.mockImplementation(async () => {
      order.push('write');
      return 1;
    });
    ApiClient.get.mockResolvedValue([beItem({ id: 'uuid-1', quantity: 1 })]);

    const result = await svc.getItems({});

    expect(order[0]).toBe('read');
    expect(result[0].quantity).toBe(9);
  });

  it('món pending KHỎI đi khi đã sync (sync_status = synced) -> không merge', async () => {
    ApiClient.get.mockResolvedValue([beItem()]);
    offlineCache.getFridgeItems.mockResolvedValue([
      pendingItem({ id: 'uuid-1', _syncStatus: 'synced' }),
    ]);

    const result = await svc.getItems({});

    expect(result).toHaveLength(1);
  });

  it('skipCacheWrite = true (SyncEngine tự ghi cache) -> KHÔNG merge', async () => {
    // Nếu merge lúc này, món pending sẽ bị `saveFridgeItems` ghi lại với
    // sync_status='synced' -> MẤT trạng thái chờ đồng bộ.
    ApiClient.get.mockResolvedValue([beItem()]);
    offlineCache.getFridgeItems.mockResolvedValue([pendingItem()]);

    const result = await svc.getItems({}, { skipCacheWrite: true });

    expect(result).toHaveLength(1);
    expect(result.some((i) => i.id === 'pending_123')).toBe(false);
  });

  it('filter server-side (compartment) -> món pending không khớp bị loại', async () => {
    ApiClient.get.mockResolvedValue([beItem({ storageLocation: 'freezer' })]);
    offlineCache.getFridgeItems.mockResolvedValue([
      pendingItem({ id: 'pending_fridge', compartment: 'fridge' }),
      pendingItem({ id: 'pending_freezer', compartment: 'freezer' }),
    ]);

    const result = await svc.getItems({ compartment: 'freezer' });

    expect(result.some((i) => i.id === 'pending_fridge')).toBe(false);
    expect(result.some((i) => i.id === 'pending_freezer')).toBe(true);
  });

  it('filter server-side (status=expiring) -> món pending không sắp hết hạn bị loại', async () => {
    ApiClient.get.mockResolvedValue([beItem({ daysUntilExpiry: 1 })]);
    offlineCache.getFridgeItems.mockResolvedValue([
      pendingItem({ id: 'pending_far', daysUntilExpiry: 30 }),
      pendingItem({ id: 'pending_near', daysUntilExpiry: 2 }),
    ]);

    const result = await svc.getItems({ status: 'expiring' });

    expect(result.some((i) => i.id === 'pending_far')).toBe(false);
    expect(result.some((i) => i.id === 'pending_near')).toBe(true);
  });

  it('lỗi đọc cache -> trả về list server, KHÔNG làm hỏng luồng chính', async () => {
    ApiClient.get.mockResolvedValue([beItem()]);
    offlineCache.getFridgeItems.mockRejectedValue(new Error('SQLite lỗi'));

    const result = await svc.getItems({});

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('uuid-1');
  });
});
