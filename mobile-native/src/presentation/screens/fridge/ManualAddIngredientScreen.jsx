/**
 * ManualAddIngredientScreen
 *
 * B1 — nối vào BE thật (thay vì `showSuccess` + `goBack` giả).
 *
 * Bám theo cấu trúc Flutter: `Mobile/lib/screens/manual_add_ingredient_screen.dart`
 *   1. Tên nguyên liệu + picker gợi ý từ danh mục
 *   2. Số lượng (stepper) + Đơn vị (bottom sheet)
 *   3. Ngày hết hạn (tùy chọn)
 *   4. Vị trí lưu trữ (3 pill: Ngăn mát / Ngăn đông / Tủ khô)
 *   5. Nút Lưu
 *
 * 3 quyết định đã chốt (DEV_B_ONBOARDING_PROMPT.md mục 5.1):
 *
 * 1. **Ô nhập hạn dùng là TÙY CHỌN.** BE tự tính `expiresAt` khi FE không gửi
 *    (bảng 5 tầng fallback, commit ca5501c). Nên:
 *    - user KHÔNG chọn ngày -> UI không gửi `expiresAt` -> BE tự tính,
 *    - user CHỌN ngày -> UI gửi `expiresAt` -> ghi đè giá trị BE.
 *    Gửi cả chuỗi rỗng là sai (sẽ ghi đè giá trị BE với ngày rỗng).
 *    (Quyết định "KHÔNG có ô hạn dùng" ban đầu ở mục 5.1 đã được mở lại: Flutter
 *    production CÓ ô này, và mock mode không có BE để tính hộ nên item thêm vào
 *    sẽ không có hạn dùng -> biến mất khỏi màn "Nguyên liệu sẵn có".)
 *
 * 2. **THÊM 3 pill storage.** `storageLocation` là enum của BE
 *    (`fridge`|`freezer`|`pantry`). Mặc định `fridge` (ngăn mát).
 *
 * 3. **THÊM ingredient picker.** `AddFridgeItemDto` có cả `ingredientId` lẫn
 *    `name` đều optional, nhưng `fridge.service.ts:141` throw BadRequest nếu
 *    không resolve được nguyên liệu trong danh mục -> UI nhập tên tự do lỗi 400.
 *    Picker search theo `GET /ingredients`, chọn xong set `ingredientId` +
 *    lấy `defaultUnit` của mục đó.
 *
 * Ngoài ra: BỎ hàng chip category (rau/thịt/sữa/trái cây) vì `AddFridgeItemDto`
 * không có field `category` — cùng lý do với B1 mục 5.2 (bỏ chip filter).
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Minus, Plus, ChevronDown, Check } from 'lucide-react-native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { CustomTextField } from '../../components/common/CustomTextField';
import { CustomButton } from '../../components/common/CustomButton';
import { ExpiryDatePicker, toIsoDate } from '../../components/fridge/ExpiryDatePicker';
import { showSuccess, showError } from '../../utils/helpers';
import { useServices } from '../../../data/ServiceProvider';
import { COMPARTMENT_LABEL } from '../../../data/services/real/RealFridgeService';

/**
 * 15 đơn vị — copy NGUYÊN VĂN từ Flutter (nguồn duy nhất, production đang chạy):
 *   Mobile/lib/screens/manual_add_ingredient_screen.dart:29
 *   Mobile/lib/screens/fridge_inventory_screen.dart:229  (giống hệt nhau)
 *
 * BE KHÔNG có endpoint danh mục đơn vị — `be/src/common/utils/unit.util.ts` chỉ là
 * bảng CONVERT (g→gram, lít→ml), không phải danh sách để chọn. Nên hardcode ở đây.
 */
const UNITS = [
  'kg',
  'gram',
  'g',
  'ml',
  'lít',
  'quả',
  'củ',
  'bó',
  'miếng',
  'gói',
  'hộp',
  'chai',
  'con',
  'bắp',
  'pcs',
];

/**
 * 3 pill vị trí lưu trữ. Key trùng enum `storageLocation` của BE.
 * Nhãn lấy từ COMPARTMENT_LABEL (nguồn duy nhất, khớp mapper ở RealFridgeService).
 */
const STORAGE_OPTIONS = [
  { key: 'fridge', label: COMPARTMENT_LABEL.fridge },
  { key: 'freezer', label: COMPARTMENT_LABEL.freezer },
  { key: 'pantry', label: COMPARTMENT_LABEL.pantry },
];

