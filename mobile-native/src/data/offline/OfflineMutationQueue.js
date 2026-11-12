/**
 * OfflineMutationQueue - điều phối lưu thao tác ghi khi offline.
 *
 * Port từ Flutter: `fridge_ops_local_service.dart` +
 * `slot_completion_local_service.dart` + `ingredient_local_service.dart`.
 *
 * TRÁCH NHIỆM:
 *   Khi `SafeService` bắt lỗi network của 1 method GHI:
 *     1. Gọi `handler.applyCache(args)` -> cập nhật cache local (optimistic).
 *     2. Gọi `outboxQueue.enqueue(opType, payload, entityId)` -> lưu hàng đợi.
 *     3. Trả `true` -> `SafeService` ném `OfflineQueuedError` cho UI.
 *
 * ⚠️ VÌ SAO CẦN `canQueue`:
 *   Không phải method nào cũng queue được. Ví dụ `updateSlot` nhận payload
 *   tùy ý; chỉ khi payload có `completed` mới là thao tác "tick đã nấu" ->
 *   nếu không có `canQueue`, mọi lỗi mạng của `updateSlot` đều bị queue
 *   dù thao tác đó không thể replay.
 *
 * R7: comment tiếng Việt.
 */

import { getMutationHandler } from './MutationHandlers';
import { outboxQueue } from './OutboxQueue';

/**
 * Xử lý 1 thao tác ghi bị lỗi mạng.
 *
 * @param {string} serviceKey - vd 'fridgeService'
 * @param {string} methodName - vd 'addItem'
 * @param {Array} args - arguments của method
 * @returns {Promise<boolean>} true nếu đã lưu offline thành công
 */
export const queueMutation = async (serviceKey, methodName, args = []) => {
  const handler = getMutationHandler(serviceKey, methodName);
  if (!handler) return false;

  // Method này không phải thao tác offline được -> để lỗi ném lên UI.
  if (typeof handler.canQueue === 'function' && !handler.canQueue(args)) {
    return false;
  }

  const entityId =
    typeof handler.entityId === 'function' ? handler.entityId(args) : (handler.entityId ?? null);
  const payload =
    typeof handler.payload === 'function' ? handler.payload(args) : (handler.payload ?? {});

  // Bước 1: cập nhật cache local (optimistic) - lỗi ở đây KHÔNG chặn queue,
  // vì cache chỉ là phụ trợ, hàng đợi mới là thứ quan trọng.
  if (typeof handler.applyCache === 'function') {
    try {
      await handler.applyCache(args);
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(
          `[OfflineMutationQueue] Không cập nhật được cache cho ${serviceKey}.${methodName}:`,
          e?.message
        );
      }
    }
  }

  // Bước 2: đẩy vào hàng đợi.
  await outboxQueue.enqueue(handler.opType, payload, entityId);

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[OfflineMutationQueue] Đã lưu offline: ${serviceKey}.${methodName}`);
  }

  return true;
};

/**
 * Tạo hàm `mutationHandler` cho `SafeService.withFallback`.
 *
 * @param {string} serviceKey
 * @returns {(methodName:string, args:Array) => Promise<boolean>}
 */
export const createMutationHandler =
  (serviceKey) =>
  (methodName, args = []) =>
    queueMutation(serviceKey, methodName, args);

export default queueMutation;
