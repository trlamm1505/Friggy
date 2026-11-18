/**
 * Regression test cho bug: "thêm nguyên liệu vào shopping list OFFLINE bị kẹt".
 *
 * ⚠️ BUG GỐC (4 lỗi độc lập, đều gây mất món):
 *   1. `CacheFallback.getActiveShoppingList()` trả `id = 'offline'` (giả) ->
 *      op `shopping_item_add` queue mang `listId = 'offline'` -> server 404 ->
 *      món MẤT VĨNH VIỄN khi sync.
 *   2. `RealRecipeService.getShoppingLists()` (đường đọc ONLINE) trả CHỈ list
 *      server -> món vừa thêm offline BIẾN MẤT khỏi UI khi bật mạng.
 *   3. `SyncEngine` SHOPPING_ITEM_ADD gọi `saveShoppingItems([1 item])` ->
 *      hàm này DELETE mọi row `synced` -> xoá SẠCH danh sách mua còn lại.
 *   4. `addShoppingListItem` không gửi `name` -> món hiện tên RỖNG offline.
 */

import { registerService, clearRegistry, getRegisteredService } from '../../api/ServiceRegistry';
import { syncEngine } from '../SyncEngine';
import { outboxQueue, OP_TYPES } from '../OutboxQueue';
import { offlineCache, OFFLINE_LIST_ID } from '../OfflineCache';
import { getCacheFallbackFor } from '../CacheFallback';
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

const registerPullStubs = (extra = {}) => {
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
    ...extra,
  });
  registerService('userService', {
    getProfile: jest.fn().mockResolvedValue(null),
    getPreferences: jest.fn().mockResolvedValue(null),
    getAllergies: jest.fn().mockResolvedValue([]),
    searchIngredients: jest.fn().mockResolvedValue([]),
  });
};

describe('Bug shopping offline — id list THẬT thay vì id giả', () => {
  beforeEach(resetAll);
  afterEach(clearRegistry);

  it('CacheFallback.getActiveShoppingList trả id list THẬT đã cache', async () => {
    await offlineCache.saveActiveShoppingListId('list-real-uuid');

    const fallback = getCacheFallbackFor('recipeService', 'getActiveShoppingList');
    const list = await fallback([]);

    expect(list.id).toBe('list-real-uuid');
    expect(list.id).not.toBe(OFFLINE_LIST_ID);
  });

  it('chưa từng online -> trả null (KHÔNG tạo op chắc chắn hỏng)', async () => {
    const fallback = getCacheFallbackFor('recipeService', 'getActiveShoppingList');
    const list = await fallback([]);

    expect(list).toBeNull();
  });

  it('list id lấy được từ row món mua đã cache (fallback)', async () => {
    await offlineCache.saveShoppingItems([
      { id: 7, name: 'Trứng', quantity: 1, unit: 'quả', listId: 'list-from-row' },
    ]);

    expect(await offlineCache.getActiveShoppingListId()).toBe('list-from-row');
  });

  it('op đã queue với listId giả -> SyncEngine dùng list id THẬT', async () => {
    const addShoppingListItem = jest.fn().mockResolvedValue({
      id: 42,
      name: 'Sữa',
      quantity: 2,
      unit: 'hộp',
    });
    registerService('recipeService', { addShoppingListItem });
    registerPullStubs({ addShoppingListItem });

    // Mô phỏng đúng tình huống bug: op queue mang listId giả 'offline'.
    await outboxQueue.enqueue(
      OP_TYPES.SHOPPING_ITEM_ADD,
      { listId: OFFLINE_LIST_ID, item: { name: 'Sữa', quantity: 2, unit: 'hộp' } },
      'pending_shop_1'
    );
    // Nhưng cache đã biết list thật (user từng online).
    await offlineCache.saveActiveShoppingListId('list-real-uuid');

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(addShoppingListItem).toHaveBeenCalledWith('list-real-uuid', {
      name: 'Sữa',
      quantity: 2,
      unit: 'hộp',
    });
  });

  it('op với listId giả + chưa có list id thật -> lấy list active từ server', async () => {
    const addShoppingListItem = jest.fn().mockResolvedValue({ id: 42, name: 'Sữa' });
    const getActiveShoppingList = jest
      .fn()
      .mockResolvedValue({ id: 'list-from-server', title: '', status: 'active', items: [] });
    registerService('recipeService', { addShoppingListItem, getActiveShoppingList });
    registerPullStubs({ addShoppingListItem, getActiveShoppingList });

    await outboxQueue.enqueue(
      OP_TYPES.SHOPPING_ITEM_ADD,
      { listId: OFFLINE_LIST_ID, item: { name: 'Sữa', quantity: 2, unit: 'hộp' } },
      'pending_shop_1'
    );

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(addShoppingListItem).toHaveBeenCalledWith('list-from-server', expect.any(Object));
  });
});

