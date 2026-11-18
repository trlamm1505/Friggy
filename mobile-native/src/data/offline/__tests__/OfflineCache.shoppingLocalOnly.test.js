/**
 * Test cho contract "món mua CHỈ CÓ Ở MÁY" + "món có id server đã sửa lượng".
 *
 * ⚠️ BE THẬT (đọc file `be/src/modules-api/meal-planning/`):
 *   - KHÔNG có `POST   /meal-planning/shopping-lists/{listId}/items`
 *   - KHÔNG có `DELETE /meal-planning/shopping-lists/{listId}/items/{itemId}`
 *   - KHÔNG có `POST   /meal-planning/slots/{slotId}/missing-to-shopping-list`
 *   - KHÔNG có `GET    /meal-planning/shopping-lists/active`
 *   - `PATCH /meal-planning/shopping-lists/{listId}/items/{itemId}` KHÔNG có
 *     `@Body()` -> TOGGLE `isPurchased` + tự thêm món vào tủ lạnh.
 *     `itemId` dùng `ParseIntPipe` -> id local (`local_*`) sẽ bị 400.
 *
 * => Món user TỰ THÊM (không có id server) phải tick 100% ở client.
 * => Món CÓ id server thì vẫn tick qua API (BE có endpoint), kể cả khi user
 *    đã sửa lượng ở máy (row bị đánh dấu `local_only`).
 */

import { offlineCache, SYNC_STATUS } from '../OfflineCache';
import { queueMutation } from '../OfflineMutationQueue';
import { outboxQueue, OP_TYPES } from '../OutboxQueue';
import { __resetFakeDb } from './helpers/fakeSqlite';

const resetAll = async () => {
  __resetFakeDb();
  await offlineCache.clearCache();
  await outboxQueue.clear();
};

