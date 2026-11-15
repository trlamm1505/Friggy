/**
 * OfflineCache - tầng cache local (SQLite) cho toàn bộ domain.
 *
 * Port từ Flutter: 11 file `Mobile/lib/sqlite/services/*_local_service.dart`
 * gộp lại thành 1 module thuận tiện cho RN.
 *
 * VÌ SAO CẦN:
 *   Khi offline, app phải hiển thị DỮ LIỆU THẬT đã tải về trước đó, chứ
 *   không phải dữ liệu giả. Hiện tại `SafeService` fallback sang MOCK khi
 *   lỗi network -> user thấy tủ lạnh ảo, món ảo (nặng hơn Flutter).
 *   Module này là nguồn dữ liệu thay thế khi offline.
 *
 * ⚠️ NGUYÊN TẮC (giữ đúng tinh thần Flutter):
 *   1. Cache chỉ là BẢN SAO. Nguồn sự thật vẫn là server.
 *   2. Ghi vào cache KHÔNG BAO GIỜ được làm hỏng luồng chính: mọi lỗi
 *      SQLite bị nuốt + log, không ném lên UI (offline cache là tiện ích,
 *      lỗi cache = mất tiện ích, KHÔNG phải lỗi chức năng).
 *   3. Item offline (chưa sync) được giữ riêng với `sync_status`:
 *      - 'synced'       : đã đồng bộ từ server
 *      - 'pending'      : thao tác offline chờ upload
 *      - 'shopping_tick': món mua đã tick offline (chỉ để hiển thị)
 *      - 'conflict'     : upload bị 409, cần user xử lý
 *   4. Khi pull dữ liệu mới từ server, KHÔNG xoá các row 'pending' (giống
 *      `IngredientLocalService.saveIngredientsCache` của Flutter).
 *
 * R7: comment tiếng Việt.
 */

import { databaseService } from '../storage/DatabaseService';

/** Quy ước `sync_status`. */
export const SYNC_STATUS = {
  SYNCED: 'synced',
  PENDING: 'pending',
  SHOPPING_TICK: 'shopping_tick',
  CONFLICT: 'conflict',
  /**
   * Dị ứng đã bấm xoá khi offline -> ẩn khỏi UI nhưng CHƯA xoá trên server.
   * Đồng bộ với Flutter `markPendingDelete` (`AllergyLocalService`).
   */
  PENDING_DELETE: 'pending_delete',
};

const now = () => Date.now();

/** Parse JSON an toàn - row hỏng không được làm sập cả cache. */
const safeParse = (raw, fallback = null) => {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (_e) {
    return fallback;
  }
};

class OfflineCache {
  constructor() {
    this._db = null;
    this._initPromise = null;
  }

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

  // ══════════════════════════════════════════════════════════════════
  // TỦ LẠNH — local_ingredients
  // ══════════════════════════════════════════════════════════════════

