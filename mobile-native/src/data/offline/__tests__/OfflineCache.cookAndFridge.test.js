/**
 * OfflineCache - trừ tủ lạnh khi tick "đã nấu" OFFLINE + cache chi tiết slot.
 *
 * ⚠️ YÊU CẦU CỦA USER:
 *   1. Cache thêm thông tin CHI TIẾT / CÔNG THỨC của các món ăn trong
 *      thực đơn ngày và thực đơn tuần (để offline vẫn mở được món).
 *   2. Khi đánh dấu "đã nấu" OFFLINE -> TỰ ĐỘNG trừ số lượng món ăn
 *      trong tủ lạnh (vì BE không chạy -> không ai trừ hộ).
 *
 * ⚠️ LOGIC PHẢI GIỐNG BE (`consumeIngredientsForSlot`):
 *   - Quy đổi về base unit (g / ml) trước khi so sánh.
 *   - Trừ FIFO theo hạn dùng (món sắp hết hạn trừ trước).
 *   - Món hết -> xoá hẳn row khỏi tủ.
 */

import { offlineCache, SYNC_STATUS } from '../OfflineCache';
import { normalizeToBaseUnit, canCompare, fromBaseUnit } from '../unitNormalize';
import { __resetFakeDb } from './helpers/fakeSqlite';

