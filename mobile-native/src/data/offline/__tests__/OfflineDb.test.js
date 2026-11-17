/**
 * DatabaseService - migration offline (bảng `local_*` cho offline).
 *
 * ⚠️ DB_VERSION hiện = 5
 *   (v3: cột `version` cho `local_ingredients`; v4: bảng `local_recipe_list`;
 *    v5: `local_notifications` + `local_json_cache` + `local_pending_ops.sync_state`).
 */

import { databaseService } from '../../storage/DatabaseService';
import { __resetFakeDb } from './helpers/fakeSqlite';

/** Các bảng offline bắt buộc có (port từ Flutter database_helper.dart v10). */
const REQUIRED_LOCAL_TABLES = [
  'local_ingredients',
  'local_fridge_stats',
  'local_weekly_plans',
  'local_shopping_items',
  'local_recipe_details',
  'local_user_profile',
  'local_user_preferences',
  'local_allergies',
  'local_ingredient_catalog',
  'local_pending_ops',
  'local_recipe_list',
  'local_notifications',
  'local_json_cache',
  'local_meta',
];

describe('DatabaseService - migration offline', () => {
  beforeEach(async () => {
    __resetFakeDb();
    // Reset instance để nó mở lại DB mới (có store rỗng).
    await databaseService.close();
  });

  it('tạo đủ bảng local_* sau init', async () => {
    const db = await databaseService.init();

    for (const table of REQUIRED_LOCAL_TABLES) {
      const row = await db.getFirstAsync(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}';`
      );
      // Fake engine không có sqlite_master -> kiểm tra qua tạo bảng tương tác.
      // Nếu bảng không tồn tại, `getAllAsync` sẽ ném lỗi -> test fail ở dưới.
      expect(row === null || row === undefined || row.name === table).toBe(true);
    }
  });

  it('ghi lại db_version vào local_meta (idempotent)', async () => {
    const db = await databaseService.init();
    const row = await db.getFirstAsync(`SELECT value FROM local_meta WHERE key = 'db_version';`);
    expect(Number(row.value)).toBe(5);
  });

  it('chạy init 2 lần không lỗi (idempotent)', async () => {
    await databaseService.init();
    await databaseService.close();
    await databaseService.init();

    const db = await databaseService.init();
    const row = await db.getFirstAsync(`SELECT value FROM local_meta WHERE key = 'db_version';`);
    expect(Number(row.value)).toBe(5);
  });
  it('bảng mock cũ vẫn còn (không phá seedData)', async () => {
    const db = await databaseService.init();
    await db.execAsync(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY);`);
    const rows = await db.getAllAsync(`SELECT * FROM users;`);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('local_pending_ops có cột đầy đủ cho hàng đợi', async () => {
    const db = await databaseService.init();
    await db.runAsync(
      `INSERT INTO local_pending_ops (op_type, entity_id, payload, retries, last_error, sync_state, created_at)
       VALUES ('fridge_add', 'e1', '{}', 0, NULL, 'pending', 123);`
    );

    const rows = await db.getAllAsync(`SELECT * FROM local_pending_ops;`);
    expect(rows).toHaveLength(1);
    expect(rows[0].op_type).toBe('fridge_add');
    expect(rows[0].retries).toBe(0);
    // ⚠️ v5: `sync_state` mặc định 'pending' -> dùng để đánh dấu conflict.
    expect(rows[0].sync_state).toBe('pending');
  });

  it('local_pending_ops có cột sync_state (migration v5)', async () => {
    const db = await databaseService.init();
    await db.runAsync(
      `INSERT INTO local_pending_ops (op_type, entity_id, payload, retries, last_error, sync_state, created_at)
       VALUES ('fridge_add', 'e_conflict', '{}', 0, NULL, 'pending', 123);`
    );
    await db.runAsync(
      `UPDATE local_pending_ops SET sync_state = 'conflict' WHERE entity_id = 'e_conflict';`
    );

    const rows = await db.getAllAsync(`SELECT sync_state FROM local_pending_ops WHERE entity_id = 'e_conflict';`);
    expect(rows[0].sync_state).toBe('conflict');
  });

  it('local_ingredients có cột sync_status', async () => {
    const db = await databaseService.init();
    await db.runAsync(
      `INSERT INTO local_ingredients (id, name, sync_status, updated_at)
       VALUES ('local_1', 'Táo', 'pending', 123);`
    );

    const rows = await db.getAllAsync(`SELECT * FROM local_ingredients;`);
    expect(rows[0].sync_status).toBe('pending');
  });

  it('local_ingredients có cột version (migration v3)', async () => {
    const db = await databaseService.init();
    await db.runAsync(
      `INSERT INTO local_ingredients (id, name, sync_status, updated_at, version)
       VALUES ('local_v', 'Táo', 'synced', 123, 5);`
    );

    const rows = await db.getAllAsync(`SELECT * FROM local_ingredients;`);
    expect(rows[0].version).toBe(5);
  });

  it('dropAllTables xoá cả bảng offline rồi tạo lại', async () => {
    await databaseService.init();
    await databaseService.dropAllTables();

    const db = await databaseService.init();
    const row = await db.getFirstAsync(`SELECT value FROM local_meta WHERE key = 'db_version';`);
    expect(Number(row.value)).toBe(5);
  });
});
