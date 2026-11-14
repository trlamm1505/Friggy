/**
 * MutationHandlers - định nghĩa cách queue 1 thao tác ghi khi offline.
 *
 * Port từ Flutter:
 *   - `fridge_ops_local_service.dart`  (update / consume / delete)
 *   - `slot_completion_local_service.dart` (tick "đã nấu")
 *   - `ingredient_local_service.dart` (thêm nguyên liệu)
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
 *     applyCache:(args) => Promise,  // cập nhật cache local (optimistic)
 *     result:    (args) => any       // giá trị trả về giả cho UI (tuỳ chọn)
 *   }
 *
 * ⚠️ VÌ SAO 4xx KHÔNG QUEUE:
 *   Lỗi 4xx = yêu cầu sai (payload hỏng, không đủ quyền, conflict).
 *   Queue lại chỉ để thất bại lặp lại. 4xx phải ném lên UI ngay.
 *   Riêng 409 (conflict optimistic locking) -> queue lại + đánh dấu để user
 *   xử lý (quyết định đã chốt: giữ op, không tự ghi đè).
 *
 * R7: comment tiếng Việt.
 */

import { offlineCache } from './OfflineCache';
import { OP_TYPES } from './OutboxQueue';
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
      applyCache: async (args) => {
        const item = args[0] ?? {};
        await offlineCache.savePendingFridgeItem({
          id: pendingId(),
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
      },
    },

    /**
     * `PATCH /fridge/items/:id/consume` — đánh dấu đã dùng hết.
     */
    markConsumed: {
      opType: OP_TYPES.FRIDGE_CONSUME,
      entityId: (args) => String(args[0] ?? ''),
      payload: (args) => ({ id: String(args[0] ?? '') }),
      applyCache: async (args) => {
        const id = args[0];
        if (!id) return;

        // Đã dùng hết -> số lượng = 0, hạn dùng = hôm nay.
        await offlineCache.updateFridgeItem(String(id), {
          quantity: 0,
          daysUntilExpiry: 0,
        });
        await offlineCache.markFridgeItemPending(String(id));
      },
    },

    /**
     * `DELETE /fridge/items/:id` — xoá khỏi tủ.
     */
    deleteItem: {
      opType: OP_TYPES.FRIDGE_DELETE,
      entityId: (args) => String(args[0] ?? ''),
      payload: (args) => ({ id: String(args[0] ?? '') }),
      applyCache: async (args) => {
        const id = args[0];
        if (!id) return;
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
     */
    toggleShoppingItemInList: {
      opType: OP_TYPES.SHOPPING_TOGGLE,
      entityId: (args) => String(args[1] ?? ''),
      payload: (args) => ({
        listId: args[0] ?? null,
        itemId: args[1] ?? null,
      }),
      applyCache: async (args) => {
        const listId = args[0];
        const itemId = args[1];
        if (itemId === null || itemId === undefined) return;

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
     * `PATCH /meal-planning/slots/{slotId}` — tick "đã nấu".
     *
     * ⚠️ CHỈ queue khi payload có `completed` (các patch khác của `updateSlot`
     *    không phải thao tác offline được -> để lỗi ném lên).
     */
    updateSlot: {
      opType: OP_TYPES.SLOT_COMPLETE,
      canQueue: (args) => {
        const payload = args[1] ?? {};
        return payload.completed !== undefined;
      },
      entityId: (args) => String(args[0] ?? ''),
      payload: (args) => {
        const payload = args[1] ?? {};
        return {
          slotId: args[0] ?? null,
          completed: payload.completed,
          // ⚠️ PHẢI lưu `servings` — BE scale nguyên liệu theo khẩu phần.
          //    Thiếu field này thì khi sync lại sẽ trừ theo `slot.servings`
          //    (khác với lúc user bấm nấu) -> tủ lạnh bị trừ sai lượng.
          //    `undefined` -> BE bỏ qua, dùng `slot.servings` (đúng).
          servings: payload.servings,
        };
      },
      applyCache: async (args) => {
        const slotId = args[0];
        if (!slotId) return;

        // Lưu trạng thái cooked vào cache slot để UI vẫn hiện đúng tick.
        await offlineCache.setSlotCooked(String(slotId), args[1]?.completed === true);
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
