/**
 * MutationHandlers - định nghĩa cách queue 1 thao tác ghi khi offline.
 *
 * Port từ Flutter:
 *   - `fridge_ops_local_service.dart`  (update / consume / delete)
 *   - `slot_completion_local_service.dart` (tick "đã nấu")
 *   - `ingredient_local_service.dart` (thêm nguyên liệu)
 *   - `allergy_local_service.dart` (thêm / xoá dị ứng) — v4
 *   - `user_profile_local_service.dart` + `user_preference_local_service.dart` — v4
 *
 * VÌ SAO CẦN:
 *   Khi offline, mọi thao tác ghi (thêm/sửa/xoá/tick) phải được LƯU LẠI,
 *   không mất trắng. Cơ chế: `SafeService` bắt lỗi network của method ghi,
 *   gọi handler tương ứng để (1) ghi vào cache local (2) đẩy vào hàng đợi,
 *   rồi ném `OfflineQueuedError` để UI hiện thông báo "đã lưu, sẽ đồng bộ".
 *
 * ⚠️ HỢP ĐỒNG CỦA 1 HANDLER:
 *   {
 *     opType:    string,             // xem `OP_TYPES`
 *     entityId:  (args) => string,   // id đối tượng bị tác động
 *     payload:   (args) => object,   // dữ liệu để gọi API lúc sync
 *     applyCache:(args, ctx) => Promise,  // cập nhật cache local (optimistic)
 *     result:    (args) => any       // giá trị trả về giả cho UI (tuỳ chọn)
 *   }
 *
 * ⚠️ `ctx` TRONG `applyCache`:
 *   `ctx = { entityId }` — id đã resolve của thao tác. Handler `addItem` PHẢI
 *   dùng `ctx.entityId` cho row pending để khớp với `entity_id` trong
 *   `local_pending_ops` (nếu không -> món "ma" mồ côi sau khi sync).
 *
 * ⚠️ VÌ SAO 4xx KHÔNG QUEUE:
 *   Lỗi 4xx = yêu cầu sai (payload hỏng, không đủ quyền, conflict).
 *   Queue lại chỉ để thất bại lặp lại. 4xx phải ném lên UI ngay.
 *   Riêng 409 (conflict optimistic locking) -> queue lại + đánh dấu để user
 *   xử lý (quyết định đã chốt: giữ op, không tự ghi đè).
 *
 * R7: comment tiếng Việt.
 */

import { offlineCache, SYNC_STATUS } from './OfflineCache';
import { OP_TYPES, outboxQueue } from './OutboxQueue';
import { computeMissingPurchaseQuantity, computeServingsScale } from '../utils/shoppingMissing';
/**
 * Lỗi ném ra khi thao tác đã được LƯU OFFLINE (không phải lỗi thật).
 *
 * UI kiểm tra `e.isOfflineQueued === true` để hiện thông báo phù hợp
 * ("đã lưu, sẽ đồng bộ khi có mạng") thay vì thông báo lỗi.
 */
export class OfflineQueuedError extends Error {
  constructor(opType, message = 'Đã lưu offline, sẽ đồng bộ khi có mạng') {
    super(message);
    this.name = 'OfflineQueuedError';
    this.isOfflineQueued = true;
    this.opType = opType;
  }
}

/**
 * Sinh id tạm cho item chưa có id server.
 * @returns {string}
 */
