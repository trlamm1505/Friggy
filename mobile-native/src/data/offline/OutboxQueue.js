/**
 * OutboxQueue - hàng đợi thao tác offline.
 *
 * Port từ Flutter: 2 bảng queue riêng
 *   - `local_pending_fridge_ops` (update/consume/delete nguyên liệu)
 *   - `local_pending_slot_completions` (tick "đã nấu")
 * RN gộp thành 1 bảng `local_pending_ops` với cột `op_type` để dễ quản lý
 * và mở rộng thêm loại thao tác mới mà không phải ALTER TABLE.
 *
 * VÌ SAO CẦN:
 *   Khi offline, user vẫn thêm/sửa/xoá/tick. Nếu không lưu lại, thao tác đó
 *   mất trắng khi app bị kill. Hàng đợi giữ lại tới khi upload thành công.
 *
 * ⚠️ VÌ SAO `op_type` DÙNG CHUỖI HẰNG SỐ:
 *   Để `SyncEngine` và `OutboxQueue` cùng hiểu 1 ngôn ngữ mà không phải import
 *   chéo (tránh vòng lặp import). Danh sách ở `OP_TYPES` bên dưới.
 *
 * R7: comment tiếng Việt.
 */

import { databaseService } from '../storage/DatabaseService';

/**
 * Các loại thao tác offline.
 *
 * - `fridge_add`     : thêm nguyên liệu mới (id local `pending_<ts>`)
 * - `fridge_update`  : sửa số lượng / đơn vị / hạn dùng
 * - `fridge_consume` : đánh dấu đã dùng hết
 * - `fridge_delete`  : xoá khỏi tủ
 * - `shopping_toggle`: tick / untick món mua
 * - `slot_complete`  : tick "đã nấu" ở meal plan
 *
 * ⚠️ v4 — bổ sung theo Flutter (đối chiếu 14/11):
 * - `allergy_add`    : thêm dị ứng khi offline (Flutter: `saveOfflineAllergy`)
 * - `allergy_delete` : xoá dị ứng khi offline (Flutter: `markPendingDelete`)
 * - `profile_update` : sửa hồ sơ khi offline (Flutter: profile `syncStatus='pending'`)
 * - `prefs_update`   : sửa tùy chọn ăn uống khi offline (Flutter: `getPendingPreferences`)
 *
 * ⚠️ v5 — bổ sung cho P1 (offline đầy đủ):
 * - `avatar_upload`      : upload avatar offline (F1)
 * - `recipe_bookmark`    : bookmark / bỏ bookmark công thức offline (F2)
 * - `shopping_item_add`  : thêm món vào danh sách mua offline (F3)
 * - `shopping_item_update`: sửa món trong danh sách mua offline (F3)
 * - `shopping_item_remove`: xoá món khỏi danh sách mua offline (F3)
 * - `notification_read`  : đánh dấu 1 thông báo đã đọc offline (F5)
 * - `notification_read_all`: đánh dấu tất cả thông báo đã đọc offline (F5)
 * - `notification_delete`: xoá 1 thông báo offline (F5)
 * - `slot_update`        : đổi công thức của 1 slot meal plan offline (F6)
 * - `onboarding_submit`  : nộp khảo sát onboarding offline (F7)
 */
export const OP_TYPES = {
  FRIDGE_ADD: 'fridge_add',
  FRIDGE_UPDATE: 'fridge_update',
  FRIDGE_CONSUME: 'fridge_consume',
  FRIDGE_DELETE: 'fridge_delete',
  SHOPPING_TOGGLE: 'shopping_toggle',
  SLOT_COMPLETE: 'slot_complete',
  ALLERGY_ADD: 'allergy_add',
  ALLERGY_DELETE: 'allergy_delete',
  PROFILE_UPDATE: 'profile_update',
  PREFS_UPDATE: 'prefs_update',
  AVATAR_UPLOAD: 'avatar_upload',
  RECIPE_BOOKMARK: 'recipe_bookmark',
  SHOPPING_ITEM_ADD: 'shopping_item_add',
  SHOPPING_ITEM_UPDATE: 'shopping_item_update',
  SHOPPING_ITEM_REMOVE: 'shopping_item_remove',
  NOTIFICATION_READ: 'notification_read',
  NOTIFICATION_READ_ALL: 'notification_read_all',
  NOTIFICATION_DELETE: 'notification_delete',
  SLOT_UPDATE: 'slot_update',
  ONBOARDING_SUBMIT: 'onboarding_submit',
};

/** Số lần thử tối đa trước khi bỏ op (tránh retry vô hạn). */
const MAX_RETRIES = 5;

/** Trạng thái đồng bộ của 1 op. */
export const SYNC_STATES = {
  /** Chờ upload. */
  PENDING: 'pending',
  /** Upload bị 409 (optimistic locking) -> chờ user xử lý. */
  CONFLICT: 'conflict',
};

