/**
 * SyncEngine - pull danh mục nguyên liệu (catalog) với phân trang.
 *
 * ⚠️ REGRESSION (bug đã gặp):
 *   BE `GET /ingredients` giới hạn `limit <= 100` (`@Max(100)` trong DTO).
 *   Code cũ gọi `searchIngredients('', 200)` -> BE trả 400 -> catalog KHÔNG
 *   BAO GIỜ được cache -> picker nguyên liệu offline rỗng.
 *
 *   Fix: duyệt từng trang (tối đa 20 trang x 100 item = 2000 item, giống
 *   Flutter `_syncIngredientCatalog`), gộp lại rồi ghi cache 1 lần.
 */

import { registerService, clearRegistry } from '../../api/ServiceRegistry';
import { syncEngine } from '../SyncEngine';
import { offlineCache } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

const PAGE_SIZE = 100;

const registerBase = (userService) => {
  registerService('fridgeService', {
    getItems: jest.fn().mockResolvedValue([]),
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
    ...userService,
  });
};

describe('SyncEngine - pull danh mục nguyên liệu (phân trang)', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
    clearRegistry();
    syncEngine._isSyncing = false;
    syncEngine._lastResult = null;
  });

  afterEach(() => clearRegistry());

  it('KHÔNG gọi limit > 100 (BE giới hạn @Max(100) -> 400)', async () => {
    const searchIngredients = jest.fn().mockResolvedValue([]);

    registerBase({ searchIngredients });
    await syncEngine._pullIngredientCatalog();

    expect(searchIngredients).toHaveBeenCalled();
    searchIngredients.mock.calls.forEach((call) => {
      expect(call[1]).toBeLessThanOrEqual(100);
    });
  });

  it('duyệt nhiều trang rồi GỘP lại (không mất trang trước)', async () => {
    const page1 = Array.from({ length: PAGE_SIZE }, (_, i) => ({
      id: i + 1,
      name: `Nguyên liệu ${i + 1}`,
    }));
    const page2 = [
      { id: 101, name: 'Nguyên liệu 101' },
      { id: 102, name: 'Nguyên liệu 102' },
    ];

    const searchIngredients = jest
      .fn()
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    registerBase({ searchIngredients });
    await syncEngine._pullIngredientCatalog();

    expect(searchIngredients).toHaveBeenCalledTimes(2);
    expect(searchIngredients.mock.calls[0][2]).toBe(1);
    expect(searchIngredients.mock.calls[1][2]).toBe(2);

    // Catalog phải chứa TẤT CẢ item của cả 2 trang.
    const all = await offlineCache.searchIngredientCatalog('', 500);
    expect(all).toHaveLength(PAGE_SIZE + 2);
  });

  it('truyền skipCacheWrite để service không ghi cache mỗi trang', async () => {
    const searchIngredients = jest.fn().mockResolvedValue([]);

    registerBase({ searchIngredients });
    await syncEngine._pullIngredientCatalog();

    expect(searchIngredients.mock.calls[0][3]).toEqual({ skipCacheWrite: true });
  });

  it('dừng sớm khi trang cuối trả về ít hơn PAGE_SIZE item', async () => {
    const searchIngredients = jest.fn().mockResolvedValue([{ id: 1, name: 'A' }]);

    registerBase({ searchIngredients });
    await syncEngine._pullIngredientCatalog();

    // Chỉ 1 trang -> không lặp vô hạn 20 trang.
    expect(searchIngredients).toHaveBeenCalledTimes(1);
  });

  it('catalog rỗng -> không ghi cache (không xoá cache cũ)', async () => {
    await offlineCache.saveIngredientCatalog([{ id: 1, name: 'Táo đỏ' }]);

    const searchIngredients = jest.fn().mockResolvedValue([]);
    registerBase({ searchIngredients });
    await syncEngine._pullIngredientCatalog();

    const all = await offlineCache.searchIngredientCatalog('', 500);
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Táo đỏ');
  });
});
