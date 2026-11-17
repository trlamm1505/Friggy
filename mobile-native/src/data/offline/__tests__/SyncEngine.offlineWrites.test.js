/**
 * SyncEngine — upload op offline cho các nhóm F1/F2/F3/F5/F7 + xử lý 409.
 *
 * Yêu cầu nghiệp vụ:
 *   1. Op thành công -> `resolve()` (xoá khỏi hàng đợi) + cập nhật cache local.
 *   2. HTTP 409 -> `markConflict()` -> `sync_state = 'conflict'` (B5).
 *   3. 4xx khác -> `fail(permanent)` -> xoá op (không retry vô ích).
 *   4. 5xx/network -> `fail()` -> giữ op, thử lại vòng sau.
 */

import { registerService, clearRegistry, getRegisteredService } from '../../api/ServiceRegistry';
import { syncEngine } from '../SyncEngine';
import { outboxQueue, OP_TYPES, SYNC_STATES } from '../OutboxQueue';
import { offlineCache } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

const httpError = (statusCode, message = 'HTTP error') => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

const resetAll = async () => {
  __resetFakeDb();
  await offlineCache.clearCache();
  await outboxQueue.clear();
  clearRegistry();
  syncEngine._isSyncing = false;
  syncEngine._lastResult = null;
};

/**
 * Đăng ký các service mà `syncAll` cần khi pull.
 *
 * ⚠️ KHÔNG được ghi đè `fridgeService` nếu test đã đăng ký riêng (method
 * updateItem...) -> sẽ mất mock của test -> phân loại lỗi sai.
 */
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
  });
  registerService('userService', {
    getProfile: jest.fn().mockResolvedValue(null),
    getPreferences: jest.fn().mockResolvedValue(null),
    getAllergies: jest.fn().mockResolvedValue([]),
    searchIngredients: jest.fn().mockResolvedValue([]),
  });
};

