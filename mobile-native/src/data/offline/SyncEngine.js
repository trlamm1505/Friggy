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
import { outboxQueue, OP_TYPES, SYNC_STATES } from './OutboxQueue';
import { offlineCache, SYNC_STATUS, toLocalDateStr, OFFLINE_LIST_ID } from './OfflineCache';
import { onNetworkEvent } from './NetworkMonitor';

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
    // Unsubscribe của listener "mạng khôi phục -> sync" (xem `startAutoSync`).
    this._autoSyncUnsub = null;
  }

  // ══════════════════════════════════════════════════════════════════
  // AUTO SYNC — đồng bộ khi mạng khôi phục
  // ══════════════════════════════════════════════════════════════════

  /**
   * Bật tự đồng bộ khi mạng khôi phục.
   *
   * ⚠️ VÌ SAO Ở TẦNG MODULE (KHÔNG phải trong `useSyncEngine`):
   *   Listener trước đây nằm trong `useSyncEngine` -> hook này chỉ được
   *   gọi ở `HomeScreen`. Mà `MainTabs` render tab có điều kiện
   *   (`{activeTab === 0 && <HomeScreen />}`) -> sang tab Tủ lạnh là
   *   `HomeScreen` bị UNMOUNT -> listener bị unsubscribe -> MẤT listener.
   *   => Bật mạng khi đang ở tab Tủ lạnh: KHÔNG BAO GIỜ sync -> món thêm
   *      offline nằm im trong hàng đợi và biến mất khỏi UI.
   *   Đặt ở tầng module (singleton) -> listener sống suốt vòng đời app,
   *   không phụ thuộc user đang ở tab nào.
   *
   * Gọi an toàn nhiều lần (chỉ đăng ký 1 listener).
   *
   * @returns {void}
   */
  startAutoSync() {
    if (this._autoSyncUnsub) return;

    this._autoSyncUnsub = onNetworkEvent('online', () => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[SyncEngine] Mạng khôi phục -> đồng bộ');
      }
      this.syncAll({ force: true }).catch(() => {});
    });
  }

  /**
   * Tắt tự đồng bộ (dùng khi logout / test).
   * @returns {void}
   */
  stopAutoSync() {
    this._autoSyncUnsub?.();
    this._autoSyncUnsub = null;
  }

  /**
   * Subscribe trạng thái sync (để UI hiện badge).
   *
   * @param {(state: {isSyncing:boolean, pendingCount:number, conflictCount:number, lastResult:SyncResult|null}) => void} handler
   * @returns {Function} unsubscribe
   */
  subscribe(handler) {
    this._listeners.add(handler);
    // Gửi trạng thái hiện tại ngay khi subscribe.
    handler({
      isSyncing: this._isSyncing,
      pendingCount: 0,
      conflictCount: 0,
      lastResult: this._lastResult,
    });
    return () => this._listeners.delete(handler);
  }

  /**
   * Phát trạng thái cho các subscriber.
   * @private
   */
  async _emit() {
    const pendingCount = await outboxQueue.countPending();
    // ⚠️ B5: đếm op bị CONFLICT riêng -> badge đỏ + modal chi tiết.
    const conflictCount = await outboxQueue.countByState(SYNC_STATES.CONFLICT);
    const state = {
      isSyncing: this._isSyncing,
      pendingCount,
      conflictCount,
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
   * Xác định `listId` + `itemId` THẬT (trên server) cho 1 op món mua.
   *
   * ⚠️ VÌ SAO CẦN (bug user báo: "thêm nguyên liệu offline bị kẹt"):
   *   - `listId` trong payload có thể là id GIẢ `'offline'` (đọc từ cache
   *     fallback) -> server 404 -> món mất vĩnh viễn.
   *   - `itemId` có thể là id LOCAL `pending_*` (món tạo offline) -> BE dùng
   *     `ParseIntPipe` nên id local sẽ 404 -> tick/xoá bị mất.
   *   => Luôn tra cache để lấy id thật; nếu chưa có thì lấy từ server.
   *
   * @param {object} payload - payload của op (shopping_*)
   * @returns {Promise<{listId: string|null, itemId: string|number|null}>}
   * @private
   */
  async _resolveShoppingContext(payload = {}) {
    // ── listId ──
    let listId = payload.listId;
    if (!listId || listId === OFFLINE_LIST_ID) {
      listId = (await offlineCache.getActiveShoppingListId()) ?? null;
    }
    if (!listId) {
      const recipe = realService('recipeService');
      if (recipe) {
        try {
          const active = await recipe.getActiveShoppingList();
          listId = active?.id ?? null;
          if (listId) await offlineCache.saveActiveShoppingListId(listId);
        } catch (_e) {
          // Không lấy được -> để null, caller sẽ ném lỗi rõ ràng.
        }
      }
    }

    // ── itemId ──
    let itemId = payload.itemId ?? null;
    if (itemId !== null && itemId !== undefined) {
      const backendId = await offlineCache.getShoppingItemBackendId(itemId);
      if (backendId) itemId = backendId;
    }

    return { listId, itemId };
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

        // ⚠️ B6: remap entity ID của các op còn lại (update/consume/delete)
        //   từ `pending_*` sang UUID server + ghi kèm `version` (BE bắt buộc
        //   version khi update -> thiếu là 400).
        if (created?.id) {
          await outboxQueue.reassignEntity(op.entity_id, String(created.id), {
            version: created.version ?? 0,
          });
        }
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

        // ⚠️ MÓN CHỈ CÓ Ở MÁY (không có id server):
        //   BE dùng `ParseIntPipe` cho `itemId` -> id local sẽ 400.
        //   Món user tự thêm được tick 100% ở client -> KHÔNG gọi API.
        //   ⚠️ Món CÓ id server -> vẫn gọi API (kể cả khi row bị đánh dấu
        //   `local_only` vì user đã sửa lượng ở máy).
        const isLocalOnly = await offlineCache.isShoppingItemLocalOnly(
          payload.itemId ?? op.entity_id
        );
        if (isLocalOnly) {
          await offlineCache.toggleLocalShoppingItem(payload.itemId ?? op.entity_id);
          return;
        }

        const ctx = await this._resolveShoppingContext(payload);
        if (!ctx.listId) throw new Error('Không tìm thấy danh sách mua để đồng bộ');
        await recipe.toggleShoppingItemInList(ctx.listId, ctx.itemId ?? payload.itemId);
        await offlineCache.clearShoppingPending(payload.itemId);
        return;
      }

      case OP_TYPES.SLOT_COMPLETE: {
        const recipe = realService('recipeService');
        if (!recipe) throw new Error('recipeService chưa sẵn sàng');
        // ⚠️ KHÔNG gửi `servings` -> BE dùng `slot.servings` (mặc định 1),
        //    giống hệt lúc user bấm nấu (đã gỡ Stepper khẩu phần — 19/11).
        const res = await recipe.updateSlot(payload.slotId, {
          completed: payload.completed,
        });

        // ⚠️ BE ĐÃ TRỪ TỦ LẠNH trên server -> cache local (đã trừ offline) phải
        //   khớp với server, nếu không tủ lạnh hiện sai lượng cho tới lần
        //   pull sau.
        //   => Ghi lại lượng thật từ BE (`consumedIngredients`).
        if (payload.completed === true) {
          await offlineCache.applyServerConsumption(
            payload.slotId,
            res?.consumedIngredients ?? []
          );
        }
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

      // ── F1: upload avatar offline ──
      case OP_TYPES.AVATAR_UPLOAD: {
        const user = realService('userService');
        if (!user) throw new Error('userService chưa sẵn sàng');
        const uploaded = await user.uploadAvatar(payload.localUri);
        // Đã upload xong -> xoá đường dẫn local, thay bằng URL server.
        await offlineCache.setAvatarLocal('', uploaded?.avatar ?? uploaded?.url ?? null);
        return;
      }

      // ── F2: bookmark công thức offline ──
      case OP_TYPES.RECIPE_BOOKMARK: {
        const recipe = realService('recipeService');
        if (!recipe) throw new Error('recipeService chưa sẵn sàng');
        if (payload.bookmarked === false) {
          await recipe.removeBookmark(payload.id);
        } else {
          await recipe.addBookmark(payload.id);
        }
        await offlineCache.setRecipeBookmarked(payload.id, payload.bookmarked !== false);
        return;
      }

      // ── F3: CRUD danh sách mua ──
      //
      // ⚠️ CHUẨN HOÁ THEO BE (rất quan trọng):
      //   BE KHÔNG có các endpoint:
      //     POST   /meal-planning/shopping-lists/{listId}/items
      //     DELETE /meal-planning/shopping-lists/{listId}/items/{itemId}
      //     POST   /meal-planning/slots/{slotId}/missing-to-shopping-list
      //   => Thêm / sửa lượng / xoá món lẻ + thêm nguyên liệu thiếu đều làm
      //      ở CLIENT (SQLite, `sync_status = 'local_only'`).
      //   Các op này giờ được `MutationHandlers` đánh dấu `suppressEnqueue`
      //   -> KHÔNG còn vào hàng đợi. Nhưng hàng đợi cũ (đã lưu từ bản cũ)
      //   vẫn có thể chứa chúng -> xử lý tại đây theo hướng LOCAL, KHÔNG gọi
      //   HTTP (tránh 404 lặp vô hạn).
      case OP_TYPES.SHOPPING_ITEM_ADD: {
        const recipe = realService('recipeService');
        if (!recipe) throw new Error('recipeService chưa sẵn sàng');

        // Id list THẬT đã cache; nếu không có thì lấy list active từ server.
        let listId = payload.listId;
        if (!listId || listId === OFFLINE_LIST_ID) {
          const cachedListId = await offlineCache.getActiveShoppingListId();
          listId = cachedListId ?? null;
          if (!listId) {
            const activeList = await recipe.getActiveShoppingList();
            listId = activeList?.id ?? null;
            if (listId) await offlineCache.saveActiveShoppingListId(listId);
          }
        }
        if (!listId) {
          throw new Error('Không tìm thấy danh sách mua để đồng bộ món đã thêm offline');
        }

        // ⚠️ `addShoppingListItem` KHÔNG gọi API (BE không có endpoint) ->
        //   nó chỉ ghi vào SQLite. Gọi lại ở đây để op cũ trong hàng đợi
        //   cũng được "chốt" đúng cách (không gọi endpoint không tồn tại).
        await recipe.addShoppingListItem(listId, payload.item ?? {});
        return;
      }

      case OP_TYPES.SHOPPING_ITEM_UPDATE: {
        const recipe = realService('recipeService');
        if (!recipe) throw new Error('recipeService chưa sẵn sàng');
        const ctx = await this._resolveShoppingContext(payload);
        if (!ctx.listId) throw new Error('Không tìm thấy danh sách mua để đồng bộ');
        // ⚠️ KHÔNG gọi HTTP: `PATCH .../items/{itemId}` của BE không có body,
        //   nó TOGGLE `isPurchased` -> sửa lượng chỉ làm ở client.
        await recipe.updateShoppingListItem(ctx.listId, ctx.itemId, {
          quantity: payload.quantity ?? undefined,
        });
        return;
      }

      case OP_TYPES.SHOPPING_ITEM_REMOVE: {
        const recipe = realService('recipeService');
        if (!recipe) throw new Error('recipeService chưa sẵn sàng');

        const ctx = await this._resolveShoppingContext(payload);
        // ⚠️ KHÔNG gọi HTTP: BE không có endpoint xoá món lẻ.
        await recipe.removeShoppingListItem(ctx.listId, ctx.itemId);
        return;
      }

      // ── Thêm nguyên liệu thiếu (theo slot) vào giỏ mua ──
      case OP_TYPES.SHOPPING_MISSING_ADD: {
        const recipe = realService('recipeService');
        if (!recipe) throw new Error('recipeService chưa sẵn sàng');
        // ⚠️ KHÔNG gọi HTTP: BE không có
        //   `POST /meal-planning/slots/{slotId}/missing-to-shopping-list`.
        //   Việc tính phần thiếu làm ở client từ `GET /slots/{id}`.
        await recipe.addSlotMissingToShoppingList(payload.slotId, {
          servings: payload.servings ?? undefined,
        });
        return;
      }

      // ── F5: thao tác thông báo offline ──
      case OP_TYPES.NOTIFICATION_READ: {
        const notification = realService('notificationService');
        if (!notification) throw new Error('notificationService chưa sẵn sàng');
        await notification.markAsRead(payload.id);
        await offlineCache.setNotificationRead(payload.id, true);
        return;
      }

      case OP_TYPES.NOTIFICATION_READ_ALL: {
        const notification = realService('notificationService');
        if (!notification) throw new Error('notificationService chưa sẵn sàng');
        await notification.markAllAsRead();
        await offlineCache.markAllNotificationsRead();
        return;
      }

      case OP_TYPES.NOTIFICATION_DELETE: {
        const notification = realService('notificationService');
        if (!notification) throw new Error('notificationService chưa sẵn sàng');
        await notification.deleteNotification(payload.id);
        await offlineCache.removeNotification(payload.id);
        return;
      }

      // ── F6: đổi công thức của slot offline ──
      case OP_TYPES.SLOT_UPDATE: {
        const recipe = realService('recipeService');
        if (!recipe) throw new Error('recipeService chưa sẵn sàng');
        await recipe.updateSlot(payload.slotId, { recipeId: payload.recipeId });
        await offlineCache.setWeeklyPlanSlotRecipe(payload.slotId, payload.recipeId);
        return;
      }

      // ── F7: nộp khảo sát onboarding offline ──
      case OP_TYPES.ONBOARDING_SUBMIT: {
        const user = realService('userService');
        if (!user) throw new Error('userService chưa sẵn sàng');
        await user.submitOnboarding(payload);
        const cached = await offlineCache.getUserPreferences();
        if (cached) {
          await offlineCache.saveUserPreferences(cached, SYNC_STATUS.SYNCED);
        }
        await offlineCache.saveJsonCache('onboarding', payload);
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
      // ⚠️ Cache "thực đơn ngày" (bữa ăn hôm nay) -> offline màn Home vẫn
      //   hiện đúng món hôm nay (kế hoạch tuần cache có thể là tuần khác).
      { name: 'dailyMeals', run: () => this._pullDailyMeals() },
      { name: 'userData', run: () => this._pullUserData() },
      { name: 'ingredientCatalog', run: () => this._pullIngredientCatalog() },
      { name: 'recipeList', run: () => this._pullRecipeList() },
      // ⚠️ B3: cache thông báo (offline màn thông báo phải hiện data THẬT).
      { name: 'notifications', run: () => this._pullNotifications() },
      // ⚠️ B4: cache gói đăng ký / gia đình / lịch sử thanh toán.
      { name: 'userContext', run: () => this._pullUserContext() },
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
   * Tải "thực đơn ngày" (bữa ăn hôm nay) về cache.
   *
   * ⚠️ VÌ SAO CẦN:
   *   `getSuggestions()` đã tự ghi cache khi online, nhưng nếu user mở app
   *   khi offline từ đầu (chưa từng mở Home) thì cache có thể cũ.
   *   Gọi lại ở đây để cache luôn mới nhất sau mỗi vòng sync.
   *
   * @private
   */
  async _pullDailyMeals() {
    const recipe = realService('recipeService');
    if (!recipe) return;
    const meals = await recipe.getSuggestions();
    if (!Array.isArray(meals) || meals.length === 0) return;

    // ⚠️ Tự ghi cache ở đây (không trông chờ vào write-through của service)
    //   -> hành vi luôn đúng kể cả khi service được thay thế / mock.
    await offlineCache.saveDailyMeals(toLocalDateStr(), meals);
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
      // ⚠️ F1 (avatar offline): khi đang PENDING, `stripSyncStatus(cached)` được
      //   spread SAU `profile` -> field `avatar`/`avatarLocalPath` của cache đè
      //   lên dữ liệu server. Điều đó đúng cho field user tự sửa (name, bio)
      //   nhưng SAI cho avatar: server có thể đã trả URL avatar MỚI (sau khi
      //   op `AVATAR_UPLOAD` vừa sync xong) -> cache lại quay về avatar cũ.
      //   => Giữ `avatar` của SERVER, chỉ giữ `avatarLocalPath` của cache
      //      (file local còn cần cho tới khi op upload xong).
      const cachedRest = stripSyncStatus(cached);
      await offlineCache.saveUserProfile(
        isPending
          ? {
              ...profile,
              ...cachedRest,
              avatar: profile.avatar ?? cachedRest.avatar ?? null,
              avatarLocalPath: cachedRest.avatarLocalPath ?? null,
            }
          : {
              ...profile,
              // Đã sync xong -> không còn file local nào chờ -> xoá đường dẫn.
              avatarLocalPath: null,
            },
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

  /**
   * Tải thông báo về cache (B3).
   *
   * ⚠️ VÌ SAO CẦN:
   *   Offline mà không có cache -> rơi xuống MOCK -> user thấy thông báo BỊA
   *   ("Tủ lạnh sắp hết thực phẩm" khi tủ còn đầy).
   *
   * @private
   */
  async _pullNotifications() {
    const notification = realService('notificationService');
    if (!notification) return;

    const list = await notification.getNotifications();
    if (!Array.isArray(list) || list.length === 0) return;

    await offlineCache.saveNotifications(list);
  }

  /**
   * Tải ngữ cảnh người dùng về cache JSON (B4).
   *
   * ⚠️ NHÓM TÀI CHÍNH / GIA ĐÌNH - CHỈ ĐỌC OFFLINE:
   *   Gom gói đăng ký / thông tin gia đình / lịch sử thanh toán. Ghi trong
   *   nhóm này KHÔNG có mutation handler -> B1 tự ném
   *   `OfflineRequiresNetworkError` khi offline (đúng yêu cầu).
   *
   * ⚠️ Mỗi endpoint fail độc lập -> 1 cái fail không chặn các cái còn lại.
   *
   * @private
   */
  async _pullUserContext() {
    const user = realService('userService');
    if (!user) return;

    const safe = async (label, fn) => {
      try {
        await fn();
      } catch (e) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn(`[SyncEngine] pull userContext.${label} lỗi:`, e?.message);
        }
      }
    };

    await safe('getCurrentPlan', async () => {
      const plan = await user.getCurrentPlan();
      if (plan) await offlineCache.saveJsonCache('current_plan', plan);
    });

    /**
     * ⚠️ 19/11 — THÊM: cache gói đầy đủ (shape `getMySubscription`).
     *
     * LÝ DO: `getCurrentPlan()` trả shape PHẲNG (`name`, `displayName`,
     * `price`, `status`) — KHÔNG có `plan` lồng. Màn "Gói của tôi" +
     * `PackageManagementScreen` đọc `currentSub.plan.name` /
     * `currentSub.status` -> offline phải có cache riêng.
     *
     * ⚠️ Cache này là "ảnh chụp" gói ĐANG có. Nếu BE đã hạ cấp/ghi đè sang
     * free (xem `subscriptionRecovery.js`), cache vẫn giữ gói cũ -> khi
     * offline user vẫn thấy gói đã mua thay vì bị "nhảy" về free.
     */
    await safe('getMySubscription', async () => {
      const sub = await user.getMySubscription();
      if (sub) await offlineCache.saveJsonCache('my_subscription', sub);
    });

    await safe('getFamilyInfo', async () => {
      const family = await user.getFamilyInfo();
      if (family) await offlineCache.saveJsonCache('family_info', family);
    });

    await safe('getAvailablePackages', async () => {
      const packages = await user.getAvailablePackages();
      if (packages) await offlineCache.saveJsonCache('packages', packages);
    });

    await safe('getPaymentHistory', async () => {
      const history = await user.getPaymentHistory(1, 20);
      if (history) await offlineCache.saveJsonCache('payment_history', history);
    });
  }
  // ══════════════════════════════════════════════════════════════════
  // PHASE 3 — PRE-CACHE RECIPES
  // ══════════════════════════════════════════════════════════════════

  /**
   * Tải trước chi tiết công thức của các slot trong plan tuần + thực đơn ngày.
   *
   * Chạy nền, KHÔNG await -> không chặn UI. Lỗi bị bỏ qua.
   *
   * ⚠️ VÌ SAO CẦN (yêu cầu của user):
   *   Offline user muốn MỞ được chi tiết công thức của các món trong
   *   thực đơn ngày / tuần (nguyên liệu + cách nấu) để nấu theo.
   *   Ngoài ra, khi tick "đã nấu" offline, client cần biết CHÍNH XÁC cần
   *   nguyên liệu gì để tự trừ tủ lạnh (xem `OfflineCache.consumeIngredientsForSlot`).
   *   => Cache `GET /meal-planning/slots/{id}` cho MỌI slot của tuần + ngày.
   *
   * @private
   */
  async _prefetchRecipes() {
    const recipe = realService('recipeService');
    if (!recipe) return;

    const plan = await recipe.getNextWeekPlan();
    const slots = (plan?.days ?? []).flatMap((day) => day.slots ?? []);

    // ⚠️ Dùng Set để không tải trùng 1 slot (slot có thể lặp giữa ngày hôm
    //   nay và plan tuần).
    const slotIds = new Set();
    slots.forEach((slot) => {
      if (slot?.id) slotIds.add(String(slot.id));
    });

    // 1) Các slot của THỰC ĐƠN NGÀY (bữa ăn hôm nay).
    //
    // ⚠️ `getSuggestions()` trả slot HÔM NAY -> cache theo ngày để offline
    //   mở màn "Thực đơn ngày" được.
    let dailySlotIds = new Set();
    try {
      const meals = await recipe.getSuggestions();
      for (const meal of meals ?? []) {
        if (!meal?.id) continue;
        const mealId = String(meal.id);
        dailySlotIds.add(mealId);
        slotIds.add(mealId);
      }
    } catch (_e) {
      // Bỏ qua — không có slot hôm nay thì không cache.
    }

    // 2) Tải chi tiết từng slot (song song, giới hạn 4 để không spam server).
    const ids = Array.from(slotIds);
    const detailsById = new Map();
    const batchSize = 4;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (slotId) => {
          try {
            const detail = await recipe.getSlotDetail(slotId);
            if (detail) {
              await offlineCache.saveRecipeDetail(slotId, 'slot', detail);
            }
            return [slotId, detail];
          } catch (_e) {
            // Bỏ qua lỗi 1 slot.
            return [slotId, null];
          }
        })
      );
      results.forEach(([slotId, detail]) => {
        if (detail) detailsById.set(slotId, detail);
      });
    }

    // 3) Lưu danh sách chi tiết theo NGÀY (để offline tra cứu nhanh).
    if (dailySlotIds.size > 0) {
      const dailyDetails = Array.from(dailySlotIds)
        .map((id) => detailsById.get(id))
        .filter(Boolean);
      if (dailyDetails.length > 0) {
        await offlineCache.saveDailyMealDetails(toLocalDateStr(), dailyDetails);
      }
    }

    // 4) Cache CHI TIẾT CÔNG THỨC (theo `recipeId`) của các slot trong plan.
    //
    // ⚠️ VÌ SAO CẦN:
    //   Màn "Chi tiết công thức" (`RecipeDetailScreen`) fetch theo `recipeId`
    //   (không phải slot id) -> `getRecipeById(recipeId)` -> cache key
    //   `local_recipe_details(id, 'recipe')`.
    //   Nếu chỉ cache slot detail thì offline vẫn KHÔNG mở được màn chi tiết
    //   công thức từ thực đơn ngày / tuần.
    //
    // ⚠️ `getRecipeById` tự ghi cache (`saveRecipeDetail(id, 'recipe', detail)`)
    //   -> ta chỉ cần gọi nó, không phải tự ghi.
    const recipeIds = new Set();
    detailsById.forEach((detail) => {
      const rid = detail?.recipe?.id;
      if (rid) recipeIds.add(String(rid));
    });

    const recipeIdList = Array.from(recipeIds);
    for (let i = 0; i < recipeIdList.length; i += 4) {
      const batch = recipeIdList.slice(i, i + 4);
      await Promise.all(
        batch.map(async (recipeId) => {
          try {
            await recipe.getRecipeById(recipeId);
          } catch (_e) {
            // Bỏ qua lỗi 1 công thức.
          }
        })
      );
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
