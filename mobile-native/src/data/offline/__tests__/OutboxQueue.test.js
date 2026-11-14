/**
 * OutboxQueue - hàng đợi thao tác offline.
 */

import { outboxQueue, OP_TYPES, MAX_RETRIES } from '../OutboxQueue';
import { __resetFakeDb } from './helpers/fakeSqlite';

describe('OutboxQueue - enqueue / list', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await outboxQueue.clear();
  });

  it('enqueue rồi list trả về op vừa thêm', async () => {
    const id = await outboxQueue.enqueue(
      OP_TYPES.FRIDGE_ADD,
      { name: 'Táo đỏ', quantity: 3, unit: 'quả' },
      'pending_1700000000000'
    );

    expect(id).toBeGreaterThan(0);

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].op_type).toBe(OP_TYPES.FRIDGE_ADD);
    expect(ops[0].entity_id).toBe('pending_1700000000000');
    expect(ops[0].payload).toEqual({ name: 'Táo đỏ', quantity: 3, unit: 'quả' });
    expect(ops[0].retries).toBe(0);
  });

  it('list lọc theo op_type', async () => {
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, { a: 1 });
    await outboxQueue.enqueue(OP_TYPES.SHOPPING_TOGGLE, { b: 2 });
    await outboxQueue.enqueue(OP_TYPES.SHOPPING_TOGGLE, { c: 3 });

    const shopping = await outboxQueue.list(OP_TYPES.SHOPPING_TOGGLE);
    expect(shopping).toHaveLength(2);
    expect(shopping.every((op) => op.op_type === OP_TYPES.SHOPPING_TOGGLE)).toBe(true);
  });

  it('giữ thứ tự FIFO theo created_at', async () => {
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, { n: 1 });
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { n: 2 });
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_DELETE, { n: 3 });

    const ops = await outboxQueue.list();
    expect(ops.map((op) => op.op_type)).toEqual([
      OP_TYPES.FRIDGE_ADD,
      OP_TYPES.FRIDGE_UPDATE,
      OP_TYPES.FRIDGE_DELETE,
    ]);
  });

  it('payload hỏng không làm sập list', async () => {
    const id = await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, { ok: true });
    // Ghi trực tiếp payload rác.
    await outboxQueue
      ._ensureDb()
      .then((db) =>
        db.runAsync(`UPDATE local_pending_ops SET payload = 'not-json' WHERE id = ?;`, [id])
      );

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].payload).toEqual({});
  });
});

describe('OutboxQueue - resolve / fail', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await outboxQueue.clear();
  });

  it('resolve xoá op khỏi hàng đợi', async () => {
    const id = await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, {});
    expect(await outboxQueue.count()).toBe(1);

    await outboxQueue.resolve(id);
    expect(await outboxQueue.count()).toBe(0);
  });

  it('fail tăng retries và lưu lỗi, giữ op lại', async () => {
    const id = await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, {});

    const kept = await outboxQueue.fail(id, 'Mạng lỗi');
    expect(kept).toBe(true);

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].retries).toBe(1);
    expect(ops[0].last_error).toBe('Mạng lỗi');
  });

  it('fail vượt MAX_RETRIES thì bỏ op (tránh retry vô hạn)', async () => {
    const id = await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, {});

    let kept = true;
    for (let i = 0; i <= MAX_RETRIES; i += 1) {
      kept = await outboxQueue.fail(id, 'lỗi');
    }

    expect(kept).toBe(false);
    expect(await outboxQueue.count()).toBe(0);
  });

  it('fail với permanent=true xoá op ngay', async () => {
    const id = await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, {});

    const kept = await outboxQueue.fail(id, '400 Bad Request', { permanent: true });
    expect(kept).toBe(false);
    expect(await outboxQueue.count()).toBe(0);
  });
});

describe('OutboxQueue - removeByEntity / count / clear', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await outboxQueue.clear();
  });

  it('removeByEntity xoá đúng entity', async () => {
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, {}, 'item-1');
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, {}, 'item-2');

    await outboxQueue.removeByEntity('item-1');

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].entity_id).toBe('item-2');
  });

  it('removeByEntity giới hạn theo op_type', async () => {
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, {}, 'item-1');
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_DELETE, {}, 'item-1');

    await outboxQueue.removeByEntity('item-1', OP_TYPES.FRIDGE_UPDATE);

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].op_type).toBe(OP_TYPES.FRIDGE_DELETE);
  });

  it('count trả về số op đang chờ', async () => {
    expect(await outboxQueue.count()).toBe(0);
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, {});
    await outboxQueue.enqueue(OP_TYPES.SHOPPING_TOGGLE, {});
    expect(await outboxQueue.count()).toBe(2);
  });

  it('countByType gom nhóm theo loại', async () => {
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, {});
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, {});
    await outboxQueue.enqueue(OP_TYPES.SHOPPING_TOGGLE, {});

    const byType = await outboxQueue.countByType();
    expect(byType[OP_TYPES.FRIDGE_ADD]).toBe(2);
    expect(byType[OP_TYPES.SHOPPING_TOGGLE]).toBe(1);
  });

  it('clear xoá toàn bộ hàng đợi', async () => {
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, {});
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_DELETE, {});

    await outboxQueue.clear();
    expect(await outboxQueue.count()).toBe(0);
  });
});
