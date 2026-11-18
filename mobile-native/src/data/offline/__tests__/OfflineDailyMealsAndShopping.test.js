/**
 * Fix 3 vấn đề offline user báo:
 *   1. "Thực đơn ngày" (bữa ăn hôm nay) không truy cập được khi offline.
 *   2. "Thêm nguyên liệu còn thiếu vào danh sách cần mua" không hoạt động offline.
 *   3. Số "món chưa mua" ở Home không cập nhật sau khi tick món offline.
 */

import { offlineCache, SYNC_STATUS, toLocalDateStr } from '../OfflineCache';
import { queueMutation } from '../OfflineMutationQueue';
import { OP_TYPES, outboxQueue } from '../OutboxQueue';
import { __resetFakeDb } from './helpers/fakeSqlite';

describe('Fix offline - thực đơn ngày', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
    await outboxQueue.clear();
  });

  it('saveDailyMeals -> getDailyMeals trả về đúng slot của hôm nay', async () => {
    const today = toLocalDateStr();

    await offlineCache.saveDailyMeals(today, [
      {
        id: 'slot-1',
        recipeId: 'r1',
        name: 'Trứng xào cà chua',
        image: 'http://x/1.png',
        mealType: 'breakfast',
        cooked: false,
        servings: 2,
      },
    ]);

    const meals = await offlineCache.getDailyMeals();
    expect(meals).toHaveLength(1);
    expect(meals[0].name).toBe('Trứng xào cà chua');
    expect(meals[0].mealType).toBe('breakfast');
  });

  it('getDailyMeals chưa có cache -> trả null (không phải mảng rỗng)', async () => {
    await expect(offlineCache.getDailyMeals()).resolves.toBeNull();
  });

  it('getDailyMeals của ngày khác -> trả null', async () => {
    await offlineCache.saveDailyMeals('2020-01-01', [{ id: 's', name: 'X' }]);
    await expect(offlineCache.getDailyMeals('2020-01-02')).resolves.toBeNull();
  });

  it('toLocalDateStr dùng giờ địa phương (không lệch UTC)', () => {
    // 23:30 giờ địa phương -> vẫn là hôm nay, không phải hôm qua (UTC).
    const d = new Date(2026, 10, 18, 23, 30, 0);
    expect(toLocalDateStr(d)).toBe('2026-11-18');
  });

  it('getWeeklyPlanSlotsForDate quy đổi dayOfWeek BE (1=T2..7=CN) đúng', async () => {
    // Tạo kế hoạch chỉ có `dayOfWeek` (không có `date`).
    const jsDay = new Date().getDay();
    const beDay = jsDay === 0 ? 7 : jsDay; // 1=T2..7=CN

    await offlineCache.saveWeeklyPlan({
      id: 'plan-1',
      weekStart: '2026-11-16',
      days: [
        {
          dayOfWeek: beDay,
          slots: [{ id: 'slot-today', recipeId: 'r1', name: 'Món hôm nay' }],
        },
        {
          dayOfWeek: beDay === 1 ? 2 : 1,
          slots: [{ id: 'slot-other', recipeId: 'r2', name: 'Món ngày khác' }],
        },
      ],
    });

    const slots = await offlineCache.getWeeklyPlanSlotsForDate();
    expect(slots).toHaveLength(1);
    expect(slots[0].id).toBe('slot-today');
    expect(slots[0].name).toBe('Món hôm nay');
  });
});

