/**
 * OfflineCache - `version` (optimistic locking) + xử lý cache rỗng.
 *
 * ⚠️ BUG ĐÃ GẬP:
 *   1. `local_ingredients` không có cột `version` -> `getFridgeItems()` trả
 *      `version: null` -> PATCH offline không gửi version -> BE trả 400
 *      (`UpdateFridgeItemDto.version` là `@IsInt() @Min(0)` bắt buộc).
 *   2. `saveFridgeItems([])` return sớm -> cache cũ không được xoá -> user
 *      offline vẫn thấy món đã bị xoá trên server.
 */

import { offlineCache, SYNC_STATUS } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

describe('OfflineCache - version optimistic locking', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  it('lưu và đọc lại version của item', async () => {
    await offlineCache.saveFridgeItems([
      { id: 'item-1', name: 'Táo', quantity: 3, version: 7 },
      { id: 'item-2', name: 'Sữa', quantity: 1, version: 0 },
    ]);

    const items = await offlineCache.getFridgeItems();
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));

    expect(byId['item-1'].version).toBe(7);
    expect(byId['item-2'].version).toBe(0);
  });

  it('item không có version -> trả null (không phải undefined)', async () => {
    await offlineCache.saveFridgeItems([{ id: 'item-1', name: 'Táo' }]);

    const items = await offlineCache.getFridgeItems();
    expect(items[0].version).toBeNull();
  });

  it('savePendingFridgeItem giữ version nếu có', async () => {
    await offlineCache.savePendingFridgeItem({
      id: 'pending_1',
      name: 'Táo offline',
      version: 4,
    });

    const items = await offlineCache.getFridgeItems();
    expect(items[0].version).toBe(4);
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);
  });

  it('markFridgeItemSynced đổi sync_status sang synced + cập nhật version', async () => {
    await offlineCache.saveFridgeItems([
      { id: 'item-1', name: 'Táo', quantity: 3, version: 2 },
    ]);
    await offlineCache.markFridgeItemPending('item-1');

    let items = await offlineCache.getFridgeItems();
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);

    await offlineCache.markFridgeItemSynced('item-1', 3);

    items = await offlineCache.getFridgeItems();
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.SYNCED);
    expect(items[0].version).toBe(3);
  });

  it('markFridgeItemSynced không có version -> giữ version cũ', async () => {
    await offlineCache.saveFridgeItems([
      { id: 'item-1', name: 'Táo', quantity: 3, version: 2 },
    ]);

    await offlineCache.markFridgeItemSynced('item-1', null);

    const items = await offlineCache.getFridgeItems();
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.SYNCED);
    expect(items[0].version).toBe(2);
  });

  it('upsertFridgeItem ghi 1 item mà KHÔNG xoá item khác', async () => {
    await offlineCache.saveFridgeItems([
      { id: 'item-1', name: 'Táo', quantity: 3, version: 1 },
      { id: 'item-2', name: 'Sữa', quantity: 1, version: 1 },
    ]);

    await offlineCache.upsertFridgeItem({
      id: 'srv-new',
      name: 'Cà chua',
      quantity: 2,
      version: 1,
    });

    const items = await offlineCache.getFridgeItems();
    expect(items).toHaveLength(3);
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
    expect(byId['srv-new'].name).toBe('Cà chua');
    expect(byId['srv-new']._syncStatus).toBe(SYNC_STATUS.SYNCED);
    expect(byId['item-1'].name).toBe('Táo');
  });
});

describe('OfflineCache - cache rỗng', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  it('saveFridgeItems([]) xoá row synced (server đã xoá hết item)', async () => {
    await offlineCache.saveFridgeItems([
      { id: 'item-1', name: 'Táo' },
      { id: 'item-2', name: 'Sữa' },
    ]);
    expect(await offlineCache.getFridgeItems()).toHaveLength(2);

    await offlineCache.saveFridgeItems([]);

    expect(await offlineCache.getFridgeItems()).toHaveLength(0);
  });

  it('saveFridgeItems([]) vẫn GIỮ row pending (món offline chưa upload)', async () => {
    await offlineCache.saveFridgeItems([{ id: 'item-1', name: 'Táo' }]);
    await offlineCache.savePendingFridgeItem({ id: 'pending_1', name: 'Cà chua offline' });

    await offlineCache.saveFridgeItems([]);

    const items = await offlineCache.getFridgeItems();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('pending_1');
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);
  });

  it('saveFridgeItems(null) -> không ném lỗi', async () => {
    await expect(offlineCache.saveFridgeItems(null)).resolves.toBe(0);
  });
});
