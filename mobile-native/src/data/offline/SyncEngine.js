/**
 * SyncEngine - đồng bộ 2 chiều khi có mạng.
 *
 * Port từ Flutter: `Mobile/lib/sqlite/services/background_sync_service.dart`
 * (3 phase: upload pending -> pull fresh -> pre-cache recipes).
 *
 * ══════════════════════════════════════════════════════════════════════
 * 3 PHASE
 * ══════════════════════════════════════════════════════════════════════
 *   Phase 1 — UPLOAD: gửi các thao tác đã lưu offline lên server.
 *     Mỗi op thành công -> `resolve()` (xoá khỏi hàng đợi).
 *     Lỗi 4xx (trừ 409) -> `fail(permanent)` (xoá, không retry vô ích).
 *     Lỗi 409 -> `markConflict()` (giữ op, hiện badge cảnh báo).
 *     Lỗi 5xx/network -> `fail()` (giữ op, thử lại sau).
 *
 *   Phase 2 — PULL: tải dữ liệu mới từ server xuống cache local.
 *     6 nhóm: fridge items, fridge stats, shopping lists, weekly plan,
 *             profile + preferences + allergies, ingredient catalog.
 *
 *   Phase 3 — PRE-CACHE: tải trước chi tiết công thức của plan tuần.
 *     Chạy nền, KHÔNG await (không chặn UI).
 *
 * ⚠️ VÌ SAO KHÔNG DÙNG `useAsyncData` / hook React:
 *   Sync engine phải chạy được ở nhiều nơi (App mount, Home mount, sự kiện
 *   mạng khôi phục) và cần chống chạy trùng -> để ở tầng module với cờ
 *   `_isSyncing`, giống `BackgroundSyncService` singleton của Flutter.
 *
 * ⚠️ VÌ SAO DÙNG `getRegisteredService` THAY VÌ `useServices()`:
 *   Engine là module thuần (không phải React) -> không gọi được hook.
 *   `getRegisteredService('fridgeService')` trả về instance Real* đã đăng ký
 *   (chưa bọc fallback) -> đúng thứ ta cần: muốn biết lỗi thật, không muốn
 *   fallback mock trong lúc đồng bộ.
 *
 * R7: comment tiếng Việt.
 */

import { getRegisteredService } from '../api/ServiceRegistry';
import { extractStatus } from '../api/SafeService';
import { outboxQueue, OP_TYPES } from './OutboxQueue';
import { offlineCache, SYNC_STATUS } from './OfflineCache';

/**
 * Kết quả 1 lần đồng bộ.
 * @typedef {object} SyncResult
 * @property {boolean} success
 * @property {number} uploaded - số op upload thành công
 * @property {number} failed - số op lỗi
 * @property {number} conflicts - số op bị conflict (409)
 * @property {number} pulled - số nhóm dữ liệu pull thành công
 * @property {string[]} errors
 */

/**
 * Lấy instance Real service (chưa bọc fallback).
 *
 * @param {string} key
 * @returns {object|null}
 */
const realService = (key) => getRegisteredService(key);

/**
 * Bỏ field `_syncStatus` (chỉ là metadata nội bộ) khỏi object cache.
 *
 * Dùng khi merge dữ liệu server với dữ liệu local đang 'pending' -> tránh
 * lẫn trạng thái của server vào payload lưu xuống DB.
 *
 * @param {object|null} obj
 * @returns {object}
 */
const stripSyncStatus = (obj) => {
  if (!obj) return {};
  const { _syncStatus, ...rest } = obj;
  return rest;
};

class SyncEngine {
  constructor() {
    // Cờ chống chạy trùng (giống `BackgroundSyncService._isSyncing`).
    this._isSyncing = false;
    this._listeners = new Set();
    this._lastResult = null;
    this._lastRunAt = null;
  }

