/**
 * ShoppingAddItemModal
 *
 * Modal nhập số lượng và đơn vị trước khi thêm nguyên liệu vào danh sách mua.
 * Giữ nguyên contract với parent: onSubmit({ quantity: number, unit: string }).
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Check, Minus, Plus, X } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { UNITS, stepForUnit, parseQuantity } from '../../utils/fridgeItems';

const MIN_QUANTITY = 0.01;
const MAX_DECIMAL_PLACES = 2;

const normalizeQuantityInput = (value) => {
  const trimmed = String(value ?? '').trim();

  // Chấp nhận dấu phẩy hoặc dấu chấm làm dấu thập phân.
  // Không tự đoán dấu phân cách hàng nghìn để tránh diễn giải sai số lượng.
  if (trimmed.includes(',') && trimmed.includes('.')) return null;
  const normalized = trimmed.replace(',', '.');

  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  if (normalized.endsWith('.')) return null;

  const parsedByUtility = parseQuantity(normalized);
  const parsed = parsedByUtility == null ? Number(normalized) : parsedByUtility;

  return Number.isFinite(parsed) ? parsed : null;
};

const formatQuantity = (value) => {
  const factor = 10 ** MAX_DECIMAL_PLACES;
  const rounded = Math.round(value * factor) / factor;
  return String(rounded);
};

export const ShoppingAddItemModal = ({
  visible,
  ingredient,
  defaultQuantity = 1,
  saving = false,
  onSubmit,
  onClose,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Parent nên remount modal theo ingredient key khi đổi nguyên liệu.
  const [quantity, setQuantity] = useState(() => String(defaultQuantity ?? 1));
  const [unit, setUnit] = useState(() => ingredient?.defaultUnit || 'kg');
  const [quantityTouched, setQuantityTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const textColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const subColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;
  const borderColor = isDark ? '#2E4D36' : '#E3E8E4';
  const cardColor = isDark ? '#19271E' : '#FFFFFF';
  const controlColor = isDark ? '#233629' : '#F2F5F3';

  const parsedQuantity = useMemo(
    () => normalizeQuantityInput(quantity),
    [quantity],
  );

  const quantityError = useMemo(() => {
    if (!quantityTouched && !submitAttempted) return '';
    if (!String(quantity ?? '').trim()) {
      return t('home.shoppingQuantityRequired', {
        defaultValue: 'Vui lòng nhập số lượng.',
      });
    }
    if (parsedQuantity === null) {
      return t('home.shoppingQuantityInvalid', {
        defaultValue: 'Vui lòng nhập số hợp lệ (ví dụ: 0,5 hoặc 0.5).',
      });
    }
    if (parsedQuantity <= 0) {
      return t('home.shoppingQuantityMustBePositive', {
        defaultValue: 'Số lượng phải lớn hơn 0.',
      });
    }
    return '';
  }, [quantity, quantityTouched, submitAttempted, parsedQuantity, t]);

  const unitOptions = useMemo(
    () => (UNITS.includes(unit) ? UNITS : [unit, ...UNITS]),
    [unit],
  );

  const closeModal = useCallback(() => {
    if (saving) return;
    Keyboard.dismiss();
    onClose?.();
  }, [saving, onClose]);

  const changeQuantityByStep = useCallback(
    (direction) => {
      if (saving) return;

      const current = parsedQuantity;
      if (current === null) {
        // Nếu o nhập đang rỗng/sai, thao tác +/- khởi tạo về một bước hợp lệ.
        const initialStep = Number(stepForUnit(unit)) || 1;
        setQuantity(formatQuantity(Math.max(MIN_QUANTITY, initialStep)));
        setQuantityTouched(false);
        return;
      }

      const unitStep = Number(stepForUnit(unit));
      const increment = Number.isFinite(unitStep) && unitStep > 0 ? unitStep : 1;
      const next =
        direction > 0
          ? current + increment
          : Math.max(MIN_QUANTITY, current - increment);

      setQuantity(formatQuantity(next));
      setQuantityTouched(false);
    },
    [saving, parsedQuantity, unit],
  );

  const handleSubmit = useCallback(() => {
    if (saving) return;

    setSubmitAttempted(true);
    setQuantityTouched(true);

    if (parsedQuantity === null || parsedQuantity <= 0 || !unit) {
      return;
    }

    Keyboard.dismiss();
    onSubmit?.({
      quantity: Math.round(parsedQuantity * 10 ** MAX_DECIMAL_PLACES) / 10 ** MAX_DECIMAL_PLACES,
      unit,
    });
  }, [saving, parsedQuantity, unit, onSubmit]);

  const handleQuantityChange = useCallback((value) => {
    // Chặn ký tự chữ và các dấu phân cách không hợp lệ ngay khi nhập.
    // Vẫn cho phép chuỗi tạm thời rỗng để người dùng chỉnh sửa.
    if (/^[0-9]*([.,][0-9]*)?$/.test(value) || value === '') {
      setQuantity(value);
    }
    setQuantityTouched(false);
    setSubmitAttempted(false);
  }, []);

  const handleUnitSelect = useCallback(
    (nextUnit) => {
      if (saving) return;
      setUnit(nextUnit);
    },
    [saving],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={closeModal}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropPress}
          onPress={closeModal}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel', { defaultValue: 'Đóng' })}
        />

        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: cardColor,
                borderColor,
                paddingBottom: Math.max(sp(18), insets.bottom),
              },
            ]}
            testID="shopping-add-modal"
            accessibilityViewIsModal
          >
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text
                  style={[styles.title, { color: textColor }]}
                  numberOfLines={1}
                >
                  {ingredient?.name ?? ''}
                </Text>
                <Text
                  style={[styles.subtitle, { color: subColor }]}
                  numberOfLines={2}
                >
                  {t('home.shoppingAddItemTitle')}
                </Text>
              </View>

              <Pressable
                onPress={closeModal}
                hitSlop={10}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel', {
                  defaultValue: 'Đóng',
                })}
                accessibilityState={{ disabled: saving }}
                style={styles.closeButton}
              >
                <X color={subColor} size={20} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.label, { color: textColor }]}>
                {t('home.shoppingQuantity')}
              </Text>

              <View style={styles.qtyRow}>
                <Pressable
                  onPress={() => changeQuantityByStep(-1)}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.qtyBtn,
                    {
                      backgroundColor: controlColor,
                      opacity: saving ? 0.45 : pressed ? 0.7 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.shoppingDecreaseQuantity', {
                    defaultValue: 'Giảm số lượng',
                  })}
                  accessibilityState={{ disabled: saving }}
                  testID="shopping-add-qty-minus"
                >
                  <Minus color={textColor} size={18} />
                </Pressable>

                <TextInput
                  value={quantity}
                  onChangeText={handleQuantityChange}
                  onBlur={() => setQuantityTouched(true)}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  placeholder="1"
                  placeholderTextColor={subColor}
                  editable={!saving}
                  selectTextOnFocus
                  accessibilityLabel={t('home.shoppingQuantity')}
                  accessibilityHint={t('home.shoppingQuantityHint', {
                    defaultValue: 'Nhập số lượng cần mua.',
                  })}
                  style={[
                    styles.qtyInput,
                    {
                      color: textColor,
                      backgroundColor: isDark ? '#0E1611' : '#FFFFFF',
                      borderColor: quantityError
                        ? AppColors.error || '#D64545'
                        : borderColor,
                    },
                  ]}
                  testID="shopping-add-qty-input"
                />

                <Pressable
                  onPress={() => changeQuantityByStep(1)}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.qtyBtn,
                    {
                      backgroundColor: controlColor,
                      opacity: saving ? 0.45 : pressed ? 0.7 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.shoppingIncreaseQuantity', {
                    defaultValue: 'Tăng số lượng',
                  })}
                  accessibilityState={{ disabled: saving }}
                  testID="shopping-add-qty-plus"
                >
                  <Plus color={textColor} size={18} />
                </Pressable>
              </View>

              {!!quantityError && (
                <Text
                  style={styles.errorText}
                  accessibilityRole="alert"
                  testID="shopping-add-qty-error"
                >
                  {quantityError}
                </Text>
              )}

              <Text style={[styles.label, styles.unitLabel, { color: textColor }]}>
                {t('fridge.unit')}
              </Text>

              <View style={styles.unitScroll}>
                <View style={styles.unitGrid}>
                  {unitOptions.map((option) => {
                    const isSelected = option === unit;

                    return (
                      <Pressable
                        key={option}
                        onPress={() => handleUnitSelect(option)}
                        disabled={saving}
                        style={({ pressed }) => [
                          styles.unitCell,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? AppColors.primaryLight
                                : AppColors.primary
                              : 'transparent',
                            borderColor: isSelected
                              ? isDark
                                ? AppColors.primaryLight
                                : AppColors.primary
                              : borderColor,
                            opacity: saving ? 0.5 : pressed ? 0.8 : 1,
                          },
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{
                          selected: isSelected,
                          disabled: saving,
                        }}
                        accessibilityLabel={option}
                        testID={`shopping-add-unit-${option}`}
                      >
                        <Text
                          style={[
                            styles.unitText,
                            {
                              color: isSelected
                                ? isDark
                                  ? '#0E1611'
                                  : '#FFFFFF'
                                : textColor,
                            },
                          ]}
                        >
                          {option}
                        </Text>
                        {isSelected ? (
                          <Check
                            color={isDark ? '#0E1611' : '#FFFFFF'}
                            size={12}
                            strokeWidth={3}
                            style={{ marginLeft: sp(4) }}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <Pressable
              onPress={handleSubmit}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: AppColors.primary,
                  opacity: saving ? 0.65 : pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('home.shoppingAddConfirm')}
              accessibilityState={{ disabled: saving, busy: saving }}
              testID="shopping-add-submit"
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveText}>
                  {t('home.addToShoppingList')}
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp(20),
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardContainer: {
    width: '100%',
    maxHeight: '100%',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxHeight: '92%',
    borderRadius: sp(16),
    padding: sp(18),
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: sp(14),
  },
  headerText: {
    flex: 1,
    paddingRight: sp(12),
  },
  closeButton: {
    minWidth: sp(32),
    minHeight: sp(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: sp(16),
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: sp(12),
    marginTop: sp(2),
  },
  contentScroll: {
    flexShrink: 1,
  },
  contentContainer: {
    paddingBottom: sp(4),
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    fontSize: sp(13),
    marginBottom: sp(8),
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(16),
    marginBottom: sp(4),
  },
  qtyBtn: {
    width: sp(40),
    height: sp(40),
    borderRadius: sp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    minWidth: sp(88),
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: sp(10),
    paddingVertical: sp(8),
    paddingHorizontal: sp(10),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    fontSize: sp(16),
  },
  errorText: {
    color: '#D64545',
    fontFamily: FontFamily.regular,
    fontSize: sp(11),
    marginTop: sp(5),
    marginBottom: sp(8),
  },
  unitLabel: {
    marginTop: sp(16),
  },
  unitScroll: {
    maxHeight: sp(180),
    marginBottom: sp(14),
  },
  unitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp(8),
  },
  unitCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp(8),
    paddingHorizontal: sp(12),
    borderRadius: sp(14),
    borderWidth: 1,
  },
  unitText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    fontSize: sp(13),
  },
  saveBtn: {
    minHeight: sp(44),
    paddingVertical: sp(12),
    borderRadius: sp(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: sp(4),
  },
  saveText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    fontSize: sp(14),
  },
});

export default ShoppingAddItemModal;
