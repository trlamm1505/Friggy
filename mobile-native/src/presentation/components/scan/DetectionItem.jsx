/**
 * DetectionItem
 *
 * 1 row trong màn review kết quả scan AI.
 *
 * B2 — mở rộng để review thật trước khi `confirmScan`:
 * - Tên (TextInput inline), xoá, confidence bar (đã có từ Sprint 8)
 * - Số lượng (stepper -/+) — `quantity` là field BẮT BUỘC của `ConfirmScanDto`
 * - Đơn vị (TextInput inline) — `unit` cũng BẮT BUỘC, BE chấp nhận chuỗi tự do
 * - Vị trí lưu trữ (3 pill nhỏ: fridge/freezer/pantry) — BE tự tính `expiresAt`
 *   theo `storageLocation` nếu FE không gửi, nên cho user chọn ở đây
 * - Cảnh báo dị ứng (icon ⚠) khi `allergyWarning = true` (BE trả từ danh sách
 *   dị ứng của user) — bám Flutter `scan_result_review_modal.dart`
 * - Badge "cần kiểm tra" khi `needsConfirm = true` (confidence thấp / không
 *   khớp danh mục) — bám `DetectedItemResultDto.needsConfirm`
 *
 * Tất cả prop mới đều optional để tương thích ngược với test/call site cũ
 * (chỉ truyền `name/confidence/onChange/onRemove/editable/style`).
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { Trash2, GripVertical, Minus, Plus, TriangleAlert } from 'lucide-react-native';
import { COMPARTMENT_LABEL } from '../../../data/services/real/RealFridgeService';

const STORAGE_KEYS = ['fridge', 'freezer', 'pantry'];

export const DetectionItem = ({
  name,
  confidence,
  onChange,
  onRemove,
  editable = true,
  style,
  // ── B2: prop mới cho review thật (đều optional) ──
  quantity = 1,
  onQuantityChange,
  unit = '',
  onUnitChange,
  storageLocation = 'fridge',
  onStorageChange,
  allergyWarning = false,
  needsConfirm = false,
}) => {
  const { isDark } = useTheme();
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const nameColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const handleColor = isDark ? AppColors.darkTextSecondary : AppColors.hintText;

  const confidenceColor = useMemo(() => {
    if (confidence == null) return null;
    if (confidence >= 0.8) return AppColors.primary;
    if (confidence >= 0.5) return '#FF9800';
    return '#FF5252';
  }, [confidence]);

  const clampQty = (q) => {
    const n = Number(q);
    if (!Number.isFinite(n)) return 1;
    return Math.min(9999, Math.max(0.1, n));
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#19271E' : '#F4F7F4',
          borderColor: needsConfirm
            ? '#FF9800'
            : isDark
              ? '#2E4D36'
              : 'transparent',
        },
        style,
      ]}
    >
      {/* ── Dòng 1: tên + cảnh báo + xoá ── */}
      <View style={styles.row}>
        {editable ? (
          <GripVertical color={handleColor} size={16} />
        ) : (
          <View style={[styles.bullet, { backgroundColor: AppColors.primary }]} />
        )}

        <View style={{ flex: 1, marginLeft: sp(10) }}>
          {editable ? (
            <TextInput
              value={name}
              onChangeText={onChange}
              placeholder={isEn ? 'Ingredient name' : 'Tên nguyên liệu'}
              placeholderTextColor={isDark ? AppColors.hintText : AppColors.hintText}
              style={[styles.input, { color: nameColor, fontSize: sp(15) }]}
              returnKeyType="done"
            />
          ) : (
            <Text
              style={[styles.name, { color: nameColor, fontSize: sp(15) }]}
              numberOfLines={1}
            >
              {name}
            </Text>
          )}

          {confidence != null ? (
            <View style={styles.confidenceRow}>
              <View
                style={[
                  styles.confidenceBarBg,
                  { backgroundColor: isDark ? '#2E4D36' : '#E3E8E4' },
                ]}
              >
                <View
                  style={[
                    styles.confidenceBarFill,
                    {
                      backgroundColor: confidenceColor,
                      width: `${Math.round(confidence * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.confidenceText,
                  {
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    fontSize: sp(10),
                  },
                ]}
              >
                {Math.round(confidence * 100)}%
              </Text>
            </View>
          ) : null}
        </View>

        {allergyWarning ? (
          <TriangleAlert color="#FF9800" size={18} style={{ marginLeft: sp(6) }} />
        ) : null}

        {onRemove ? (
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            style={({ pressed }) => [
              styles.removeBtn,
              { backgroundColor: isDark ? '#3D1F1A' : '#FFEBEE', opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Trash2 color={isDark ? '#FF8A80' : '#B71C1C'} size={14} />
          </Pressable>
        ) : null}
      </View>

      {/* ── Badge "cần kiểm tra" khi AI không chắc ── */}
      {needsConfirm ? (
        <Text
          style={[
            styles.needsConfirmText,
            { color: '#FF9800', fontSize: sp(11) },
          ]}
        >
          {isEn ? 'Please double-check this item' : 'Vui lòng kiểm tra lại món này'}
        </Text>
      ) : null}

      {/* ── Dòng 2: số lượng + đơn vị (chỉ khi editable + có callback) ── */}
      {editable && onQuantityChange && onUnitChange ? (
        <View style={styles.qtyRow}>
          <View
            style={[
              styles.stepper,
              { borderColor: isDark ? '#2E4D36' : '#C8E6C9' },
            ]}
          >
            <Pressable
              onPress={() => onQuantityChange(clampQty(Number(quantity) - 1))}
              hitSlop={8}
              style={styles.stepperBtn}
            >
              <Minus color={handleColor} size={14} strokeWidth={2.5} />
            </Pressable>
            <TextInput
              value={String(quantity)}
              onChangeText={(text) => {
                // Cho gõ dở (vd "1.") rồi mới clamp khi blur.
                const n = Number(text);
                if (text === '' || Number.isFinite(n)) onQuantityChange(text);
              }}
              onBlur={() => onQuantityChange(clampQty(quantity))}
              keyboardType="decimal-pad"
              style={[
                styles.qtyInput,
                { color: nameColor, fontSize: sp(14) },
              ]}
            />
            <Pressable
              onPress={() => onQuantityChange(clampQty(Number(quantity) + 1))}
              hitSlop={8}
              style={styles.stepperBtn}
            >
              <Plus color={handleColor} size={14} strokeWidth={2.5} />
            </Pressable>
          </View>

          <TextInput
            value={unit}
            onChangeText={onUnitChange}
            placeholder={isEn ? 'Unit' : 'Đơn vị'}
            placeholderTextColor={AppColors.hintText}
            style={[
              styles.unitInput,
              {
                color: nameColor,
                fontSize: sp(14),
                borderColor: isDark ? '#2E4D36' : '#C8E6C9',
              },
            ]}
          />
        </View>
      ) : null}

      {/* ── Dòng 3: vị trí lưu trữ (chỉ khi editable + có callback) ── */}
      {editable && onStorageChange ? (
        <View style={styles.storageRow}>
          {STORAGE_KEYS.map((key) => {
            const selected = storageLocation === key;
            return (
              <Pressable
                key={key}
                onPress={() => onStorageChange(key)}
                style={({ pressed }) => [
                  styles.storagePill,
                  {
                    backgroundColor: selected
                      ? AppColors.primary
                      : 'transparent',
                    borderColor: selected
                      ? AppColors.primary
                      : isDark
                        ? '#2E4D36'
                        : '#C8E6C9',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.storageText,
                    {
                      color: selected
                        ? '#FFFFFF'
                        : isDark
                          ? '#FFFFFF'
                          : AppColors.textSecondary,
                      fontSize: sp(11),
                    },
                  ]}
                  numberOfLines={1}
                >
                  {COMPARTMENT_LABEL[key] ?? key}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: sp(12),
    borderRadius: sp(12),
    borderWidth: 1,
    marginBottom: sp(10),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bullet: {
    width: sp(8),
    height: sp(8),
    borderRadius: sp(4),
  },
  name: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  input: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    padding: 0,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp(4),
    gap: sp(6),
  },
  confidenceBarBg: {
    flex: 1,
    height: sp(4),
    borderRadius: sp(2),
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: sp(2),
  },
  confidenceText: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginLeft: sp(6),
    minWidth: sp(28),
    textAlign: 'right',
  },
  removeBtn: {
    width: sp(28),
    height: sp(28),
    borderRadius: sp(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: sp(8),
  },
  needsConfirmText: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginTop: sp(6),
    marginLeft: sp(26),
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp(10),
    marginLeft: sp(26),
    gap: sp(8),
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: sp(10),
    paddingHorizontal: sp(4),
  },
  stepperBtn: {
    padding: sp(6),
  },
  qtyInput: {
    minWidth: sp(44),
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    paddingVertical: sp(4),
  },
  unitInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: sp(10),
    paddingHorizontal: sp(10),
    paddingVertical: sp(6),
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
  },
  storageRow: {
    flexDirection: 'row',
    marginTop: sp(8),
    marginLeft: sp(26),
    gap: sp(6),
  },
  storagePill: {
    flex: 1,
    paddingVertical: sp(6),
    borderRadius: sp(10),
    borderWidth: 1,
    alignItems: 'center',
  },
  storageText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
});
