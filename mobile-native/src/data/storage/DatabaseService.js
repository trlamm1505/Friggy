/**
 * Database Service
 *
 * Singleton wrapper quanh expo-sqlite. Khởi tạo schema từ SCHEMA_SQL,
 * cung cấp helper CRUD cơ bản. Sprint 8 sẽ thêm local services cụ thể.
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'friggy_local.db';
const DB_VERSION = 2;

/**
 * ⚠️ TỪ DB_VERSION 2: bảng `local_*` (offline cache + hàng đợi đồng bộ).
 *
 * Port từ Flutter `Mobile/lib/sqlite/helpers/database_helper.dart` (v10).
 * RN trước đây chỉ có bảng mock (dùng cho `seedData.js`) — KHÔNG có bảng
 * nào cho offline. Bảng `pending_ops` cũ không được code nào đọc/ghi ->
 * giữ lại để không phá (mock seed không đụng tới) nhưng hàng đợi thật
 * dùng bảng `local_pending_ops`.
 *
 * Nguyên tắc đặt tên: mọi bảng offline đều có prefix `local_` để không lẫn
 * với bảng mock. Cột `sync_status` quy ước:
 *   'synced'       - đã đồng bộ từ server
 *   'pending'      - thao tác offline chờ upload
 *   'shopping_tick'- món mua đã tick offline (chỉ dùng để hiển thị)
 *   'conflict'     - upload bị 409, cần user xử lý
 */
const LOCAL_SCHEMA_SQL = [
  // ── Cache nguyên liệu trong tủ ──
  `CREATE TABLE IF NOT EXISTS local_ingredients (
    id TEXT PRIMARY KEY,
    ingredient_id INTEGER,
    name TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    storage_location TEXT,
    expires_at TEXT,
    days_until_expiry INTEGER,
    image_path TEXT,
    updated_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'synced'
  );`,

  // ── Thống kê tủ lạnh ──
  `CREATE TABLE IF NOT EXISTS local_fridge_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_spent_this_month INTEGER,
    waste_percent REAL,
    meals_cooked INTEGER,
    expiring_soon_count INTEGER,
    total_items INTEGER,
    chart_json TEXT,
    updated_at INTEGER
  );`,

  // ── Kế hoạch tuần (JSON blob) ──
  `CREATE TABLE IF NOT EXISTS local_weekly_plans (
    id TEXT PRIMARY KEY,
    week_start_date TEXT,
    days_data_json TEXT,
    updated_at INTEGER
  );`,

  // ── Danh sách mua ──
  `CREATE TABLE IF NOT EXISTS local_shopping_items (
    id TEXT PRIMARY KEY,
    ingredient_id INTEGER,
    ingredient_name TEXT,
    quantity REAL,
    unit TEXT,
    is_purchased INTEGER DEFAULT 0,
    updated_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'synced',
    list_id TEXT,
    backend_item_id INTEGER
  );`,

  // ── Chi tiết công thức (cache) ──
  `CREATE TABLE IF NOT EXISTS local_recipe_details (
    id TEXT PRIMARY KEY,
    id_type TEXT,
    detail_json TEXT,
    updated_at INTEGER
  );`,

  // ── Profile ──
  `CREATE TABLE IF NOT EXISTS local_user_profile (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    avatar_local_path TEXT,
    date_of_birth TEXT,
    gender TEXT,
    bio TEXT,
    role TEXT,
    status TEXT,
    updated_at INTEGER NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'synced'
  );`,

  // ── Tùy chọn ăn uống ──
  `CREATE TABLE IF NOT EXISTS local_user_preferences (
    id INTEGER PRIMARY KEY DEFAULT 1,
    weekly_budget INTEGER,
    daily_calorie_target INTEGER,
    dietary_style TEXT DEFAULT 'omnivore',
    prefer_simple_recipes INTEGER DEFAULT 0,
    max_cook_time_minutes INTEGER,
    skill_level TEXT DEFAULT 'beginner',
    household_size INTEGER DEFAULT 1,
    ai_personality_mode TEXT DEFAULT 'friendly',
    primary_goal TEXT,
    cooking_frequency TEXT,
    height INTEGER,
    weight INTEGER,
    activity_level TEXT,
    updated_at INTEGER NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'synced'
  );`,

  // ── Dị ứng ──
  `CREATE TABLE IF NOT EXISTS local_allergies (
    id TEXT PRIMARY KEY,
    ingredient_id INTEGER NOT NULL,
    ingredient_name TEXT NOT NULL,
    note TEXT,
    sync_status TEXT NOT NULL DEFAULT 'synced',
    updated_at INTEGER
  );`,

  // ── Danh mục nguyên liệu hệ thống ──
  `CREATE TABLE IF NOT EXISTS local_ingredient_catalog (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    english_name TEXT,
    default_unit TEXT,
    category TEXT,
    image_path TEXT,
    updated_at INTEGER
  );`,

  // ── Hàng đợi thao tác offline (thay cho `pending_ops` cũ không dùng) ──
  `CREATE TABLE IF NOT EXISTS local_pending_ops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    op_type TEXT NOT NULL,
    entity_id TEXT,
    payload TEXT,
    retries INTEGER DEFAULT 0,
    last_error TEXT,
    created_at INTEGER NOT NULL
  );`,

  // ── Index ──
  `CREATE INDEX IF NOT EXISTS idx_local_ingredients_sync ON local_ingredients(sync_status);`,
  `CREATE INDEX IF NOT EXISTS idx_local_ingredients_expiry ON local_ingredients(days_until_expiry);`,
  `CREATE INDEX IF NOT EXISTS idx_local_shopping_sync ON local_shopping_items(sync_status);`,
  `CREATE INDEX IF NOT EXISTS idx_local_catalog_name ON local_ingredient_catalog(name);`,
  `CREATE INDEX IF NOT EXISTS idx_local_pending_ops_type ON local_pending_ops(op_type);`,
];