  /**
   * Thay toàn bộ cache nguyên liệu bằng dữ liệu mới từ server.
   *
   * ⚠️ GIỮ LẠI các row 'pending' (thao tác offline chưa upload) - nếu xoá,
   *   user mất món vừa thêm khi offline.
   *
   * ⚠️ `items` RỖNG vẫn phải xoá row 'synced': server đã xoá hết item ->
   *   cache phải phản ánh "tủ trống", nếu không user sẽ thấy món cũ offline.
   *
   * @param {Array<object>} items - shape UI `FridgeItem`
   * @returns {Promise<number>} số row đã ghi
   */
  async saveFridgeItems(items) {
    if (!Array.isArray(items)) return 0;

    await this._ensureDb();
    const timestamp = now();

    await databaseService.withTransaction(async (tx) => {
      // Chỉ xoá row đã đồng bộ (giữ 'pending', 'shopping_tick', 'conflict').
      await tx.runAsync(`DELETE FROM local_ingredients WHERE sync_status = ?;`, [
        SYNC_STATUS.SYNCED,
      ]);

      for (const item of items) {
        if (!item?.id) continue;

        await tx.runAsync(
          `INSERT OR REPLACE INTO local_ingredients
             (id, ingredient_id, name, quantity, unit, storage_location, expires_at,
              days_until_expiry, image_path, updated_at, sync_status, version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            String(item.id),
            item.ingredientId ?? null,
            item.name ?? '',
            item.quantity ?? null,
            item.unit ?? null,
            item.compartment ?? null,
            item.expiryDate ?? null,
            item.daysUntilExpiry ?? null,
            item.image ?? null,
            timestamp,
            SYNC_STATUS.SYNCED,
            item.version ?? null,
          ]
        );
      }
    });

    return items.length;
  }

  /**
   * Đọc cache nguyên liệu (gồm cả row 'pending' để hiện optimistic).
   *
   * @returns {Promise<Array<object>>} shape UI `FridgeItem`
   */
  async getFridgeItems() {
    const db = await this._ensureDb();
    const rows = await db.getAllAsync(`SELECT * FROM local_ingredients ORDER BY expires_at ASC;`);

    return (rows ?? []).map((row) => ({
      id: row.id,
      name: row.name ?? '',
      image: row.image_path ?? null,
      quantity: row.quantity ?? 0,
      unit: row.unit ?? '',
      compartment: row.storage_location ?? null,
      status: OfflineCache._statusFromDays(row.days_until_expiry),
      expiryDate: row.expires_at ?? null,
      daysUntilExpiry: row.days_until_expiry ?? null,
      ingredientId: row.ingredient_id ?? null,
      // ⚠️ `version` — Optimistic locking của BE. BẮT BUỘC phải đọc từ DB
      // (không hardcode null) vì BE `UpdateFridgeItemDto.version` là
      // `@IsInt() @Min(0)` -> thiếu/null -> 400 khi PATCH offline.
      version: row.version ?? null,
      // Cờ nội bộ: UI có thể hiển thị "đang chờ đồng bộ".
      _syncStatus: row.sync_status ?? SYNC_STATUS.SYNCED,
    }));
  }

  /**
   * Lưu 1 nguyên liệu tạm offline (chưa có id server).
   *
   * @param {object} item - shape UI `FridgeItem` + `id` = `pending_<ts>`
   */
  async savePendingFridgeItem(item) {
    const db = await this._ensureDb();
    if (!item?.id) return;

    await db.runAsync(
      `INSERT OR REPLACE INTO local_ingredients
         (id, ingredient_id, name, quantity, unit, storage_location, expires_at,
          days_until_expiry, image_path, updated_at, sync_status, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        String(item.id),
        item.ingredientId ?? null,
        item.name ?? '',
        item.quantity ?? null,
        item.unit ?? null,
        item.compartment ?? null,
        item.expiryDate ?? null,
        item.daysUntilExpiry ?? null,
        item.image ?? null,
        now(),
        SYNC_STATUS.PENDING,
        item.version ?? null,
      ]
    );
  }

  /**
   * Ghi (upsert) 1 nguyên liệu vào cache mà KHÔNG xoá các item khác.
   *
   * Dùng sau khi upload `fridge_add` thành công: thay row `pending_*` bằng
   * item thật từ server (có `id` + `version` chính thức).
   *
   * @param {object} item - shape UI `FridgeItem`
   * @param {string} [syncStatus] - mặc định 'synced'
   */
  async upsertFridgeItem(item, syncStatus = SYNC_STATUS.SYNCED) {
    if (!item?.id) return;

    const db = await this._ensureDb();

    await db.runAsync(
      `INSERT OR REPLACE INTO local_ingredients
         (id, ingredient_id, name, quantity, unit, storage_location, expires_at,
          days_until_expiry, image_path, updated_at, sync_status, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        String(item.id),
        item.ingredientId ?? null,
        item.name ?? '',
        item.quantity ?? null,
        item.unit ?? null,
        item.compartment ?? null,
        item.expiryDate ?? null,
        item.daysUntilExpiry ?? null,
        item.image ?? null,
        now(),
        syncStatus,
        item.version ?? null,
      ]
    );
  }

  /**
   * Cập nhật 1 nguyên liệu trong cache (dùng cho optimistic update offline).
   *
   * @param {string} id
   * @param {object} updates
   */
  async updateFridgeItem(id, updates = {}) {
    const db = await this._ensureDb();

    const sets = [];
    const params = [];

    if (updates.quantity !== undefined) {
      sets.push('quantity = ?');
      params.push(updates.quantity);
    }
    if (updates.unit !== undefined) {
      sets.push('unit = ?');
      params.push(updates.unit);
    }
    if (updates.expiryDate !== undefined) {
      sets.push('expires_at = ?');
      params.push(updates.expiryDate);
    }
    if (updates.daysUntilExpiry !== undefined) {
      sets.push('days_until_expiry = ?');
      params.push(updates.daysUntilExpiry);
    }
    if (updates.status !== undefined) {
      sets.push('days_until_expiry = ?');
      params.push(updates.status === 'expired' ? -1 : (updates.daysUntilExpiry ?? null));
    }
    if (updates.compartment !== undefined) {
      sets.push('storage_location = ?');
      params.push(updates.compartment);
    }

    sets.push('updated_at = ?');
    params.push(now());

    params.push(id);

    await db.runAsync(`UPDATE local_ingredients SET ${sets.join(', ')} WHERE id = ?;`, params);
  }

  /**
   * Đánh dấu 1 nguyên liệu trong cache là 'pending' (đang chờ upload).
   *
   * @param {string} id
   */
  async markFridgeItemPending(id) {
    if (!id) return;
    const db = await this._ensureDb();
    await db.runAsync(
      `UPDATE local_ingredients SET sync_status = ?, updated_at = ? WHERE id = ?;`,
      [SYNC_STATUS.PENDING, now(), String(id)]
    );
  }

  /**
   * Đánh dấu 1 nguyên liệu đã ĐỒNG BỘ xong (upload thành công).
   *
   * ⚠️ Trước đây `SyncEngine` gọi `markFridgeItemPending` sau khi upload
   *   -> item vẫn bị hiện là "đang chờ đồng bộ" mãi, và `version` cũ khiến
   *   lần PATCH sau gửi version đã cũ -> 409 Conflict.
   *
   * @param {string} id
   * @param {number|null} [version] - version mới nhận từ server (nếu có)
   */
  async markFridgeItemSynced(id, version = null) {
    if (!id) return;
    const db = await this._ensureDb();

    if (version === null || version === undefined) {
      await db.runAsync(
        `UPDATE local_ingredients SET sync_status = ?, updated_at = ? WHERE id = ?;`,
        [SYNC_STATUS.SYNCED, now(), String(id)]
      );
      return;
    }

    await db.runAsync(
      `UPDATE local_ingredients SET sync_status = ?, version = ?, updated_at = ? WHERE id = ?;`,
      [SYNC_STATUS.SYNCED, Number(version), now(), String(id)]
    );
  }

  /**
   * Đánh dấu 1 nguyên liệu đã sync (xoá row pending sau khi upload thành công).
   *
   * @param {string} id
   */
  async removeFridgeItem(id) {
    const db = await this._ensureDb();
    await db.runAsync(`DELETE FROM local_ingredients WHERE id = ?;`, [String(id)]);
  }

  /**
   * Tính status từ `days_until_expiry` (giống `RealFridgeService._statusFromDays`).
   * @private
   */
  static _statusFromDays(days) {
    if (days === null || days === undefined) return null;
    if (days < 0) return 'expired';
    if (days <= 3) return 'expiring';
    return 'fresh';
  }

  // ══════════════════════════════════════════════════════════════════
  // THỐNG KÊ TỦ LẠNH — local_fridge_stats
  // ══════════════════════════════════════════════════════════════════

  /**
   * Lưu thống kê tủ lạnh.
   * @param {object} stats
   */
  async saveFridgeStats(stats) {
    const db = await this._ensureDb();
    if (!stats) return;

    await db.runAsync(
      `INSERT OR REPLACE INTO local_fridge_stats
         (id, total_spent_this_month, waste_percent, meals_cooked,
          expiring_soon_count, total_items, chart_json, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?);`,
      [
        stats.totalSpentThisMonth ?? 0,
        stats.wastePercent ?? 0,
        stats.mealsCooked ?? 0,
        stats.expiringSoonCount ?? 0,
        stats.totalItems ?? 0,
        stats.chart ? JSON.stringify(stats.chart) : null,
        now(),
      ]
    );
  }

  /**
   * Đọc thống kê tủ lạnh từ cache.
   * @returns {Promise<object|null>}
   */
  async getFridgeStats() {
    const db = await this._ensureDb();
    const row = await db.getFirstAsync(`SELECT * FROM local_fridge_stats WHERE id = 1;`);
    if (!row) return null;

    return {
      totalSpentThisMonth: row.total_spent_this_month ?? 0,
      wastePercent: row.waste_percent ?? 0,
      mealsCooked: row.meals_cooked ?? 0,
      expiringSoonCount: row.expiring_soon_count ?? 0,
      totalItems: row.total_items ?? 0,
      chart: safeParse(row.chart_json, null),
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // DANH SÁCH MUA — local_shopping_items
  // ══════════════════════════════════════════════════════════════════

  /**
   * Thay cache danh sách mua bằng dữ liệu mới từ server.
   * @param {Array<object>} items - shape UI `ShoppingItem` (+ `listId`)
   */
  async saveShoppingItems(items) {
    if (!Array.isArray(items) || items.length === 0) return 0;

    await this._ensureDb();
    const timestamp = now();

    await databaseService.withTransaction(async (tx) => {
      await tx.runAsync(`DELETE FROM local_shopping_items WHERE sync_status = ?;`, [
        SYNC_STATUS.SYNCED,
      ]);

      for (const item of items) {
        if (!item?.id) continue;

        await tx.runAsync(
          `INSERT OR REPLACE INTO local_shopping_items
             (id, ingredient_id, ingredient_name, quantity, unit, is_purchased,
              updated_at, sync_status, list_id, backend_item_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            String(item.id),
            item.ingredientId ?? null,
            item.name ?? '',
            item.quantity ?? 0,
            item.unit ?? '',
            item.done ? 1 : 0,
            timestamp,
            SYNC_STATUS.SYNCED,
            item.listId ?? null,
            item.id ?? null,
          ]
        );
      }
    });

    return items.length;
  }

