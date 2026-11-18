/**
 * SyncEngine — upload op `shopping_missing_add` (thêm nguyên liệu thiếu vào
 * giỏ mua khi offline) + cache "thực đơn ngày".
 */

import { registerService, clearRegistry, getRegisteredService } from '../../api/ServiceRegistry';
import { syncEngine } from '../SyncEngine';
import { outboxQueue, OP_TYPES } from '../OutboxQueue';
import { offlineCache } from '../OfflineCache';
import { queueMutation } from '../OfflineMutationQueue';
import { __resetFakeDb } from './helpers/fakeSqlite';

const resetAll = async () => {
  __resetFakeDb();
  await offlineCache.clearCache();
  await outboxQueue.clear();
  clearRegistry();
  syncEngine._isSyncing = false;
  syncEngine._lastResult = null;
};

const registerPullStubs = () => {
  if (!getRegisteredService('fridgeService')) {
    registerService('fridgeService', {
      getItems: jest.fn().mockResolvedValue([]),
      getFridgeStats: jest.fn().mockResolvedValue(null),
    });
  }
  registerService('recipeService', {
    getShoppingLists: jest.fn().mockResolvedValue([]),
    getNextWeekPlan: jest.fn().mockResolvedValue(null),
    getSuggestions: jest.fn().mockResolvedValue([]),
  });
  registerService('userService', {
    getProfile: jest.fn().mockResolvedValue(null),
    getPreferences: jest.fn().mockResolvedValue(null),
    getAllergies: jest.fn().mockResolvedValue([]),
    searchIngredients: jest.fn().mockResolvedValue([]),
  });
};

describe('SyncEngine — shopping_missing_add', () => {
  beforeEach(resetAll);
  afterEach(clearRegistry);

  // ⚠️ CHUẨN HOÁ THEO BE:
  //   BE KHÔNG có `POST /meal-planning/slots/{slotId}/missing-to-shopping-list`
  //   -> op này KHÔNG được gọi HTTP. Nếu gọi -> 404 -> op bị giữ lại vô hạn
  //   (sync loop) và user thấy món bị kẹt.
  it('op shopping_missing_add -> xử lý ở CLIENT, KHÔNG gọi endpoint không tồn tại', async () => {
    registerPullStubs();

    const addSlotMissingToShoppingList = jest.fn().mockResolvedValue({
      listId: 'L1',
      addedCount: 1,
      addedItems: [],
    });
    registerService('recipeService', { addSlotMissingToShoppingList });

    await offlineCache.saveRecipeDetail('slot-1', 'slot', {
      servings: 2,
      summary: {
        missingItems: [
          {
            ingredientId: 3,
            name: 'Thịt bò',
            quantityNeeded: 500,
            fridgeQuantity: 0,
            missingQuantity: 500,
            baseUnit: 'g',
          },
        ],
      },
    });

    await queueMutation('recipeService', 'addSlotMissingToShoppingList', ['slot-1']);

    // ⚠️ Handler đánh dấu `suppressEnqueue` -> KHÔNG có op trong hàng đợi.
    expect(await outboxQueue.list()).toHaveLength(0);

    // Món vẫn nằm trong cache local (món chỉ có ở máy).
    expect(await offlineCache.getShoppingItems()).toHaveLength(1);
    expect(addSlotMissingToShoppingList).not.toHaveBeenCalled();
  });

  it('op shopping_missing_add CŨ (đã nằm trong hàng đợi) -> KHÔNG gọi HTTP, vẫn resolve', async () => {
    registerPullStubs();

    const addSlotMissingToShoppingList = jest.fn().mockResolvedValue({
      listId: 'L1',
      addedCount: 0,
      addedItems: [],
    });
    registerService('recipeService', { addSlotMissingToShoppingList });

    // Hàng đợi cũ (từ bản trước) vẫn có op này -> không được gọi endpoint 404.
    await outboxQueue.enqueue(OP_TYPES.SHOPPING_MISSING_ADD, { slotId: 'slot-1' }, 'slot-1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });

    expect(result.uploaded).toBe(1);
    expect(addSlotMissingToShoppingList).toHaveBeenCalledWith('slot-1', {
      servings: undefined,
    });
    expect(await outboxQueue.list()).toHaveLength(0);
  });

  it('upload lỗi 5xx -> op được giữ lại (không mất thao tác)', async () => {
    registerPullStubs();

    const err = new Error('Server boom');
    err.statusCode = 500;
    registerService('recipeService', {
      addSlotMissingToShoppingList: jest.fn().mockRejectedValue(err),
    });

    await outboxQueue.enqueue(OP_TYPES.SHOPPING_MISSING_ADD, { slotId: 'slot-1' }, 'slot-1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });

    expect(result.uploaded).toBe(0);
    expect(result.failed).toBe(1);
    expect(await outboxQueue.list()).toHaveLength(1);
  });
});

describe('SyncEngine — cache thực đơn ngày', () => {
  beforeEach(resetAll);
  afterEach(clearRegistry);

  it('pull gọi getSuggestions -> cache thực đơn ngày được ghi', async () => {
    registerPullStubs();

    const getSuggestions = jest.fn().mockResolvedValue([
      { id: 'slot-1', recipeId: 'r1', name: 'Trứng xào', mealType: 'breakfast' },
    ]);
    registerService('recipeService', { getSuggestions });

    await syncEngine.syncAll({ force: true, prefetchRecipes: false });

    expect(getSuggestions).toHaveBeenCalled();
    const meals = await offlineCache.getDailyMeals();
    expect(meals).toHaveLength(1);
    expect(meals[0].name).toBe('Trứng xào');
  });
});
