/**
 * B5 — OutboxQueue: dedupe (replace) + xung đột có giới hạn (bounded conflict).
 *
 * Yêu cầu nghiệp vụ:
 *   1. `enqueue(..., { replace: true })` -> xoá op cũ cùng `entity_id` + `op_type`
 *      (giống Flutter `ConflictAlgorithm.replace`) -> chỉ giữ trạng thái cuối.
 *   2. HTTP 409 -> `markConflict()` đặt `sync_state = 'conflict'`, tăng retries.
 *   3. `list()` mặc định LOẠI conflict -> tránh vòng lặp retry vô hạn.
 *   4. `clearConflict()` (user chọn "Bỏ qua") -> xoá op.
 *   5. `requeueWithVersion()` (user chọn "Thử lại") -> reset `sync_state='pending'`,
 *      `retries=0`, ghi version mới vào payload.
 */

import { outboxQueue, OP_TYPES, SYNC_STATES } from '../OutboxQueue';
import { __resetFakeDb } from './helpers/fakeSqlite';

describe('B5 — OutboxQueue dedupe (replace)', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await outboxQueue.clear();
  });

  it('replace=true -> xoá op cũ cùng entity + op_type, giữ op mới', async () => {
    await outboxQueue.enqueue(
      OP_TYPES.FRIDGE_UPDATE,
      { name: 'Táo' },
      'item-1',
      { replace: true }
    );
    await outboxQueue.enqueue(
      OP_TYPES.FRIDGE_UPDATE,
      { name: 'Táo đỏ' },
      'item-1',
      { replace: true }
    );

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].payload).toEqual({ name: 'Táo đỏ' });
  });

  it('replace chỉ áp dụng cùng op_type -> op khác loại vẫn còn', async () => {
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, { a: 1 }, 'item-1', { replace: true });
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { b: 2 }, 'item-1', { replace: true });

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(2);
    expect(ops.map((o) => o.op_type).sort()).toEqual(
      [OP_TYPES.FRIDGE_ADD, OP_TYPES.FRIDGE_UPDATE].sort()
    );
  });

  it('replace=false (mặc định) -> giữ cả 2 op', async () => {
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { a: 1 }, 'item-1');
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { a: 2 }, 'item-1');

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(2);
  });

  it('replace không đụng entity khác', async () => {
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { a: 1 }, 'item-1', { replace: true });
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { b: 2 }, 'item-2', { replace: true });

    expect(await outboxQueue.count()).toBe(2);
  });
});

describe('B5 — OutboxQueue bounded conflict', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await outboxQueue.clear();
  });

  it('markConflict đặt sync_state=conflict và tăng retries', async () => {
    const id = await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { name: 'Táo' }, 'item-1');

    await outboxQueue.markConflict(id, 'version conflict');

    const rows = await outboxQueue.listByState(SYNC_STATES.CONFLICT);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(id);
    expect(rows[0].retries).toBe(1);
    expect(rows[0].last_error).toContain('version conflict');
  });

  it('list() mặc định loại conflict (chặn retry vô hạn)', async () => {
    const id = await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, {}, 'item-1');
    await outboxQueue.markConflict(id, '409');

    expect(await outboxQueue.list()).toHaveLength(0);
    expect(await outboxQueue.list(null, { includeConflicts: true })).toHaveLength(1);
  });

  it('countPending không tính conflict, countByState(CONFLICT) thì có', async () => {
    const id = await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, {}, 'item-1');
    await outboxQueue.markConflict(id, '409');

    expect(await outboxQueue.countPending()).toBe(0);
    expect(await outboxQueue.countByState(SYNC_STATES.CONFLICT)).toBe(1);
  });

  it('clearConflict (Bỏ qua) -> xoá op khỏi hàng đợi', async () => {
    const id = await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, {}, 'item-1');
    await outboxQueue.markConflict(id, '409');

    await outboxQueue.clearConflict(id);

    expect(await outboxQueue.count()).toBe(0);
    expect(await outboxQueue.countByState(SYNC_STATES.CONFLICT)).toBe(0);
  });

  it('requeueWithVersion (Thử lại) -> reset về pending, retries=0, ghi version mới', async () => {
    const id = await outboxQueue.enqueue(
      OP_TYPES.FRIDGE_UPDATE,
      { name: 'Táo', version: 1 },
      'item-1'
    );
    await outboxQueue.markConflict(id, '409');

    const ok = await outboxQueue.requeueWithVersion(id, 7);
    expect(ok).toBe(true);

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].sync_state).toBe(SYNC_STATES.PENDING);
    expect(ops[0].retries).toBe(0);
    expect(ops[0].payload.version).toBe(7);
  });

  it('requeueWithVersion trên op không tồn tại -> false', async () => {
    expect(await outboxQueue.requeueWithVersion(9999, 1)).toBe(false);
  });
});
