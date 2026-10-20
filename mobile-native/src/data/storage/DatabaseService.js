/**
 * Database Service
 *
 * Singleton wrapper quanh expo-sqlite. Khởi tạo schema từ SCHEMA_SQL,
 * cung cấp helper CRUD cơ bản. Sprint 8 sẽ thêm local services cụ thể.
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'friggy_local.db';
const DB_VERSION = 1;

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
      this._db = db;
      if (__DEV__) {
        console.log('[DatabaseService] Initialized:', DB_NAME, 'v' + DB_VERSION);
      }
      return db;
    })();

    return this._initPromise;
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
