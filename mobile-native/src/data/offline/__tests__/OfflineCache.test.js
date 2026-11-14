/**
 * OfflineCache - đọc/ghi cache local cho 9 domain.
 */

import { offlineCache, SYNC_STATUS } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

describe('OfflineCache - tủ lạnh', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  it('lưu và đọc lại danh sách nguyên liệu', async () => {
    await offlineCache.saveFridgeItems([
      {
        id: '1',
        name: 'Táo',
        quantity: 3,
        unit: 'quả',
        compartment: 'Tủ lạnh',
        expiryDate: '2026-11-20',
        daysUntilExpiry: 5,
      },
      {
        id: '2',
        name: 'Sữa',
        quantity: 1,
        unit: 'hộp',
        daysUntilExpiry: -2,
      },
    ]);

    const items = await offlineCache.getFridgeItems();
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe('Táo');
    expect(items[0].quantity).toBe(3);
    expect(items[0].unit).toBe('quả');
  });

  it('tính status từ days_until_expiry (expired/expiring/fresh)', async () => {
    await offlineCache.saveFridgeItems([
      { id: '1', name: 'A', daysUntilExpiry: -1 },
      { id: '2', name: 'B', daysUntilExpiry: 2 },
      { id: '3', name: 'C', daysUntilExpiry: 30 },
    ]);

    const items = await offlineCache.getFridgeItems();
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));

    expect(byId['1'].status).toBe('expired');
    expect(byId['2'].status).toBe('expiring');
    expect(byId['3'].status).toBe('fresh');
  });

  it('GIỮ row pending khi pull dữ liệu mới từ server', async () => {
    await offlineCache.savePendingFridgeItem({
      id: 'pending_1',
      name: 'Táo đỏ offline',
      quantity: 2,
      unit: 'quả',
    });

    await offlineCache.saveFridgeItems([{ id: 'srv_1', name: 'Sữa' }]);

    const items = await offlineCache.getFridgeItems();
    const ids = items.map((i) => i.id);
    expect(ids).toContain('pending_1');
    expect(ids).toContain('srv_1');
  });

  it('xoá row synced cũ khi pull dữ liệu mới', async () => {
    await offlineCache.saveFridgeItems([{ id: 'old_1', name: 'Cũ' }]);
    await offlineCache.saveFridgeItems([{ id: 'new_1', name: 'Mới' }]);

    const items = await offlineCache.getFridgeItems();
    const ids = items.map((i) => i.id);
    expect(ids).not.toContain('old_1');
    expect(ids).toContain('new_1');
  });

  it('savePendingFridgeItem đánh dấu sync_status = pending', async () => {
    await offlineCache.savePendingFridgeItem({ id: 'p1', name: 'X', quantity: 1 });
    const items = await offlineCache.getFridgeItems();
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);
  });

  it('updateFridgeItem sửa số lượng + đơn vị', async () => {
    await offlineCache.saveFridgeItems([{ id: '1', name: 'Táo', quantity: 1, unit: 'quả' }]);

    await offlineCache.updateFridgeItem('1', { quantity: 5, unit: 'kg' });

    const items = await offlineCache.getFridgeItems();
    expect(items[0].quantity).toBe(5);
    expect(items[0].unit).toBe('kg');
  });

  it('removeFridgeItem xoá item khỏi cache', async () => {
    await offlineCache.saveFridgeItems([{ id: '1', name: 'Táo' }]);
    await offlineCache.removeFridgeItem('1');

    const items = await offlineCache.getFridgeItems();
    expect(items).toHaveLength(0);
  });
});

describe('OfflineCache - thống kê', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  it('lưu và đọc lại thống kê tủ lạnh', async () => {
    await offlineCache.saveFridgeStats({
      mealsCooked: 12,
      expiringSoonCount: 3,
      totalSpentThisMonth: 1_500_000,
      wastePercent: 8.5,
      totalItems: 20,
    });

    const stats = await offlineCache.getFridgeStats();
    expect(stats.mealsCooked).toBe(12);
    expect(stats.expiringSoonCount).toBe(3);
    expect(stats.wastePercent).toBe(8.5);
  });

  it('getFridgeStats trả null khi chưa có dữ liệu', async () => {
    expect(await offlineCache.getFridgeStats()).toBeNull();
  });
});

