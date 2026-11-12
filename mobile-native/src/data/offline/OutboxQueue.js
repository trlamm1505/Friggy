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
 */
export const OP_TYPES = {
  FRIDGE_ADD: 'fridge_add',
  FRIDGE_UPDATE: 'fridge_update',
  FRIDGE_CONSUME: 'fridge_consume',
  FRIDGE_DELETE: 'fridge_delete',
  SHOPPING_TOGGLE: 'shopping_toggle',
  SLOT_COMPLETE: 'slot_complete',
};

/** Số lần thử tối đa trước khi bỏ op (tránh retry vô hạn). */
const MAX_RETRIES = 5;

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
   * @returns {Promise<number>} id của row vừa tạo
   */
  async enqueue(opType, payload = {}, entityId = null) {
    const db = await this._ensureDb();

    const result = await db.runAsync(
      `INSERT INTO local_pending_ops (op_type, entity_id, payload, retries, last_error, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [opType, entityId, JSON.stringify(payload ?? {}), 0, null, Date.now()]
    );

    return result?.lastInsertRowId ?? 0;
  }

  /**
   * Lấy tất cả op chưa sync, theo thứ tự tạo (FIFO - thao tác cũ hơn trước).
   *
   * @param {string} [opType] - lọc theo loại (bỏ trống = tất cả)
   * @returns {Promise<Array<{id:number,op_type:string,entity_id:string|null,payload:object,retries:number,last_error:string|null,created_at:number}>>}
   */
  async list(opType = null) {
    const db = await this._ensureDb();

    const rows = opType
      ? await db.getAllAsync(
          `SELECT * FROM local_pending_ops WHERE op_type = ? ORDER BY created_at ASC, id ASC;`,
          [opType]
        )
      : await db.getAllAsync(`SELECT * FROM local_pending_ops ORDER BY created_at ASC, id ASC;`);

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
   * ⚠️ QUYẾT ĐỊNH ĐÃ CHỐT: giữ op trong hàng đợi + hiện badge cảnh báo,
   *    KHÔNG tự ghi đè lên server (tránh mất thay đổi của người khác trong
   *    cùng gia đình). Op vẫn được thử lại ở lần sync sau.
   *
   * @param {number} id
   * @param {string} message
   */
  async markConflict(id, message) {
    const db = await this._ensureDb();
    await db.runAsync(
      `UPDATE local_pending_ops SET last_error = ?, retries = retries + 1 WHERE id = ?;`,
      [`[conflict] ${String(message ?? '').slice(0, 400)}`, id]
    );
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