describe('Bug shopping offline — món pending không biến mất khi bật mạng', () => {
  beforeEach(resetAll);
  afterEach(clearRegistry);

  it('RealRecipeService.getShoppingLists gộp món pending vào list server', async () => {
    const { RealRecipeService } = require('../../services/real/RealRecipeService');

    await offlineCache.addPendingShoppingItem({
      id: 'pending_shop_1',
      name: 'Sữa',
      quantity: 2,
      unit: 'hộp',
      ingredientId: 9,
      listId: 'list-1',
    });

    const svc = new RealRecipeService({ get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() });
    svc.client.get = jest.fn().mockResolvedValue([
      {
        id: 'list-1',
        title: 'Tuần này',
        status: 'active',
        items: [{ id: 7, ingredientName: 'Trứng', quantity: 1, unit: 'quả', isPurchased: false }],
      },
    ]);

    const lists = await svc.getShoppingLists();
    const ids = lists[0].items.map((i) => String(i.id));

    // Món server VẪN còn, món pending ĐƯỢC thêm vào -> không biến mất.
    expect(ids).toContain('7');
    expect(ids).toContain('pending_shop_1');
  });

  it('SyncEngine KHÔNG xoá sạch danh sách mua khi sync 1 món pending', async () => {
    const addShoppingListItem = jest.fn().mockResolvedValue({
      id: 42,
      name: 'Sữa',
      quantity: 2,
      unit: 'hộp',
    });
    registerService('recipeService', { addShoppingListItem });
    registerPullStubs({ addShoppingListItem });

    // Cache đã có 2 món server (synced).
    await offlineCache.saveShoppingItems([
      { id: 7, name: 'Trứng', quantity: 1, unit: 'quả', listId: 'list-1' },
      { id: 8, name: 'Muối', quantity: 1, unit: 'g', listId: 'list-1' },
    ]);
    await offlineCache.addPendingShoppingItem({
      id: 'pending_shop_1',
      name: 'Sữa',
      quantity: 2,
      unit: 'hộp',
      ingredientId: 9,
      listId: 'list-1',
    });

    await outboxQueue.enqueue(
      OP_TYPES.SHOPPING_ITEM_ADD,
      { listId: 'list-1', item: { name: 'Sữa', quantity: 2, unit: 'hộp' } },
      'pending_shop_1'
    );

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);

    const items = await offlineCache.getShoppingItems();
    const names = items.map((i) => i.name).sort();

    // ⚠️ Bug cũ: `saveShoppingItems([1 item])` xoá sạch -> chỉ còn 'Sữa'.
    expect(names).toHaveLength(3);
    expect(names).toContain('Sữa');
    expect(names).toContain('Trứng');
    expect(names).toContain('Muối');
  });
});

describe('Bug shopping offline — remap id món pending khi sync', () => {
  beforeEach(resetAll);
  afterEach(clearRegistry);

  // ⚠️ CHUẨN HOÁ THEO BE:
  //   Món user tự thêm giờ là món CHỈ CÓ Ở MÁY (`local_only`) -> KHÔNG có
  //   id server -> không thể remap. Vì vậy tick món local phải được xử lý
  //   ở client (không gọi endpoint `ParseIntPipe` với id local -> 400).
  it('op toggle trỏ id LOCAL -> KHÔNG gọi API (BE ParseIntPipe sẽ 400)', async () => {
    const addShoppingListItem = jest.fn().mockResolvedValue({
      id: 42,
      name: 'Sữa',
      quantity: 2,
      unit: 'hộp',
    });
    const toggleShoppingItemInList = jest.fn().mockResolvedValue({ ok: true });
    registerService('recipeService', { addShoppingListItem, toggleShoppingItemInList });
    registerPullStubs({ addShoppingListItem, toggleShoppingItemInList });

    await offlineCache.addLocalShoppingItem({
      id: 'local_shop_1',
      name: 'Sữa',
      quantity: 2,
      unit: 'hộp',
      ingredientId: 9,
      listId: 'list-1',
    });
    // User tick món đó offline -> op toggle trỏ id local.
    await outboxQueue.enqueue(
      OP_TYPES.SHOPPING_TOGGLE,
      { listId: 'list-1', itemId: 'local_shop_1' },
      'local_shop_1'
    );

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);

    // ⚠️ KHÔNG được gọi API với id local.
    expect(toggleShoppingItemInList).not.toHaveBeenCalled();
  });

  it('op toggle trỏ id SERVER -> gọi đúng endpoint toggle', async () => {
    const toggleShoppingItemInList = jest.fn().mockResolvedValue({ ok: true });
    registerService('recipeService', { toggleShoppingItemInList });
    registerPullStubs({ toggleShoppingItemInList });

    await offlineCache.saveShoppingItems([
      { id: 42, name: 'Sữa', quantity: 2, unit: 'hộp', listId: 'list-1' },
    ]);
    await outboxQueue.enqueue(
      OP_TYPES.SHOPPING_TOGGLE,
      { listId: 'list-1', itemId: 42 },
      '42'
    );

    const result = await syncEngine.syncAll({ force: true, prefetchRecipes: false });
    expect(result.uploaded).toBe(1);
    expect(toggleShoppingItemInList).toHaveBeenCalledWith('list-1', 42);
  });
});

describe('Bug shopping offline — món phải có TÊN', () => {
  beforeEach(resetAll);
  afterEach(clearRegistry);

  it('applyCache lưu tên nguyên liệu vào row pending', async () => {
    await queueMutation('recipeService', 'addShoppingListItem', [
      'list-1',
      { ingredientId: 9, name: 'Sữa tươi', quantity: 2, unit: 'hộp' },
    ]);

    const items = await offlineCache.getShoppingItems();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Sữa tươi');
    expect(items[0].quantity).toBe(2);
  });
});
