/**
 * CameraPreviewScreen
 *
 * Redesigned (Sprint 8):
 * - Dùng DetectionItem component (editable, có confidence bar)
 * - Header với count badge "5 món"
 * - Re-scan button
 * - Inline edit name (TextInput trong từng item)
 * - Confirm dialog trước khi add to fridge
 * - Empty state khi list rỗng
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Plus, Camera, Sparkles } from 'lucide-react-native';
import { CustomButton } from '../../components/common/CustomButton';
import { DetectionItem } from '../../components/scan/DetectionItem';
import { EmptyState } from '../../components/common/EmptyState';
import { showSuccess } from '../../utils/helpers';

export const CameraPreviewScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const initialItems = useMemo(
    () =>
      route.params?.items || [
        { id: '1', name: 'Cà chua', confidence: 0.95 },
        { id: '2', name: 'Sữa tươi', confidence: 0.88 },
        { id: '3', name: 'Trứng', confidence: 0.76 },
      ],
    [route.params?.items],
  );
  const [items, setItems] = useState(initialItems);

  const updateName = useCallback((id, name) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, name } : it)));
  }, []);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const addNew = useCallback(() => {
    const newItem = {
      id: String(Date.now()),
      name: '',
      confidence: null,
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  const saveAll = useCallback(() => {
    const validItems = items.filter((i) => i.name.trim().length > 0);
    if (validItems.length === 0) {
      Alert.alert('Chưa có nguyên liệu', 'Vui lòng thêm ít nhất 1 nguyên liệu');
      return;
    }
    Alert.alert(
      t('home.scanAddToFridge'),
      t('home.scanConfirmAdd', { count: validItems.length }),
      [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.scanAddToFridge'),
          onPress: () => {
            showSuccess(`Đã thêm ${validItems.length} món vào tủ lạnh`);
            navigation.popToTop();
          },
        },
      ],
    );
  }, [items, t, navigation]);

  const reScan = useCallback(() => {
    Alert.alert(t('home.scanReScan'), 'Chụp lại ảnh?', [
      { text: t('home.cancel'), style: 'cancel' },
      { text: t('home.scanReScan'), onPress: () => navigation.goBack() },
    ]);
  }, [t, navigation]);

  const validCount = items.filter((i) => i.name.trim().length > 0).length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <ChevronLeft color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={24} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text
            style={[styles.title, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(17) }]}
          >
            {t('home.scanReviewItems')}
          </Text>
          <View
            style={[
              styles.countBadge,
              { backgroundColor: isDark ? '#19271E' : AppColors.accentGreen },
            ]}
          >
            <Sparkles color={isDark ? AppColors.primaryLight : AppColors.primary} size={11} />
            <Text
              style={[
                styles.countText,
                { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(11) },
              ]}
            >
              {t('home.scanItemCount', { count: validCount })}
            </Text>
          </View>
        </View>
        <Pressable onPress={reScan} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <Camera color={isDark ? AppColors.primaryLight : AppColors.primary} size={20} />
        </Pressable>
      </View>

      <Text
        style={[
          styles.hint,
          { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(13) },
        ]}
      >
        {t('home.scanReviewHint')}
      </Text>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={{ marginTop: sp(40) }}>
            <EmptyState
              emoji="📷"
              title={t('home.scanEmpty')}
              hint={t('home.scanEmptyHint')}
              actionText={t('home.scanAddManually')}
              onAction={addNew}
            />
          </View>
        ) : (
          <>
            {items.map((item) => (
              <DetectionItem
                key={item.id}
                name={item.name}
                confidence={item.confidence}
                onChange={(name) => updateName(item.id, name)}
                onRemove={() => remove(item.id)}
              />
            ))}

            <Pressable
              onPress={addNew}
              style={({ pressed }) => [
                styles.addRow,
                {
                  borderColor: isDark ? '#2E4D36' : '#A5E69C',
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
                {t('home.scanAddManually')}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <View
        style={[
          styles.bottom,
          { backgroundColor: isDark ? '#0E1611' : '#FFFFFF', borderTopColor: isDark ? '#2E4D36' : '#E3E8E4' },
        ]}
      >
        <CustomButton
          title={t('home.scanAddToFridge')}
          onPress={saveAll}
          disabled={validCount === 0}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp(16),
    paddingTop: sp(50),
    paddingBottom: sp(8),
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: sp(4),
  },
  title: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(8),
    paddingVertical: sp(2),
    borderRadius: sp(8),
    gap: sp(4),
  },
  countText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: sp(2),
  },
  hint: {
    fontFamily: FontFamily.regular,
    paddingHorizontal: sp(20),
    paddingBottom: sp(12),
  },
  scroll: {
    padding: sp(20),
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp(14),
    borderRadius: sp(12),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: sp(2),
  },
  addText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: sp(6),
  },
  bottom: {
    padding: sp(20),
    borderTopWidth: 1,
  },
});