describe('SyncEngine — F2 bookmark công thức', () => {
  beforeEach(resetAll);
  afterEach(clearRegistry);

  it('bookmark=true -> gọi addBookmark + cập nhật cache', async () => {
    const addBookmark = jest.fn().mockResolvedValue({ ok: true });
    registerService('recipeService', { addBookmark });
    await offlineCache.saveRecipeList([{ id: 'r1', name: 'Cơm gà' }]);

    await outboxQueue.enqueue(OP_TYPES.RECIPE_BOOKMARK, { id: 'r1', bookmarked: true }, 'r1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(addBookmark).toHaveBeenCalledWith('r1');

    const bookmarked = await offlineCache.getBookmarkedRecipes();
    expect(bookmarked.map((r) => r.id)).toEqual(['r1']);
  });

  it('bookmark=false -> gọi removeBookmark', async () => {
    const removeBookmark = jest.fn().mockResolvedValue({ ok: true });
    registerService('recipeService', { removeBookmark });
    await offlineCache.saveRecipeList([{ id: 'r1', name: 'Cơm gà' }]);

    await outboxQueue.enqueue(OP_TYPES.RECIPE_BOOKMARK, { id: 'r1', bookmarked: false }, 'r1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(removeBookmark).toHaveBeenCalledWith('r1');
  });
});

describe('SyncEngine — F3 CRUD danh sách mua', () => {
  beforeEach(resetAll);
  afterEach(clearRegistry);

  it('shopping_item_add -> gọi addShoppingListItem + thay row pending bằng item server', async () => {
    const addShoppingListItem = jest.fn().mockResolvedValue({
      id: 55,
      name: 'Sữa',
      quantity: 2,
      unit: 'hộp',
    });
    registerService('recipeService', { addShoppingListItem });

    await outboxQueue.enqueue(
      OP_TYPES.SHOPPING_ITEM_ADD,
      { listId: 'list-1', item: { name: 'Sữa', quantity: 2, unit: 'hộp' } },
      'pending_shop_1'
    );

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(addShoppingListItem).toHaveBeenCalledWith('list-1', {
      name: 'Sữa',
      quantity: 2,
      unit: 'hộp',
    });

    const items = await offlineCache.getShoppingItems();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(55);
  });

  it('shopping_item_remove -> xoá item khỏi cache', async () => {
    const removeShoppingListItem = jest.fn().mockResolvedValue({ ok: true });
    registerService('recipeService', { removeShoppingListItem });

    await offlineCache.saveShoppingItems([{ id: 7, name: 'Trứng', quantity: 1, unit: 'quả' }]);
    await outboxQueue.enqueue(
      OP_TYPES.SHOPPING_ITEM_REMOVE,
      { listId: 'list-1', itemId: 7 },
      '7'
    );

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(removeShoppingListItem).toHaveBeenCalledWith('list-1', 7);
    expect(await offlineCache.getShoppingItems()).toHaveLength(0);
  });

  it('shopping_toggle -> clearShoppingPending GIỮ row (không DELETE)', async () => {
    const toggleShoppingItemInList = jest.fn().mockResolvedValue({ ok: true });
    registerService('recipeService', { toggleShoppingItemInList });

    await offlineCache.saveShoppingItems([
      { id: 7, name: 'Trứng', quantity: 1, unit: 'quả', done: false },
    ]);
    await outboxQueue.enqueue(
      OP_TYPES.SHOPPING_TOGGLE,
      { listId: 'list-1', itemId: 7 },
      '7'
    );

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);

    // ⚠️ Bug F3 cũ: `clearShoppingPending` DELETE row -> món biến mất khỏi
    // danh sách sau khi sync. Nay phải GIỮ row, chỉ đổi trạng thái.
    const items = await offlineCache.getShoppingItems();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(7);
  });
});

describe('SyncEngine — F5 thao tác thông báo', () => {
  beforeEach(resetAll);
  afterEach(clearRegistry);

  it('notification_read -> đánh dấu đã đọc cả server lẫn cache', async () => {
    const markAsRead = jest.fn().mockResolvedValue({ ok: true });
    registerService('notificationService', { markAsRead });

    await offlineCache.saveNotifications([{ id: 'n1', type: 'system', title: 'A', read: false }]);
    await outboxQueue.enqueue(OP_TYPES.NOTIFICATION_READ, { id: 'n1' }, 'n1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(markAsRead).toHaveBeenCalledWith('n1');
    expect(await offlineCache.getUnreadNotificationCount()).toBe(0);
  });

  it('notification_read_all -> đánh dấu tất cả đã đọc', async () => {
    const markAllAsRead = jest.fn().mockResolvedValue({ ok: true });
    registerService('notificationService', { markAllAsRead });

    await offlineCache.saveNotifications([
      { id: 'n1', type: 'system', title: 'A', read: false },
      { id: 'n2', type: 'system', title: 'B', read: false },
    ]);
    await outboxQueue.enqueue(OP_TYPES.NOTIFICATION_READ_ALL, {}, null);

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(await offlineCache.getUnreadNotificationCount()).toBe(0);
  });

  it('notification_delete -> xoá khỏi cache', async () => {
    const deleteNotification = jest.fn().mockResolvedValue({ ok: true });
    registerService('notificationService', { deleteNotification });

    await offlineCache.saveNotifications([{ id: 'n1', type: 'system', title: 'A', read: false }]);
    await outboxQueue.enqueue(OP_TYPES.NOTIFICATION_DELETE, { id: 'n1' }, 'n1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(await offlineCache.getNotifications()).toHaveLength(0);
  });
});

describe('SyncEngine — F7 nộp khảo sát onboarding offline', () => {
  beforeEach(resetAll);
  afterEach(clearRegistry);

  it('onboarding_submit -> gọi submitOnboarding + lưu cache JSON', async () => {
    const submitOnboarding = jest.fn().mockResolvedValue({ ok: true });
    registerService('userService', { submitOnboarding });

    await outboxQueue.enqueue(
      OP_TYPES.ONBOARDING_SUBMIT,
      { primaryGoal: 'eat_healthy', householdSize: 3 },
      null
    );

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(submitOnboarding).toHaveBeenCalledWith({
      primaryGoal: 'eat_healthy',
      householdSize: 3,
    });

    const cached = await offlineCache.getJsonCache('onboarding');
    expect(cached.primaryGoal).toBe('eat_healthy');
  });
});

describe('SyncEngine — xử lý lỗi khi upload (B5)', () => {
  beforeEach(resetAll);
  afterEach(clearRegistry);

  it('HTTP 409 -> đánh dấu conflict, op KHÔNG bị xoá', async () => {
    registerService('fridgeService', {
      updateItem: jest.fn().mockRejectedValue(httpError(409, 'Version conflict')),
    });
    registerPullStubs();

    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { quantity: 5 }, 'item-1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.conflicts).toBe(1);

    const conflicts = await outboxQueue.listByState(SYNC_STATES.CONFLICT);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].entity_id).toBe('item-1');

    // Op conflict KHÔNG bị retry mỗi vòng -> `list()` mặc định loại.
    expect(await outboxQueue.list()).toHaveLength(0);
  });

  it('4xx khác 409 -> bỏ op (lỗi vĩnh viễn)', async () => {
    registerService('fridgeService', {
      updateItem: jest.fn().mockRejectedValue(httpError(422, 'Payload sai')),
    });
    registerPullStubs();

    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { quantity: 5 }, 'item-1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.failed).toBe(1);
    expect(await outboxQueue.count()).toBe(0);
  });

  it('5xx -> giữ op để thử lại vòng sau', async () => {
    registerService('fridgeService', {
      updateItem: jest.fn().mockRejectedValue(httpError(500, 'Server boom')),
    });
    registerPullStubs();

    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { quantity: 5 }, 'item-1');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.failed).toBe(1);

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].retries).toBe(1);
  });
});