class OutboxQueue {
  constructor() {
    this._db = null;
    this._initPromise = null;
  }

  /** Lazy init - chỉ mở DB khi thực sự dùng. */
  async _ensureDb() {
    if (this._db) return this._db;
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      const db = await databaseService.init();
      this._db = db;
      return db;
    })();

    return this._initPromise;
  }

  /**
   * Thêm 1 thao tác vào hàng đợi.
   *
   * @param {string} opType - xem `OP_TYPES`
   * @param {object} payload - dữ liệu cần thiết để gọi API lúc sync
   * @param {string} [entityId] - id đối tượng bị tác động (để dedupe/gỡ)
   * @param {object} [options]
   * @param {boolean} [options.replace] - true -> XOÁ op cùng `entity_id` + `op_type`
   *   rồi insert op mới (thay thế). Dùng để tránh hàng đợi phình to khi user
   *   bấm nhiều lần: bookmark bật/tắt, tick/untick, sửa nhiều lần cùng 1 item.
   *   Đối chiếu Flutter `ConflictAlgorithm.replace` trong
   *   `Mobile/lib/sqlite/services/fridge_ops_local_service.dart`.
   * @returns {Promise<number>} id của row vừa tạo
   */
  async enqueue(opType, payload = {}, entityId = null, options = {}) {
    const db = await this._ensureDb();

    // Thay thế: xoá op cũ cùng entity + cùng loại -> chỉ giữ trạng thái cuối.
    if (options.replace === true && entityId) {
      await db.runAsync(`DELETE FROM local_pending_ops WHERE entity_id = ? AND op_type = ?;`, [
        entityId,
        opType,
      ]);
    }

    const result = await db.runAsync(
      `INSERT INTO local_pending_ops (op_type, entity_id, payload, retries, last_error, sync_state, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        opType,
        entityId,
        JSON.stringify(payload ?? {}),
        0,
        null,
        SYNC_STATES.PENDING,
        Date.now(),
      ]
    );

    return result?.lastInsertRowId ?? 0;
  }

  /**
   * Gộp 1 patch vào payload của op đang chờ (không tạo op mới).
   *
   * ⚠️ VÌ SAO CẦN (B7):
   *   Item tủ lạnh tạo offline có id `pending_*` và `version = null`. BE yêu cầu
   *   `version` là `@IsInt() @Min(0)` BẮT BUỘC -> PATCH item pending sẽ 400.
   *   Nên thay vì tạo op `FRIDGE_UPDATE` riêng, ta GỘP thay đổi vào payload
   *   của op `FRIDGE_ADD` đang chờ. Khi ADD lên server -> có version thật ->
   *   các update sau mới dùng đúng version.
   *
   * @param {string} opType - loại op cần gộp (vd `OP_TYPES.FRIDGE_ADD`)
   * @param {string} entityId - entity của op
   * @param {object} patch - các field cần merge vào payload
   * @returns {Promise<boolean>} true nếu đã gộp (tìm thấy op)
   */
  async mergePayload(opType, entityId, patch = {}) {
    const db = await this._ensureDb();

    const row = await db.getFirstAsync(
      `SELECT id, payload FROM local_pending_ops
       WHERE op_type = ? AND entity_id = ? ORDER BY created_at ASC, id ASC LIMIT 1;`,
      [opType, entityId]
    );
    if (!row) return false;

    const current = OutboxQueue._parsePayload(row.payload);
    const merged = { ...current, ...patch };

    await db.runAsync(`UPDATE local_pending_ops SET payload = ? WHERE id = ?;`, [
      JSON.stringify(merged),
      row.id,
    ]);
    return true;
  }

  /**
   * Đổi entity ID của các op còn lại (vd `pending_123` -> UUID server).
   *
   * ⚠️ VÌ SAO CẦN (B6):
   *   Khi `FRIDGE_ADD` được upload thành công, BE trả về `id` UUID thật.
   *   Các op đứng sau (update/consume/delete) vẫn trỏ `pending_123` -> upload
   *   lên sẽ 404. Ta remap chúng sang UUID thật + ghi kèm `version` (BE bắt
   *   buộc version khi update).
   *
   * @param {string} oldId - entity id cũ (vd 'pending_123')
   * @param {string} newId - entity id mới (UUID server)
   * @param {object} [extraPayload] - field bổ sung ghi vào payload (vd `{ version }`)
   * @returns {Promise<number>} số op đã remap
   */
  async reassignEntity(oldId, newId, extraPayload = {}) {
    if (!oldId || !newId || oldId === newId) return 0;
    const db = await this._ensureDb();

    const rows = await db.getAllAsync(
      `SELECT id, op_type, payload FROM local_pending_ops WHERE entity_id = ?;`,
      [oldId]
    );
    if (!rows || rows.length === 0) return 0;

    let count = 0;
    for (const row of rows) {
      const payload = OutboxQueue._parsePayload(row.payload);
      // Ghi `version` vào payload các op update (BE bắt buộc version).
      const nextPayload =
        row.op_type === OP_TYPES.FRIDGE_UPDATE ? { ...payload, ...extraPayload } : payload;
      await db.runAsync(
        `UPDATE local_pending_ops SET entity_id = ?, payload = ? WHERE id = ?;`,
        [newId, JSON.stringify(nextPayload), row.id]
      );
      count += 1;
    }
    return count;
  }

  /**
   * Lấy tất cả op chưa sync, theo thứ tự tạo (FIFO - thao tác cũ hơn trước).
   *
   * @param {string} [opType] - lọc theo loại (bỏ trống = tất cả)
   * @param {object} [options]
   * @param {boolean} [options.includeConflicts] - mặc định `false` -> BỎ QUA op
   *   đã ở trạng thái `conflict` (đợi user xử lý, không retry mỗi vòng sync).
   * @returns {Promise<Array<{id:number,op_type:string,entity_id:string|null,payload:object,retries:number,last_error:string|null,sync_state:string,created_at:number}>>}
   */
  async list(opType = null, options = {}) {
    const db = await this._ensureDb();

    const includeConflicts = options.includeConflicts === true;
    const syncFilter = includeConflicts ? '' : ` AND sync_state != '${SYNC_STATES.CONFLICT}'`;

    const rows = opType
      ? await db.getAllAsync(
          `SELECT * FROM local_pending_ops WHERE op_type = ?${syncFilter} ORDER BY created_at ASC, id ASC;`,
          [opType]
        )
      : await db.getAllAsync(
          `SELECT * FROM local_pending_ops${syncFilter ? ` WHERE ${syncFilter.trim().replace(/^AND\s+/i, '')}` : ''} ORDER BY created_at ASC, id ASC;`
        );

    return (rows ?? []).map((row) => ({
      ...row,
      payload: OutboxQueue._parsePayload(row.payload),
    }));
  }

  /**
   * Lấy các op theo trạng thái (vd 'conflict').
   *
   * @param {string} state - xem `SYNC_STATES`
   * @returns {Promise<Array<object>>}
   */
  async listByState(state) {
    const db = await this._ensureDb();
    const rows = await db.getAllAsync(
      `SELECT * FROM local_pending_ops WHERE sync_state = ? ORDER BY created_at ASC, id ASC;`,
      [state]
    );
    return (rows ?? []).map((row) => ({
      ...row,
      payload: OutboxQueue._parsePayload(row.payload),
    }));
  }

  /**
   * Parse payload JSON an toàn (row hỏng không được làm sập cả queue).
   * @private
   */
  static _parsePayload(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_e) {
      return {};
    }
  }

  /**
   * Đánh dấu op đã upload thành công -> xoá khỏi hàng đợi.
   *
   * @param {number} id
   */
  async resolve(id) {
    const db = await this._ensureDb();
    await db.runAsync(`DELETE FROM local_pending_ops WHERE id = ?;`, [id]);
  }

  /**
   * Đánh dấu op thất bại -> tăng `retries`, lưu lỗi.
   *
   * ⚠️ Retry vô hạn là lỗi: op hỏng vĩnh viễn (vd 400 do payload sai) sẽ
   *   chặn mọi op sau nó. Vì vậy quá `MAX_RETRIES` -> xoá op (bỏ qua).
   *
   * @param {number} id
   * @param {string} errorMessage
   * @param {{permanent?:boolean}} [options] - `permanent: true` -> xoá ngay
   * @returns {Promise<boolean>} true nếu op còn được giữ lại
   */
  async fail(id, errorMessage, options = {}) {
    const db = await this._ensureDb();

    if (options.permanent) {
      await db.runAsync(`DELETE FROM local_pending_ops WHERE id = ?;`, [id]);
      return false;
    }

    const row = await db.getFirstAsync(`SELECT retries FROM local_pending_ops WHERE id = ?;`, [id]);
    const retries = (row?.retries ?? 0) + 1;

    if (retries > MAX_RETRIES) {
      await db.runAsync(`DELETE FROM local_pending_ops WHERE id = ?;`, [id]);
      return false;
    }

    await db.runAsync(`UPDATE local_pending_ops SET retries = ?, last_error = ? WHERE id = ?;`, [
      retries,
      String(errorMessage ?? '').slice(0, 500),
      id,
    ]);
    return true;
  }

  /**
   * Xoá TẤT CẢ op của 1 entity (dùng khi user bỏ thao tác offline).
   *
   * @param {string} entityId
   * @param {string} [opType] - giới hạn theo loại
   */
  async removeByEntity(entityId, opType = null) {
    const db = await this._ensureDb();

    if (opType) {
      await db.runAsync(`DELETE FROM local_pending_ops WHERE entity_id = ? AND op_type = ?;`, [
        entityId,
        opType,
      ]);
      return;
    }
    await db.runAsync(`DELETE FROM local_pending_ops WHERE entity_id = ?;`, [entityId]);
  }

  /**
   * Đánh dấu op bị CONFLICT (409 - optimistic locking).
   *
   * ⚠️ BOUNDED CONFLICT (B5):
   *   Op bị 409 KHÔNG được retry vô hạn - mỗi vòng sync lại thử lại sẽ tăng
   *   `retries` vô tội vạ và chặn các op sau. Vì vậy op được đánh dấu
   *   `sync_state = 'conflict'` -> `list()` mặc định BỎ QUA -> chỉ chờ user
   *   quyết định (bỏ qua / thử lại) trong modal chi tiết.
   *
   * @param {number} id
   * @param {string} message
   */
  async markConflict(id, message) {
    const db = await this._ensureDb();
    await db.runAsync(
      `UPDATE local_pending_ops
       SET last_error = ?, retries = retries + 1, sync_state = ? WHERE id = ?;`,
      [`[conflict] ${String(message ?? '').slice(0, 400)}`, SYNC_STATES.CONFLICT, id]
    );
  }

  /**
   * Bỏ qua op bị conflict (user chọn "Bỏ qua") -> xoá op khỏi hàng đợi.
   *
   * @param {number} id
   */
  async clearConflict(id) {
    const db = await this._ensureDb();
    await db.runAsync(`DELETE FROM local_pending_ops WHERE id = ?;`, [id]);
  }

  /**
   * Thử lại op bị conflict với version mới từ server (user chọn "Thử lại").
   *
   * @param {number} id
   * @param {number} [version] - version mới nhận từ server
   * @returns {Promise<boolean>} true nếu op đã được đưa lại vào hàng đợi
   */
  async requeueWithVersion(id, version) {
    const db = await this._ensureDb();

    const row = await db.getFirstAsync(
      `SELECT id, payload FROM local_pending_ops WHERE id = ?;`,
      [id]
    );
    if (!row) return false;

    const payload = OutboxQueue._parsePayload(row.payload);
    if (version !== undefined && version !== null) {
      payload.version = version;
    }

    await db.runAsync(
      `UPDATE local_pending_ops
       SET sync_state = ?, retries = 0, last_error = NULL, payload = ? WHERE id = ?;`,
      [SYNC_STATES.PENDING, JSON.stringify(payload), id]
    );
    return true;
  }

  /**
   * Đếm số op đang chờ đồng bộ (để hiện badge).
   *
   * @returns {Promise<number>}
   */
  async count() {
    try {
      const db = await this._ensureDb();
      const row = await db.getFirstAsync(`SELECT COUNT(*) as count FROM local_pending_ops;`);
      return row?.count ?? 0;
    } catch (_e) {
      return 0;
    }
  }

  /**
   * Đếm số op đang chờ đồng bộ, KHÔNG tính op conflict.
   *
   * @returns {Promise<number>}
   */
  async countPending() {
    try {
      const db = await this._ensureDb();
      const row = await db.getFirstAsync(
        `SELECT COUNT(*) as count FROM local_pending_ops WHERE sync_state != '${SYNC_STATES.CONFLICT}';`
      );
      return row?.count ?? 0;
    } catch (_e) {
      return 0;
    }
  }

  /**
   * Đếm số op đang bị CONFLICT (để badge đỏ + modal chi tiết).
   *
   * @returns {Promise<number>}
   */
  async countByState(state = SYNC_STATES.CONFLICT) {
    try {
      const db = await this._ensureDb();
      const row = await db.getFirstAsync(
        `SELECT COUNT(*) as count FROM local_pending_ops WHERE sync_state = ?;`,
        [state]
      );
      return row?.count ?? 0;
    } catch (_e) {
      return 0;
    }
  }

  /**
   * Tổng số op đang chờ, theo từng loại (để debug / badge chi tiết).
   *
   * @returns {Promise<Record<string, number>>}
   */
  async countByType() {
    try {
      const db = await this._ensureDb();
      const rows = await db.getAllAsync(
        `SELECT op_type, COUNT(*) as count FROM local_pending_ops GROUP BY op_type;`
      );
      const out = {};
      (rows ?? []).forEach((r) => {
        out[r.op_type] = r.count;
      });
      return out;
    } catch (_e) {
      return {};
    }
  }

  /**
   * Xoá toàn bộ hàng đợi (logout / reset).
   */
  async clear() {
    const db = await this._ensureDb();
    await db.runAsync(`DELETE FROM local_pending_ops;`);
  }
}

export const outboxQueue = new OutboxQueue();
export { MAX_RETRIES };
export default outboxQueue;