describe('Fix offline - thêm nguyên liệu thiếu vào giỏ mua', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
    await outboxQueue.clear();
  });

  it('queue addSlotMissingToShoppingList -> ghi cache pending + đẩy hàng đợi', async () => {
    // Cache chi tiết slot (đã tải về trước đó) -> có `summary.missingItems`.
    await offlineCache.saveRecipeDetail('slot-1', 'slot', {
      id: 'slot-1',
      summary: {
        missingItems: [
          { ingredientId: 3, name: 'Thịt bò', missingQuantity: 2, unit: 'kg' },
          { ingredientId: 4, name: 'Hành', missingQuantity: 1, unit: 'củ' },
        ],
      },
    });

    const handled = await queueMutation('recipeService', 'addSlotMissingToShoppingList', [
      'slot-1',
    ]);

    expect(handled).toBe(true);

    // Cache local hiện 2 món pending (optimistic) -> user thấy ngay.
    const items = await offlineCache.getShoppingItems();
    expect(items).toHaveLength(2);
    expect(items.every((i) => i._syncStatus === SYNC_STATUS.PENDING)).toBe(true);
    expect(items.map((i) => i.name).sort()).toEqual(['Hành', 'Thịt bò']);

    // Hàng đợi có op đúng loại.
    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].op_type).toBe(OP_TYPES.SHOPPING_MISSING_ADD);
    expect(ops[0].payload.slotId).toBe('slot-1');
  });

  it('slot không có cache chi tiết -> vẫn queue (không chết), nhưng không thêm món', async () => {
    const handled = await queueMutation('recipeService', 'addSlotMissingToShoppingList', [
      'slot-khong-co-cache',
    ]);

    expect(handled).toBe(true);

    const items = await offlineCache.getShoppingItems();
    expect(items).toHaveLength(0);

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
  });

  it('removePendingShoppingItemsBySlot xoá đúng các món optimistic của slot', async () => {
    await offlineCache.saveRecipeDetail('slot-1', 'slot', {
      summary: {
        missingItems: [{ ingredientId: 3, name: 'Thịt bò', missingQuantity: 2, unit: 'kg' }],
      },
    });
    await offlineCache.saveRecipeDetail('slot-2', 'slot', {
      summary: {
        missingItems: [{ ingredientId: 9, name: 'Cá', missingQuantity: 1, unit: 'con' }],
      },
    });

    await queueMutation('recipeService', 'addSlotMissingToShoppingList', ['slot-1']);
    await queueMutation('recipeService', 'addSlotMissingToShoppingList', ['slot-2']);

    await offlineCache.removePendingShoppingItemsBySlot('slot-1');

    const items = await offlineCache.getShoppingItems();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Cá');
  });
});

describe('Fix offline - đồng bộ số món chưa mua', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
    await outboxQueue.clear();
  });

  it('saveShoppingItems KHÔNG ghi đè row pending (tick offline còn nguyên)', async () => {
    // Server đã có món id=5, chưa tick.
    await offlineCache.saveShoppingItems([
      { id: '5', name: 'Thịt bò', quantity: 1, unit: 'kg', done: false, listId: 'L1' },
    ]);

    // User tick offline -> row chuyển 'pending' + is_purchased = 1.
    await offlineCache.setShoppingItemPurchased('5', true, 'L1');

    // Bật mạng -> pull dữ liệu server (vẫn chưa tick vì chưa kịp upload).
    await offlineCache.saveShoppingItems([
      { id: '5', name: 'Thịt bò', quantity: 1, unit: 'kg', done: false, listId: 'L1' },
    ]);

    const items = await offlineCache.getShoppingItems();
    expect(items).toHaveLength(1);
    // Trạng thái tick của user phải được giữ -> số "chưa mua" giảm đúng 1.
    expect(items[0].done).toBe(true);
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);
  });

  it('getUnpurchasedShoppingCount đếm đúng số món chưa mua', async () => {
    await offlineCache.saveShoppingItems([
      { id: '1', name: 'A', done: false, listId: 'L1' },
      { id: '2', name: 'B', done: false, listId: 'L1' },
      { id: '3', name: 'C', done: true, listId: 'L1' },
    ]);

    await expect(offlineCache.getUnpurchasedShoppingCount()).resolves.toBe(2);

    await offlineCache.setShoppingItemPurchased('1', true, 'L1');
    await expect(offlineCache.getUnpurchasedShoppingCount()).resolves.toBe(1);
  });

  it('clearShoppingPending giữ row, chỉ đổi trạng thái -> món không biến mất', async () => {
    await offlineCache.saveShoppingItems([
      { id: '9', name: 'Sữa', done: false, listId: 'L1' },
    ]);
    await offlineCache.setShoppingItemPurchased('9', true, 'L1');

    await offlineCache.clearShoppingPending('9');

    const items = await offlineCache.getShoppingItems();
    expect(items).toHaveLength(1);
    expect(items[0].done).toBe(true);
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.SYNCED);
  });
});