  /**
   * Đọc cache danh sách mua.
   * @returns {Promise<Array<object>>}
   */
  async getShoppingItems() {
    const db = await this._ensureDb();
    const rows = await db.getAllAsync(`SELECT * FROM local_shopping_items;`);

    return (rows ?? []).map((row) => ({
      id: row.backend_item_id ?? row.id,
      ingredientId: row.ingredient_id ?? null,
      name: row.ingredient_name ?? '',
      quantity: row.quantity ?? 0,
      unit: row.unit ?? '',
      done: row.is_purchased === 1,
      estimatedPrice: null,
      purchasedAt: null,
      supplierSuggestions: [],
      listId: row.list_id ?? null,
      _syncStatus: row.sync_status ?? SYNC_STATUS.SYNCED,
    }));
  }

  /**
   * Tick / untick 1 món mua trong cache (optimistic offline).
   *
   * @param {string|number} itemId
   * @param {boolean} isPurchased
   * @param {string} [listId]
   */
  async setShoppingItemPurchased(itemId, isPurchased, listId = null) {
    const db = await this._ensureDb();

    // `backend_item_id` là số (BE dùng ParseIntPipe) -> so sánh cả dạng string.
    await db.runAsync(
      `UPDATE local_shopping_items
         SET is_purchased = ?, updated_at = ?, sync_status = ?
       WHERE id = ? OR backend_item_id = ?;`,
      [isPurchased ? 1 : 0, now(), SYNC_STATUS.PENDING, String(itemId), itemId]
    );

    if (listId) {
      await db.runAsync(
        `UPDATE local_shopping_items SET list_id = ? WHERE id = ? OR backend_item_id = ?;`,
        [listId, String(itemId), itemId]
      );
    }
  }