/**
 * Migration v1 -> v2.
 *
 * RN cũ chỉ có bảng mock + 1 bảng `pending_ops` chết. Bảng `local_*` mới
 * được tạo bằng `CREATE TABLE IF NOT EXISTS` nên chạy lại nhiều lần vô hại.
 */
const MIGRATIONS = [
  {
    version: 2,
    up: async (db) => {
      for (const sql of LOCAL_SCHEMA_SQL) {
        await db.execAsync(sql);
      }
    },
  },
];

const SCHEMA_SQL = [
  // Users
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    avatar TEXT,
    birthday TEXT,
    gender TEXT,
    bio TEXT,
    join_date TEXT,
    is_family_plan INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`,

  // Fridge items
  `CREATE TABLE IF NOT EXISTS fridge_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    quantity REAL DEFAULT 0,
    unit TEXT,
    expiry_date TEXT,
    status TEXT,
    image TEXT,
    compartment TEXT DEFAULT 'fridge',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`,

  // Fridge stats (cached)
  `CREATE TABLE IF NOT EXISTS fridge_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,
    expired_count INTEGER DEFAULT 0,
    available_count INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`,

  // Weekly plans
  `CREATE TABLE IF NOT EXISTS weekly_plans (
    id TEXT PRIMARY KEY,
    week_start TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`,

  // Meal slots (1 plan có nhiều slot)
  `CREATE TABLE IF NOT EXISTS meal_slots (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    slot_type TEXT NOT NULL,
    recipe_id TEXT,
    recipe_name TEXT,
    recipe_image TEXT,
    cook_time INTEGER,
    cooked INTEGER DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES weekly_plans(id) ON DELETE CASCADE
  );`,

  // Notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    type TEXT,
    title TEXT,
    message TEXT,
    time TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`,

  // User preferences
  `CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY DEFAULT 1,
    diet TEXT,
    spice_level TEXT,
    cooking_time INTEGER,
    servings INTEGER
  );`,

  // Allergies
  `CREATE TABLE IF NOT EXISTS allergies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    severity TEXT
  );`,

  // Family members
  `CREATE TABLE IF NOT EXISTS family_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    avatar TEXT
  );`,

  // Shopping items
  `CREATE TABLE IF NOT EXISTS shopping_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    quantity REAL DEFAULT 0,
    unit TEXT,
    done INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`,

  // Weekly stats
  `CREATE TABLE IF NOT EXISTS weekly_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,
    week_data TEXT,
    total INTEGER DEFAULT 0,
    previous_week INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`,

  // Pending operations queue (for offline sync)
  `CREATE TABLE IF NOT EXISTS pending_ops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    op_type TEXT NOT NULL,
    payload TEXT,
    retries INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_fridge_status ON fridge_items(status);`,
  `CREATE INDEX IF NOT EXISTS idx_fridge_compartment ON fridge_items(compartment);`,
  `CREATE INDEX IF NOT EXISTS idx_fridge_expiry ON fridge_items(expiry_date);`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);`,
  `CREATE INDEX IF NOT EXISTS idx_meal_slots_plan ON meal_slots(plan_id);`,
];

class DatabaseService {
  constructor() {
    this._db = null;
    this._initPromise = null;
  }

  /**
   * Khởi tạo database - lazy, an toàn gọi nhiều lần
   */
  async init() {
    if (this._db) return this._db;
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      // Bật foreign keys
      await db.execAsync('PRAGMA foreign_keys = ON;');
      // Tạo schema
      for (const sql of SCHEMA_SQL) {
        await db.execAsync(sql);
      }
      // Migration (offline tables)
      await this._runMigrations(db);
      this._db = db;
      if (__DEV__) {
        console.log('[DatabaseService] Initialized:', DB_NAME, 'v' + DB_VERSION);
      }
      return db;
    })();

    return this._initPromise;
  }

  /**
   * Chạy các migration còn thiếu.
   *
   * ⚠️ VÌ SAO KHÔNG DÙNG `PRAGMA user_version`:
   *   `expo-sqlite` không expose API đọc/ghi `user_version` một cách đáng tin
   *   cậy trên mọi platform. Thay vào đó ta dùng bảng `local_meta` để lưu
   *   version đã áp dụng -> idempotent, chạy lại nhiều lần vô hại.
   *
   * @private
   */
  async _runMigrations(db) {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS local_meta (key TEXT PRIMARY KEY, value TEXT);`
    );

    const row = await db.getFirstAsync(
      `SELECT value FROM local_meta WHERE key = 'db_version';`
    );
    const current = row ? Number(row.value) : 1;

    if (current >= DB_VERSION) return;

    for (const migration of MIGRATIONS) {
      if (migration.version <= current) continue;
      await migration.up(db);
      if (__DEV__) {
        console.log(`[DatabaseService] Migration v${current} -> v${migration.version}`);
      }
    }

    await db.runAsync(
      `INSERT OR REPLACE INTO local_meta (key, value) VALUES ('db_version', ?);`,
      [String(DB_VERSION)]
    );
  }

  /**
   * Chạy nhiều thao tác trong 1 transaction (atomic).
   *
   * ⚠️ `expo-sqlite` (SDK 54+) có `withTransactionAsync`; các phiên bản cũ
   *   không có -> fallback sang gọi tuần tự (không atomic nhưng vẫn chạy).
   *
   * @param {(tx: object) => Promise<void>} fn
   */
  async withTransaction(fn) {
    await this.init();
    const db = this._db;

    if (typeof db.withTransactionAsync === 'function') {
      await db.withTransactionAsync(async () => {
        await fn(db);
      });
      return;
    }

    // Fallback: không atomic.
    await fn(db);
  }

  /**
   * Lấy db instance (phải gọi init() trước)
   */
  get db() {
    if (!this._db) {
      throw new Error('DatabaseService chưa được init. Gọi await DatabaseService.instance.init() trước.');
    }
    return this._db;
  }

  /**
   * Helper: query all
   */
  async queryAll(sql, params = []) {
    await this.init();
    return await this._db.getAllAsync(sql, params);
  }

  /**
   * Helper: query one
   */
  async queryOne(sql, params = []) {
    await this.init();
    return await this._db.getFirstAsync(sql, params);
  }

  /**
   * Helper: insert
   */
  async insert(table, values) {
    await this.init();
    const keys = Object.keys(values);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const params = keys.map((k) => values[k]);
    return await this._db.runAsync(sql, params);
  }

  /**
   * Helper: update
   */
  async update(table, values, where, whereArgs = []) {
    await this.init();
    const sets = Object.keys(values).map((k) => `${k} = ?`).join(', ');
    const params = [...Object.values(values), ...whereArgs];
    const sql = `UPDATE ${table} SET ${sets} WHERE ${where}`;
    return await this._db.runAsync(sql, params);
  }

  /**
   * Helper: delete
   */
  async delete(table, where, whereArgs = []) {
    await this.init();
    const sql = `DELETE FROM ${table} WHERE ${where}`;
    return await this._db.runAsync(sql, whereArgs);
  }

  /**
   * Đóng database (gọi khi logout / cleanup)
   */
  async close() {
    if (this._db) {
      await this._db.closeAsync();
      this._db = null;
      this._initPromise = null;
    }
  }

  /**
   * Drop tất cả tables (dev only)
   */
  async dropAllTables() {
    await this.init();
    const tables = [
      'fridge_items', 'fridge_stats', 'weekly_plans', 'meal_slots',
      'notifications', 'user_preferences', 'allergies', 'family_members',
      'shopping_items', 'weekly_stats', 'pending_ops', 'users',
      // Bảng offline (Phase 0) - phải xoá cả khi reset cache local.
      'local_ingredients', 'local_fridge_stats', 'local_weekly_plans',
      'local_shopping_items', 'local_recipe_details', 'local_user_profile',
      'local_user_preferences', 'local_allergies', 'local_ingredient_catalog',
      'local_pending_ops', 'local_meta',
    ];
    for (const t of tables) {
      await this._db.execAsync(`DROP TABLE IF EXISTS ${t};`);
    }
    // Recreate schema
    this._db = null;
    this._initPromise = null;
    await this.init();
  }
}

export const databaseService = new DatabaseService();
export default databaseService;
