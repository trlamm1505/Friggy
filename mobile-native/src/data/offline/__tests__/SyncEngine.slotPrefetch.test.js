/**
 * SyncEngine — cache chi tiết công thức/slot của thực đơn ngày & tuần.
 *
 * ⚠️ YÊU CẦU CỦA USER:
 *   "Tôi muốn cache thêm thông tin chi tiết hay công thức của các món ăn /
 *   plan ngày hay tuần".
 *
 * ⚠️ ĐƯỢC KIỂM TRA:
 *   1. `_prefetchRecipes()` tải `GET /meal-planning/slots/{id}` cho MỌI slot
 *      của plan tuần + thực đơn ngày -> lưu vào `local_recipe_details`.
 *   2. Lưu danh sách chi tiết theo NGÀY (`daily_meal_details:<date>`).
 *   3. Cache chi tiết CÔNG THỨC theo `recipeId` (màn chi tiết công thức
 *      fetch theo `recipeId`, không phải slot id).
 */

import { registerService, clearRegistry } from '../../api/ServiceRegistry';
import { syncEngine } from '../SyncEngine';
import { offlineCache } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

/** Chi tiết slot mẫu (giống shape UI `MealSlotDetail`). */
const makeSlotDetail = (slotId, recipeId) => ({
  id: slotId,
  mealType: 'lunch',
  servings: 2,
  completedAt: null,
  cooked: false,
  recipe: {
    id: recipeId,
    name: `Món ${recipeId}`,
    servings: 2,
    ingredients: [
      {
        ingredientId: 10,
        name: 'Thịt bò',
        quantityNeeded: 200,
        baseUnit: 'g',
        originalQuantity: 200,
        originalUnit: 'g',
        isOptional: false,
      },
    ],
    steps: ['Rửa sạch', 'Nấu'],
  },
  summary: { totalIngredients: 1, haveCount: 0, partialCount: 0, missingCount: 1, fridgeReadyPercent: 0, missingItems: [] },
});

const resetAll = async () => {
  __resetFakeDb();
  await offlineCache.clearCache();
  clearRegistry();
  syncEngine._isSyncing = false;
  syncEngine._lastResult = null;
};

describe('SyncEngine — cache chi tiết công thức thực đơn ngày / tuần', () => {
  beforeEach(resetAll);
  afterEach(clearRegistry);

  it('cache chi tiết slot của plan tuần + thực đơn ngày', async () => {
    const getSlotDetail = jest
      .fn()
      .mockImplementation(async (slotId) => makeSlotDetail(slotId, `recipe-${slotId}`));

    registerService('recipeService', {
      getNextWeekPlan: jest.fn().mockResolvedValue({
        id: 'plan-1',
        weekStart: '2026-11-16',
        days: [
          { dayOfWeek: 1, date: '2026-11-16', slots: [{ id: 'slot-a', recipeId: 'r-a' }] },
          { dayOfWeek: 2, date: '2026-11-17', slots: [{ id: 'slot-b', recipeId: 'r-b' }] },
        ],
      }),
      getSuggestions: jest.fn().mockResolvedValue([{ id: 'slot-today', recipeId: 'r-today' }]),
      getSlotDetail,
      getRecipeById: jest.fn().mockResolvedValue({ id: 'r-a', name: 'Món', ingredients: [], steps: [] }),
    });

    await syncEngine._prefetchRecipes();

    // Đã gọi API cho cả slot tuần lẫn slot hôm nay.
    const calledIds = getSlotDetail.mock.calls.map((c) => c[0]);
    expect(calledIds).toEqual(expect.arrayContaining(['slot-a', 'slot-b', 'slot-today']));

    // Chi tiết slot được lưu vào cache.
    const detailA = await offlineCache.getRecipeDetail('slot-a', 'slot');
    expect(detailA).not.toBeNull();
    expect(detailA.recipe.ingredients).toHaveLength(1);

    // Danh sách chi tiết theo ngày được lưu.
    const ids = await offlineCache.getDailyMealDetailIds();
    expect(ids.length).toBeGreaterThan(0);
  });

  it('cache chi tiết công thức theo recipeId (mở được màn chi tiết offline)', async () => {
    const getRecipeById = jest.fn().mockResolvedValue({
      id: 'r-a',
      name: 'Cơm gà',
      ingredients: [{ id: 10, name: 'Thịt bò', amount: 200, unit: 'g' }],
      steps: ['Nấu'],
    });

    registerService('recipeService', {
      getNextWeekPlan: jest.fn().mockResolvedValue({
        id: 'plan-1',
        weekStart: '2026-11-16',
        days: [{ dayOfWeek: 1, date: '2026-11-16', slots: [{ id: 'slot-a', recipeId: 'r-a' }] }],
      }),
      getSuggestions: jest.fn().mockResolvedValue([]),
      getSlotDetail: jest.fn().mockImplementation(async (id) => makeSlotDetail(id, 'r-a')),
      getRecipeById,
    });

    await syncEngine._prefetchRecipes();

    expect(getRecipeById).toHaveBeenCalledWith('r-a');
  });

  it('1 slot lỗi -> không chặn các slot còn lại', async () => {
    const getSlotDetail = jest.fn().mockImplementation(async (slotId) => {
      if (slotId === 'slot-bad') throw new Error('Mạng lỗi');
      return makeSlotDetail(slotId, `recipe-${slotId}`);
    });

    registerService('recipeService', {
      getNextWeekPlan: jest.fn().mockResolvedValue({
        id: 'plan-1',
        weekStart: '2026-11-16',
        days: [
          { dayOfWeek: 1, date: '2026-11-16', slots: [{ id: 'slot-bad' }] },
          { dayOfWeek: 2, date: '2026-11-17', slots: [{ id: 'slot-ok' }] },
        ],
      }),
      getSuggestions: jest.fn().mockResolvedValue([]),
      getSlotDetail,
      getRecipeById: jest.fn().mockResolvedValue(null),
    });

    await syncEngine._prefetchRecipes();

    const detailOk = await offlineCache.getRecipeDetail('slot-ok', 'slot');
    expect(detailOk).not.toBeNull();
    const detailBad = await offlineCache.getRecipeDetail('slot-bad', 'slot');
    expect(detailBad).toBeNull();
  });

  it('không có plan -> không lỗi', async () => {
    registerService('recipeService', {
      getNextWeekPlan: jest.fn().mockResolvedValue(null),
      getSuggestions: jest.fn().mockResolvedValue([]),
      getSlotDetail: jest.fn(),
      getRecipeById: jest.fn(),
    });

    await expect(syncEngine._prefetchRecipes()).resolves.toBeUndefined();
  });
});
