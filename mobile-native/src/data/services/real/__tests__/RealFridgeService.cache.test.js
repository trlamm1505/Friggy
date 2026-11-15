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