  /**
   * Subscribe trạng thái sync (để UI hiện badge).
   *
   * @param {(state: {isSyncing:boolean, pendingCount:number, lastResult:SyncResult|null}) => void} handler
   * @returns {Function} unsubscribe
   */
  subscribe(handler) {
    this._listeners.add(handler);
    // Gửi trạng thái hiện tại ngay khi subscribe.
    handler({
      isSyncing: this._isSyncing,
      pendingCount: 0,
      lastResult: this._lastResult,
    });
    return () => this._listeners.delete(handler);
  }

  /**
   * Phát trạng thái cho các subscriber.
   * @private
   */
  async _emit() {
    const pendingCount = await outboxQueue.count();
    const state = {
      isSyncing: this._isSyncing,
      pendingCount,
      lastResult: this._lastResult,
    };
    this._listeners.forEach((handler) => {
      try {
        handler(state);
      } catch (e) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[SyncEngine] listener lỗi:', e?.message);
        }
      }
    });
  }

  /**
   * Đồng bộ toàn bộ.
   *
   * @param {object} [options]
   * @param {boolean} [options.force=false] - bỏ qua cờ chống chạy trùng.
   *   Flutter `forceSync()` dùng khi user kéo pull-to-refresh -> luôn chạy.
   * @param {boolean} [options.prefetchRecipes=true] - có chạy Phase 3 không.
   * @returns {Promise<SyncResult>}
   */
  async syncAll(options = {}) {
    const { force = false, prefetchRecipes = true } = options;

    // Chống chạy trùng.
    if (this._isSyncing && !force) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[SyncEngine] Đang sync, bỏ qua lần gọi này');
      }
      return this._lastResult ?? this._emptyResult();
    }

    this._isSyncing = true;
    await this._emit();

    const result = this._emptyResult();

    try {
      // ── Phase 1: upload pending ──
      await this._uploadPending(result);

      // ── Phase 2: pull fresh data ──
      await this._pullFreshData(result);

      // ── Phase 3: pre-cache recipes (nền, không await) ──
      if (prefetchRecipes) {
        this._prefetchRecipes().catch(() => {});
      }
    } catch (e) {
      result.success = false;
      result.errors.push(e?.message ?? 'Lỗi đồng bộ không xác định');
    } finally {
      this._isSyncing = false;
      this._lastResult = result;
      this._lastRunAt = Date.now();
      await this._emit();
    }

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(
        `[SyncEngine] Xong: upload=${result.uploaded} failed=${result.failed} conflict=${result.conflicts} pulled=${result.pulled}`
      );
    }

    return result;
  }

  /**
   * Kết quả rỗng.
   * @private
   */
  _emptyResult() {
    return {
      success: true,
      uploaded: 0,
      failed: 0,
      conflicts: 0,
      pulled: 0,
      errors: [],
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // PHASE 1 — UPLOAD PENDING
  // ══════════════════════════════════════════════════════════════════

  /**
   * Gửi tất cả op trong hàng đợi lên server.
   * @private
   */
  async _uploadPending(result) {
    const ops = await outboxQueue.list();
    if (ops.length === 0) return;

    for (const op of ops) {
      try {
        await this._uploadOne(op);

        await outboxQueue.resolve(op.id);
        result.uploaded += 1;
      } catch (e) {
        const status = extractStatus(e);

        // 409 -> conflict: giữ op, hiện badge cảnh báo (quyết định đã chốt).
        if (status === 409) {
          await outboxQueue.markConflict(op.id, e?.message ?? 'Conflict');
          result.conflicts += 1;
          result.errors.push(`[${op.op_type}] xung đột dữ liệu`);
          continue;
        }

        // 4xx khác -> lỗi vĩnh viễn (payload sai, không đủ quyền) -> bỏ op.
        if (status !== null && status >= 400 && status < 500) {
          await outboxQueue.fail(op.id, e?.message ?? 'Lỗi 4xx', { permanent: true });
          result.failed += 1;
          result.errors.push(`[${op.op_type}] ${e?.message ?? 'Lỗi 4xx'}`);
          continue;
        }

        // 5xx / network -> giữ op, thử lại lần sau.

        await outboxQueue.fail(op.id, e?.message ?? 'Lỗi mạng');
        result.failed += 1;
        result.errors.push(`[${op.op_type}] ${e?.message ?? 'Lỗi mạng'}`);

        // Mất mạng -> dừng luôn (các op sau cũng chưa gửi được).
        if (status === null) break;
      }
    }
  }

  /**
   * Upload 1 op cụ thể.
   *
   * @param {object} op
   * @private
   */
  async _uploadOne(op) {
    const payload = op.payload ?? {};

    switch (op.op_type) {
      case OP_TYPES.FRIDGE_ADD: {
        const fridge = realService('fridgeService');
        if (!fridge) throw new Error('fridgeService chưa sẵn sàng');
        const created = await fridge.addItem({
          name: payload.name,
          ingredientId: payload.ingredientId,
          quantity: payload.quantity,
          unit: payload.unit,
          compartment: payload.compartment,
          expiryDate: payload.expiryDate,
        });

        // Item đã lên server -> thay row `pending_*` bằng item thật (có id +
        // version chính thức) rồi xoá row pending.
        if (created?.id) {
          await offlineCache.upsertFridgeItem(created, SYNC_STATUS.SYNCED);
        }
        await offlineCache.removeFridgeItem(op.entity_id);
        return;
      }

      case OP_TYPES.FRIDGE_UPDATE: {
        const fridge = realService('fridgeService');
        if (!fridge) throw new Error('fridgeService chưa sẵn sàng');
        const updated = await fridge.updateItem(op.entity_id, {
          quantity: payload.quantity ?? undefined,
          unit: payload.unit ?? undefined,
          expiryDate: payload.expiryDate ?? undefined,
          clearExpiry: payload.clearExpiry === true ? true : undefined,
          version: payload.version ?? undefined,
        });
        // Đã sync xong -> KHÔNG giữ trạng thái 'pending' (nếu không item mãi
        // hiện "đang chờ đồng bộ") + cập nhật version mới (BE increment 1).
        await offlineCache.markFridgeItemSynced(op.entity_id, updated?.version ?? null);
        return;
      }

      case OP_TYPES.FRIDGE_CONSUME: {
        const fridge = realService('fridgeService');
        if (!fridge) throw new Error('fridgeService chưa sẵn sàng');
        const consumed = await fridge.markConsumed(op.entity_id);
        await offlineCache.markFridgeItemSynced(op.entity_id, consumed?.version ?? null);
        return;
      }

      case OP_TYPES.FRIDGE_DELETE: {
        const fridge = realService('fridgeService');
        if (!fridge) throw new Error('fridgeService chưa sẵn sàng');
        await fridge.deleteItem(op.entity_id);
        await offlineCache.removeFridgeItem(op.entity_id);
        return;
      }

      case OP_TYPES.SHOPPING_TOGGLE: {
        const recipe = realService('recipeService');
        if (!recipe) throw new Error('recipeService chưa sẵn sàng');
        await recipe.toggleShoppingItemInList(payload.listId, payload.itemId);
        await offlineCache.clearShoppingPending(payload.itemId);
        return;
      }

      case OP_TYPES.SLOT_COMPLETE: {
        const recipe = realService('recipeService');
        if (!recipe) throw new Error('recipeService chưa sẵn sàng');
        // ⚠️ Truyền lại `servings` để BE trừ đúng lượng như lúc user bấm nấu.
        //    `undefined` -> BE dùng `slot.servings`.
        await recipe.updateSlot(payload.slotId, {
          completed: payload.completed,
          servings: payload.servings,
        });
        return;
      }

      case OP_TYPES.ALLERGY_ADD: {
        const user = realService('userService');
        if (!user) throw new Error('userService chưa sẵn sàng');
        const created = await user.addAllergy(payload.ingredientId, payload.note);
        // Server đã có dị ứng với id thật -> đổi row pending sang id thật
        // (giống Flutter `markAsSynced(localId, serverId)`).
        if (created?.id && op.entity_id) {
          await offlineCache.deleteAllergy(op.entity_id);
          await offlineCache.upsertAllergy({
            id: String(created.id),
            ingredientId: created.ingredientId ?? payload.ingredientId,
            name: created.name ?? '',
            note: created.note ?? payload.note ?? null,
          });
        }
        return;
      }

      case OP_TYPES.ALLERGY_DELETE: {
        const user = realService('userService');
        if (!user) throw new Error('userService chưa sẵn sàng');
        await user.removeAllergy(op.entity_id);
        // Xoá trên server thành công -> xoá hẳn row khỏi cache.
        await offlineCache.deleteAllergy(op.entity_id);
        return;
      }

      case OP_TYPES.PROFILE_UPDATE: {
        const user = realService('userService');
        if (!user) throw new Error('userService chưa sẵn sàng');
        await user.updateProfile({
          name: payload.name ?? undefined,
          dateOfBirth: payload.dateOfBirth ?? undefined,
          gender: payload.gender ?? undefined,
          bio: payload.bio ?? undefined,
        });
        // Đã sync -> đánh dấu 'synced' (đừng để mãi 'pending').
        const cached = await offlineCache.getUserProfile();
        if (cached) {
          await offlineCache.saveUserProfile(cached, SYNC_STATUS.SYNCED);
        }
        return;
      }

      case OP_TYPES.PREFS_UPDATE: {
        const user = realService('userService');
        if (!user) throw new Error('userService chưa sẵn sàng');
        await user.updatePreferences(payload);
        const cached = await offlineCache.getUserPreferences();
        if (cached) {
          await offlineCache.saveUserPreferences(cached, SYNC_STATUS.SYNCED);
        }
        return;
      }

      default:
        // Op không còn hỗ trợ -> bỏ (tránh chặn cả hàng đợi).
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn(`[SyncEngine] Không biết op_type "${op.op_type}" -> bỏ qua`);
        }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // PHASE 2 — PULL FRESH DATA
  // ══════════════════════════════════════════════════════════════════

  /**
   * Tải dữ liệu mới từ server xuống cache.
   * @private
   */
  async _pullFreshData(result) {
    const groups = [
      { name: 'fridgeItems', run: () => this._pullFridgeItems() },
      { name: 'fridgeStats', run: () => this._pullFridgeStats() },
      { name: 'shoppingLists', run: () => this._pullShoppingLists() },
      { name: 'weeklyPlan', run: () => this._pullWeeklyPlan() },
      { name: 'userData', run: () => this._pullUserData() },
      { name: 'ingredientCatalog', run: () => this._pullIngredientCatalog() },
      { name: 'recipeList', run: () => this._pullRecipeList() },
    ];

    for (const group of groups) {
      try {
        await group.run();
        result.pulled += 1;
      } catch (e) {
        // Một nhóm fail KHÔNG chặn các nhóm sau.
        result.errors.push(`[pull:${group.name}] ${e?.message ?? 'Lỗi'}`);
      }
    }
  }

  /**
   * Tải dữ liệu tủ lạnh mới từ server xuống cache.
   *
   * ⚠️ CHỈ GHI CACHE 1 LẦN:
   *   `RealFridgeService.getItems` mặc định sẽ write-through cache. Nếu
   *   `_pullFridgeItems` lại ghi thêm lần nữa -> 2 transaction SQLite chạy
   *   chồng nhau -> "cannot start a transaction within a transaction" ->
   *   cache ghi hỏng hoàn toàn (log "[RealFridgeService] Không ghi được cache").
   *   => Gọi `getItems` với `skipCacheWrite: true`, rồi `SyncEngine` tự ghi
   *   cache 1 lần (giữ được hành vi với cả mock service trong test).
   *
   * @private
   */
  async _pullFridgeItems() {
    const fridge = realService('fridgeService');
    if (!fridge) return;

    const items = await fridge.getItems({}, { skipCacheWrite: true });
    await offlineCache.saveFridgeItems(items ?? []);
  }

  /** @private */
  async _pullFridgeStats() {
    const fridge = realService('fridgeService');
    if (!fridge) return;
    const stats = await fridge.getFridgeStats();
    await offlineCache.saveFridgeStats(stats);
  }

  /** @private */
  async _pullShoppingLists() {
    const recipe = realService('recipeService');
    if (!recipe) return;
    const lists = await recipe.getShoppingLists();
    const flat = (lists ?? []).flatMap((l) =>
      (l.items ?? []).map((item) => ({ ...item, listId: l.id }))
    );
    if (flat.length > 0) {
      await offlineCache.saveShoppingItems(flat);
    }
  }

  /** @private */
  async _pullWeeklyPlan() {
    const recipe = realService('recipeService');
    if (!recipe) return;
    const plan = await recipe.getNextWeekPlan();
    if (!plan) return;
    await offlineCache.saveWeeklyPlan({
      id: plan.id,
      weekStart: plan.weekStart,
      days: plan.days ?? [],
    });
  }

  /**
   * Tải hồ sơ / sở thích / dị ứng về cache.
   *
   * ⚠️ QUAN TRỌNG — KHÔNG ghi đè thay đổi chưa đồng bộ:
   *   Nếu user sửa hồ sơ OFFLINE (cache đang 'pending'), mà lúc này pull
   *   dữ liệu server về và ghi đè -> thay đổi của user MẤT, dù op trong
   *   hàng đợi vẫn còn (sẽ upload giá trị cũ lên server).
   *   -> Giữ nguyên giá trị local đang 'pending', chỉ cập nhật phần server.
   *
   * Đối chiếu Flutter: `user_profile_local_service.dart` / `user_preference_
   * local_service.dart` cũng giữ row 'pending' khi pull.
   *
   * @private
   */
  async _pullUserData() {
    const user = realService('userService');
    if (!user) return;

    const profile = await user.getProfile();
    if (profile) {
      const cached = await offlineCache.getUserProfile();
      const isPending = cached?._syncStatus === SYNC_STATUS.PENDING;
      await offlineCache.saveUserProfile(
        isPending ? { ...profile, ...stripSyncStatus(cached) } : profile,
        isPending ? SYNC_STATUS.PENDING : SYNC_STATUS.SYNCED
      );
    }

    const prefs = await user.getPreferences();
    if (prefs) {
      const cachedPrefs = await offlineCache.getUserPreferences();
      const isPending = cachedPrefs?._syncStatus === SYNC_STATUS.PENDING;
      await offlineCache.saveUserPreferences(
        isPending ? { ...prefs, ...stripSyncStatus(cachedPrefs) } : prefs,
        isPending ? SYNC_STATUS.PENDING : SYNC_STATUS.SYNCED
      );
    }

    const allergies = await user.getAllergies();
    // `saveAllergies` chỉ xoá row 'synced' -> row 'pending' / 'pending_delete'
    // được giữ nguyên (đúng như Flutter).
    await offlineCache.saveAllergies(allergies);
  }

  /**
   * Tải TOÀN BỘ danh mục nguyên liệu về cache (picker offline).
   *
   * ⚠️ Phân trang (đối chiếu Flutter `_syncIngredientCatalog`):
   *   Flutter duyệt tối đa 20 trang x 100 item = tối đa 2000 nguyên liệu.
   *   BE `GET /ingredients` giới hạn `limit <= 100` (`@Max(100)`) -> gọi
   *   `limit=200` sẽ bị 400. Phải gọi TỪNG TRANG rồi gộp.
   *
   * ⚠️ `saveIngredientCatalog` XOÁ SẠCH bảng rồi insert lại -> chỉ gọi 1
   *   lần sau khi đã gộp hết các trang (gọi mỗi trang sẽ mất trang trước).
   *   -> Truyền `skipCacheWrite: true` để service không tự ghi cache.
   *
   * @private
   */
  async _pullIngredientCatalog() {
    const user = realService('userService');
    if (!user) return;

    const PAGE_SIZE = 100;
    const MAX_PAGES = 20; // Flutter cũng giới hạn 20 trang.
    const all = [];

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const items = await user.searchIngredients('', PAGE_SIZE, page, {
        skipCacheWrite: true,
      });
      const list = Array.isArray(items) ? items : [];
      all.push(...list);

      // Trang cuối -> BE trả về ít hơn PAGE_SIZE item.
      if (list.length < PAGE_SIZE) break;
    }

    if (all.length > 0) {
      await offlineCache.saveIngredientCatalog(all);
    }
  }

  /**
   * Tải danh sách công thức về cache (offline màn "Gợi ý công thức").
   *
   * ⚠️ VÌ SAO CẦN:
   *   `GET /recipes` không có cache -> offline `SafeService` fallback sang MOCK
   *   -> user thấy công thức BỊA. Đây là nguồn dữ liệu thay thế.
   *
   * ⚠️ Phân trang (BE giới hạn `limit <= 100`):
   *   Chỉ lấy trang đầu (100 món) là thiếu -> duyệt tối đa 10 trang x 100.
   *
   * ⚠️ `getRecipesFiltered` không gọi write-through cache -> phải tự ghi.
   *
   * @private
   */
  async _pullRecipeList() {
    const recipe = realService('recipeService');
    if (!recipe) return;

    // Lấy danh sách chính (không filter) để cache đầy đủ -> offline lọc client-side.
    const PAGE_SIZE = 100;
    const MAX_PAGES = 10;
    const all = [];

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const recipes = await recipe.getRecipes({ limit: PAGE_SIZE, page });
      const list = Array.isArray(recipes) ? recipes : [];
      all.push(...list);

      // Trang cuối -> BE trả về ít hơn PAGE_SIZE item.
      if (list.length < PAGE_SIZE) break;
    }

    if (all.length === 0) return;

    // Gắn cờ bookmark từ server (nếu có) để offline hiện đúng icon.
    let bookmarkedIds = [];
    try {
      const bookmarked = await recipe.getBookmarked();
      bookmarkedIds = (bookmarked ?? []).map((r) => String(r.id));
    } catch (_e) {
      // Bỏ qua — cache vẫn dùng được, chỉ thiếu cờ bookmark.
    }

    const merged = all.map((r) => ({
      ...r,
      isBookmarked: bookmarkedIds.includes(String(r.id)),
    }));

    await offlineCache.saveRecipeList(merged);
  }
  // ══════════════════════════════════════════════════════════════════
  // PHASE 3 — PRE-CACHE RECIPES
  // ══════════════════════════════════════════════════════════════════

  /**
   * Tải trước chi tiết công thức của các slot trong plan tuần.
   *
   * Chạy nền, KHÔNG await -> không chặn UI. Lỗi bị bỏ qua.
   * @private
   */
  async _prefetchRecipes() {
    const recipe = realService('recipeService');
    if (!recipe) return;

    const plan = await recipe.getNextWeekPlan();
    const slots = (plan?.days ?? []).flatMap((day) => day.slots ?? []);
    if (slots.length === 0) return;

    for (const slot of slots) {
      if (!slot?.id) continue;
      try {
        const detail = await recipe.getSlotDetail(slot.id);
        if (detail) {
          await offlineCache.saveRecipeDetail(slot.id, 'slot', detail);
        }
      } catch (_e) {
        // Bỏ qua lỗi 1 slot.
      }
    }

    // Dọn cache cũ (> 7 ngày) - giống Flutter `cleanOldCache`.
    await offlineCache.cleanOldRecipeDetails(7);
  }

  // ══════════════════════════════════════════════════════════════════
  // TIỆN ÍCH
  // ══════════════════════════════════════════════════════════════════

  /**
   * Xoá toàn bộ cache + hàng đợi (logout / đổi user).
   *
   * @returns {Promise<void>}
   */
  async clearAll() {
    await offlineCache.clearCache();
    await outboxQueue.clear();
    this._lastResult = null;
    await this._emit();
  }

  /** Kết quả lần sync gần nhất. */
  get lastResult() {
    return this._lastResult;
  }

  /** Thời điểm sync gần nhất (timestamp). */
  get lastRunAt() {
    return this._lastRunAt;
  }

  /** Đang sync hay không. */
  get isSyncing() {
    return this._isSyncing;
  }
}

export const syncEngine = new SyncEngine();
export { SYNC_STATUS };
export default syncEngine;
