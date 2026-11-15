/**
 * OfflineUserMutations - hồi quy cho nhóm "dị ứng / hồ sơ / sở thích" offline.
 *
 * Đối chiếu Flutter 14/11:
 *   - `allergy_local_service.dart`      -> thêm / xoá dị ứng offline
 *   - `user_profile_local_service.dart` -> sửa hồ sơ offline
 *   - `user_preference_local_service.dart` -> sửa sở thích offline
 *
 * RN dùng chung bảng `local_pending_ops` (outbox) thay vì cột `sync_status`
 * riêng như Flutter -> phải kiểm tra cả 2 lớp: cache local + hàng đợi.
 */

import { queueMutation } from '../OfflineMutationQueue';
import { OP_TYPES } from '../OutboxQueue';
import { offlineCache, SYNC_STATUS } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

const clearAll = async () => {
  __resetFakeDb();
  await offlineCache.clearCache();
  const { outboxQueue } = require('../OutboxQueue');
  await outboxQueue.clear();
};

// ═══════════════ DỊ ỨNG ═══════════════

describe('OfflineUserMutations - dị ứng', () => {
  beforeEach(clearAll);

  it('addAllergy: lưu row pending + đẩy hàng đợi', async () => {
    const handled = await queueMutation('userService', 'addAllergy', [7, 'Dị ứng nặng']);

    expect(handled).toBe(true);

    const allergies = await offlineCache.getAllergies();
    expect(allergies).toHaveLength(1);
    expect(allergies[0].ingredientId).toBe(7);
    expect(allergies[0].note).toBe('Dị ứng nặng');
    expect(allergies[0]._syncStatus).toBe(SYNC_STATUS.PENDING);

    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].op_type).toBe(OP_TYPES.ALLERGY_ADD);
    expect(ops[0].payload.ingredientId).toBe(7);
    expect(ops[0].payload.note).toBe('Dị ứng nặng');
  });

  it('addAllergy: id pending phải khớp entity_id của hàng đợi', async () => {
    await queueMutation('userService', 'addAllergy', [7, null]);

    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    const allergies = await offlineCache.getAllergies();

    // Khớp -> upload xong xoá được row pending (không còn dị ứng "ma").
    expect(allergies[0].id).toBe(ops[0].entity_id);
  });

  it('addAllergy: ingredientId không hợp lệ -> KHÔNG queue', async () => {
    const handled = await queueMutation('userService', 'addAllergy', [0, null]);
    expect(handled).toBe(false);

    const { outboxQueue } = require('../OutboxQueue');
    expect(await outboxQueue.count()).toBe(0);
  });

  it('removeAllergy: đánh dấu pending_delete -> ẨN khỏi UI', async () => {
    await offlineCache.saveAllergies([{ id: 'a1', ingredientId: 5, name: 'Tôm' }]);

    const handled = await queueMutation('userService', 'removeAllergy', ['a1']);

    expect(handled).toBe(true);

    // Row vẫn còn trong DB (chờ DELETE server) nhưng UI không hiện nữa.
    const allergies = await offlineCache.getAllergies();
    expect(allergies).toHaveLength(0);

    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    expect(ops[0].op_type).toBe(OP_TYPES.ALLERGY_DELETE);
    expect(ops[0].entity_id).toBe('a1');
  });

  it('removeAllergy: id tạm (pending_*) -> KHÔNG queue (không có trên server)', async () => {
    const handled = await queueMutation('userService', 'removeAllergy', ['pending_123']);
    expect(handled).toBe(false);

    const { outboxQueue } = require('../OutboxQueue');
    expect(await outboxQueue.count()).toBe(0);
  });

  it('thêm 2 dị ứng rồi xoá 1 -> còn đúng 1 dị ứng trong UI', async () => {
    await queueMutation('userService', 'addAllergy', [5, null]);
    await queueMutation('userService', 'addAllergy', [6, null]);
    await offlineCache.upsertAllergy({ id: 'srv-1', ingredientId: 9, name: 'Đậu' });

    await queueMutation('userService', 'removeAllergy', ['srv-1']);

    const allergies = await offlineCache.getAllergies();
    expect(allergies).toHaveLength(2);
    expect(allergies.map((a) => a.ingredientId).sort()).toEqual([5, 6]);
  });

  it('upsertAllergy KHÔNG xoá các dị ứng đã sync khác', async () => {
    await offlineCache.saveAllergies([
      { id: 'a1', ingredientId: 5, name: 'Tôm' },
      { id: 'a2', ingredientId: 6, name: 'Lạc' },
    ]);

    await offlineCache.upsertAllergy({ id: 'a1', ingredientId: 5, name: 'Tôm hải' });

    const allergies = await offlineCache.getAllergies();
    expect(allergies).toHaveLength(2);
    expect(allergies.find((a) => a.id === 'a1').name).toBe('Tôm hải');
  });
});

// ═══════════════ HỒ SƠ ═══════════════

describe('OfflineUserMutations - hồ sơ', () => {
  beforeEach(clearAll);

  it('updateProfile: lưu cache + đánh dấu pending + đẩy hàng đợi', async () => {
    await offlineCache.saveUserProfile({ name: 'Cũ', email: 'a@b.com' });

    const handled = await queueMutation('userService', 'updateProfile', [
      { name: 'Mới', birthday: '1995-01-02', gender: 'female', bio: 'Hello' },
    ]);

    expect(handled).toBe(true);

    const profile = await offlineCache.getUserProfile();
    expect(profile.name).toBe('Mới');
    expect(profile.email).toBe('a@b.com'); // giữ field cũ
    expect(profile.birthday).toBe('1995-01-02');
    expect(profile._syncStatus).toBe(SYNC_STATUS.PENDING);

    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    expect(ops[0].op_type).toBe(OP_TYPES.PROFILE_UPDATE);
    expect(ops[0].entity_id).toBe('me');
    expect(ops[0].payload.name).toBe('Mới');
    expect(ops[0].payload.dateOfBirth).toBe('1995-01-02');
  });
});

// ═══════════════ SỞ THÍCH ═══════════════

describe('OfflineUserMutations - sở thích', () => {
  beforeEach(clearAll);

  it('updatePreferences: lưu cache + đánh dấu pending + đẩy hàng đợi', async () => {
    await offlineCache.saveUserPreferences({ weeklyBudget: 1_000_000, dietaryStyle: 'normal' });

    const handled = await queueMutation('userService', 'updatePreferences', [
      { weeklyBudget: 2_000_000, dietaryStyle: 'vegetarian', preferSimpleRecipes: true },
    ]);

    expect(handled).toBe(true);

    const prefs = await offlineCache.getUserPreferences();
    expect(prefs.weeklyBudget).toBe(2_000_000);
    expect(prefs.dietaryStyle).toBe('vegetarian');
    expect(prefs.preferSimpleRecipes).toBe(true);
    expect(prefs._syncStatus).toBe(SYNC_STATUS.PENDING);

    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    expect(ops[0].op_type).toBe(OP_TYPES.PREFS_UPDATE);
    expect(ops[0].entity_id).toBe('me');
    expect(ops[0].payload.weeklyBudget).toBe(2_000_000);
  });
});