/** Chi tiết slot mẫu: 200g thịt + 2 quả trứng. */
const slotDetail = (overrides = {}) => ({
  id: 'slot-1',
  mealType: 'lunch',
  servings: 2,
  completedAt: null,
  cooked: false,
  recipe: {
    id: 'recipe-1',
    name: 'Trứng bác cà chua',
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
  ...overrides,
});

describe('OfflineCache - trừ tủ lạnh khi nấu offline', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  // ══════════════════════════════════════════════════════════════
  // unitNormalize
  // ══════════════════════════════════════════════════════════════

  describe('unitNormalize (port từ BE)', () => {
    it('quy đổi khối lượng về gram', () => {
      expect(normalizeToBaseUnit(1, 'kg')).toEqual({ quantity: 1000, baseUnit: 'g' });
      expect(normalizeToBaseUnit(500, 'g')).toEqual({ quantity: 500, baseUnit: 'g' });
    });

    it('quy đổi thể tích về ml', () => {
      expect(normalizeToBaseUnit(1, 'l')).toEqual({ quantity: 1000, baseUnit: 'ml' });
      expect(normalizeToBaseUnit(15, 'ml')).toEqual({ quantity: 15, baseUnit: 'ml' });
    });

    it('đơn vị đếm giữ nguyên (có alias)', () => {
      expect(normalizeToBaseUnit(2, 'trái')).toEqual({ quantity: 2, baseUnit: 'quả' });
      expect(normalizeToBaseUnit(3, 'quả')).toEqual({ quantity: 3, baseUnit: 'quả' });
    });

    it('canCompare chỉ true khi baseUnit giống nhau', () => {
      expect(canCompare('g', 'g')).toBe(true);
      expect(canCompare('g', 'ml')).toBe(false);
      expect(canCompare('g', '')).toBe(false);
    });

    it('fromBaseUnit quy ngược về unit gốc', () => {
      expect(fromBaseUnit(700, 'kg')).toBeCloseTo(0.7, 5);
      expect(fromBaseUnit(700, 'g')).toBeCloseTo(700, 5);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // consumeIngredientsForSlot
  // ══════════════════════════════════════════════════════════════

  describe('consumeIngredientsForSlot', () => {
    it('trừ đúng lượng khi tủ có đủ', async () => {
      await offlineCache.saveFridgeItems([
        { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 500, unit: 'g' },
        { id: 'f-2', ingredientId: 20, name: 'Trứng', quantity: 5, unit: 'quả' },
      ]);
      await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail());

      const result = await offlineCache.consumeIngredientsForSlot('slot-1');

      expect(result.consumed).toHaveLength(2);
      expect(result.missing).toHaveLength(0);

      const items = await offlineCache.getFridgeItems();
      const byId = Object.fromEntries(items.map((i) => [i.id, i]));
      // 500g - 200g = 300g
      expect(byId['f-1'].quantity).toBe(300);
      // 5 quả - 2 quả = 3 quả
      expect(byId['f-2'].quantity).toBe(3);
    });

    it('xoá hẳn món khi tủ chỉ đủ vừa (hết sạch)', async () => {
      await offlineCache.saveFridgeItems([
        { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 200, unit: 'g' },
      ]);
      await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail());

      const result = await offlineCache.consumeIngredientsForSlot('slot-1');

      expect(result.consumed).toHaveLength(1);
      const items = await offlineCache.getFridgeItems();
      // Món thịt hết -> không còn trong tủ.
      expect(items.find((i) => i.id === 'f-1')).toBeUndefined();
    });

    it('quy đổi đơn vị khi so sánh (tủ kg vs công thức g)', async () => {
      await offlineCache.saveFridgeItems([
        { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 1, unit: 'kg' },
      ]);
      await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail());

      await offlineCache.consumeIngredientsForSlot('slot-1');

      const items = await offlineCache.getFridgeItems();
      // 1kg = 1000g - 200g = 800g -> 0.8kg
      expect(items[0].quantity).toBeCloseTo(0.8, 5);
      expect(items[0].unit).toBe('kg');
    });

    it('trừ FIFO: ưu tiên món sắp hết hạn trước', async () => {
      await offlineCache.saveFridgeItems([
        {
          id: 'late',
          ingredientId: 10,
          name: 'Thịt bò',
          quantity: 500,
          unit: 'g',
          expiryDate: '2026-12-31',
        },
        {
          id: 'soon',
          ingredientId: 10,
          name: 'Thịt bò',
          quantity: 150,
          unit: 'g',
          expiryDate: '2026-11-20',
        },
      ]);
      await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail());

      await offlineCache.consumeIngredientsForSlot('slot-1');

      const items = await offlineCache.getFridgeItems();
      const byId = Object.fromEntries(items.map((i) => [i.id, i]));
      // Món sắp hết hạn (150g) bị trừ hết trước -> xoá khỏi tủ.
      expect(byId.soon).toBeUndefined();
      // Món còn hạn dài phải gánh phần còn thiếu (200 - 150 = 50g) -> 450g.
      expect(byId.late.quantity).toBe(450);
    });

    it('báo thiếu khi tủ không đủ (và vẫn trừ được phần có)', async () => {
      await offlineCache.saveFridgeItems([
        { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 100, unit: 'g' },
      ]);
      await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail());

      const result = await offlineCache.consumeIngredientsForSlot('slot-1');

      // Thịt: đủ 100g nhưng cần 200g -> thiếu 100g.
      const meat = result.missing.find((m) => m.ingredientId === 10);
      expect(meat).toBeDefined();
      expect(meat.quantity).toBe(100);
      // Trứng: không có trong tủ -> thiếu 2 quả.
      const egg = result.missing.find((m) => m.ingredientId === 20);
      expect(egg).toBeDefined();
      expect(egg.quantity).toBe(2);
      // Món thịt bị trừ hết -> xoá khỏi tủ.
      const items = await offlineCache.getFridgeItems();
      expect(items.find((i) => i.id === 'f-1')).toBeUndefined();
    });

    it('không so được khi khác loại đơn vị (g vs ml)', async () => {
      await offlineCache.saveFridgeItems([
        { id: 'f-1', ingredientId: 10, name: 'Nước', quantity: 500, unit: 'ml' },
      ]);
      await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail());

      const result = await offlineCache.consumeIngredientsForSlot('slot-1');

      // Không trừ được gì (đơn vị không tương thích) -> tủ giữ nguyên.
      const items = await offlineCache.getFridgeItems();
      expect(items[0].quantity).toBe(500);
      expect(result.consumed).toHaveLength(0);
    });

    it('scale lại khi user đổi khẩu phần', async () => {
      await offlineCache.saveFridgeItems([
        { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 1000, unit: 'g' },
      ]);
      await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail());

      // Slot gốc 2 khẩu phần cần 200g -> user đổi sang 4 khẩu phần -> 400g.
      await offlineCache.consumeIngredientsForSlot('slot-1', 4);

      const items = await offlineCache.getFridgeItems();
      expect(items[0].quantity).toBe(600);
    });

    it('không có chi tiết slot -> không trừ gì, không lỗi', async () => {
      await offlineCache.saveFridgeItems([
        { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 500, unit: 'g' },
      ]);

      const result = await offlineCache.consumeIngredientsForSlot('slot-khong-co');

      expect(result.consumed).toHaveLength(0);
      expect(result.missing).toHaveLength(0);
      const items = await offlineCache.getFridgeItems();
      expect(items[0].quantity).toBe(500);
    });

    it('chi tiết slot không có ingredients -> không trừ gì', async () => {
      await offlineCache.saveFridgeItems([
        { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 500, unit: 'g' },
      ]);
      await offlineCache.saveRecipeDetail(
        'slot-1',
        'slot',
        slotDetail({ recipe: { id: 'r', name: 'x', ingredients: [], steps: [] } })
      );

      const result = await offlineCache.consumeIngredientsForSlot('slot-1');

      expect(result.consumed).toHaveLength(0);
      const items = await offlineCache.getFridgeItems();
      expect(items[0].quantity).toBe(500);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // applyServerConsumption
  // ══════════════════════════════════════════════════════════════

  describe('applyServerConsumption', () => {
    it('BE đã trừ -> đánh dấu row pending thành synced', async () => {
      await offlineCache.saveFridgeItems([
        { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 500, unit: 'g' },
      ]);
      await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail());

      await offlineCache.consumeIngredientsForSlot('slot-1');

      let items = await offlineCache.getFridgeItems();
      expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);

      // BE xác nhận đã trừ.
      await offlineCache.applyServerConsumption('slot-1', [
        { ingredientId: 10, name: 'Thịt bò', deductedQuantity: 200 },
      ]);

      items = await offlineCache.getFridgeItems();
      expect(items[0]._syncStatus).toBe(SYNC_STATUS.SYNCED);
    });

    it('BE KHÔNG trừ (slot đã nấu trước) -> bỏ cờ pending', async () => {
      await offlineCache.saveFridgeItems([
        { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 500, unit: 'g' },
      ]);
      await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail());

      await offlineCache.consumeIngredientsForSlot('slot-1');
      await offlineCache.applyServerConsumption('slot-1', []);

      const items = await offlineCache.getFridgeItems();
      expect(items[0]._syncStatus).toBe(SYNC_STATUS.SYNCED);
    });

    it('không có ghi chú trừ -> không làm gì', async () => {
      await offlineCache.saveFridgeItems([
        { id: 'f-1', ingredientId: 10, name: 'Thịt bò', quantity: 500, unit: 'g' },
      ]);

      const changed = await offlineCache.applyServerConsumption('slot-1', [
        { ingredientId: 10, name: 'Thịt bò' },
      ]);

      expect(changed).toBe(0);
      const items = await offlineCache.getFridgeItems();
      expect(items[0]._syncStatus).toBe(SYNC_STATUS.SYNCED);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // setSlotCooked + saveDailyMealDetails
  // ══════════════════════════════════════════════════════════════

  describe('setSlotCooked', () => {
    it('cập nhật đúng field `cooked` (không tạo field `slot` lạ)', async () => {
      await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail());

      await offlineCache.setSlotCooked('slot-1', true);

      const detail = await offlineCache.getRecipeDetail('slot-1', 'slot');
      expect(detail.cooked).toBe(true);
      expect(detail.completedAt).toBeTruthy();
    });

    it('untick -> cooked = false, completedAt = null', async () => {
      await offlineCache.saveRecipeDetail('slot-1', 'slot', slotDetail({ cooked: true }));

      await offlineCache.setSlotCooked('slot-1', false);

      const detail = await offlineCache.getRecipeDetail('slot-1', 'slot');
      expect(detail.cooked).toBe(false);
      expect(detail.completedAt).toBeNull();
    });
  });

  describe('saveDailyMealDetails', () => {
    it('lưu chi tiết slot theo ngày và tra cứu lại được', async () => {
      const count = await offlineCache.saveDailyMealDetails('2026-11-18', [slotDetail()]);

      expect(count).toBe(1);
      const ids = await offlineCache.getDailyMealDetailIds('2026-11-18');
      expect(ids).toEqual([{ id: 'slot-1' }]);

      const detail = await offlineCache.getRecipeDetail('slot-1', 'slot');
      expect(detail.recipe.ingredients).toHaveLength(2);
    });

    it('ngày khác -> không lẫn dữ liệu', async () => {
      await offlineCache.saveDailyMealDetails('2026-11-18', [slotDetail()]);

      const ids = await offlineCache.getDailyMealDetailIds('2026-11-19');
      expect(ids).toEqual([]);
    });
  });
});