const pendingId = () => `pending_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

/**
 * Id này có phải id tạm của item tạo offline không (`pending_*`)?
 *
 * ⚠️ B7: item tạo offline có `version = null` -> BE bắt buộc `version` khi
 *   PATCH -> nếu không coalesce sẽ 400.
 *
 * @param {any} id
 * @returns {boolean}
 */
const isPendingId = (id) => typeof id === 'string' && id.startsWith('pending_');

/**
 * Tính `days_until_expiry` từ ngày hết hạn (để cache hiển thị đúng status).
 * @param {string|null|undefined} expiryDate - `YYYY-MM-DD`
 * @returns {number|null}
 */
const daysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const target = new Date(`${expiryDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

/**
 * Bảng handler cho từng service.
 *
 * ⚠️ Key phải khớp CHÍNH XÁC tên method trong `Real*Service`.
 */
export const MUTATION_HANDLERS = {
  fridgeService: {
    /**
     * `POST /fridge/items` — thêm nguyên liệu.
     */
    addItem: {
      opType: OP_TYPES.FRIDGE_ADD,
      entityId: () => pendingId(),
      payload: (args) => {
        const item = args[0] ?? {};
        return {
          name: item.name,
          ingredientId: item.ingredientId ?? null,
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
          compartment: item.compartment ?? null,
          expiryDate: item.expiryDate ?? null,
        };
      },
      applyCache: async (args, ctx) => {
        const item = args[0] ?? {};
        // ⚠️ Dùng `ctx.entityId` (id đã sinh cho `local_pending_ops`) để id
        //   của row pending trong `local_ingredients` KHỚP với `entity_id`.
        //   Nếu tự sinh id riêng -> upload xong không xoá được row pending ->
        //   món "ma" mãi trong tủ mà không còn op để sync.
        const id = ctx?.entityId ?? pendingId();
        await offlineCache.savePendingFridgeItem({
          id,
          name: item.name ?? '',
          ingredientId: item.ingredientId ?? null,
          quantity: Number(item.quantity) || 0,
          unit: item.unit ?? null,
          compartment: item.compartment ?? null,
          expiryDate: item.expiryDate ?? null,
          daysUntilExpiry: daysUntilExpiry(item.expiryDate),
          image: item.image ?? null,
        });
      },
    },

    /**
     * `PATCH /fridge/items/:id` — sửa số lượng / đơn vị / hạn dùng.
     *
     * ⚠️ B7 - COALESCE ITEM PENDING:
     *   Item tạo offline có id `pending_*` và `version = null`. BE bắt buộc
     *   `version` (`@IsInt() @Min(0)`) -> PATCH item pending sẽ 400.
     *   => Với id `pending_*`: GỘP thay đổi vào payload op `FRIDGE_ADD` đang
     *      chờ (chỉ cần 1 op ADD cho tới lúc lên server) + KHÔNG tạo op
     *      `FRIDGE_UPDATE` riêng.
     */
    updateItem: {
      opType: OP_TYPES.FRIDGE_UPDATE,
      entityId: (args) => String(args[0] ?? ''),
      payload: (args) => {
        const updates = args[1] ?? {};
        return {
          quantity: updates.quantity ?? null,
          unit: updates.unit ?? null,
          expiryDate: updates.expiryDate ?? null,
          clearExpiry: updates.clearExpiry === true,
          version: updates.version ?? null,
        };
      },
      suppressEnqueue: (args) => isPendingId(args[0]),
      applyCache: async (args) => {
        const id = args[0];
        const updates = args[1] ?? {};
        if (!id) return;

        await offlineCache.updateFridgeItem(String(id), {
          quantity: updates.quantity,
          unit: updates.unit,
          expiryDate: updates.expiryDate,
          daysUntilExpiry: daysUntilExpiry(updates.expiryDate),
          compartment: updates.compartment,
        });
        await offlineCache.markFridgeItemPending(String(id));

        // Gộp vào op FRIDGE_ADD đang chờ (nếu có) -> tránh PATCH version null.
        if (isPendingId(id)) {
          const patch = {};
          if (updates.quantity !== undefined) patch.quantity = updates.quantity;
          if (updates.unit !== undefined) patch.unit = updates.unit;
          if (updates.expiryDate !== undefined) patch.expiryDate = updates.expiryDate;
          if (updates.compartment !== undefined) patch.compartment = updates.compartment;
          if (Object.keys(patch).length > 0) {
            await outboxQueue.mergePayload(OP_TYPES.FRIDGE_ADD, String(id), patch);
          }
        }
      },
    },

    /**
     * `PATCH /fridge/items/:id/consume` — đánh dấu đã dùng hết.
     *
     * ⚠️ B7: id `pending_*` -> gộp `quantity = 0` vào op FRIDGE_ADD đang chờ.
     */
    markConsumed: {
      opType: OP_TYPES.FRIDGE_CONSUME,
      entityId: (args) => String(args[0] ?? ''),
      payload: (args) => ({ id: String(args[0] ?? '') }),
      suppressEnqueue: (args) => isPendingId(args[0]),
      applyCache: async (args) => {
        const id = args[0];
        if (!id) return;

        // Đã dùng hết -> số lượng = 0, hạn dùng = hôm nay.
        await offlineCache.updateFridgeItem(String(id), {
          quantity: 0,
          daysUntilExpiry: 0,
        });
        await offlineCache.markFridgeItemPending(String(id));

        if (isPendingId(id)) {
          await outboxQueue.mergePayload(OP_TYPES.FRIDGE_ADD, String(id), { quantity: 0 });
        }
      },
    },

    /**
     * `DELETE /fridge/items/:id` — xoá khỏi tủ.
     *
     * ⚠️ B7: id `pending_*` -> item CHƯA từng lên server -> chỉ gỡ op
     *   `FRIDGE_ADD` đang chờ + xoá row pending. KHÔNG gọi DELETE server.
     */
    deleteItem: {
      opType: OP_TYPES.FRIDGE_DELETE,
      entityId: (args) => String(args[0] ?? ''),
      payload: (args) => ({ id: String(args[0] ?? '') }),
      suppressEnqueue: (args) => isPendingId(args[0]),
      applyCache: async (args) => {
        const id = args[0];
        if (!id) return;

        if (isPendingId(id)) {
          // Gỡ op ADD đang chờ -> item sẽ không bao giờ lên server.
          await outboxQueue.removeByEntity(String(id), OP_TYPES.FRIDGE_ADD);
        }
        await offlineCache.removeFridgeItem(String(id));
      },
    },
  },

  recipeService: {
    /**
     * `PATCH /meal-planning/shopping-lists/{listId}/items/{itemId}` — tick đã mua.
     *
     * ⚠️ BE TỰ TOGGLE (không nhận `isPurchased` trong body) -> payload chỉ cần
     *    id + listId để sync gọi lại đúng endpoint.
     *
     * ⚠️ MÓN CHỈ CÓ Ở MÁY (`local_*`, không có id server):
     *   BE dùng `ParseIntPipe` -> id local sẽ 400 khi sync.
     *   Vì vậy món local KHÔNG queue op toggle, chỉ đổi trạng thái ở client
     *   (`suppressEnqueue` -> không có op trong hàng đợi).
     *
     * ⚠️ Món CÓ id server (dù user đã sửa lượng ở máy) -> VẪN queue op toggle
     *   để đồng bộ lên BE (BE có endpoint toggle).
     */
    toggleShoppingItemInList: {
      opType: OP_TYPES.SHOPPING_TOGGLE,
      entityId: (args) => String(args[1] ?? ''),
      payload: (args) => ({
        listId: args[0] ?? null,
        itemId: args[1] ?? null,
      }),
      suppressEnqueue: async (args) => {
        const itemId = args[1];
        if (itemId === null || itemId === undefined) return true;
        // Món chỉ có ở máy (không có id server) -> không có endpoint để tick
        // -> KHÔNG đẩy vào hàng đợi (tránh 404/400 lặp vô hạn lúc sync).
        return offlineCache.isShoppingItemLocalOnly(itemId);
      },
      applyCache: async (args) => {
        const listId = args[0];
        const itemId = args[1];
        if (itemId === null || itemId === undefined) return;

        const localOnly = await offlineCache.isShoppingItemLocalOnly(itemId);
        if (localOnly) {
          // Tick 100% ở client (giữ nguyên `local_only`).
          await offlineCache.toggleLocalShoppingItem(itemId);
          return;
        }

        const items = await offlineCache.getShoppingItems();
        const current = items.find((i) => String(i.id) === String(itemId));
        await offlineCache.setShoppingItemPurchased(
          itemId,
          !(current?.done ?? false),
          listId ?? null
        );
      },
    },
    /**
     * `PATCH /meal-planning/slots/{slotId}` — tick "đã nấu" hoặc đổi công thức.
     *
     * ⚠️ CHỈ queue khi payload có `completed` HOẶC `recipeId`:
     *    các patch khác của `updateSlot` không phải thao tác offline được ->
     *    để lỗi ném lên.
     */
    updateSlot: {
      opType: OP_TYPES.SLOT_COMPLETE,
      canQueue: (args) => {
        const payload = args[1] ?? {};
        return payload.completed !== undefined || payload.recipeId !== undefined;
      },
      entityId: (args) => String(args[0] ?? ''),
      payload: (args) => {
        const payload = args[1] ?? {};
        return {
          slotId: args[0] ?? null,
          completed: payload.completed,
          // ⚠️ KHÔNG lưu `servings` (đã gỡ Stepper khẩu phần — 19/11):
          //   BE dùng `slot.servings` (mặc định 1) khi không nhận field này ->
          //   đồng bộ offline khớp đúng lúc user bấm nấu.
          // ⚠️ F6: đổi công thức của slot.
          recipeId: payload.recipeId ?? null,
        };
      },
      applyCache: async (args) => {
        const slotId = args[0];
        if (!slotId) return;

        const payload = args[1] ?? {};

        // Lưu trạng thái cooked vào cache slot để UI vẫn hiện đúng tick.
        if (payload.completed !== undefined) {
          await offlineCache.setSlotCooked(String(slotId), payload.completed === true);
        }

        // ⚠️ OFFLINE — TỰ TRỪ TỦ LẠNH khi tick "đã nấu" (yêu cầu của user).
        //   BE chỉ trừ nguyên liệu khi `PATCH /meal-planning/slots/{id}` tới
        //   server. Offline không có BE -> nếu không trừ ở client, tủ lạnh
        //   vẫn nguyên trạng -> user tưởng app hỏng.
        //   => Mô phỏng y hệt `consumeIngredientsForSlot` của BE (FIFO theo
        //      hạn dùng, quy về base unit g/ml).
        //
        // ⚠️ CHỈ khi `completed === true`:
        //   Untick (completed=false) KHÔNG được hoàn lại lượng — BE cũng vậy
        //   (idempotent guard chỉ trừ lần đầu, không hoàn khi untick).
        if (payload.completed === true) {
          await offlineCache.consumeIngredientsForSlot(
            String(slotId),
            null,
            null
          );
        }

        // F6: đổi công thức -> cập nhật JSON kế hoạch tuần (tên/ảnh lấy từ cache).
        if (payload.recipeId !== undefined && payload.recipeId !== null) {
          await offlineCache.setWeeklyPlanSlotRecipe(String(slotId), payload.recipeId);
        }
      },
    },

    /**
     * `POST /recipes/{id}/bookmark` — bookmark công thức (F2).
     *
     * ⚠️ `replace: true` -> bấm bookmark rồi bỏ bookmark khi offline chỉ còn
     *    1 op cuối cùng (tránh hàng đợi phình to).
     */
    addBookmark: {
      opType: OP_TYPES.RECIPE_BOOKMARK,
      entityId: (args) => String(args[0] ?? ''),
      payload: (args) => ({ id: String(args[0] ?? ''), bookmarked: true }),
      enqueueOptions: { replace: true },
      applyCache: async (args) => {
        const id = args[0];
        if (!id) return;
        await offlineCache.setRecipeBookmarked(String(id), true);
      },
    },

    /**
     * `DELETE /recipes/{id}/bookmark` — bỏ bookmark công thức (F2).
     */
    removeBookmark: {
      opType: OP_TYPES.RECIPE_BOOKMARK,
      entityId: (args) => String(args[0] ?? ''),
      payload: (args) => ({ id: String(args[0] ?? ''), bookmarked: false }),
      enqueueOptions: { replace: true },
      applyCache: async (args) => {
        const id = args[0];
        if (!id) return;
        await offlineCache.setRecipeBookmarked(String(id), false);
      },
    },

    /**
     * Thêm món mua — LÀM Ở CLIENT (BE không có endpoint thêm món lẻ).
     *
     * ⚠️ VÌ SAO `suppressEnqueue: true`:
     *   BE KHÔNG có `POST /meal-planning/shopping-lists/{listId}/items` -> nếu
     *   queue op này thì lúc sync sẽ gọi endpoint không tồn tại -> 404 -> món
     *   mất vĩnh viễn. => Chỉ ghi vào SQLite, KHÔNG đẩy lên hàng đợi.
     *
     * ⚠️ `name` PHẢI có trong payload:
     *   Cache local cần tên để hiển thị ngay (user vừa thêm món phải THẤY
     *   tên, không phải dòng rỗng).
     */
    addShoppingListItem: {
      opType: OP_TYPES.SHOPPING_ITEM_ADD,
      entityId: () => pendingId(),
      payload: (args) => ({
        listId: args[0] ?? null,
        item: args[1] ?? {},
      }),
      suppressEnqueue: () => true,
      applyCache: async (args, ctx) => {
        const listId = args[0];
        const item = args[1] ?? {};
        const id = ctx?.entityId ?? pendingId();

        await offlineCache.addLocalShoppingItem({
          id,
          name: item.name ?? item.ingredientName ?? '',
          quantity: Number(item.quantity) || 0,
          unit: item.unit ?? '',
          ingredientId: item.ingredientId ?? null,
          listId: listId ?? null,
          done: false,
        });
      },
    },

    /**
     * Sửa số lượng món mua — LÀM Ở CLIENT.
     *
     * ⚠️ BE `PATCH .../items/{itemId}` KHÔNG có `@Body()` -> nó TOGGLE
     *   `isPurchased` (và tự thêm món vào tủ lạnh khi tick `true`).
     *   Gửi `{ quantity }` đi sẽ vô tình đánh dấu "đã mua" -> sai hoàn toàn.
     *   => Chỉ sửa trong SQLite, KHÔNG queue.
     */
    updateShoppingListItem: {
      opType: OP_TYPES.SHOPPING_ITEM_UPDATE,
      entityId: (args) => String(args[1] ?? ''),
      payload: (args) => ({
        listId: args[0] ?? null,
        itemId: args[1] ?? null,
        quantity: (args[2] ?? {}).quantity ?? null,
      }),
      suppressEnqueue: () => true,
      applyCache: async (args) => {
        const itemId = args[1];
        const payload = args[2] ?? {};
        if (!itemId) return;

        if (payload.quantity !== undefined && payload.quantity !== null) {
          await offlineCache.updateShoppingItemQuantityLocal(itemId, payload.quantity);
        }
      },
    },

    /**
     * Xoá món mua — LÀM Ở CLIENT (BE không có endpoint xoá món lẻ).
     *
     * ⚠️ Dùng tombstone (`local_deleted`) thay vì DELETE row -> món đã xoá ở
     *   máy KHÔNG bị "hồi sinh" khi pull danh sách từ server.
     */
    removeShoppingListItem: {
      opType: OP_TYPES.SHOPPING_ITEM_REMOVE,
      entityId: (args) => String(args[1] ?? ''),
      payload: (args) => ({
        listId: args[0] ?? null,
        itemId: args[1] ?? null,
      }),
      suppressEnqueue: () => true,
      applyCache: async (args) => {
        const itemId = args[1];
        if (!itemId) return;
        await offlineCache.markShoppingItemLocallyDeleted(itemId);
      },
    },

    /**
     * Thêm nguyên liệu THIẾU của 1 slot vào giỏ mua — LÀM Ở CLIENT.
     *
     * ⚠️ VÌ SAO `suppressEnqueue: true`:
     *   BE KHÔNG có `POST /meal-planning/slots/{slotId}/missing-to-shopping-list`
     *   -> queue op này thì lúc sync sẽ gọi endpoint không tồn tại -> 404.
     *   => Chỉ ghi vào SQLite (`local_only`), KHÔNG đẩy lên hàng đợi.
     *
     * ⚠️ VÌ SAO CẦN (bug user báo):
     *   Method này có trong `WriteMethods.recipeService` (là method GHI) nhưng
     *   trước đây KHÔNG có handler -> offline gọi sẽ ném
     *   `OfflineRequiresNetworkError` -> nút "+ Thêm vào DS" chết khi mất mạng.
     *
     * ⚠️ CÁCH LÀM OPTIMISTIC:
     *   BE tính phần thiếu dựa trên TỦ LẠNH THẬT. Offline ta không gọi được
     *   BE -> dùng cache `local_recipe_details` (slot detail đã cache sẵn từ
     *   `getSlotDetail`) -> `summary.missingItems` là đúng danh sách thiếu.
     *   Thêm từng món vào `local_shopping_items` với `sync_status='local_only'`
     *   (id `local_missing_<slotId>_<index>`) -> UI hiện ngay + không mất
     *   khi app bị kill + không bị mất khi pull dữ liệu server về.
     *
     * ⚠️ `servings` (KHẨU PHẦN) — yêu cầu của user:
     *   Món thêm vào giỏ phải theo đúng khẩu phần user chọn, không phải mặc
     *   định của slot. `missingQuantity` trong cache đã scale theo
     *   `slot.servings` -> nhân thêm `servings / slot.servings`.
     */
    addSlotMissingToShoppingList: {
      opType: OP_TYPES.SHOPPING_MISSING_ADD,
      entityId: (args) => String(args[0] ?? ''),
      payload: (args) => ({
        slotId: args[0] ?? null,
        // ⚠️ PHẢI lưu `servings` -> khi sync, BE scale lại đúng khẩu phần.
        servings: args[1]?.servings ?? args[1] ?? null,
      }),
      suppressEnqueue: () => true,
      applyCache: async (args) => {
        const slotId = args[0];
        if (!slotId) return;

        const options = args[1] ?? {};
        const targetServings = Number(options.servings) || null;

        // Đọc chi tiết slot từ cache (đã cache ở `getSlotDetail`).
        const detail = await offlineCache.getRecipeDetail(String(slotId), 'slot');
        const missingItems = detail?.summary?.missingItems ?? [];
        if (!Array.isArray(missingItems) || missingItems.length === 0) return;

        // Khẩu phần của slot trong kế hoạch (mẫu số để scale).
        const slotServings = Math.max(1, detail?.servings ?? 1);
        const scale = computeServingsScale(targetServings, slotServings);

        // List id THẬT (để tick/xoá sau khi sync gọi đúng endpoint).
        const listId = await offlineCache.getActiveShoppingListId();

        for (let i = 0; i < missingItems.length; i += 1) {
          const item = missingItems[i];
          if (!item?.name) continue;

          // ⚠️ Tính lại lượng thiếu theo khẩu phần user chọn (giống BE).
          //   Xem `src/data/utils/shoppingMissing.js` để hiểu vì sao KHÔNG
          //   dùng `missingQuantity * scale`.
          const missingNew = computeMissingPurchaseQuantity(item, scale);
          if (missingNew <= 0) continue;

          await offlineCache.addLocalShoppingItem({
            id: `local_missing_${slotId}_${i}`,
            name: item.name,
            quantity: Math.max(0.01, Math.round(missingNew * 100) / 100),
            // ⚠️ `missingQuantity` đã chuẩn hoá về base unit -> dùng
            //   `baseUnit` (vd "g"), KHÔNG dùng `originalUnit` (vd "kg") ->
            //   "0.5 kg" trong khi thực tế là 500g -> user mua sai lượng.
            unit: item.baseUnit ?? item.originalUnit ?? item.unit ?? '',
            ingredientId: item.ingredientId ?? null,
            listId,
            done: false,
          });
        }
      },
    },
  },

  /**
   * ⚠️ v4 — nhóm dị ứng / hồ sơ / sở thích (đối chiếu Flutter 14/11).
   *
   * Flutter xử lý 3 nhóm này offline qua cột `sync_status` trong
   * `local_allergies` / `local_user_profile` / `local_user_preferences`
   * (không dùng bảng queue riêng). RN dùng chung `local_pending_ops` nên
   * vẫn queue được, nhưng phải giữ đúng quy ước:
   *   - thêm dị ứng -> row 'pending' (ẩn khỏi server, hiện trong UI)
   *   - xoá dị ứng -> row 'pending_delete' (ẩn khỏi UI, chờ DELETE server)
   */
  userService: {
    /**
     * `POST /users/me/allergies` — thêm dị ứng.
     *
     * ⚠️ BE BẮT BUỘC `ingredientId` là số >= 1 -> nếu thiếu thì để lỗi ném lên
     *    (không queue payload vô nghĩa).
     */
    addAllergy: {
      opType: OP_TYPES.ALLERGY_ADD,
      entityId: () => pendingId(),
      payload: (args) => {
        const ingredientId = Number(args[0]);
        return {
          ingredientId,
          note: args[1] ?? null,
        };
      },
      canQueue: (args) => {
        const id = Number(args[0]);
        return Number.isInteger(id) && id >= 1;
      },
      applyCache: async (args, ctx) => {
        const ingredientId = Number(args[0]);
        if (!Number.isInteger(ingredientId) || ingredientId < 1) return;

        // Tên nguyên liệu lấy từ catalog cache (nếu có) -> UI hiện đúng tên.
        let name = `Nguyên liệu #${ingredientId}`;
        try {
          const catalog = await offlineCache.searchIngredientCatalog('', 500);
          const found = catalog.find((c) => Number(c.id) === ingredientId);
          if (found?.name) name = found.name;
        } catch (_e) {
          // Không có catalog -> dùng tên tạm, không chặn luồng.
        }

        await offlineCache.savePendingAllergy({
          id: ctx?.entityId ?? pendingId(),
          ingredientId,
          name,
          note: args[1] ?? null,
        });
      },
    },

    /**
     * `DELETE /users/me/allergies/:id` — xoá dị ứng.
     *
     * ⚠️ Chỉ queue được khi id là id thật từ server. Id tạm `pending_*` đã
     *    được queue bởi `ALLERGY_ADD` -> xoá nó chỉ cần gỡ op add, không
     *    cần gọi DELETE server.
     */
    removeAllergy: {
      opType: OP_TYPES.ALLERGY_DELETE,
      entityId: (args) => String(args[0] ?? ''),
      canQueue: (args) => {
        const id = String(args[0] ?? '');
        // Id tạm -> không có trên server -> không gọi DELETE.
        return id.length > 0 && !id.startsWith('pending_');
      },
      payload: (args) => ({ id: String(args[0] ?? '') }),
      applyCache: async (args) => {
        const id = String(args[0] ?? '');
        if (!id) return;

        await offlineCache.markAllergyPendingDelete(id);
      },
    },

    /**
     * `PATCH /users/me/profile` — sửa hồ sơ.
     */
    updateProfile: {
      opType: OP_TYPES.PROFILE_UPDATE,
      entityId: () => 'me',
      payload: (args) => {
        const updates = args[0] ?? {};
        return {
          name: updates.name ?? null,
          dateOfBirth: updates.birthday || updates.dateOfBirth || null,
          gender: updates.gender ?? null,
          bio: updates.bio ?? null,
        };
      },
      applyCache: async (args) => {
        const updates = args[0] ?? {};
        const cached = await offlineCache.getUserProfile();

        await offlineCache.saveUserProfile(
          {
            ...(cached ?? {}),
            name: updates.name ?? cached?.name ?? '',
            email: cached?.email ?? '',
            phone: cached?.phone ?? null,
            avatar: cached?.avatar ?? null,
            birthday: updates.birthday || updates.dateOfBirth || cached?.birthday || null,
            gender: updates.gender ?? cached?.gender ?? null,
            bio: updates.bio ?? cached?.bio ?? null,
            role: cached?.role ?? null,
            status: cached?.status ?? null,
          },
          SYNC_STATUS.PENDING
        );
      },
    },

    /**
     * `PATCH /users/me/preferences` — sửa tùy chọn ăn uống.
     */
    updatePreferences: {
      opType: OP_TYPES.PREFS_UPDATE,
      entityId: () => 'me',
      payload: (args) => {
        const prefs = args[0] ?? {};
        return {
          weeklyBudget: prefs.weeklyBudget ?? null,
          dailyCalorieTarget: prefs.dailyCalorieTarget ?? null,
          dietaryStyle: prefs.dietaryStyle ?? null,
          preferSimpleRecipes: prefs.preferSimpleRecipes ?? false,
          maxCookTimeMinutes: prefs.maxCookTimeMinutes ?? null,
          skillLevel: prefs.skillLevel ?? null,
          householdSize: prefs.householdSize ?? null,
          aiPersonalityMode: prefs.aiPersonalityMode ?? null,
          primaryGoal: prefs.primaryGoal ?? null,
          cookingFrequency: prefs.cookingFrequency ?? null,
          height: prefs.height ?? null,
          weight: prefs.weight ?? null,
          activityLevel: prefs.activityLevel ?? null,
        };
      },
      applyCache: async (args) => {
        const prefs = args[0] ?? {};
        const cached = await offlineCache.getUserPreferences();

        await offlineCache.saveUserPreferences(
          {
            ...(cached ?? {}),
            ...prefs,
          },
          SYNC_STATUS.PENDING
        );
      },
    },

    /**
     * `POST /users/me/avatar` — upload avatar (F1).
     *
     * ⚠️ applyCache lưu `avatar_local_path` + đặt `avatar` = localUri để UI
     *   hiện ảnh NGAY (file còn nằm trên máy), không phải avatar cũ từ server.
     *
     * ⚠️ `replace: true` -> user chọn ảnh nhiều lần khi offline chỉ còn op
     *   MỚI NHẤT trong hàng đợi (giống bookmark/tick). Upload cả 2 ảnh là
     *   thừa, và ảnh cũ có thể đã bị user xoá khỏi máy.
     */
    uploadAvatar: {
      opType: OP_TYPES.AVATAR_UPLOAD,
      entityId: () => 'me',
      payload: (args) => ({ localUri: args[0] ?? null }),
      canQueue: (args) => !!args[0],
      enqueueOptions: { replace: true },
      applyCache: async (args) => {
        const localUri = args[0];
        if (!localUri) return;

        await offlineCache.setAvatarLocal(localUri, localUri);
      },
    },

    /**
     * `POST /users/me/onboarding` — nộp khảo sát onboarding (F7).
     *
     * ⚠️ BE BẮT BUỘC `primaryGoal` + `cookingFrequency` -> thiếu thì không
     *   queue (để lỗi ném lên UI thay vì tạo op vô nghĩa).
     */
    submitOnboarding: {
      opType: OP_TYPES.ONBOARDING_SUBMIT,
      entityId: () => 'me',
      payload: (args) => {
        const data = args[0] ?? {};
        return {
          primaryGoal: data.primaryGoal ?? null,
          cookingFrequency: data.cookingFrequency ?? null,
          dietaryStyle: data.dietaryStyle ?? null,
          skillLevel: data.skillLevel ?? null,
          householdSize: data.householdSize ?? null,
          maxCookTimeMinutes: data.maxCookTimeMinutes ?? null,
          preferSimpleRecipes: data.preferSimpleRecipes ?? false,
          weeklyBudget: data.weeklyBudget ?? null,
          dailyCalorieTarget: data.dailyCalorieTarget ?? null,
          aiPersonalityMode: data.aiPersonalityMode ?? null,
        };
      },
      canQueue: (args) => {
        const data = args[0] ?? {};
        return !!data.primaryGoal && !!data.cookingFrequency;
      },
      applyCache: async (args) => {
        const data = args[0] ?? {};
        const cached = await offlineCache.getUserPreferences();

        await offlineCache.saveUserPreferences(
          {
            ...(cached ?? {}),
            primaryGoal: data.primaryGoal ?? cached?.primaryGoal ?? null,
            cookingFrequency: data.cookingFrequency ?? cached?.cookingFrequency ?? null,
            dietaryStyle: data.dietaryStyle ?? cached?.dietaryStyle ?? null,
            skillLevel: data.skillLevel ?? cached?.skillLevel ?? null,
            householdSize: data.householdSize ?? cached?.householdSize ?? null,
          },
          SYNC_STATUS.PENDING
        );
        await offlineCache.saveJsonCache('onboarding', data);
      },
    },
  },

  /**
   * ⚠️ F5 — thao tác thông báo offline (đọc / đọc hết / xoá).
   *
   * Đối chiếu Flutter `notification_local_service.dart`.
   */
  notificationService: {
    /**
     * `PATCH /notifications/{id}/read` — đánh dấu 1 thông báo đã đọc.
     */
    markAsRead: {
      opType: OP_TYPES.NOTIFICATION_READ,
      entityId: (args) => String(args[0] ?? ''),
      payload: (args) => ({ id: String(args[0] ?? '') }),
      enqueueOptions: { replace: true },
      applyCache: async (args) => {
        const id = args[0];
        if (!id) return;
        await offlineCache.setNotificationRead(String(id), true);
      },
    },

    /**
     * `PATCH /notifications/read-all` — đánh dấu tất cả đã đọc.
     */
    markAllAsRead: {
      opType: OP_TYPES.NOTIFICATION_READ_ALL,
      entityId: () => 'all',
      payload: () => ({}),
      enqueueOptions: { replace: true },
      applyCache: async () => {
        await offlineCache.markAllNotificationsRead();
      },
    },

    /**
     * `DELETE /notifications/{id}` — xoá 1 thông báo.
     */
    deleteNotification: {
      opType: OP_TYPES.NOTIFICATION_DELETE,
      entityId: (args) => String(args[0] ?? ''),
      payload: (args) => ({ id: String(args[0] ?? '') }),
      enqueueOptions: { replace: true },
      applyCache: async (args) => {
        const id = args[0];
        if (!id) return;
        await offlineCache.removeNotification(String(id));
      },
    },
  },
};

/**
 * Lấy handler của 1 method.
 *
 * @param {string} serviceKey
 * @param {string} methodName
 * @returns {object|null}
 */
export const getMutationHandler = (serviceKey, methodName) => {
  const map = MUTATION_HANDLERS[serviceKey];
  if (!map) return null;
  return map[methodName] ?? null;
};

export default MUTATION_HANDLERS;
