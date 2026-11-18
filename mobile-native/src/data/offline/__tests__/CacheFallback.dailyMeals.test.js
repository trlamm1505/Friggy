/**
 * CacheFallback - đọc cache local khi offline.
 *
 * ⚠️ Bao phủ 3 bug user báo về offline:
 *   1. "Thực đơn ngày" phải đọc được khi offline (từ cache ngày, fallback
 *      kế hoạch tuần) + đúng field `name`/`image`.
 *   2. Số "món chưa mua" phải phản ánh cả tick offline (row 'pending').
 */

import { getCacheFallbackFor } from '../CacheFallback';
import { offlineCache, SYNC_STATUS } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

const recipeFallback = (method) => getCacheFallbackFor('recipeService', method);

describe('CacheFallback - getSuggestions (thực đơn ngày)', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  it('đọc cache thực đơn ngày -> đúng tên/ảnh/bữa', async () => {
    await offlineCache.saveDailyMeals('2026-11-18', [
      {
        id: 'slot-1',
        recipeId: 'r1',
        name: 'Trứng xào cà chua',
        image: 'http://cdn/1.png',
        mealType: 'breakfast',
        cooked: false,
        servings: 2,
      },
    ]);

    const result = await recipeFallback('getSuggestions')();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Trứng xào cà chua');
    expect(result[0].title).toBe('Trứng xào cà chua');
    expect(result[0].image).toBe('http://cdn/1.png');
    expect(result[0].mealType).toBe('breakfast');
    expect(result[0].servings).toBe(2);
  });

  it('fallback sang kế hoạch tuần -> lấy đúng field name/image', async () => {
    const jsDay = new Date().getDay();
    const beDay = jsDay === 0 ? 7 : jsDay;

    await offlineCache.saveWeeklyPlan({
      id: 'plan-1',
      weekStart: '2026-11-16',
      days: [
        {
          dayOfWeek: beDay,
          date: null,
          slots: [
            {
              id: 'slot-9',
              recipeId: 'r9',
              name: 'Canh rau củ',
              image: 'http://cdn/9.png',
              mealType: 'lunch',
              cooked: true,
              servings: 3,
              cookTime: 25,
            },
          ],
        },
      ],
    });

    const result = await recipeFallback('getSuggestions')();

    expect(result).toHaveLength(1);
    // ⚠️ Trước đây đọc `slot.recipeName` -> null -> món trống tên.
    expect(result[0].name).toBe('Canh rau củ');
    expect(result[0].image).toBe('http://cdn/9.png');
    expect(result[0].cooked).toBe(true);
    expect(result[0].cookTime).toBe(25);
  });

  it('không có cache nào -> trả null (SafeService tiếp tục ném lỗi thật)', async () => {
    await expect(recipeFallback('getSuggestions')()).resolves.toBeNull();
  });
});

describe('CacheFallback - danh sách mua', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  it('getShoppingLists trả về list offline chứa items (kể cả row pending)', async () => {
    await offlineCache.saveShoppingItems([
      { id: '1', name: 'A', done: false, listId: 'L1' },
      { id: '2', name: 'B', done: false, listId: 'L1' },
    ]);
    await offlineCache.setShoppingItemPurchased('2', true, 'L1');

    const lists = await recipeFallback('getShoppingLists')();

    expect(lists).toHaveLength(1);
    expect(lists[0].items).toHaveLength(2);
    const byId = Object.fromEntries(lists[0].items.map((i) => [String(i.id), i]));
    expect(byId['2'].done).toBe(true);
    expect(byId['2']._syncStatus).toBe(SYNC_STATUS.PENDING);
    expect(byId['1'].done).toBe(false);
  });
});