describe('Món mua chỉ có ở máy — KHÔNG gọi endpoint BE không tồn tại', () => {
  beforeEach(resetAll);

  it('isShoppingItemLocalOnly: món user tự thêm -> true', async () => {
    await offlineCache.addLocalShoppingItem({
      id: 'local_shop_1',
      name: 'Sữa',
      quantity: 2,
      unit: 'hộp',
      listId: 'list-1',
    });

    await expect(offlineCache.isShoppingItemLocalOnly('local_shop_1')).resolves.toBe(true);
  });

  it('isShoppingItemLocalOnly: món CÓ id server -> false (dù đã sửa lượng ở máy)', async () => {
    await offlineCache.saveShoppingItems([
      { id: 42, name: 'Sữa', quantity: 2, unit: 'hộp', listId: 'list-1' },
    ]);

    // User sửa lượng ở máy -> row chuyển `local_only`.
    await offlineCache.updateShoppingItemQuantityLocal(42, 5);

    await expect(offlineCache.isShoppingItemLocalOnly(42)).resolves.toBe(false);
  });

  it('isShoppingItemLocalOnly: món không có trong cache -> false', async () => {
    await expect(offlineCache.isShoppingItemLocalOnly(999)).resolves.toBe(false);
  });

  it('toggle món local -> giữ nguyên `local_only`, KHÔNG đổi sang `pending`', async () => {
    await offlineCache.addLocalShoppingItem({
      id: 'local_shop_1',
      name: 'Sữa',
      quantity: 2,
      unit: 'hộp',
      listId: 'list-1',
    });

    await offlineCache.toggleLocalShoppingItem('local_shop_1');

    const items = await offlineCache.getShoppingItems();
    expect(items).toHaveLength(1);
    expect(items[0].done).toBe(true);
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.LOCAL_ONLY);
  });

  it('queue toggle món local -> KHÔNG đẩy hàng đợi (BE sẽ 400 do ParseIntPipe)', async () => {
    await offlineCache.addLocalShoppingItem({
      id: 'local_shop_1',
      name: 'Sữa',
      quantity: 2,
      unit: 'hộp',
      listId: 'list-1',
    });

    const handled = await queueMutation('recipeService', 'toggleShoppingItemInList', [
      'list-1',
      'local_shop_1',
    ]);

    // Handler xử lý được (tick ở client) -> không ném lỗi ra UI.
    expect(handled).toBe(true);

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(0);
  });

  it('queue toggle món CÓ id server -> đẩy hàng đợi để đồng bộ lên BE', async () => {
    await offlineCache.saveShoppingItems([
      { id: 42, name: 'Sữa', quantity: 2, unit: 'hộp', listId: 'list-1' },
    ]);

    await queueMutation('recipeService', 'toggleShoppingItemInList', ['list-1', 42]);

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].op_type).toBe(OP_TYPES.SHOPPING_TOGGLE);
  });

  it('món CÓ id server đã sửa lượng -> tick VẪN đồng bộ lên BE (không bị chặn)', async () => {
    await offlineCache.saveShoppingItems([
      { id: 42, name: 'Sữa', quantity: 2, unit: 'hộp', listId: 'list-1' },
    ]);
    await offlineCache.updateShoppingItemQuantityLocal(42, 5);

    await queueMutation('recipeService', 'toggleShoppingItemInList', ['list-1', 42]);

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);

    // Trạng thái sau tick phải là 'pending' (đang chờ upload) -> không 'local_only'.
    const items = await offlineCache.getShoppingItems();
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);
  });

  it('sửa lượng món đang chờ tick -> GIỮ `pending` (không mất trạng thái tick)', async () => {
    await offlineCache.saveShoppingItems([
      { id: 42, name: 'Sữa', quantity: 2, unit: 'hộp', listId: 'list-1' },
    ]);
    await offlineCache.setShoppingItemPurchased(42, true, 'list-1');

    await offlineCache.updateShoppingItemQuantityLocal(42, 5);

    const items = await offlineCache.getShoppingItems();
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);
    expect(items[0].done).toBe(true);
    expect(items[0].quantity).toBe(5);
  });

  it('sửa lượng món CHỈ có ở máy -> giữ `local_only`', async () => {
    await offlineCache.addLocalShoppingItem({
      id: 'local_shop_1',
      name: 'Sữa',
      quantity: 2,
      unit: 'hộp',
      listId: 'list-1',
    });

    await offlineCache.updateShoppingItemQuantityLocal('local_shop_1', 5);

    const items = await offlineCache.getShoppingItems();
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.LOCAL_ONLY);
    expect(items[0].quantity).toBe(5);
  });

  it('xoá món ở máy -> tombstone `local_deleted`, KHÔNG còn trong cache đọc', async () => {
    await offlineCache.saveShoppingItems([
      { id: 42, name: 'Sữa', quantity: 2, unit: 'hộp', listId: 'list-1' },
    ]);

    await offlineCache.markShoppingItemLocallyDeleted(42);

    const items = await offlineCache.getShoppingItems();
    expect(items).toHaveLength(0);
  });

  it('món đã xoá ở máy KHÔNG bị "hồi sinh" khi pull danh sách từ server', async () => {
    await offlineCache.saveShoppingItems([
      { id: 42, name: 'Sữa', quantity: 2, unit: 'hộp', listId: 'list-1' },
    ]);
    await offlineCache.markShoppingItemLocallyDeleted(42);

    // Bật mạng -> server vẫn trả món đó (BE không có endpoint xoá món lẻ).
    await offlineCache.saveShoppingItems([
      { id: 42, name: 'Sữa', quantity: 2, unit: 'hộp', listId: 'list-1' },
    ]);

    const items = await offlineCache.getShoppingItems();
    expect(items).toHaveLength(0);
  });

  it('RealRecipeService.getShoppingList LỌC món đã xoá ở máy (không hồi sinh)', async () => {
    const { RealRecipeService } = require('../../services/real/RealRecipeService');

    // Server vẫn trả món đã bị user xoá ở máy.
    await offlineCache.saveShoppingItems([
      { id: 42, name: 'Sữa', quantity: 2, unit: 'hộp', listId: 'list-1' },
      { id: 43, name: 'Muối', quantity: 1, unit: 'g', listId: 'list-1' },
    ]);
    await offlineCache.markShoppingItemLocallyDeleted(42);

    const svc = new RealRecipeService();
    svc.client = {
      get: jest.fn().mockResolvedValue([
        {
          id: 'list-1',
          title: 'Tuần này',
          status: 'active',
          items: [
            { id: 42, ingredientName: 'Sữa', quantity: 2, unit: 'hộp', isPurchased: false },
            { id: 43, ingredientName: 'Muối', quantity: 1, unit: 'g', isPurchased: false },
          ],
        },
      ]),
    };

    const items = await svc.getShoppingList();

    expect(items.map((i) => String(i.id))).toEqual(['43']);
  });
});
