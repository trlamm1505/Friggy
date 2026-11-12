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
        await fridge.addItem({
          name: payload.name,
          ingredientId: payload.ingredientId,
          quantity: payload.quantity,
          unit: payload.unit,
          compartment: payload.compartment,
          expiryDate: payload.expiryDate,
        });
        // Xoá row pending local (dữ liệu đã lên server -> sẽ được pull lại).
        await offlineCache.removeFridgeItem(op.entity_id);
        return;
      }

      case OP_TYPES.FRIDGE_UPDATE: {
        const fridge = realService('fridgeService');
        if (!fridge) throw new Error('fridgeService chưa sẵn sàng');
        await fridge.updateItem(op.entity_id, {
          quantity: payload.quantity ?? undefined,
          unit: payload.unit ?? undefined,
          expiryDate: payload.expiryDate ?? undefined,
          clearExpiry: payload.clearExpiry === true ? true : undefined,
          version: payload.version ?? undefined,
        });
        await offlineCache.markFridgeItemPending(op.entity_id);
        return;
      }

      case OP_TYPES.FRIDGE_CONSUME: {
        const fridge = realService('fridgeService');
        if (!fridge) throw new Error('fridgeService chưa sẵn sàng');
        await fridge.markConsumed(op.entity_id);
        await offlineCache.markFridgeItemPending(op.entity_id);
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

  /** @private */
  async _pullFridgeItems() {
    const fridge = realService('fridgeService');
    if (!fridge) return;
    const items = await fridge.getItems({});
    await offlineCache.saveFridgeItems(items);
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

  /** @private */
  async _pullUserData() {
    const user = realService('userService');
    if (!user) return;

    const profile = await user.getProfile();
    await offlineCache.saveUserProfile(profile);

    const prefs = await user.getPreferences();
    await offlineCache.saveUserPreferences(prefs);

    const allergies = await user.getAllergies();
    await offlineCache.saveAllergies(allergies);
  }

  /** @private */
  async _pullIngredientCatalog() {
    const user = realService('userService');
    if (!user) return;
    const items = await user.searchIngredients('', 100);
    if (items.length > 0) {
      await offlineCache.saveIngredientCatalog(items);
    }
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