describe('OfflineCache - danh sách mua', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  it('lưu và đọc lại danh sách mua', async () => {
    await offlineCache.saveShoppingItems([
      { id: 10, name: 'Thịt heo', quantity: 500, unit: 'g', done: false, listId: 'L1' },
      { id: 11, name: 'Rau', quantity: 1, unit: 'bó', done: true, listId: 'L1' },
    ]);

    const items = await offlineCache.getShoppingItems();
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.id === 11).done).toBe(true);
  });

  it('setShoppingItemPurchased tick offline -> sync_status pending', async () => {
    await offlineCache.saveShoppingItems([{ id: 10, name: 'Thịt', done: false }]);

    await offlineCache.setShoppingItemPurchased(10, true);

    const items = await offlineCache.getShoppingItems();
    expect(items[0].done).toBe(true);
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);
  });

  it('clearShoppingPending xoá row pending sau khi upload', async () => {
    await offlineCache.saveShoppingItems([{ id: 10, name: 'Thịt', done: false }]);
    await offlineCache.setShoppingItemPurchased(10, true);
    await offlineCache.clearShoppingPending(10);

    const items = await offlineCache.getShoppingItems();
    expect(items).toHaveLength(0);
  });
});

describe('OfflineCache - profile / preferences / allergies / catalog', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  it('lưu và đọc lại profile', async () => {
    await offlineCache.saveUserProfile({
      name: 'Lâm',
      email: 'lam@example.com',
      avatar: 'http://a.png',
    });

    const profile = await offlineCache.getUserProfile();
    expect(profile.name).toBe('Lâm');
    expect(profile.email).toBe('lam@example.com');
  });

  it('lưu và đọc lại preferences', async () => {
    await offlineCache.saveUserPreferences({
      weeklyBudget: 2_000_000,
      dietaryStyle: 'vegetarian',
      preferSimpleRecipes: true,
    });

    const prefs = await offlineCache.getUserPreferences();
    expect(prefs.weeklyBudget).toBe(2_000_000);
    expect(prefs.dietaryStyle).toBe('vegetarian');
    expect(prefs.preferSimpleRecipes).toBe(true);
  });

  it('lưu và đọc lại dị ứng', async () => {
    await offlineCache.saveAllergies([
      { id: '1', ingredientId: 5, name: 'Tôm', note: 'Dị ứng nặng' },
    ]);

    const allergies = await offlineCache.getAllergies();
    expect(allergies).toHaveLength(1);
    expect(allergies[0].name).toBe('Tôm');
  });

  it('lưu danh mục nguyên liệu + tìm kiếm', async () => {
    await offlineCache.saveIngredientCatalog([
      { id: 1, name: 'Táo đỏ', defaultUnit: 'quả', categoryName: 'Trái cây' },
      { id: 2, name: 'Cà chua', defaultUnit: 'quả', categoryName: 'Rau củ' },
    ]);

    const found = await offlineCache.searchIngredientCatalog('Táo');
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('Táo đỏ');

    const all = await offlineCache.searchIngredientCatalog('');
    expect(all).toHaveLength(2);
  });
});

describe('OfflineCache - kế hoạch tuần / công thức', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  it('lưu và đọc lại kế hoạch tuần', async () => {
    await offlineCache.saveWeeklyPlan({
      id: 'plan-1',
      weekStart: '2026-11-09',
      days: [{ dayOfWeek: 1, slots: [] }],
    });

    const plan = await offlineCache.getWeeklyPlan();
    expect(plan.id).toBe('plan-1');
    expect(plan.days).toHaveLength(1);
  });

  it('lưu và đọc lại chi tiết công thức', async () => {
    await offlineCache.saveRecipeDetail('r1', 'recipe', { id: 'r1', name: 'Bò kho' });

    const detail = await offlineCache.getRecipeDetail('r1', 'recipe');
    expect(detail.name).toBe('Bò kho');
  });

  it('getRecipeDetail trả null khi chưa cache', async () => {
    expect(await offlineCache.getRecipeDetail('khong-co', 'recipe')).toBeNull();
  });

  it('cleanOldRecipeDetails xoá cache cũ', async () => {
    await offlineCache.saveRecipeDetail('r1', 'recipe', { id: 'r1' });
    await offlineCache.cleanOldRecipeDetails(7);

    // Cache vừa ghi nên còn -> xoá với maxAgeDays = 0 mới mất.
    await offlineCache.cleanOldRecipeDetails(0);
    expect(await offlineCache.getRecipeDetail('r1', 'recipe')).toBeNull();
  });
});

describe('OfflineCache - quản lý chung', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  it('getCacheStatus trả số liệu tổng quan', async () => {
    await offlineCache.saveFridgeItems([
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
    ]);
    await offlineCache.savePendingFridgeItem({ id: 'p1', name: 'C' });

    const status = await offlineCache.getCacheStatus();
    expect(status.fridgeItems).toBe(3);
    expect(status.pending).toBe(1);
  });

  it('clearCache xoá toàn bộ bảng cache', async () => {
    await offlineCache.saveFridgeItems([{ id: '1', name: 'A' }]);
    await offlineCache.saveUserProfile({ name: 'Lâm' });

    await offlineCache.clearCache();

    expect(await offlineCache.getFridgeItems()).toHaveLength(0);
    expect(await offlineCache.getUserProfile()).toBeNull();
  });
});
