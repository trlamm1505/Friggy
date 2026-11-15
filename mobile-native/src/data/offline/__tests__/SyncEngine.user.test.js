/**
 * SyncEngine - upload nhóm "dị ứng / hồ sơ / sở thích" offline.
 *
 * Đối chiếu Flutter 14/11:
 *   Flutter dùng cột `sync_status` trong bảng local riêng; RN dùng chung
 *   `local_pending_ops` -> sau khi upload phải:
 *     - `allergy_add`     -> đổi row pending thành id thật của server
 *     - `allergy_delete`  -> xoá hẳn row khỏi cache
 *     - `profile_update`  -> đánh dấu 'synced'
 *     - `prefs_update`    -> đánh dấu 'synced'
 */

import { registerService, clearRegistry } from '../../api/ServiceRegistry';
import { syncEngine } from '../SyncEngine';
import { outboxQueue, OP_TYPES } from '../OutboxQueue';
import { offlineCache, SYNC_STATUS } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

const resetEngine = async () => {
  __resetFakeDb();
  await offlineCache.clearCache();
  await outboxQueue.clear();
  clearRegistry();
  syncEngine._isSyncing = false;
  syncEngine._lastResult = null;
};

/** Đăng ký đủ các service mà `syncAll` cần (tránh lỗi thiếu service). */
const registerBaseServices = (userService) => {
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

describe('SyncEngine - upload dị ứng', () => {
  beforeEach(resetEngine);
  afterEach(() => clearRegistry());

  it('allergy_add -> đổi row pending thành id thật của server', async () => {
    const addAllergy = jest.fn().mockResolvedValue({
      id: 42,
      ingredientId: 7,
      name: 'Tôm',
      note: 'nặng',
    });

    await offlineCache.savePendingAllergy({
      id: 'pending_1',
      ingredientId: 7,
      name: 'Nguyên liệu #7',
      note: 'nặng',
    });

    registerBaseServices({ addAllergy });
    await outboxQueue.enqueue(
      OP_TYPES.ALLERGY_ADD,
      { ingredientId: 7, note: 'nặng' },
      'pending_1'
    );

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(addAllergy).toHaveBeenCalledWith(7, 'nặng');

    const allergies = await offlineCache.getAllergies();
    expect(allergies).toHaveLength(1);
    expect(allergies[0].id).toBe('42');
    expect(allergies[0].ingredientId).toBe(7);
    expect(allergies[0]._syncStatus).toBe(SYNC_STATUS.SYNCED);
  });

  it('allergy_delete -> xoá hẳn row khỏi cache', async () => {
    const removeAllergy = jest.fn().mockResolvedValue(undefined);

    await offlineCache.saveAllergies([{ id: 'a1', ingredientId: 5, name: 'Tôm' }]);
    await offlineCache.markAllergyPendingDelete('a1');

    registerBaseServices({ removeAllergy });
    await outboxQueue.enqueue(OP_TYPES.ALLERGY_DELETE, { id: 'a1' }, 'a1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(removeAllergy).toHaveBeenCalledWith('a1');

    expect(await offlineCache.getAllergies()).toHaveLength(0);
  });
});

describe('SyncEngine - upload hồ sơ / sở thích', () => {
  beforeEach(resetEngine);
  afterEach(() => clearRegistry());

  it('profile_update -> đánh dấu cache ' + "'synced'", async () => {
    const updateProfile = jest.fn().mockResolvedValue({});

    await offlineCache.saveUserProfile(
      { name: 'Lâm', email: 'a@b.com' },
      SYNC_STATUS.PENDING
    );

    registerBaseServices({ updateProfile });
    await outboxQueue.enqueue(
      OP_TYPES.PROFILE_UPDATE,
      { name: 'Lâm', dateOfBirth: null, gender: null, bio: null },
      'me'
    );

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(updateProfile).toHaveBeenCalled();

    const profile = await offlineCache.getUserProfile();
    expect(profile._syncStatus).toBe(SYNC_STATUS.SYNCED);
  });

  it('prefs_update -> đánh dấu cache ' + "'synced'", async () => {
    const updatePreferences = jest.fn().mockResolvedValue({});

    await offlineCache.saveUserPreferences(
      { weeklyBudget: 2_000_000, dietaryStyle: 'vegetarian' },
      SYNC_STATUS.PENDING
    );

    registerBaseServices({
      updatePreferences,
      // Server đã nhận giá trị mới -> pull về cùng giá trị.
      getPreferences: jest.fn().mockResolvedValue({
        weeklyBudget: 2_000_000,
        dietaryStyle: 'vegetarian',
      }),
    });
    await outboxQueue.enqueue(
      OP_TYPES.PREFS_UPDATE,
      { weeklyBudget: 2_000_000, dietaryStyle: 'vegetarian' },
      'me'
    );

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(updatePreferences).toHaveBeenCalled();

    const prefs = await offlineCache.getUserPreferences();
    expect(prefs._syncStatus).toBe(SYNC_STATUS.SYNCED);
    expect(prefs.weeklyBudget).toBe(2_000_000);
  });

  // ⚠️ REGRESSION: nếu pull ghi đè thay đổi offline, user MẤT thay đổi
  //   dù op trong hàng đợi vẫn còn (sẽ upload giá trị cũ lên server).
  it('pull KHÔNG ghi đè thay đổi đang pending (upload lỗi)', async () => {
    const updatePreferences = jest.fn().mockRejectedValue(new Error('Mất mạng'));

    await offlineCache.saveUserPreferences(
      { weeklyBudget: 2_000_000, dietaryStyle: 'vegetarian' },
      SYNC_STATUS.PENDING
    );

    registerBaseServices({
      updatePreferences,
      // Server vẫn còn giá trị CŨ.
      getPreferences: jest.fn().mockResolvedValue({
        weeklyBudget: 1_000_000,
        dietaryStyle: 'normal',
      }),
    });
    await outboxQueue.enqueue(
      OP_TYPES.PREFS_UPDATE,
      { weeklyBudget: 2_000_000, dietaryStyle: 'vegetarian' },
      'me'
    );

    await syncEngine.syncAll({ force: true, prefetchRecipes: false });

    const prefs = await offlineCache.getUserPreferences();
    // Giá trị local đang pending phải được giữ.
    expect(prefs.weeklyBudget).toBe(2_000_000);
    expect(prefs.dietaryStyle).toBe('vegetarian');
    expect(prefs._syncStatus).toBe(SYNC_STATUS.PENDING);
  });

  it('pull KHÔNG ghi đè hồ sơ đang pending', async () => {
    const updateProfile = jest.fn().mockRejectedValue(new Error('Mất mạng'));

    await offlineCache.saveUserProfile({ name: 'Tên Mới', email: 'a@b.com' }, SYNC_STATUS.PENDING);

    registerBaseServices({
      updateProfile,
      getProfile: jest.fn().mockResolvedValue({ name: 'Tên Cũ', email: 'a@b.com' }),
    });
    await outboxQueue.enqueue(
      OP_TYPES.PROFILE_UPDATE,
      { name: 'Tên Mới', dateOfBirth: null, gender: null, bio: null },
      'me'
    );

    await syncEngine.syncAll({ force: true, prefetchRecipes: false });

    const profile = await offlineCache.getUserProfile();
    expect(profile.name).toBe('Tên Mới');
    expect(profile._syncStatus).toBe(SYNC_STATUS.PENDING);
  });
});
