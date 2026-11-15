/**
 * OfflineMutationQueue - `entity_id` phải KHỚP với id của row pending.
 *
 * ⚠️ BUG ĐÃ GẬP:
 *   `MutationHandlers.addItem` gọi `pendingId()` 2 lần: 1 lần cho `entityId`
 *   (lưu vào `local_pending_ops.entity_id`), 1 lần nữa trong `applyCache`
 *   (lưu vào `local_ingredients.id`) -> 2 ID KHÁC NHAU.
 *   Hậu quả: upload xong `removeFridgeItem(op.entity_id)` xoá id không tồn tại
 *   -> row pending mồ côi (món "ma" mãi trong tủ nhưng không còn op để sync).
 */

import { queueMutation } from '../OfflineMutationQueue';
import { OP_TYPES, outboxQueue } from '../OutboxQueue';
import { offlineCache, SYNC_STATUS } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

describe('OfflineMutationQueue - entity id khớp row pending', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
    await outboxQueue.clear();
  });

  it('addItem: entity_id trong hàng đợi == id của row pending trong cache', async () => {
    const handled = await queueMutation('fridgeService', 'addItem', [
      { name: 'Táo đỏ', ingredientId: 7, quantity: 3, unit: 'quả' },
    ]);

    expect(handled).toBe(true);

    const items = await offlineCache.getFridgeItems();
    const ops = await outboxQueue.list();

    expect(items).toHaveLength(1);
    expect(ops).toHaveLength(1);
    expect(items[0].id).toBe(ops[0].entity_id);
    expect(items[0].id).toMatch(/^pending_/);
  });

  it('nhiều lần addItem -> mỗi op có 1 row pending riêng, không trùng id', async () => {
    await queueMutation('fridgeService', 'addItem', [
      { name: 'Táo', ingredientId: 1, quantity: 1, unit: 'quả' },
    ]);
    await queueMutation('fridgeService', 'addItem', [
      { name: 'Sữa', ingredientId: 2, quantity: 1, unit: 'hộp' },
    ]);

    const items = await offlineCache.getFridgeItems();
    const ops = await outboxQueue.list();

    expect(items).toHaveLength(2);
    expect(ops).toHaveLength(2);
    expect(new Set(items.map((i) => i.id)).size).toBe(2);
    expect(new Set(ops.map((o) => o.entity_id)).size).toBe(2);

    // Mỗi row pending đều tìm được op tương ứng.
    const itemIds = items.map((i) => i.id).sort();
    const opIds = ops.map((o) => o.entity_id).sort();
    expect(itemIds).toEqual(opIds);
  });

  it('row pending của addItem có sync_status = pending', async () => {
    await queueMutation('fridgeService', 'addItem', [
      { name: 'Táo', ingredientId: 1, quantity: 1, unit: 'quả' },
    ]);

    const items = await offlineCache.getFridgeItems();
    expect(items[0]._syncStatus).toBe(SYNC_STATUS.PENDING);
  });

  it('updateItem: entity_id vẫn là id thật của item (không phải pending)', async () => {
    await offlineCache.saveFridgeItems([{ id: 'item-1', name: 'Táo', quantity: 1 }]);

    await queueMutation('fridgeService', 'updateItem', ['item-1', { quantity: 5 }]);

    const ops = await outboxQueue.list();
    expect(ops[0].op_type).toBe(OP_TYPES.FRIDGE_UPDATE);
    expect(ops[0].entity_id).toBe('item-1');
  });
});
