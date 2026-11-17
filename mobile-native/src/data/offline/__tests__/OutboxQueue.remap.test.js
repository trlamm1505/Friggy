/**
 * B6 + B7 — Gộp op pending của tủ lạnh + remap entity id sau khi upload.
 *
 * B6 (coalescing): item offline có id `pending_*`. Khi user sửa / tick / xoá
 *   item đó, KHÔNG tạo op update/delete riêng -> phải SỬA payload của op
 *   `FRIDGE_ADD` đang pending (hoặc xoá hẳn op đó nếu user xoá item).
 *
 * B7 (remapping): khi `FRIDGE_ADD` upload thành công, BE trả UUID thật.
 *   Các op còn lại trỏ `pending_*` -> phải remap sang UUID + ghi `version`
 *   (BE bắt buộc version khi update, optimistic locking).
 */

import { outboxQueue, OP_TYPES } from '../OutboxQueue';
import { __resetFakeDb } from './helpers/fakeSqlite';

describe('B6 — mergePayload (gộp thao tác vào op pending)', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await outboxQueue.clear();
  });

  it('mergePayload cập nhật payload của op pending cùng entity + op_type', async () => {
    await outboxQueue.enqueue(
      OP_TYPES.FRIDGE_ADD,
      { name: 'Táo đỏ', quantity: 3 },
      'pending_1'
    );

    const ok = await outboxQueue.mergePayload(OP_TYPES.FRIDGE_ADD, 'pending_1', {
      quantity: 5,
      unit: 'quả',
    });

    expect(ok).toBe(true);

    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].payload).toEqual({ name: 'Táo đỏ', quantity: 5, unit: 'quả' });
  });

  it('mergePayload trên entity không có op -> false', async () => {
    expect(await outboxQueue.mergePayload(OP_TYPES.FRIDGE_ADD, 'pending_x', { a: 1 })).toBe(false);
  });

  it('mergePayload không đụng op khác loại', async () => {
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { name: 'A' }, 'pending_1');

    expect(await outboxQueue.mergePayload(OP_TYPES.FRIDGE_ADD, 'pending_1', { name: 'B' })).toBe(
      false
    );

    const ops = await outboxQueue.list();
    expect(ops[0].payload).toEqual({ name: 'A' });
  });

  it('removeByEntity xoá op pending khi user xoá item offline', async () => {
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_ADD, { name: 'Táo' }, 'pending_1');

    await outboxQueue.removeByEntity('pending_1', OP_TYPES.FRIDGE_ADD);

    expect(await outboxQueue.count()).toBe(0);
  });
});

describe('B7 — reassignEntity (remap pending_* -> UUID server)', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await outboxQueue.clear();
  });

  it('remap entity_id của các op còn lại sang UUID thật', async () => {
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { quantity: 5 }, 'pending_1');
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_DELETE, {}, 'pending_1');
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, { quantity: 9 }, 'pending_2');

    const count = await outboxQueue.reassignEntity('pending_1', 'uuid-real-1', { version: 3 });

    expect(count).toBe(2);

    const ops = await outboxQueue.list();
    const remapped = ops.filter((op) => op.entity_id === 'uuid-real-1');
    const update = remapped.find((op) => op.op_type === OP_TYPES.FRIDGE_UPDATE);
    const del = remapped.find((op) => op.op_type === OP_TYPES.FRIDGE_DELETE);

    expect(remapped).toHaveLength(2);
    // Op UPDATE được ghi kèm `version` (BE bắt buộc version khi update).
    expect(update.payload).toEqual({ quantity: 5, version: 3 });
    // Op DELETE không cần version -> không bị ghi thêm.
    expect(del.payload).toEqual({});

    // Op của entity khác không bị đụng.
    const other = ops.find((op) => op.entity_id === 'pending_2');
    expect(other).toBeTruthy();
    expect(other.payload.version).toBeUndefined();
  });

  it('reassignEntity cùng id (old == new) -> 0, không làm gì', async () => {
    await outboxQueue.enqueue(OP_TYPES.FRIDGE_UPDATE, {}, 'pending_1');

    expect(await outboxQueue.reassignEntity('pending_1', 'pending_1', { version: 1 })).toBe(0);

    const ops = await outboxQueue.list();
    expect(ops[0].entity_id).toBe('pending_1');
    expect(ops[0].payload.version).toBeUndefined();
  });

  it('reassignEntity khi không có op nào khớp -> 0', async () => {
    expect(await outboxQueue.reassignEntity('pending_x', 'uuid-real', { version: 1 })).toBe(0);
  });

  it('reassignEntity với id rỗng -> 0 (guard)', async () => {
    expect(await outboxQueue.reassignEntity(null, 'uuid-real')).toBe(0);
    expect(await outboxQueue.reassignEntity('pending_1', null)).toBe(0);
  });
});
