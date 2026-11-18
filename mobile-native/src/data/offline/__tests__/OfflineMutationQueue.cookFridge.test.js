/**
 * OfflineMutationQueue - tick "đã nấu" OFFLINE phải TRỪ TỦ LẠNH.
 *
 * ⚠️ YÊU CẦU CỦA USER:
 *   "Nếu đánh dấu 'đã nấu' các món đó ở offline thì sẽ tự động nhật (giảm)
 *   số lượng món ăn trong tủ lạnh".
 *
 * ⚠️ FLOW ĐƯỢC KIỂM TRA:
 *   1. `queueMutation('recipeService', 'updateSlot', [slotId, { completed: true }])`
 *      -> gọi `applyCache` (trừ tủ lạnh cục bộ) + đẩy op `slot_complete`.
 *   2. Tủ lạnh cập nhật NGAY (không cần mạng).
 *   3. Op vào hàng đợi để upload sau.
 */

import { queueMutation } from '../OfflineMutationQueue';
import { OP_TYPES } from '../OutboxQueue';
import { offlineCache, SYNC_STATUS } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

/** Chi tiết slot mẫu: cần 200g thịt + 2 quả trứng. */
const slotDetail = {
  id: 'slot-1',
  mealType: 'lunch',
  servings: 2,
  completedAt: null,
  cooked: false,
  recipe: {
    id: 'recipe-1',
    name: 'Trứng bác cà chua',
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
      {
        ingredientId: 20,
        name: 'Trứng',
        quantityNeeded: 2,
        baseUnit: 'quả',
        originalQuantity: 2,
        originalUnit: 'quả',
        isOptional: false,
      },
    ],
    steps: [],
  },
  summary: {},
};

describe('OfflineMutationQueue - tick "đã nấu" trừ tủ lạnh', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
    const { outboxQueue } = require('../OutboxQueue');
    await outboxQueue.clear();
  });

  it('trừ nguyên liệu khỏi tủ lạnh khi tick "đã nấu" offline', async () => {
    await offlineCache.saveFridgeItems([
      { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 500, unit: 'g' },
      { id: 'f-2', ingredientId: 20, name: 'Trứng', quantity: 5, unit: 'quả' },
    ]);
    await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail);

    const handled = await queueMutation('recipeService', 'updateSlot', [
      'slot-1',
      { completed: true },
    ]);

    expect(handled).toBe(true);

    // Tủ lạnh cập nhật NGAY, không cần mạng.
    const items = await offlineCache.getFridgeItems();
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
    expect(byId['f-1'].quantity).toBe(300); // 500g - 200g
    expect(byId['f-2'].quantity).toBe(3); // 5 quả - 2 quả

    // Slot đánh dấu đã nấu trong cache.
    const detail = await offlineCache.getRecipeDetail('slot-1', 'slot');
    expect(detail.cooked).toBe(true);

    // Op được đẩy vào hàng đợi để upload khi có mạng.
    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].op_type).toBe(OP_TYPES.SLOT_COMPLETE);
    expect(ops[0].entity_id).toBe('slot-1');
    expect(ops[0].payload.completed).toBe(true);
  });

  it('untick ("chưa nấu") -> KHÔNG trừ tủ lạnh', async () => {
    await offlineCache.saveFridgeItems([
      { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 500, unit: 'g' },
    ]);
    await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail);

    await queueMutation('recipeService', 'updateSlot', ['slot-1', { completed: false }]);

    const items = await offlineCache.getFridgeItems();
    expect(items[0].quantity).toBe(500);
  });

  it('row đã trừ được đánh dấu pending (không bị pull server ghi đè)', async () => {
    await offlineCache.saveFridgeItems([
      { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 500, unit: 'g' },
    ]);
    await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail);

    await queueMutation('recipeService', 'updateSlot', ['slot-1', { completed: true }]);

    const items = await offlineCache.getFridgeItems();
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);
  });

  it('không có chi tiết slot trong cache -> không trừ, vẫn queue op', async () => {
    await offlineCache.saveFridgeItems([
      { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 500, unit: 'g' },
    ]);

    const handled = await queueMutation('recipeService', 'updateSlot', [
      'slot-khong-cache',
      { completed: true },
    ]);

    expect(handled).toBe(true);
    const items = await offlineCache.getFridgeItems();
    expect(items[0].quantity).toBe(500);

    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
  });

  it('món hết trong tủ -> bị xoá khỏi tủ (giống BE consumedAt)', async () => {
    await offlineCache.saveFridgeItems([
      { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 100, unit: 'g' },
    ]);
    await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail);

    await queueMutation('recipeService', 'updateSlot', ['slot-1', { completed: true }]);

    const items = await offlineCache.getFridgeItems();
    expect(items.find((i) => i.id === 'f-1')).toBeUndefined();
  });
});
