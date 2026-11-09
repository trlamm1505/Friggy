/**
 * FridgeItemActions
 *
 * Bottom sheet cho 3 thao tác lên 1 nguyên liệu (B1 — hoàn tất CRUD).
 *
 *   1. Cập nhật số lượng (+ đơn vị)  -> PATCH /fridge/items/:id
 *   2. Đánh dấu đã dùng hết         -> PATCH /fridge/items/:id/consume
 *   3. Xóa khỏi tủ                  -> DELETE /fridge/items/:id
 *
 * Bám theo Flutter production (`fridge_inventory_screen.dart`
 * `_showUpdateQuantityDialog`):
 *   - Bấm vào 1 item -> mở sheet này
 *   - Có ô số lượng (stepper +/-) + chọn đơn vị + nút "Lưu thay đổi"
 *   - Dưới cùng 2 nút viền: "Đã dùng hết" (xanh) + "Xóa khỏi tủ" (đỏ)
 *
 * ⚠️ VÌ SAO `updateItem` / `deleteItem` / `markConsumed` LÀ Ở ĐÂY:
 *   `RealFridgeService` đã có sẵn 3 method này (kèm test), nhưng trước đó
 *   KHÔNG màn nào gọi tới -> "CRUD" thực tế chỉ có Create + Read, không sửa
 *   được số lượng, không xóa được món. Đây là phần còn thiếu của B1.
 *
 * ⚠️ VÌ SAO state KHÔNG khởi tạo trực tiếp từ `item`:
 *   Parent render `<FridgeItemActions key={item.id} ... />` -> mỗi item là 1
 *   instance mới -> state khởi tạo đúng ngay, không cần setState trong effect
 *   (tránh vi phạm `react-hooks/set-state-in-effect`).
 *   Nhưng để component KHÔNG phụ thuộc vào việc parent có truyền `key` hay
 *   không, state ở đây là "draft" GẮN VỚI id của item
 *   (`draft.itemId`). Khi id khác -> coi như chưa có draft -> dùng luôn giá trị
 *   của item mới. Không cần setState trong render lẫn trong effect.
 *
 * ⚠️ VÌ SAO backdrop KHÔNG bọc bằng `TouchableWithoutFeedback`:
 *   Bản cũ bọc CẢ sheet trong `TouchableWithoutFeedback` để chặn sự kiện
 *   chạm xuống backdrop. Hệ quả: `TextInput` số lượng nằm bên trong một
 *   touchable cha -> trên một số thiết bị bàn phím không mở được (view cha
 *   giành responder trước). Nay backdrop là 1 `Pressable` riêng, sheet là
 *   anh em cạnh nó -> chạm trong sheet KHÔNG đóng sheet, chạm ngoài sheet mới
 *   đóng, và `TextInput` không còn nằm trong touchable nào.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, Check, Trash2 } from 'lucide-react-native';
import { useServices } from '../../../data/ServiceProvider';
import { showSuccess, showError } from '../../utils/helpers';
import { UNITS, stepForUnit, parseQuantity } from '../../utils/fridgeItems';
import { ExpiryDatePicker, toIsoDate } from './ExpiryDatePicker';

/**
 * Parse chuỗi ngày của BE (`YYYY-MM-DD`) thành `Date` ở giờ địa phương.
 *
 * ⚠️ VÌ SAO KHÔNG DÙNG `new Date('2026-11-04')`:
 *   Chuỗi `YYYY-MM-DD` được JS parse theo chuẩn ISO-8601 -> luôn là **UTC**
 *   (00:00:00Z). Ở Việt Nam (UTC+7) thành 07:00 cùng ngày — vẫn đúng ngày,
 *   NHƯNG nếu user ở UTC-5 thì thành 19:00 hôm TRƯỚC -> lệch 1 ngày.
 *   Parse thủ công -> luôn đúng ngày theo múi giờ thiết bị.
 *
 * @param {string|null|undefined} value
 * @returns {Date|null}
 */