// Số kết quả gợi ý tối đa trong picker.
const SUGGESTION_LIMIT = 8;

export const ManualAddIngredientScreen = () => {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const services = useServices();
  const isEn = i18n.language === 'en';

  const [name, setName] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('kg');
  const [storageLocation, setStorageLocation] = useState('fridge');
  // Ngày hết hạn (Date | null). null = để BE tự tính theo storageLocation.
  const [expiryDate, setExpiryDate] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);

  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Timer debounce search — setState nằm trong callback của timer (không phải
  // thân effect) nên không vi phạm quy tắc cascading render.
  const searchTimer = useRef(null);
  const requestIdRef = useRef(0);

  // Debounce 300ms cho picker. Mỗi ký tự gõ 1 request sẽ tốn băng thông và
  // dễ giật — cùng lý do đã dùng ở FridgeInventoryScreen.
  const runSearch = useCallback(
    (keyword) => {
      const q = keyword.trim();
      if (!q) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // Tăng id để bỏ qua response của request cũ (race condition).
      requestIdRef.current += 1;
      const currentId = requestIdRef.current;

      setSearching(true);
      services.fridgeService
        .searchIngredients(q, SUGGESTION_LIMIT)
        .then((results) => {
          // Response đến sau request mới hơn -> bỏ qua.
          if (currentId !== requestIdRef.current) return;
          setSuggestions(Array.isArray(results) ? results : []);
          setShowSuggestions(true);
        })
        .catch(() => {
          if (currentId !== requestIdRef.current) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (currentId === requestIdRef.current) setSearching(false);
        });
    },
    [services]
  );

  const handleNameChange = useCallback(
    (text) => {
      setName(text);
      // Chỉnh tay tên -> bỏ chọn nguyên liệu cũ (id không còn khớp tên).
      setSelectedIngredientId(null);

      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (!text.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      searchTimer.current = setTimeout(() => runSearch(text), 300);
    },
    [runSearch]
  );

  // Dọn timer khi unmount -> không setState sau khi rời màn.
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    []
  );

  const handleSelectSuggestion = useCallback((option) => {
    setName(option.name);
    setSelectedIngredientId(option.id);
    // Lấy đơn vị mặc định của nguyên liệu nếu có (Flutter làm vậy ở
    // `_selectSuggestion`).
    if (option.defaultUnit) setUnit(option.defaultUnit);
    setShowSuggestions(false);
    setSuggestions([]);
  }, []);

  const decrementQuantity = useCallback(() => {
    setQuantity((q) => Math.max(1, q - 1));
  }, []);

  const incrementQuantity = useCallback(() => {
    setQuantity((q) => Math.min(9999, q + 1));
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showError(isEn ? 'Please enter an ingredient name' : 'Vui lòng nhập tên nguyên liệu');
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      const isoExpiry = toIsoDate(expiryDate);
      await services.fridgeService.addItem({
        name: trimmedName,
        // `ingredientId` BẮT BUỘC để BE resolve được nguyên liệu trong danh mục.
        // Không có nó -> `fridge.service.ts:141` throw BadRequest.
        ...(selectedIngredientId ? { ingredientId: selectedIngredientId } : {}),
        quantity,
        unit,
        // UI `compartment` -> BE `storageLocation`.
        compartment: storageLocation,
        // Chỉ gửi `expiryDate` khi user CHỌN ngày. Bỏ trống -> không gửi ->
        // BE tự tính `expiresAt` theo `storageLocation` (bảng 5 tầng fallback,
        // commit ca5501c). Gửi cả chuỗi rỗng sẽ ghi đè giá trị BE tính -> sai.
        ...(isoExpiry ? { expiryDate: isoExpiry } : {}),
      });
      showSuccess(isEn ? 'Ingredient added' : 'Đã thêm nguyên liệu');
      navigation.goBack();
    } catch (e) {
      // 4xx không được fallback -> hiện lỗi thật cho user.
      showError(e?.message || (isEn ? 'Failed to add ingredient' : 'Không thêm được nguyên liệu'));
    } finally {
      setSaving(false);
    }
  }, [
    name,
    selectedIngredientId,
    quantity,
    unit,
    storageLocation,
    expiryDate,
    saving,
    services,
    navigation,
    isEn,
  ]);

  const fieldLabelStyle = [
    styles.fieldLabel,
    { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(14) },
  ];

  const surfaceStyle = {
    backgroundColor: isDark ? '#19271E' : '#FFFFFF',
    borderColor: isDark ? '#2E4D36' : '#81C784',
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: isDark ? '#0E1611' : AppColors.accentGreen }]}
    >
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text
          style={[
            styles.title,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(24) },
          ]}
        >
          {t('fridge.addIngredient')}
        </Text>

        {/* ── 1. Tên nguyên liệu + picker gợi ý ── */}
        <View style={{ marginTop: sp(20) }}>
          <CustomTextField
            label={t('scan.ingredientName')}
            value={name}
            onChangeText={handleNameChange}
            placeholder={isEn ? 'e.g. Red Apple, Fresh Milk...' : 'vd: Táo đỏ, Sữa tươi...'}
          />
        </View>

        {showSuggestions && suggestions.length > 0 ? (
          <View style={[styles.suggestionsBox, surfaceStyle]}>
            {suggestions.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => handleSelectSuggestion(option)}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  {
                    borderBottomColor: isDark ? '#2E4D36' : '#E8F5E9',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.suggestionName,
                      { color: isDark ? '#FFFFFF' : AppColors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {option.name}
                  </Text>
                  {option.defaultUnit ? (
                    <Text
                      style={[
                        styles.suggestionUnit,
                        { color: isDark ? AppColors.primaryLight : AppColors.primaryDark },
                      ]}
                    >
                      {isEn
                        ? `Default unit: ${option.defaultUnit}`
                        : `Đơn vị mặc định: ${option.defaultUnit}`}
                    </Text>
                  ) : null}
                </View>
                <Check
                  color={isDark ? AppColors.primaryLight : AppColors.primaryDark}
                  size={15}
                  strokeWidth={2.5}
                />
              </Pressable>
            ))}
          </View>
        ) : null}

        {searching && !showSuggestions ? (
          <View style={styles.searchingRow}>
            <ActivityIndicator
              size="small"
              color={isDark ? AppColors.primaryLight : AppColors.primary}
            />
            <Text
              style={[
                styles.searchingText,
                { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
              ]}
            >
              {isEn ? 'Searching...' : 'Đang tìm...'}
            </Text>
          </View>
        ) : null}

        {/* ── 2. Số lượng + Đơn vị ── */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={fieldLabelStyle}>{t('scan.quantity')}</Text>
            <View style={[styles.stepperBox, surfaceStyle]}>
              <Pressable
                onPress={decrementQuantity}
                disabled={quantity <= 1}
                style={({ pressed }) => [
                  styles.stepperBtn,
                  {
                    backgroundColor: isDark ? '#233629' : AppColors.accentGreen,
                    opacity: pressed ? 0.7 : quantity <= 1 ? 0.4 : 1,
                  },
                ]}
              >
                <Minus
                  color={isDark ? AppColors.primaryLight : AppColors.forestAccent}
                  size={18}
                  strokeWidth={2.5}
                />
              </Pressable>
              <Text
                style={[
                  styles.stepperValue,
                  { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(16) },
                ]}
              >
                {quantity}
              </Text>
              <Pressable
                onPress={incrementQuantity}
                style={({ pressed }) => [
                  styles.stepperBtn,
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
          </View>

          <View style={{ flex: 1 }}>
            <Text style={fieldLabelStyle}>{t('scan.unit')}</Text>
            <Pressable
              onPress={() => setUnitPickerOpen(true)}
              style={[styles.selectBox, surfaceStyle]}
            >
              <Text
                style={[
                  styles.selectValue,
                  { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) },
                ]}
                numberOfLines={1}
              >
                {unit}
              </Text>
              <ChevronDown
                color={isDark ? AppColors.primaryLight : AppColors.forestAccent}
                size={18}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>
        </View>

        {/* ── 3. Ngày hết hạn (tùy chọn) ── */}
        <View style={{ marginTop: sp(24) }}>
          <Text style={fieldLabelStyle}>
            {isEn ? 'Expiration Date (Optional)' : 'Ngày Hết Hạn (Tùy chọn)'}
          </Text>
          <ExpiryDatePicker
            value={expiryDate}
            onChange={setExpiryDate}
            placeholder={isEn ? 'Tap to set date (Optional)' : 'Bấm để chọn ngày (Không bắt buộc)'}
          />
        </View>

        {/* ── 4. Vị trí lưu trữ (3 pill) ── */}
        <View style={{ marginTop: sp(24) }}>
          <Text style={fieldLabelStyle}>{isEn ? 'Storage Area' : 'Vị Trí Lưu Trữ'}</Text>
          <View style={styles.storageRow}>
            {STORAGE_OPTIONS.map((opt) => {
              const isSelected = storageLocation === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setStorageLocation(opt.key)}
                  style={({ pressed }) => [
                    styles.storagePill,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? AppColors.primaryLight
                          : AppColors.primary
                        : isDark
                          ? '#19271E'
                          : '#FFFFFF',
                      borderColor: isSelected
                        ? isDark
                          ? AppColors.primaryLight
                          : AppColors.primary
                        : isDark
                          ? '#2E4D36'
                          : '#81C784',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.storagePillText,
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
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── 5. Nút lưu ── */}
        <View style={{ marginTop: sp(28) }}>
          <CustomButton title={t('scan.save')} onPress={handleSave} loading={saving} />
        </View>

        <View style={{ height: Math.max(sp(40), insets.bottom + sp(16)) }} />
      </ScrollView>

      {/* ── Bottom sheet chọn đơn vị ── */}
      <Modal
        visible={unitPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setUnitPickerOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setUnitPickerOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.unitSheet,
                  {
                    backgroundColor: isDark ? '#19271E' : '#FFFFFF',
                    borderColor: isDark ? '#2E4D36' : '#E3E8E4',
                  },
                ]}
              >
                <View style={styles.sheetHandle} />
                <Text
                  style={[
                    styles.sheetTitle,
                    { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(18) },
                  ]}
                >
                  {t('scan.unit')}
                </Text>
                <FlatList
                  data={UNITS}
                  keyExtractor={(u) => u}
                  numColumns={3}
                  columnWrapperStyle={styles.unitGridRow}
                  style={{ maxHeight: sp(320) }}
                  renderItem={({ item }) => {
                    const isSelected = unit === item;
                    return (
                      <Pressable
                        onPress={() => {
                          setUnit(item);
                          setUnitPickerOpen(false);
                        }}
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
                              : isDark
                                ? '#2E4D36'
                                : '#E3E8E4',
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.unitCellText,
                            {
                              color: isSelected
                                ? isDark
                                  ? '#0E1611'
                                  : '#FFFFFF'
                                : isDark
                                  ? '#FFFFFF'
                                  : AppColors.textPrimary,
                              fontSize: sp(14),
                            },
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: sp(20),
    paddingTop: sp(8),
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    letterSpacing: -0.5,
  },
  fieldLabel: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginTop: sp(16),
    marginBottom: sp(8),
    marginLeft: sp(8),
  },

  // Picker gợi ý
  suggestionsBox: {
    marginTop: sp(8),
    borderRadius: sp(16),
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(14),
    paddingVertical: sp(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: sp(8),
  },
  suggestionName: {
    fontSize: sp(14),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  suggestionUnit: {
    fontSize: sp(12),
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(8),
    marginTop: sp(8),
    marginLeft: sp(8),
  },
  searchingText: {
    fontSize: sp(12),
    fontFamily: FontFamily.regular,
  },

  // Số lượng + đơn vị
  row: {
    flexDirection: 'row',
    gap: sp(12),
    marginTop: sp(8),
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: sp(52),
    borderRadius: sp(16),
    borderWidth: 1,
    paddingHorizontal: sp(6),
  },
  stepperBtn: {
    width: sp(34),
    height: sp(34),
    borderRadius: sp(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: sp(52),
    borderRadius: sp(16),
    borderWidth: 1,
    paddingHorizontal: sp(16),
  },
  selectValue: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },

  // Pill vị trí lưu trữ
  storageRow: {
    flexDirection: 'row',
    gap: sp(10),
  },
  storagePill: {
    flex: 1,
    height: sp(48),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: sp(24),
    borderWidth: 1.4,
  },
  storagePillText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },

  // Bottom sheet đơn vị
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  unitSheet: {
    borderTopLeftRadius: sp(28),
    borderTopRightRadius: sp(28),
    borderWidth: 1,
    paddingHorizontal: sp(20),
    paddingTop: sp(14),
    paddingBottom: sp(28),
  },
  sheetHandle: {
    alignSelf: 'center',
    width: sp(38),
    height: sp(4.5),
    borderRadius: sp(10),
    backgroundColor: '#C8E6C9',
    marginBottom: sp(14),
  },
  sheetTitle: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginBottom: sp(12),
  },
  unitGridRow: {
    gap: sp(10),
    marginBottom: sp(10),
  },
  unitCell: {
    flex: 1,
    paddingVertical: sp(11),
    borderRadius: sp(14),
    borderWidth: 1,
    alignItems: 'center',
    marginRight: sp(10),
  },
  unitCellText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
});