  /**
   * Đánh dấu món mua đã đồng bộ (xoá row pending).
   * @param {string|number} itemId
   */
  async clearShoppingPending(itemId) {
    const db = await this._ensureDb();
    await db.runAsync(
      `DELETE FROM local_shopping_items
       WHERE (id = ? OR backend_item_id = ?) AND sync_status = ?;`,
      [String(itemId), itemId, SYNC_STATUS.PENDING]
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // KẾ HOẠCH TUẦN — local_weekly_plans
  // ══════════════════════════════════════════════════════════════════

  /**
   * Lưu kế hoạch tuần (JSON blob).
   * @param {object} plan - `{ id, weekStart, days: [...] }`
   */
  async saveWeeklyPlan(plan) {
    const db = await this._ensureDb();
    if (!plan?.id) return;

    await db.runAsync(
      `INSERT OR REPLACE INTO local_weekly_plans (id, week_start_date, days_data_json, updated_at)
       VALUES (?, ?, ?, ?);`,
      [String(plan.id), plan.weekStart ?? null, JSON.stringify(plan.days ?? []), now()]
    );
  }

  /**
   * Đọc kế hoạch tuần mới nhất từ cache.
   * @returns {Promise<object|null>}
   */
  async getWeeklyPlan() {
    const db = await this._ensureDb();
    const row = await db.getFirstAsync(
      `SELECT * FROM local_weekly_plans ORDER BY updated_at DESC LIMIT 1;`
    );
    if (!row) return null;

    return {
      id: row.id,
      weekStart: row.week_start_date ?? null,
      days: safeParse(row.days_data_json, []),
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // CHI TIẾT CÔNG THỨC — local_recipe_details
  // ══════════════════════════════════════════════════════════════════

  /**
   * Lưu chi tiết công thức để đọc offline.
   *
   * @param {string} id - id recipe hoặc id slot
   * @param {'recipe'|'slot'} idType
   * @param {object} detail
   */
  async saveRecipeDetail(id, idType, detail) {
    const db = await this._ensureDb();
    if (!id || !detail) return;

    await db.runAsync(
      `INSERT OR REPLACE INTO local_recipe_details (id, id_type, detail_json, updated_at)
       VALUES (?, ?, ?, ?);`,
      [String(id), idType, JSON.stringify(detail), now()]
    );
  }

  /**
   * Đọc chi tiết công thức từ cache.
   *
   * @param {string} id
   * @param {'recipe'|'slot'} [idType]
   * @returns {Promise<object|null>}
   */
  async getRecipeDetail(id, idType = null) {
    const db = await this._ensureDb();
    const row = idType
      ? await db.getFirstAsync(`SELECT * FROM local_recipe_details WHERE id = ? AND id_type = ?;`, [
          String(id),
          idType,
        ])
      : await db.getFirstAsync(`SELECT * FROM local_recipe_details WHERE id = ?;`, [String(id)]);

    if (!row) return null;
    return safeParse(row.detail_json, null);
  }

  /**
   * Xoá cache công thức cũ (> 7 ngày) - giống Flutter `cleanOldCache`.
   * @param {number} [maxAgeDays=7]
   */
  async cleanOldRecipeDetails(maxAgeDays = 7) {
    const db = await this._ensureDb();
    const cutoff = now() - maxAgeDays * 24 * 60 * 60 * 1000;
    await db.runAsync(`DELETE FROM local_recipe_details WHERE updated_at < ?;`, [cutoff]);
  }

  // ══════════════════════════════════════════════════════════════════
  // PROFILE / PREFERENCES / ALLERGIES
  // ══════════════════════════════════════════════════════════════════

  /**
   * Lưu thông tin cá nhân.
   *
   * @param {object} profile - shape UI `UserProfile`
   * @param {string} [syncStatus] - mặc định 'synced'. Khi offline, gọi với
   *   'pending' để `SyncEngine` biết cần upload lại lên server.
   */
  async saveUserProfile(profile, syncStatus = SYNC_STATUS.SYNCED) {
    const db = await this._ensureDb();
    if (!profile) return;

    await db.runAsync(
      `INSERT OR REPLACE INTO local_user_profile
         (id, name, email, phone, avatar_url, date_of_birth, gender, bio,
          role, status, updated_at, sync_status)
       VALUES ('me', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        profile.name ?? null,
        profile.email ?? null,
        profile.phone ?? null,
        profile.avatar ?? null,
        profile.birthday ?? null,
        profile.gender ?? null,
        profile.bio ?? null,
        profile.role ?? null,
        profile.status ?? null,
        now(),
        syncStatus,
      ]
    );
  }

  /**
   * Đọc thông tin cá nhân từ cache.
   * @returns {Promise<object|null>}
   */
  async getUserProfile() {
    const db = await this._ensureDb();
    const row = await db.getFirstAsync(`SELECT * FROM local_user_profile WHERE id = 'me';`);
    if (!row) return null;

    return {
      id: row.id,
      name: row.name ?? '',
      email: row.email ?? '',
      phone: row.phone ?? null,
      avatar: row.avatar_url ?? null,
      birthday: row.date_of_birth ?? null,
      gender: row.gender ?? null,
      bio: row.bio ?? null,
      role: row.role ?? null,
      status: row.status ?? null,
      _syncStatus: row.sync_status ?? SYNC_STATUS.SYNCED,
    };
  }

  /**
   * Lưu tùy chọn ăn uống.
   *
   * @param {object} prefs - shape `UserPreferencesFull`
   * @param {string} [syncStatus] - mặc định 'synced'. Khi offline, gọi với
   *   'pending' để `SyncEngine` biết cần upload lại lên server.
   */
  async saveUserPreferences(prefs, syncStatus = SYNC_STATUS.SYNCED) {
    const db = await this._ensureDb();
    if (!prefs) return;

    await db.runAsync(
      `INSERT OR REPLACE INTO local_user_preferences
         (id, weekly_budget, daily_calorie_target, dietary_style,
          prefer_simple_recipes, max_cook_time_minutes, skill_level, household_size,
          ai_personality_mode, primary_goal, cooking_frequency, height, weight,
          activity_level, updated_at, sync_status)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        prefs.weeklyBudget ?? null,
        prefs.dailyCalorieTarget ?? null,
        prefs.dietaryStyle ?? null,
        prefs.preferSimpleRecipes ? 1 : 0,
        prefs.maxCookTimeMinutes ?? null,
        prefs.skillLevel ?? null,
        prefs.householdSize ?? null,
        prefs.aiPersonalityMode ?? null,
        prefs.primaryGoal ?? null,
        prefs.cookingFrequency ?? null,
        prefs.height ?? null,
        prefs.weight ?? null,
        prefs.activityLevel ?? null,
        now(),
        syncStatus,
      ]
    );
  }

  /**
   * Đọc tùy chọn ăn uống từ cache.
   * @returns {Promise<object|null>}
   */
  async getUserPreferences() {
    const db = await this._ensureDb();
    const row = await db.getFirstAsync(`SELECT * FROM local_user_preferences WHERE id = 1;`);
    if (!row) return null;

    return {
      weeklyBudget: row.weekly_budget ?? null,
      dailyCalorieTarget: row.daily_calorie_target ?? null,
      dietaryStyle: row.dietary_style ?? 'omnivore',
      preferSimpleRecipes: row.prefer_simple_recipes === 1,
      maxCookTimeMinutes: row.max_cook_time_minutes ?? null,
      skillLevel: row.skill_level ?? 'beginner',
      householdSize: row.household_size ?? 1,
      aiPersonalityMode: row.ai_personality_mode ?? 'friendly',
      primaryGoal: row.primary_goal ?? null,
      cookingFrequency: row.cooking_frequency ?? null,
      height: row.height ?? null,
      weight: row.weight ?? null,
      activityLevel: row.activity_level ?? null,
      _syncStatus: row.sync_status ?? SYNC_STATUS.SYNCED,
    };
  }

  /**
   * Lưu danh sách dị ứng.
   *
   * ⚠️ CHỈ xoá row 'synced' — giữ row 'pending' (dị ứng thêm offline chờ upload)
   *   và 'pending_delete' (đã bấm xoá offline, chờ gọi DELETE lên server).
   *
   * @param {Array<object>} allergies - shape UI `Allergy`
   */
  async saveAllergies(allergies) {
    if (!Array.isArray(allergies) || allergies.length === 0) return 0;

    await this._ensureDb();
    const timestamp = now();

    await databaseService.withTransaction(async (tx) => {
      await tx.runAsync(`DELETE FROM local_allergies WHERE sync_status = ?;`, [SYNC_STATUS.SYNCED]);

      for (const allergy of allergies) {
        if (!allergy?.id) continue;

        await tx.runAsync(
          `INSERT OR REPLACE INTO local_allergies
             (id, ingredient_id, ingredient_name, note, sync_status, updated_at)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [
            String(allergy.id),
            allergy.ingredientId ?? 0,
            allergy.name ?? '',
            allergy.note ?? null,
            SYNC_STATUS.SYNCED,
            timestamp,
          ]
        );
      }
    });

    return allergies.length;
  }

  /**
   * Lưu 1 dị ứng mới thêm khi OFFLINE (chưa có id server).
   *
   * Id tạm `pending_allergy_<ts>` -> sau khi upload thành công, `SyncEngine`
   * sẽ đổi lại id server rồi xoá row pending.
   *
   * @param {object} allergy - shape UI `Allergy` (id sẽ tự sinh nếu thiếu)
   */
  async savePendingAllergy(allergy) {
    if (!allergy?.ingredientId) return;

    const db = await this._ensureDb();
    const id = String(allergy.id ?? `pending_allergy_${now()}`);

    await db.runAsync(
      `INSERT OR REPLACE INTO local_allergies
         (id, ingredient_id, ingredient_name, note, sync_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        id,
        Number(allergy.ingredientId),
        allergy.name ?? '',
        allergy.note ?? null,
        SYNC_STATUS.PENDING,
        now(),
      ]
    );
  }

  /**
   * Upsert 1 dị ứng đã đồng bộ (KHÔNG xoá các row khác).
   *
   * ⚠️ KHÔNG dùng `saveAllergies` ở đây: hàm đó XOÁ SẠCH các row 'synced'
   *    rồi insert lại danh sách mới -> gọi với 1 phần tử sẽ làm MẤT tất cả
   *    dị ứng khác của user. Đây là hàm upsert đơn lẻ.
   *
   * @param {object} allergy - shape UI `Allergy`
   */
  async upsertAllergy(allergy) {
    if (!allergy?.id) return;

    const db = await this._ensureDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO local_allergies
         (id, ingredient_id, ingredient_name, note, sync_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        String(allergy.id),
        Number(allergy.ingredientId ?? 0),
        allergy.name ?? '',
        allergy.note ?? null,
        SYNC_STATUS.SYNCED,
        now(),
      ]
    );
  }

  /**
   * Đánh dấu 1 dị ứng cần XOÁ trên server khi có mạng.
   *
   * Vẫn giữ row trong DB nhưng UI phải ẩn đi (giống Flutter `markPendingDelete`).
   *
   * @param {string} id
   */
  async markAllergyPendingDelete(id) {
    if (!id) return;
    const db = await this._ensureDb();
    await db.runAsync(
      `UPDATE local_allergies SET sync_status = ?, updated_at = ? WHERE id = ?;`,
      [SYNC_STATUS.PENDING_DELETE, now(), String(id)]
    );
  }

  /**
   * Xoá hẳn 1 dị ứng khỏi cache (sau khi DELETE server thành công).
   * @param {string} id
   */
  async deleteAllergy(id) {
    if (!id) return;
    const db = await this._ensureDb();
    await db.runAsync(`DELETE FROM local_allergies WHERE id = ?;`, [String(id)]);
  }

  /**
   * Đọc danh sách dị ứng từ cache.
   *
   * ⚠️ Loại row 'pending_delete' — dị ứng đã bấm xoá offline không được hiện.
   *
   * @returns {Promise<Array<object>>}
   */
  async getAllergies() {
    const db = await this._ensureDb();
    const rows = await db.getAllAsync(
      `SELECT * FROM local_allergies WHERE sync_status != ? ORDER BY ingredient_name ASC;`,
      [SYNC_STATUS.PENDING_DELETE]
    );

    return (rows ?? []).map((row) => ({
      id: String(row.id),
      ingredientId: Number(row.ingredient_id ?? 0),
      name: row.ingredient_name ?? '',
      note: row.note ?? null,
      _syncStatus: row.sync_status ?? SYNC_STATUS.SYNCED,
    }));
  }

  // ══════════════════════════════════════════════════════════════════
  // DANH SÁCH CÔNG THỨC — local_recipe_list
  // ══════════════════════════════════════════════════════════════════

  /**
   * Lưu snapshot danh sách công thức đã tải về từ server.
   *
   * ⚠️ VÌ SAO CẦN:
   *   Màn "Gợi ý công thức" gọi `GET /recipes`. Offline, `SafeService` fallback
   *   sang MOCK -> user thấy công thức BỊA (tệ hơn Flutter, vì Flutter cũng
   *   fallback về cache thật). Bảng này là nguồn thay thế khi offline.
   *
   * ⚠️ XOÁ SẠCH rồi insert lại -> chỉ dùng cho snapshot ĐẦY ĐỦ (không
   *   filter, đã gộp hết các trang). Với kết quả ĐÃ LỌC hoặc 1 trang,
   *   dùng `upsertRecipeList` (gộp, không xoá).
   *
   * @param {Array<object>} recipes - shape UI `Recipe`
   */
  async saveRecipeList(recipes) {
    if (!Array.isArray(recipes) || recipes.length === 0) return 0;

    await this._ensureDb();
    const timestamp = now();

    await databaseService.withTransaction(async (tx) => {
      await tx.runAsync(`DELETE FROM local_recipe_list;`);

      for (const r of recipes) {
        if (!r?.id) continue;

        await tx.runAsync(
          `INSERT OR REPLACE INTO local_recipe_list
             (id, name, image, cook_time, difficulty, servings, meal_type,
              estimated_cost, is_ai_generated, tags_json, is_bookmarked, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            String(r.id),
            r.name ?? '',
            r.image ?? null,
            r.cookTime ?? null,
            r.difficulty ?? null,
            r.servings ?? null,
            r.mealType ?? null,
            r.estimatedCost ?? null,
            r.isAiGenerated ? 1 : 0,
            JSON.stringify(r.tags ?? []),
            r.isBookmarked ? 1 : 0,
            timestamp,
          ]
        );
      }
    });

    return recipes.length;
  }

  /**
   * Gộp (upsert) danh sách công thức vào cache mà KHÔNG xoá các row cũ.
   *
   * ⚠️ DÙNG KHI NÀO:
   *   - Kết quả `GET /recipes` đã LỌC (search / difficulty / mealType):
   *     nếu dùng `saveRecipeList` -> cache bị cắt cụt còn đúng phần lọc,
   *     user offline chỉ thấy 1 phần nhỏ.
   *   - Khi duyệt phân trang: mỗi trang ghi riêng sẽ làm mất các trang trước.
   *
   * @param {Array<object>} recipes - shape UI `Recipe`
   * @returns {Promise<number>} số row đã ghi
   */
  async upsertRecipeList(recipes) {
    if (!Array.isArray(recipes) || recipes.length === 0) return 0;

    await this._ensureDb();
    const timestamp = now();
    let written = 0;

    // ⚠️ Giữ cờ bookmark đã có trong cache:
    //   Payload từ server (`_toRecipe`) KHÔNG có field `isBookmarked` ->
    //   nếu ghi `is_bookmarked = 0` thì xoá mất cờ đã bookmark trước đó.
    const existingRows = await this._ensureDb().then((db) =>
      db.getAllAsync(`SELECT id, is_bookmarked FROM local_recipe_list;`)
    );
    const bookmarkMap = new Map(
      (existingRows ?? []).map((row) => [String(row.id), row.is_bookmarked === 1])
    );

    await databaseService.withTransaction(async (tx) => {
      for (const r of recipes) {
        if (!r?.id) continue;

        // `undefined` -> giữ nguyên cờ cũ; có giá trị -> dùng giá trị mới.
        const isBookmarked =
          typeof r.isBookmarked === 'boolean'
            ? r.isBookmarked
            : (bookmarkMap.get(String(r.id)) ?? false);

        await tx.runAsync(
          `INSERT OR REPLACE INTO local_recipe_list
             (id, name, image, cook_time, difficulty, servings, meal_type,
              estimated_cost, is_ai_generated, tags_json, is_bookmarked, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            String(r.id),
            r.name ?? '',
            r.image ?? null,
            r.cookTime ?? null,
            r.difficulty ?? null,
            r.servings ?? null,
            r.mealType ?? null,
            r.estimatedCost ?? null,
            r.isAiGenerated ? 1 : 0,
            JSON.stringify(r.tags ?? []),
            isBookmarked ? 1 : 0,
            timestamp,
          ]
        );
        written += 1;
      }
    });

    return written;
  }

  /**
   * Đọc danh sách công thức từ cache (offline).
   *
   * Lọc/Sort client-side vì offline không có server để query.
   *
   * @param {object} [filters] - `{ search, difficulty, maxCookTime, sortBy, sortDir }`
   * @returns {Promise<Array<object>>}
   */
  async getRecipeList(filters = {}) {
    const db = await this._ensureDb();
    const rows = await db.getAllAsync(`SELECT * FROM local_recipe_list;`);

    let list = (rows ?? []).map((row) => ({
      id: row.id,
      name: row.name ?? '',
      image: row.image ?? null,
      cookTime: row.cook_time ?? 0,
      difficulty: row.difficulty ?? 'easy',
      servings: row.servings ?? null,
      mealType: row.meal_type ?? null,
      estimatedCost: row.estimated_cost ?? null,
      isAiGenerated: row.is_ai_generated === 1,
      tags: safeParse(row.tags_json, []),
      isBookmarked: row.is_bookmarked === 1,
    }));

    const search = String(filters?.search ?? '').trim().toLowerCase();
    if (search) {
      list = list.filter((r) => String(r.name ?? '').toLowerCase().includes(search));
    }
    if (filters?.difficulty) {
      list = list.filter((r) => r.difficulty === filters.difficulty);
    }
    if (filters?.maxCookTime) {
      list = list.filter((r) => (r.cookTime ?? 0) <= filters.maxCookTime);
    }

    // Sort client-side — giống `RealRecipeService.getRecipesFiltered` (BE
    // không có `sortBy`/`sortDir`, service RN tự sort trên tập kết quả).
    const sortBy = filters?.sortBy;
    if (!sortBy) return list;

    const dir = filters?.sortDir === 'desc' ? -1 : 1;
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'cookTime':
          return (a.cookTime - b.cookTime) * dir;
        case 'name':
          return String(a.name ?? '').localeCompare(String(b.name ?? '')) * dir;
        case 'difficulty': {
          const order = { easy: 0, medium: 1, hard: 2 };
          return ((order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1)) * dir;
        }
        default:
          return 0;
      }
    });
  }

  /**
   * Đánh dấu 1 công thức đã / chưa bookmark (optimistic offline).
   *
   * @param {string} id
   * @param {boolean} isBookmarked
   */
  async setRecipeBookmarked(id, isBookmarked) {
    if (!id) return;
    const db = await this._ensureDb();
    await db.runAsync(`UPDATE local_recipe_list SET is_bookmarked = ? WHERE id = ?;`, [
      isBookmarked ? 1 : 0,
      String(id),
    ]);
  }

  /**
   * Đồng bộ cờ bookmark của TOÀN BỘ công thức trong cache theo danh sách id
   * từ server (`GET /recipes/bookmarked`).
   *
   * ⚠️ KHÔNG dùng `saveRecipeList` ở đây: hàm đó xoá sạch bảng rồi insert lại
   *    -> gọi từ `getBookmarked` sẽ XOÁ mất danh sách công thức chính đã cache.
   *    Hàm này chỉ cập nhật cột `is_bookmarked`.
   *
   * @param {Array<string|number>} ids - id công thức đã bookmark
   */
  async syncBookmarkedFlags(ids = []) {
    const db = await this._ensureDb();
    const idSet = new Set((ids ?? []).map((id) => String(id)));

    await db.runAsync(`UPDATE local_recipe_list SET is_bookmarked = 0;`);
    for (const id of idSet) {
      await db.runAsync(`UPDATE local_recipe_list SET is_bookmarked = 1 WHERE id = ?;`, [id]);
    }
  }

  /**
   * Đọc danh sách công thức ĐÃ BOOKMARK từ cache.
   * @returns {Promise<Array<object>>}
   */
  async getBookmarkedRecipes() {
    const db = await this._ensureDb();
    const rows = await db.getAllAsync(
      `SELECT * FROM local_recipe_list WHERE is_bookmarked = 1 ORDER BY name ASC;`
    );

    return (rows ?? []).map((row) => ({
      id: row.id,
      name: row.name ?? '',
      image: row.image ?? null,
      cookTime: row.cook_time ?? 0,
      difficulty: row.difficulty ?? 'easy',
      servings: row.servings ?? null,
      mealType: row.meal_type ?? null,
      estimatedCost: row.estimated_cost ?? null,
      isAiGenerated: row.is_ai_generated === 1,
      tags: safeParse(row.tags_json, []),
    }));
  }

  // ══════════════════════════════════════════════════════════════════
  // DANH MỤC NGUYÊN LIỆU — local_ingredient_catalog
  // ══════════════════════════════════════════════════════════════════

  /**
   * Cập nhật trạng thái cooked của 1 slot trong cache.
   *
   * @param {string} slotId
   * @param {boolean} cooked
   */
  async setSlotCooked(slotId, cooked) {
    if (!slotId) return;

    const detail = await this.getRecipeDetail(String(slotId), 'slot');
    if (!detail) return;

    await this.saveRecipeDetail(String(slotId), 'slot', {
      ...detail,
      slot: { ...(detail.slot ?? {}), cooked },
      cooked,
    });
  }

  /**
   * Lưu danh mục nguyên liệu hệ thống (dùng cho picker offline).
   * @param {Array<object>} items - `{ id, name, defaultUnit, image, categoryName }`
   */
  async saveIngredientCatalog(items) {
    if (!Array.isArray(items) || items.length === 0) return 0;

    await this._ensureDb();
    const timestamp = now();

    await databaseService.withTransaction(async (tx) => {
      await tx.runAsync(`DELETE FROM local_ingredient_catalog;`);

      for (const item of items) {
        if (!item?.id) continue;

        await tx.runAsync(
          `INSERT OR REPLACE INTO local_ingredient_catalog
             (id, name, english_name, default_unit, category, image_path, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            Number(item.id),
            item.name ?? '',
            item.englishName ?? null,
            item.defaultUnit ?? null,
            item.categoryName ?? null,
            item.image ?? null,
            timestamp,
          ]
        );
      }
    });

    return items.length;
  }

  /**
   * Tìm nguyên liệu trong danh mục cache (offline picker).
   *
   * @param {string} query
   * @param {number} [limit=20]
   * @returns {Promise<Array<object>>}
   */
  async searchIngredientCatalog(query = '', limit = 20) {
    const db = await this._ensureDb();
    const q = String(query ?? '').trim();

    const rows = q
      ? await db.getAllAsync(
          `SELECT * FROM local_ingredient_catalog
           WHERE name LIKE ? OR english_name LIKE ?
           ORDER BY name ASC LIMIT ?;`,
          [`%${q}%`, `%${q}%`, limit]
        )
      : await db.getAllAsync(`SELECT * FROM local_ingredient_catalog ORDER BY name ASC LIMIT ?;`, [
          limit,
        ]);

    return (rows ?? []).map((row) => ({
      id: Number(row.id),
      name: row.name ?? '',
      englishName: row.english_name ?? null,
      defaultUnit: row.default_unit ?? null,
      image: row.image_path ?? null,
      categoryName: row.category ?? '',
    }));
  }

  // ══════════════════════════════════════════════════════════════════
  // QUẢN LÝ CHUNG
  // ══════════════════════════════════════════════════════════════════

  /**
   * Xoá toàn bộ cache local (logout / đổi user).
   *
   * ⚠️ KHÔNG xoá `local_pending_ops` ở đây - hàng đợi được quản lý riêng
   *   bởi `OutboxQueue.clear()` để chỗ gọi quyết định rõ ràng.
   */
  async clearCache() {
    const db = await this._ensureDb();
    const tables = [
      'local_ingredients',
      'local_fridge_stats',
      'local_weekly_plans',
      'local_shopping_items',
      'local_recipe_details',
      'local_user_profile',
      'local_user_preferences',
      'local_allergies',
      'local_ingredient_catalog',
      'local_recipe_list',
    ];

    for (const table of tables) {
      await db.runAsync(`DELETE FROM ${table};`);
    }
  }

  /**
   * Thống kê trạng thái cache (debug / badge).
   *
   * @returns {Promise<{fridgeItems:number, shoppingItems:number, pending:number, recipes:number}>}
   */
  async getCacheStatus() {
    const db = await this._ensureDb();

    const countOf = async (table, where = null, params = []) => {
      const row = where
        ? await db.getFirstAsync(`SELECT COUNT(*) as count FROM ${table} WHERE ${where};`, params)
        : await db.getFirstAsync(`SELECT COUNT(*) as count FROM ${table};`);
      return row?.count ?? 0;
    };

    return {
      fridgeItems: await countOf('local_ingredients'),
      shoppingItems: await countOf('local_shopping_items'),
      recipes: await countOf('local_recipe_details'),
      pending: await countOf('local_ingredients', 'sync_status = ?', [SYNC_STATUS.PENDING]),
    };
  }
}

export const offlineCache = new OfflineCache();
export default offlineCache;