const parseIsoDate = (value) => {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

export const FridgeItemActions = ({ item, visible, onClose, onChanged }) => {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { fridgeService } = useServices();

  // `draft` = chỉ số 2 người dùng đang sửa (số lượng + đơn vị).
  // `null` = chưa sửa gì -> dùng giá trị của `item`.
  const [draft, setDraft] = useState(null);
  // Ngày hết hạn đang chọn (Date|null). `null` = không đổi (giữ giá trị BE).
  //
  // ⚠️ TÁCH RIÊNG khỏi `draft`:
  //   `draft` được XOÁ khi đóng sheet (để không giữ sửa đổi chưa lưu).
  //   Nhưng ngày hết hạn cần khởi tạo từ `item.expiryDate` MỖI LẦN MỞ sheet.
  //   Dùng `useState` init 1 lần -> chỉ đúng lần đầu; parent dùng `key={item.id}`
  //   nên mỗi item là instance mới -> OK. Nhưng để không phụ thuộc vào `key`,
  //   ta tính `expiryDate` từ `item` khi chưa có draft (xem `effectiveExpiryDate`).
  const [expiryDraft, setExpiryDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null); // 'consume' | 'delete' | null

  // Khoá đồng bộ (ref, không phải state) để chặn double-submit.
  //
  // ⚠️ VÌ SAO CẦN REF:
  //   `saving`/`busy` là state -> giá trị mới chỉ có hiệu lực ở lần render
  //   SAU. Nếu user bấm "Lưu" 2 lần liên tiếp TRƯỚC khi React kịp render
  //   lại, cả 2 lần đều thấy `saving === false` -> gọi API 2 lần.
  //   Ref cập nhật đồng bộ ngay khi bấm -> lần thứ 2 bị chặn.
  const savingRef = useRef(false);
  const busyRef = useRef(null);

  const itemId = item?.id ?? null;

  // Giá trị hiển thị: draft của CHÍNH item này, nếu không thì lấy từ item.
  const quantityText =
    draft && draft.itemId === itemId
      ? draft.quantityText
      : item?.quantity !== undefined && item?.quantity !== null
        ? String(item.quantity)
        : '1';
  const unit = draft && draft.itemId === itemId ? draft.unit : item?.unit || 'kg';

  const setQuantity = useCallback(
    (next) => setDraft({ itemId, quantityText: next, unit }),
    [itemId, unit]
  );
  const setUnit = useCallback(
    (next) => setDraft({ itemId, quantityText, unit: next }),
    [itemId, quantityText]
  );

  /**
   * Ngày hết hạn đang hiển thị trong picker.
   *
   * - Chưa chọn gì trong phiên này -> lấy từ `item.expiryDate` (giá trị BE).
   * - Đã chọn -> lấy từ `expiryDraft` (kể cả `null` = user muốn BỎ hạn dùng).
   *
   * ⚠️ VÌ SAO CẦN `expiryTouched`:
   *   `null` vừa có thể là "chưa chọn" vừa có thể là "user đã xoá hạn dùng".
   *   Không có cờ phân biệt thì không biết `null` nào là ý định của user.
   */
  const [expiryTouched, setExpiryTouched] = useState(false);
  const effectiveExpiryDate = expiryTouched ? expiryDraft : parseIsoDate(item?.expiryDate);

  const handleExpiryChange = useCallback((next) => {
    setExpiryTouched(true);
    setExpiryDraft(next);
  }, []);

  /**
   * Đóng sheet + xoá draft.
   *
   * ⚠️ VÌ SAO phải xoá draft:
   *   Draft gắn với `itemId`, nên nếu user mở item A -> sửa số lượng -> đóng
   *   sheet (bấm backdrop) -> mở lại item A, giá trị đã sửa vẫn còn -> user
   *   tưởng số lượng trong tủ đã thay đổi dù chưa bấm "Lưu".
   *   (Khi parent truyền `key={item.id}` thì instance bị remount nên không lộ,
   *   nhưng component không nên phụ thuộc vào điều đó.)
   */
  const closeSheet = useCallback(() => {
    setDraft(null);
    setExpiryDraft(null);
    setExpiryTouched(false);
    onClose?.();
  }, [onClose]);

  // Đơn vị của item luôn nằm đầu danh sách (giống Flutter: nếu đơn vị hiện tại
  // không có trong bảng 15 đơn vị thì chèn vào đầu).
  const unitOptions = useMemo(() => {
    const current = item?.unit;
    if (!current || UNITS.includes(current)) return UNITS;
    return [current, ...UNITS];
  }, [item?.unit]);

  const surfaceStyle = {
    backgroundColor: isDark ? '#19271E' : '#FFFFFF',
    borderColor: isDark ? '#2E4D36' : '#81C784',
  };

  const step = stepForUnit(unit);

  const adjustQuantity = useCallback(
    (delta) => {
      const current = parseQuantity(quantityText);
      // Ô rỗng / sai định dạng -> coi như 0 rồi cộng (không NaN).
      const base = current === null ? 0 : current;
      // Không cho âm: số lượng là số dương.
      const next = Math.max(0, base + delta);
      // Bỏ phần thập phân thừa (0.30000000000000004 -> 0.3)
      setQuantity(String(Math.round(next * 1000) / 1000));
    },
    [quantityText, setQuantity]
  );

  const handleSave = useCallback(async () => {
    if (savingRef.current) return;

    const quantity = parseQuantity(quantityText);
    // Ô rỗng / sai định dạng -> KHÔNG gửi. Gửi `0` như bản cũ sẽ âm thầm
    // xoá hết số lượng còn lại của món mà user chỉ lỡ tay xoá chữ.
    if (quantity === null) {
      showError(t('fridge.invalidQuantity'));
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      // ⚠️ `version` BẮT BUỘC với BE thật (optimistic locking):
      //   BE `UpdateFridgeItemDto.version` có `@IsInt() @Min(0)` -> thiếu -> 400.
      //   Gửi version của item đang sửa; BE tự trả 409 nếu đã bị người khác sửa.
      //   `item.version` là `null` ở mock mode -> không gửi (giữ hành vi cũ).
      //
      // ⚠️ `expiryDate` chỉ gửi khi user ĐÃ chạm vào picker:
      //   - Chưa chạm -> không gửi -> BE giữ nguyên `expiresAt` hiện tại.
      //   - Đã chạm + chọn ngày -> gửi `YYYY-MM-DD` -> BE set `expiresAt`.
      //   - Đã chạm + bấm X (xoá) -> gửi `null` -> BE set `expiresAt = null`.
      //     (`RealFridgeService.updateItem` chỉ gửi `expiresAt` khi có truthy value
      //      — nên "xoá hạn dùng" cần xử lý riêng, xem bên dưới.)
      const payload = { quantity, unit, version: item?.version ?? undefined };

      if (expiryTouched) {
        payload.expiryDate = toIsoDate(expiryDraft);
        // `null` = user muốn BỎ hạn dùng -> phải gửi `null` tới BE.
        // `RealFridgeService.updateItem` hiện bỏ qua null -> cần cờ `clearExpiry`.
        payload.clearExpiry = expiryDraft === null;
      }

      await fridgeService.updateItem(item.id, payload);
      showSuccess(t('fridge.updated'));
      onChanged?.();
      closeSheet();
    } catch (e) {
      // 4xx KHÔNG fallback -> hiện lỗi thật cho user.
      showError(e?.message || t('fridge.updateFailed'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [
    fridgeService,
    item,
    quantityText,
    unit,
    expiryTouched,
    expiryDraft,
    t,
    onChanged,
    closeSheet,
  ]);

  const handleConsume = useCallback(() => {
    if (busyRef.current) return;
    // Khoá NGAY (trước khi mở dialog) để 2 lần bấm liên tiếp không mở
    // 2 dialog -> 2 request "đã dùng hết" cho cùng 1 món.
    busyRef.current = 'consume';
    setBusy('consume');
    Alert.alert(t('fridge.usedAll'), t('fridge.consumeConfirm'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
        onPress: () => {
          busyRef.current = null;
          setBusy(null);
        },
      },
      {
        text: t('fridge.usedAll'),
        onPress: async () => {
          try {
            await fridgeService.markConsumed(item.id);
            showSuccess(t('fridge.consumed'));
            onChanged?.();
            closeSheet();
          } catch (e) {
            showError(e?.message || t('fridge.consumeFailed'));
            busyRef.current = null;
            setBusy(null);
          }
        },
      },
    ]);
  }, [fridgeService, item, t, onChanged, closeSheet]);

  const handleDelete = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = 'delete';
    setBusy('delete');
    Alert.alert(t('fridge.deleteFromFridge'), t('fridge.deleteConfirm'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
        onPress: () => {
          busyRef.current = null;
          setBusy(null);
        },
      },
      {
        text: t('fridge.deleteFromFridge'),
        style: 'destructive',
        onPress: async () => {
          try {
            await fridgeService.deleteItem(item.id);
            showSuccess(t('fridge.deleted'));
            onChanged?.();
            closeSheet();
          } catch (e) {
            showError(e?.message || t('fridge.deleteFailed'));
            busyRef.current = null;
            setBusy(null);
          }
        },
      },
    ]);
  }, [fridgeService, item, t, onChanged, closeSheet]);

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={closeSheet}>
      <View style={styles.overlay}>
        {/* Backdrop: chỉ đóng sheet khi bấm ra ngoài vùng sheet. */}
        <Pressable
          testID="fridge-actions-backdrop"
          style={styles.backdrop}
          onPress={closeSheet}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? '#19271E' : '#FFFFFF',
                borderColor: isDark ? '#2E4D36' : '#E3E8E4',
                paddingBottom: Math.max(sp(24), insets.bottom + sp(12)),
              },
            ]}
          >
            <View style={styles.handle} />

            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(19) },
              ]}
            >
              {t('fridge.updateQuantity')}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>

            {/* ── Số lượng ── */}
            <Text style={[styles.label, { color: isDark ? '#FFFFFF' : AppColors.textPrimary }]}>
              {t('fridge.quantity')}
            </Text>
            <View style={[styles.qtyRow, surfaceStyle]}>
              <Pressable
                testID="fridge-actions-qty-minus"
                onPress={() => adjustQuantity(-step)}
                style={({ pressed }) => [
                  styles.qtyBtn,
                  {
                    backgroundColor: isDark ? '#233629' : AppColors.accentGreen,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Minus
                  color={isDark ? AppColors.primaryLight : AppColors.forestAccent}
                  size={18}
                  strokeWidth={2.5}
                />
              </Pressable>
              <TextInput
                testID="fridge-actions-qty-input"
                value={quantityText}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
                style={[
                  styles.qtyInput,
                  { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(17) },
                ]}
                selectTextOnFocus
              />
              <Pressable
                testID="fridge-actions-qty-plus"
                onPress={() => adjustQuantity(step)}
                style={({ pressed }) => [
                  styles.qtyBtn,
                  {
                    backgroundColor: isDark ? '#233629' : AppColors.accentGreen,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Plus
                  color={isDark ? AppColors.primaryLight : AppColors.forestAccent}
                  size={18}
                  strokeWidth={2.5}
                />
              </Pressable>
            </View>

            {/* ── Đơn vị ── */}
            <Text style={[styles.label, { color: isDark ? '#FFFFFF' : AppColors.textPrimary }]}>
              {t('fridge.unit')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.unitRow}
            >
              {unitOptions.map((u) => {
                const isSelected = unit === u;
                return (
                  <Pressable
                    key={u}
                    testID={`fridge-actions-unit-${u}`}
                    onPress={() => setUnit(u)}
                    style={({ pressed }) => [
                      styles.unitPill,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? AppColors.primaryLight
                            : AppColors.primary
                          : isDark
                            ? '#233629'
                            : '#F1F8E9',
                        borderColor: isSelected
                          ? isDark
                            ? AppColors.primaryLight
                            : AppColors.primary
                          : isDark
                            ? '#2E4D36'
                            : '#C8E6C9',
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitText,
                        {
                          color: isSelected
                            ? isDark
                              ? '#0E1611'
                              : '#FFFFFF'
                            : isDark
                              ? '#FFFFFF'
                              : AppColors.primary,
                          fontSize: sp(13),
                        },
                      ]}
                    >
                      {u}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* ── Ngày hết hạn (tuỳ chọn) ──
                Đặt SAU khối đơn vị, TRƯỚC nút "Lưu" -> giữ được nhịp đọc:
                số lượng -> đơn vị -> hạn dùng -> lưu.
                `ExpiryDatePicker` tự dựng modal lịch (không phụ thuộc native lib). */}
            <Text style={[styles.label, { color: isDark ? '#FFFFFF' : AppColors.textPrimary }]}>
              {t('fridge.expiryDate')}
            </Text>
            <ExpiryDatePicker
              testID="fridge-actions-expiry-picker"
              value={effectiveExpiryDate}
              onChange={handleExpiryChange}
              placeholder={t('fridge.expiryDatePlaceholder')}
              locale={i18n.language === 'en' ? 'en' : 'vi'}
            />

            {/* ── Lưu ── */}
            <Pressable
              testID="fridge-actions-save"
              onPress={handleSave}
              disabled={saving || busy !== null}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: AppColors.primary,
                  opacity: pressed ? 0.85 : saving || busy ? 0.6 : 1,
                },
              ]}
            >
              <Check color="#FFFFFF" size={18} strokeWidth={2.5} />
              <Text style={styles.saveText}>{t('fridge.saveChanges')}</Text>
            </Pressable>

            {/* ── Đã dùng hết + Xóa ── */}
            <View style={styles.footerRow}>
              <Pressable
                testID="fridge-actions-consume"
                onPress={handleConsume}
                disabled={busy !== null}
                style={({ pressed }) => [
                  styles.outlineBtn,
                  {
                    borderColor: '#4CAF50',
                    opacity: pressed ? 0.7 : busy !== null ? 0.5 : 1,
                  },
                ]}
              >
                <Check color="#4CAF50" size={17} strokeWidth={2.5} />
                <Text style={[styles.outlineText, { color: '#4CAF50' }]}>
                  {t('fridge.usedAll')}
                </Text>
              </Pressable>

              <Pressable
                testID="fridge-actions-delete"
                onPress={handleDelete}
                disabled={busy !== null}
                style={({ pressed }) => [
                  styles.outlineBtn,
                  {
                    borderColor: '#E57373',
                    opacity: pressed ? 0.7 : busy !== null ? 0.5 : 1,
                  },
                ]}
              >
                <Trash2 color="#E57373" size={17} strokeWidth={2.5} />
                <Text style={[styles.outlineText, { color: '#E57373' }]}>
                  {t('fridge.deleteFromFridge')}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: sp(28),
    borderTopRightRadius: sp(28),
    borderWidth: 1,
    paddingHorizontal: sp(20),
    paddingTop: sp(12),
  },
  handle: {
    alignSelf: 'center',
    width: sp(38),
    height: sp(4.5),
    borderRadius: sp(10),
    backgroundColor: '#C8E6C9',
    marginBottom: sp(14),
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    fontSize: sp(13),
    marginTop: sp(2),
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    fontSize: sp(13),
    marginTop: sp(18),
    marginBottom: sp(8),
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: sp(52),
    borderRadius: sp(16),
    borderWidth: 1,
    paddingHorizontal: sp(6),
  },
  qtyBtn: {
    width: sp(36),
    height: sp(36),
    borderRadius: sp(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    paddingVertical: 0,
  },
  unitRow: {
    gap: sp(8),
    paddingVertical: sp(2),
  },
  unitPill: {
    paddingHorizontal: sp(16),
    paddingVertical: sp(10),
    borderRadius: sp(14),
    borderWidth: 1,
  },
  unitText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(8),
    marginTop: sp(24),
    height: sp(52),
    borderRadius: sp(18),
  },
  saveText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    fontSize: sp(15),
  },
  footerRow: {
    flexDirection: 'row',
    gap: sp(12),
    marginTop: sp(12),
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(6),
    height: sp(46),
    borderRadius: sp(14),
    borderWidth: 1.2,
  },
  outlineText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: sp(13),
  },
});
