/**
 * SyncEngine - pull tủ lạnh KHÔNG được ghi cache 2 lần.
 *
 * ⚠️ BUG ĐÃ GẬP:
 *   `_pullFridgeItems` gọi `fridge.getItems({})` (đã tự write-through cache)
 *   rồi lại `await offlineCache.saveFridgeItems(items)` -> 2 transaction SQLite
 *   chạy chồng nhau -> "cannot start a transaction within a transaction" ->
 *   cache ghi hỏng hoàn toàn (log "[RealFridgeService] Không ghi được cache").
 *
 * Ngoài ra: sau khi upload `fridge_update` / `fridge_consume` thành công,
 * item PHẢI được đánh dấu 'synced' (+ version mới) chứ không giữ 'pending'.
 */

import { registerService, clearRegistry } from '../../api/ServiceRegistry';
import { syncEngine } from '../SyncEngine';
import { outboxQueue, OP_TYPES } from '../OutboxQueue';
import { offlineCache, SYNC_STATUS } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

describe('SyncEngine - pull tủ lạnh', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
    await outboxQueue.clear();
    clearRegistry();
    syncEngine._isSyncing = false;
    syncEngine._lastResult = null;
  });

  afterEach(() => {
    clearRegistry();
  });

  it('_pullFridgeItems gọi getItems() và ghi cache ĐÚNG 1 LẦN', async () => {
    const getItems = jest.fn().mockResolvedValue([{ id: '1', name: 'Táo' }]);
    const fridge = {
      getItems,
      getFridgeStats: jest.fn().mockResolvedValue({}),
    };
    registerService('fridgeService', fridge);
    registerService('recipeService', {
      getShoppingLists: jest.fn().mockResolvedValue([]),
      getNextWeekPlan: jest.fn().mockResolvedValue(null),
    });
    registerService('userService', {
      getProfile: jest.fn().mockResolvedValue({}),
      getPreferences: jest.fn().mockResolvedValue({}),
      getAllergies: jest.fn().mockResolvedValue([]),
      searchIngredients: jest.fn().mockResolvedValue([]),
    });

    const saveFridgeItems = jest.spyOn(offlineCache, 'saveFridgeItems');

    await syncEngine._pullFridgeItems();

    expect(getItems).toHaveBeenCalledTimes(1);
    // `skipCacheWrite` -> service KHÔNG tự ghi cache, SyncEngine ghi đúng 1 lần.
    expect(getItems).toHaveBeenCalledWith({}, { skipCacheWrite: true });
    expect(saveFridgeItems).toHaveBeenCalledTimes(1);

    // Dữ liệu đã vào cache local.
    const items = await offlineCache.getFridgeItems();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Táo');

    saveFridgeItems.mockRestore();
  });
});

describe('SyncEngine - resolve cache sau upload', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
    await outboxQueue.clear();
    clearRegistry();
    syncEngine._isSyncing = false;
    syncEngine._lastResult = null;
  });

  afterEach(() => {
    clearRegistry();
  });

  it('upload fridge_update -> đánh dấu synced + cập nhật version mới', async () => {
    await offlineCache.saveFridgeItems([
      { id: 'item-1', name: 'Táo', quantity: 1, version: 2 },
    ]);
    await offlineCache.markFridgeItemPending('item-1');

    registerService('fridgeService', {
      // BE increment version -> trả về version mới.
      updateItem: jest.fn().mockResolvedValue({ id: 'item-1', name: 'Táo', quantity: 5, version: 3 }),
    });

    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { quantity: 5, version: 2 }, 'item-1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);

    const items = await offlineCache.getFridgeItems();
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.SYNCED);
    expect(items[0].version).toBe(3);
  });

  it('upload fridge_consume -> đánh dấu synced', async () => {
    await offlineCache.saveFridgeItems([
      { id: 'item-1', name: 'Sữa', quantity: 2, version: 1 },
    ]);
    await offlineCache.markFridgeItemPending('item-1');

    registerService('fridgeService', {
      markConsumed: jest.fn().mockResolvedValue({ id: 'item-1', name: 'Sữa', quantity: 0, version: 2 }),
    });

    await outboxQueue.enqueue(OP_TYPES.FRIDGE_CONSUME, { id: 'item-1' }, 'item-1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);

    const items = await offlineCache.getFridgeItems();
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.SYNCED);
    expect(items[0].version).toBe(2);
  });

  it('upload fridge_add -> thay row pending bằng item server (có id thật)', async () => {
    await offlineCache.savePendingFridgeItem({
      id: 'pending_1',
      name: 'Táo đỏ',
      quantity: 3,
    });

    registerService('fridgeService', {
      addItem: jest.fn().mockResolvedValue({
        id: 'srv-1',
        name: 'Táo đỏ',
        quantity: 3,
        version: 1,
      }),
    });

    await outboxQueue.enqueue(
      OP_TYPES.FRIDGE_ADD,
      { name: 'Táo đỏ', ingredientId: 7, quantity: 3, unit: 'quả' },
      'pending_1'
    );

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);

    const items = await offlineCache.getFridgeItems();
    // Row pending đã bị xoá, item server đã thay thế.
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('srv-1');
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.SYNCED);
    expect(items[0].version).toBe(1);
  });
});
