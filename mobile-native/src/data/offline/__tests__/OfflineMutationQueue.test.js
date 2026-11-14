/**
 * OfflineMutationQueue - lưu thao tác ghi offline + hàng đợi.
 */

import { queueMutation, createMutationHandler } from '../OfflineMutationQueue';
import { OP_TYPES } from '../OutboxQueue';
import { offlineCache, SYNC_STATUS } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

describe('OfflineMutationQueue - tủ lạnh', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
    const { outboxQueue } = require('../OutboxQueue');
    await outboxQueue.clear();
  });

  it('addItem: lưu cache pending + đẩy hàng đợi', async () => {
    const handled = await queueMutation('fridgeService', 'addItem', [
      { name: 'Táo đỏ', ingredientId: 7, quantity: 3, unit: 'quả' },
    ]);

    expect(handled).toBe(true);

    const items = await offlineCache.getFridgeItems();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Táo đỏ');
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);

    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].op_type).toBe(OP_TYPES.FRIDGE_ADD);
    expect(ops[0].payload.name).toBe('Táo đỏ');
    expect(ops[0].payload.ingredientId).toBe(7);
  });

  it('updateItem: cập nhật số lượng trong cache + đánh dấu pending', async () => {
    await offlineCache.saveFridgeItems([{ id: 'item-1', name: 'Sữa', quantity: 1 }]);

    const handled = await queueMutation('fridgeService', 'updateItem', [
      'item-1',
      { quantity: 5, unit: 'hộp', version: 3 },
    ]);

    expect(handled).toBe(true);

    const items = await offlineCache.getFridgeItems();
    expect(items[0].quantity).toBe(5);
    expect(items[0].unit).toBe('hộp');
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);

    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    expect(ops[0].op_type).toBe(OP_TYPES.FRIDGE_UPDATE);
    expect(ops[0].entity_id).toBe('item-1');
    expect(ops[0].payload.quantity).toBe(5);
    expect(ops[0].payload.version).toBe(3);
  });

  it('markConsumed: đặt số lượng = 0 trong cache', async () => {
    await offlineCache.saveFridgeItems([{ id: 'item-1', name: 'Sữa', quantity: 2 }]);

    await queueMutation('fridgeService', 'markConsumed', ['item-1']);

    const items = await offlineCache.getFridgeItems();
    expect(items[0].quantity).toBe(0);
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);
  });

  it('deleteItem: xoá khỏi cache + đẩy hàng đợi', async () => {
    await offlineCache.saveFridgeItems([{ id: 'item-1', name: 'Sữa' }]);

    const handled = await queueMutation('fridgeService', 'deleteItem', ['item-1']);

    expect(handled).toBe(true);
    expect(await offlineCache.getFridgeItems()).toHaveLength(0);

    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    expect(ops[0].op_type).toBe(OP_TYPES.FRIDGE_DELETE);
    expect(ops[0].entity_id).toBe('item-1');
  });
});

describe('OfflineMutationQueue - shopping / slot', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
    const { outboxQueue } = require('../OutboxQueue');
    await outboxQueue.clear();
  });

  it('toggleShoppingItemInList: flip trạng thái trong cache', async () => {
    await offlineCache.saveShoppingItems([{ id: 10, name: 'Thịt', done: false, listId: 'L1' }]);

    const handled = await queueMutation('recipeService', 'toggleShoppingItemInList', ['L1', 10]);

    expect(handled).toBe(true);

    const items = await offlineCache.getShoppingItems();
    expect(items[0].done).toBe(true);
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);

    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    expect(ops[0].op_type).toBe(OP_TYPES.SHOPPING_TOGGLE);
    expect(ops[0].payload.listId).toBe('L1');
    expect(ops[0].payload.itemId).toBe(10);
  });

  it('updateSlot với completed -> queue được', async () => {
    const handled = await queueMutation('recipeService', 'updateSlot', [
      'slot-1',
      { completed: true },
    ]);

    expect(handled).toBe(true);

    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    expect(ops[0].op_type).toBe(OP_TYPES.SLOT_COMPLETE);
    expect(ops[0].payload.completed).toBe(true);
  });

  // ⚠️ P0 — `servings` phải được LƯU vào outbox.
  // Nếu không, khi sync lại BE sẽ dùng `slot.servings` (khác lúc user
  // bấm nấu) -> tủ lạnh bị trừ sai lượng.
  it('updateSlot LƯU `servings` vào outbox (trừ đúng khẩu phần khi sync lại)', async () => {
    const handled = await queueMutation('recipeService', 'updateSlot', [
      'slot-1',
      { completed: true, servings: 4 },
    ]);

    expect(handled).toBe(true);

    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    expect(ops[0].op_type).toBe(OP_TYPES.SLOT_COMPLETE);
    expect(ops[0].payload.servings).toBe(4);
  });

  it('updateSlot KHÔNG có completed -> KHÔNG queue (canQueue = false)', async () => {
    const handled = await queueMutation('recipeService', 'updateSlot', [
      'slot-1',
      { recipeId: 'r9' },
    ]);

    expect(handled).toBe(false);

    const { outboxQueue } = require('../OutboxQueue');
    expect(await outboxQueue.count()).toBe(0);
  });
});

describe('OfflineMutationQueue - method không hỗ trợ', () => {
  it('method lạ -> trả false, không queue', async () => {
    const handled = await queueMutation('fridgeService', 'getItems', []);
    expect(handled).toBe(false);
  });

  it('service lạ -> trả false', async () => {
    const handled = await queueMutation('unknownService', 'someMethod', []);
    expect(handled).toBe(false);
  });

  it('createMutationHandler tạo hàm gọi được', async () => {
    const handler = createMutationHandler('fridgeService');
    await expect(handler('deleteItem', ['x'])).resolves.toBe(true);
  });
});
