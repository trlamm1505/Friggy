/**
 * SyncEngine - đồng bộ 3 phase (upload / pull / pre-cache).
 */

import { registerService, clearRegistry } from '../../api/ServiceRegistry';
import { syncEngine } from '../SyncEngine';
import { outboxQueue, OP_TYPES } from '../OutboxQueue';
import { offlineCache } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

/** Tạo lỗi HTTP có statusCode. */
const httpError = (statusCode, message = 'HTTP error') => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

describe('SyncEngine - Phase 1 upload', () => {
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

  it('upload fridge_add thành công -> xoá op khỏi hàng đợi', async () => {
    const addItem = jest.fn().mockResolvedValue({ id: 'srv-1' });
    registerService('fridgeService', { addItem });

    await outboxQueue.enqueue(
      OP_TYPES.FRIDGE_ADD,
      { name: 'Táo', ingredientId: 1, quantity: 2, unit: 'quả' },
      'pending_1'
    );

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });

    expect(result.uploaded).toBe(1);
    expect(result.failed).toBe(0);
    expect(addItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Táo', ingredientId: 1, quantity: 2 })
    );
    expect(await outboxQueue.count()).toBe(0);
  });

  it('lỗi 409 -> giữ op trong hàng đợi, đếm conflict', async () => {
    registerService('fridgeService', {
      updateItem: jest.fn().mockRejectedValue(httpError(409, 'Version conflict')),
    });

    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { quantity: 5, unit: 'kg' }, 'item-1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });

    expect(result.conflicts).toBe(1);
    expect(result.uploaded).toBe(0);
    // Op vẫn còn -> user có thể xử lý.
    expect(await outboxQueue.count()).toBe(1);
  });

  it('lỗi 4xx (khác 409) -> xoá op vĩnh viễn, không retry', async () => {
    registerService('fridgeService', {
      addItem: jest.fn().mockRejectedValue(httpError(422, 'Validation failed')),
    });

    await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, { name: 'X' }, 'p1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });

    expect(result.failed).toBe(1);
    expect(await outboxQueue.count()).toBe(0);
  });

  it('lỗi 5xx -> giữ op để thử lại', async () => {
    registerService('fridgeService', {
      addItem: jest.fn().mockRejectedValue(httpError(500, 'Server error')),
    });

    await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, { name: 'X' }, 'p1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });

    expect(result.failed).toBe(1);
    expect(await outboxQueue.count()).toBe(1);
  });

  it('lỗi network -> giữ op và DỪNG (không spam các op sau)', async () => {
    const updateItem = jest.fn().mockRejectedValue(httpError(null, 'Network Error'));
    registerService('fridgeService', { updateItem });

    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { quantity: 1 }, 'i1');
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { quantity: 2 }, 'i2');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });

    expect(result.failed).toBe(1);
    expect(updateItem).toHaveBeenCalledTimes(1);
    expect(await outboxQueue.count()).toBe(2);
  });

  it('op_type không hỗ trợ -> bỏ qua, không chặn hàng đợi', async () => {
    registerService('fridgeService', {});

    await outboxQueue.enqueue('unknown_op', {}, 'x');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });

    expect(result.uploaded).toBe(1);
    expect(await outboxQueue.count()).toBe(0);
  });
});

describe('SyncEngine - Phase 2 pull', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
    await outboxQueue.clear();
    clearRegistry();
    syncEngine._isSyncing = false;
  });

  afterEach(() => {
    clearRegistry();
  });

  it('pull tủ lạnh -> ghi vào cache local', async () => {
    registerService('fridgeService', {
      getItems: jest.fn().mockResolvedValue([{ id: '1', name: 'Táo', quantity: 2 }]),
      getFridgeStats: jest.fn().mockResolvedValue({ mealsCooked: 3 }),
    });
    registerService('recipeService', {
      getShoppingLists: jest.fn().mockResolvedValue([]),
      getNextWeekPlan: jest.fn().mockResolvedValue(null),
    });
    registerService('userService', {
      getProfile: jest.fn().mockResolvedValue({ name: 'Lâm' }),
      getPreferences: jest.fn().mockResolvedValue({ weeklyBudget: 100 }),
      getAllergies: jest.fn().mockResolvedValue([]),
      searchIngredients: jest.fn().mockResolvedValue([]),
    });

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });

    const items = await offlineCache.getFridgeItems();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Táo');
    expect(result.pulled).toBeGreaterThan(0);
  });

  it('1 nhóm pull lỗi -> các nhóm khác vẫn chạy', async () => {
    registerService('fridgeService', {
      getItems: jest.fn().mockRejectedValue(httpError(500, 'Server error')),
      getFridgeStats: jest.fn().mockResolvedValue({ mealsCooked: 3 }),
    });
    registerService('recipeService', {
      getShoppingLists: jest.fn().mockResolvedValue([]),
      getNextWeekPlan: jest.fn().mockResolvedValue(null),
    });
    registerService('userService', {
      getProfile: jest.fn().mockResolvedValue({ name: 'Lâm' }),
      getPreferences: jest.fn().mockResolvedValue({}),
      getAllergies: jest.fn().mockResolvedValue([]),
      searchIngredients: jest.fn().mockResolvedValue([]),
    });

    await syncEngine.syncAll({ force: true, prefetchRecipes: false });

    // Stats vẫn được pull -> nhóm lỗi không chặn nhóm sau.
    const stats = await offlineCache.getFridgeStats();
    expect(stats.mealsCooked).toBe(3);
  });
});

describe('SyncEngine - chống chạy trùng + trạng thái', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
    await outboxQueue.clear();
    clearRegistry();
    syncEngine._isSyncing = false;
  });

  afterEach(() => {
    clearRegistry();
  });

  it('syncAll khi đang sync (không force) -> bỏ qua', async () => {
    let resolveFn;
    registerService('fridgeService', {
      getItems: jest.fn(
        () =>
          new Promise((resolve) => {
            resolveFn = resolve;
          })
      ),
      getFridgeStats: jest.fn().mockResolvedValue({}),
    });
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

    const first = syncEngine.syncAll({ force: false, prefetchRecipes: false });
    // Chờ 1 tick để `getItems` được gọi (promise đang pending).
    await new Promise((r) => setTimeout(r, 0));
    const second = await syncEngine.syncAll({ force: false, prefetchRecipes: false });

    // Lần 2 bị bỏ qua -> trả kết quả rỗng.
    expect(second.uploaded).toBe(0);

    resolveFn?.([]);
    await first;
  });

  it('subscribe nhận trạng thái + pendingCount', async () => {
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, {}, 'p1');

    const handler = jest.fn();
    const unsubscribe = syncEngine.subscribe(handler);

    expect(handler).toHaveBeenCalled();
    const state = handler.mock.calls[handler.mock.calls.length - 1][0];
    expect(state).toHaveProperty('isSyncing');
    expect(state).toHaveProperty('pendingCount');

    unsubscribe();
  });

  it('clearAll xoá cache + hàng đợi', async () => {
    await offlineCache.saveFridgeItems([{ id: '1', name: 'A' }]);
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, {}, 'p1');

    await syncEngine.clearAll();

    expect(await offlineCache.getFridgeItems()).toHaveLength(0);
    expect(await outboxQueue.count()).toBe(0);
  });
});
