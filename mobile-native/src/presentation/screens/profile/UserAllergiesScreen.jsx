/**
 * UserAllergiesScreen — Sprint A2, nối thật với `/users/me/allergies`.
 *
 * QUYẾT ĐỊNH ĐỔI (23/10): bỏ khái niệm "severity" (low/medium/high).
 *
 * Lý do: BE `AllergyResponseDto` chỉ có `{ id, ingredientId, ingredientName, note }`
 * và `AddAllergyDto` chỉ nhận `{ ingredientId, note }` — KHÔNG có `severity`.
 * Flutter (`user_models.dart:105-117`) cũng không có field này. Giữ severity
 * nghĩa là vòng lặp trên máy sẽ đổi màu badge nhưng không lưu được gì.
 *
 * Thêm dị ứng giờ dùng PICKER nguyên liệu (`GET /ingredients?search=`) vì BE bắt
 * buộc `ingredientId` là số trỏ vào catalog, không nhận tên tự do.
 *
 * Xoá dùng optimistic UI + rollback — theo Flutter `user_allergies_screen.dart:96-105`
 * (offline thì đánh dấu pending, phần offline queue để backlog ngoài 7 sprint này).
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackCircleButton } from '../../components/common/BackCircleButton';
import { CustomTextField } from '../../components/common/CustomTextField';
import { EmptyState } from '../../components/common/EmptyState';
import { useServices } from '../../../data/ServiceProvider';
import { showError } from '../../utils/helpers';
import { Plus, X, Search, TriangleAlert } from 'lucide-react-native';

export const UserAllergiesScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { userService } = useServices();

  const [allergies, setAllergies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Ẩn dị ứng đang có khỏi danh sách chọn — tránh bấm thêm trùng (BE trả 400).
  const existingIds = allergies.map((a) => a.ingredientId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await userService.getAllergies();
        if (!cancelled) setAllergies(Array.isArray(list) ? list : []);
      } catch (_e) {
        // Offline -> danh sách rỗng, người dùng thấy EmptyState (không crash).
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userService]);

  // Tìm nguyên liệu trong catalog. Debounce 300ms để không gõ là gọi mỗi ký tự
  // (cùng nguyên tắc debounce của Sprint B1 cho search tủ lạnh).
  useEffect(() => {
    if (!isPickerOpen) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const list = await userService.searchIngredients(keyword.trim(), 20);
        if (!cancelled) setResults(Array.isArray(list) ? list : []);
      } catch (_e) {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword, isPickerOpen, userService]);

  const openPicker = useCallback(() => {
    setKeyword('');
    setResults([]);
    setIsPickerOpen(true);
  }, []);

  const add = useCallback(
    async (ingredient) => {
      setIsSaving(true);
      try {
        const created = await userService.addAllergy(ingredient.id);
        if (created) setAllergies((prev) => [...prev, created]);
        setIsPickerOpen(false);
      } catch (e) {
        // 400 trùng nguyên liệu là lỗi của người dùng → hiện message BE trả về.
        showError(e?.message || 'Không thể thêm dị ứng');
      } finally {
        setIsSaving(false);
      }
    },
    [userService]
  );

  /** Optimistic: ẩn khỏi UI ngay, gọi API, lỗi thì trả về danh sách cũ. */
  const remove = useCallback(
    (item) => {
      Alert.alert(t('home.removeAllergy'), t('home.removeMemberConfirm'), [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.removeAllergy'),
          style: 'destructive',
          onPress: async () => {
            const snapshot = allergies;
            setAllergies((prev) => prev.filter((a) => a.id !== item.id));
            try {
              await userService.removeAllergy(item.id);
            } catch (e) {
              setAllergies(snapshot); // rollback
              showError(e?.message || 'Không thể xoá dị ứng');
            }
          },
        },
      ]);
    },
    [allergies, userService, t]
  );

  const iconColor = isDark ? AppColors.primaryLight : '#8C9890';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground },
      ]}
    >
      <View style={{ paddingTop: insets.top + sp(12), paddingHorizontal: sp(20) }}>
        <BackCircleButton onPress={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text
          style={[
            styles.title,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(24) },
          ]}
        >
          {t('home.allergiesTitle')}
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              fontSize: sp(13),
            },
          ]}
        >
          {t('home.allergiesSubtitle')}
        </Text>

        {isLoading ? (
          // Đang tải từ BE — chưa có dữ liệu thì không vội hiện EmptyState
          // ("chưa có dị ứng nào" khi thực ra là đang tải → gây hiểu nhầm).
          <View style={{ marginTop: sp(40) }}>
            <Text
              style={[
                styles.emptyText,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  fontSize: sp(13),
                },
              ]}
            >
              {t('home.searching')}
            </Text>
          </View>
        ) : allergies.length === 0 ? (
          <View style={{ marginTop: sp(40) }}>
            <EmptyState
              emoji="🤧"
              title={t('home.noAllergies')}
              hint={t('home.noAllergiesHint')}
              actionText={t('home.addAllergy')}
              onAction={openPicker}
            />
          </View>
        ) : (
          <View style={{ marginTop: sp(20) }}>
            {allergies.map((a) => (
              <View
                key={a.id}
                style={[
                  styles.row,
                  {
                    backgroundColor: isDark ? '#19271E' : '#F4F7F4',
                    borderColor: isDark ? '#2E4D36' : 'transparent',
                    borderLeftColor: isDark ? '#FF8A80' : '#B71C1C',
                  },
                ]}
              >
                <View
                  style={[styles.warnCircle, { backgroundColor: isDark ? '#3D1F1A' : '#FFEBEE' }]}
                >
                  <TriangleAlert color="#D32F2F" size={18} />
                </View>
                <View style={{ flex: 1, marginLeft: sp(12) }}>
                  <Text
                    style={[
                      styles.name,
                      { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) },
                    ]}
                    numberOfLines={1}
                  >
                    {a.name}
                  </Text>
                  {a.note ? (
                    <Text
                      style={[
                        styles.note,
                        {
                          color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          fontSize: sp(11),
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {a.note}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => remove(a)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <X color="#D32F2F" size={18} />
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={openPicker}
              style={({ pressed }) => [
                styles.addRow,
                {
                  borderColor: isDark ? '#2E4D36' : AppColors.primary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Plus color={isDark ? AppColors.primaryLight : AppColors.primary} size={18} />
              <Text
                style={[
                  styles.addText,
                  { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(14) },
                ]}
              >
                {t('home.addAllergy')}
              </Text>
            </Pressable>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Picker nguyên liệu — BE bắt buộc `ingredientId` nên không cho gõ tên tự do. */}
      <Modal
        visible={isPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPickerOpen(false)}
      >
        <View
          style={[styles.modalBackdrop, { backgroundColor: isDark ? '#0E1611EE' : '#FFFFFFEE' }]}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: isDark ? AppColors.darkCardBg : '#FFFFFF' },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(18) },
                ]}
              >
                {t('home.addAllergy')}
              </Text>
              <Pressable onPress={() => setIsPickerOpen(false)} hitSlop={8}>
                <X color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={20} />
              </Pressable>
            </View>

            <CustomTextField
              value={keyword}
              onChangeText={setKeyword}
              placeholder={t('home.searchIngredient')}
              prefixIcon={(props) => <Search {...props} color={iconColor} size={18} />}
            />

            <View style={{ maxHeight: sp(320) }}>
              <FlatList
                data={results}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text
                    style={[
                      styles.emptyText,
                      {
                        color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                        fontSize: sp(13),
                      },
                    ]}
                  >
                    {isSearching ? t('home.searching') : t('home.noIngredientsFound')}
                  </Text>
                }
                renderItem={({ item }) => {
                  const already = existingIds.includes(item.id);
                  return (
                    <Pressable
                      disabled={already || isSaving}
                      onPress={() => add(item)}
                      style={({ pressed }) => [
                        styles.resultRow,
                        {
                          borderBottomColor: isDark ? '#2E4D36' : '#EEF2EE',
                          opacity: already ? 0.4 : pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.resultName,
                          { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(14) },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {already ? (
                        <Text
                          style={[
                            styles.alreadyTag,
                            { color: AppColors.textSecondary, fontSize: sp(11) },
                          ]}
                        >
                          {t('home.alreadyAdded')}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    marginTop: sp(6),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp(14),
    borderRadius: sp(16),
    borderWidth: 1,
    borderLeftWidth: 3,
    marginBottom: sp(10),
  },
  warnCircle: {
    width: sp(36),
    height: sp(36),
    borderRadius: sp(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  note: {
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  removeBtn: {
    padding: sp(6),
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(8),
    marginTop: sp(6),
    paddingVertical: sp(14),
    borderRadius: sp(16),
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: sp(24),
    borderTopRightRadius: sp(24),
    paddingHorizontal: sp(20),
    paddingTop: sp(18),
    paddingBottom: sp(30),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp(14),
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp(12),
    borderBottomWidth: 1,
  },
  resultName: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    flex: 1,
  },
  alreadyTag: {
    fontFamily: FontFamily.regular,
    marginLeft: sp(8),
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    marginTop: sp(24),
  },
});
