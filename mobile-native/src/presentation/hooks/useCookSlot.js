/**
 * useCookSlot — Hook dùng chung cho thao tác "Bắt đầu nấu" (tick meal slot).
 *
 * ⚠️ TẠI SAO TÁCH RA HOOK:
 *   Logic "tick đã nấu -> BE trừ nguyên liệu FIFO -> báo user" đang nằm
 *   trong `RecipeDetailScreen` và `CookingSuggestionsSection` — 2 chỗ gần
 *   nhưng lệch nhau (1 chỗ gửi `servings`, 1 chỗ không). Rất dễ quên
 *   cập nhật 1 chỗ khi BE đổi contract.
 *   => Gom về 1 hook, 2 màn chỉ gọi `cook({ slotId, servings })`.
 *
 * ⚠️ VÌ SAO PHẢI GỬI `servings`:
 *   BE scale nguyên liệu theo công thức:
 *       scaledQty = recipeIngredient.quantity * (servings / recipe.servings)
 *   Nếu RN không gửi `servings`, BE dùng `slot.servings` (lúc sinh kế hoạch)
 *   -> khi user chỉnh khẩu phần ở màn chi tiết công thức, tủ lạnh bị trừ
 *   SAI LƯỢNG (đây là bug P0 đã ghi nhận).
 *
 * ⚠️ BACKEND IDEMPOTENT:
 *   BE chỉ trừ khi `slot.completedAt === null` -> gọi lại lần 2 trả
 *   `consumedIngredients: []`, KHÔNG trừ thêm. Nên hook có thể gọi an toàn.
 *
 * R7: comment tiếng Việt.
 */

import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useServices } from '../../data/ServiceProvider';
import { showSuccess, showError, showInfo } from '../utils/helpers';

/**
 * Chuẩn hoá 1 phần tử `consumedIngredients` / `missingIngredients` từ BE.
 *
 * BE đã gửi sẵn đủ field (`ingredientId`, `name`, `quantity`, `unit`,
 * `requiredQuantity`, `deductedQuantity`, `shortage`, `isOptional`) nhưng
 * client cũ / BE chưa deploy có thể thiếu -> fallback về field cũ.
 *
 * @param {object} item
 * @param {'consumed'|'missing'} kind
 * @returns {{name:string,quantity:number,unit:string,shortage:number,isOptional:boolean}|null}
 */
function normalizeItem(item, kind) {
  if (!item || !item.name) return null;

  const requiredQuantity = Number(item.requiredQuantity ?? item.quantity ?? 0) || 0;
  const requiredUnit = item.requiredUnit ?? item.unit ?? '';

  if (kind === 'missing') {
    return {
      ingredientId: item.ingredientId ?? null,
      name: item.name,
      // Lượng còn thiếu (đã ở base unit từ BE).
      quantity: Number(item.quantity ?? 0) || 0,
      unit: item.unit ?? '',
      requiredQuantity,
      requiredUnit,
      isOptional: Boolean(item.isOptional),
    };
  }

  return {
    ingredientId: item.ingredientId ?? null,
    name: item.name,
    // Lượng công thức yêu cầu (đơn vị gốc của công thức).
    quantity: Number(item.quantity ?? requiredQuantity) || 0,
    unit: item.unit ?? requiredUnit,
    requiredQuantity,
    requiredUnit,
    // Lượng THỰC SỰ bị trừ — fallback về `quantity` nếu BE cũ không có.
    deductedQuantity: Number(item.deductedQuantity ?? item.quantity ?? 0) || 0,
    deductedUnit: item.deductedUnit ?? item.unit ?? '',
    shortage: Number(item.shortage ?? 0) || 0,
    isOptional: Boolean(item.isOptional),
  };
}

/**
 * Hook "bắt đầu nấu".
 *
 * @param {object} [options]
 * @param {(result:object)=>void} [options.onSuccess] - callback sau khi nấu xong
 * @returns {{
 *   cook: (params:{slotId:string, servings?:number, recipeId?:string|null, note?:string}) => Promise<object|null>,
 *   cooking: boolean,
 *   error: Error|null,
 *   result: object|null,
 * }}
 */
export const useCookSlot = (options = {}) => {
  const services = useServices();
  const { t } = useTranslation();
  const [cooking, setCooking] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  // Chống bấm nhiều lần liên tiếp -> BE có idempotent guard nhưng vẫn
  // tránh gọi mạng thừa.
  const inFlightRef = useRef(false);

  const { onSuccess } = options;

  /**
   * Tick "đã nấu" 1 meal slot.
   *
   * @param {{slotId:string, servings?:number, recipeId?:string|null, note?:string}} params
   * @returns {Promise<object|null>} kết quả từ BE, hoặc `null` nếu lỗi
   */
  const cook = useCallback(
    async (params = {}) => {
      const { slotId, servings, recipeId, note } = params;

      if (!slotId) {
        showError(t('home.startCookingNoSlot'));
        return null;
      }
      if (inFlightRef.current) return null;

      inFlightRef.current = true;
      setCooking(true);
      setError(null);

      try {
        // ⚠️ `servings` PHẢI gửi kèm -> BE scale nguyên liệu đúng khẩu phần.
        const payload = { completed: true };
        if (servings !== undefined && servings !== null) payload.servings = servings;
        if (recipeId !== undefined) payload.recipeId = recipeId;
        if (note !== undefined) payload.note = note;

        const res = await services.recipeService.updateSlot(slotId, payload);

        const consumed = (res?.consumedIngredients ?? [])
          .map((it) => normalizeItem(it, 'consumed'))
          .filter(Boolean);
        const missing = (res?.missingIngredients ?? [])
          .map((it) => normalizeItem(it, 'missing'))
          .filter(Boolean);

        const shaped = {
          id: res?.id ?? slotId,
          completedAt: res?.completedAt ?? null,
          consumedIngredients: consumed,
          missingIngredients: missing,
        };

        setResult(shaped);

        // ── Thông báo cho user ────────────────────────────────────
        // 3 trạng thái:
        //   1. Đủ nguyên liệu -> trừ hết.
        //   2. Thiếu một phần  -> đã trừ được nhưng còn thiếu.
        //   3. Không trừ được gì -> tủ lạnh không có nguyên liệu nào phù hợp.
        if (consumed.length === 0 && missing.length === 0) {
          // Slot đã tick trước đó (BE idempotent) hoặc món không có nguyên liệu.
          showSuccess(t('home.startCookingNoIngredient'));
        } else if (missing.length === 0) {
          showSuccess(t('home.startCookingDone', { count: consumed.length }));
        } else {
          const names = missing
            .slice(0, 3)
            .map((m) => `${m.name} (${m.quantity}${m.unit})`)
            .join(', ');
          const more = missing.length > 3 ? ` và ${missing.length - 3} món khác` : '';
          showInfo(
            t('home.startCookingPartial', {
              count: consumed.length,
              missing: `${names}${more}`,
            })
          );
        }

        onSuccess?.(shaped);
        return shaped;
      } catch (e) {
        setError(e);
        showError(e?.message ?? t('home.startCookingFailed'));
        return null;
      } finally {
        inFlightRef.current = false;
        setCooking(false);
      }
    },
    [services, t, onSuccess]
  );

  return { cook, cooking, error, result };
};

export default useCookSlot;
