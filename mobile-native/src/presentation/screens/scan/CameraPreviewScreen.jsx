/**
 * CameraPreviewScreen (ScanResultReview)
 *
 * B2 — nối vào BE thật (thay data cứng + Alert giả).
 *
 * Luồng thật (giống Flutter `scan_result_review_modal.dart`):
 *   1. Nhận `{ scanId, scanType, items }` từ màn scan qua route params
 *      (items đã chuẩn hoá bởi `useScanFlow()`).
 *   2. User kiểm tra / sửa: tên, số lượng, đơn vị, vị trí lưu trữ, xoá, thêm tay.
 *      Món có `needsConfirm` hiện badge nhắc kiểm tra; món có `allergyWarning`
 *      hiện icon ⚠ (giống Flutter).
 *   3. `POST /fridge/scan/:scanId/confirm` với `{ items: [{ ingredientId?,
 *      name?, quantity, unit, storageLocation }] }` -> BE tạo fridge items.
 *   4. Thành công -> toast + `popToTop()` (giống Flutter `Navigator.pop(ctx, true)`).
 *
 * Trường hợp không có `scanId` (deep-link lạ / test cũ): vẫn cho review
 * offline nhưng nút Lưu chỉ hiện toast nhắc — KHÔNG gọi BE với id giả.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Plus, Camera, Sparkles } from 'lucide-react-native';
import { CustomButton } from '../../components/common/CustomButton';
import { ErrorState } from '../../components/common/ErrorState';
import { DetectionItem } from '../../components/scan/DetectionItem';
import { EmptyState } from '../../components/common/EmptyState';
import { showSuccess } from '../../utils/helpers';
import { useServices } from '../../../data/ServiceProvider';

const normalizeIncoming = (rawItems) => {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((it, idx) => {
    // Tương thích ngược: màn scan cũ (Sprint 8) chỉ truyền mảng string.
    if (typeof it === 'string') {
      return {
        clientId: `legacy-${idx}`,
        ingredientId: null,
        name: it,
        quantity: 1,
        unit: '',
        confidence: null,
        needsConfirm: true,
        allergyWarning: false,
        storageLocation: 'fridge',
      };
    }
    return {
      clientId: it.clientId ?? `item-${idx}`,
      ingredientId: it.ingredientId ?? null,
      name: it.name ?? '',
      quantity: Number.isFinite(Number(it.quantity)) ? Number(it.quantity) : 1,
      unit: it.unit ?? '',
      confidence: it.confidence ?? null,
      needsConfirm: it.needsConfirm === true,
      allergyWarning: it.allergyWarning === true,
      storageLocation: it.storageLocation ?? 'fridge',
    };
  });
};

export const CameraPreviewScreen = () => {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const services = useServices();
  const isEn = i18n.language === 'en';

  // `ScanFoodPhotoScreen` (Sprint 8) từng truyền `{ items: ['Cà chua', ...] }`
  // (mảng string) — `normalizeIncoming` giữ màn review chạy được với cả 2 shape.
  const initialItems = useMemo(
    () => normalizeIncoming(route.params?.items),
    [route.params?.items]
  );
  const scanId = route.params?.scanId ?? null;

  const [items, setItems] = useState(initialItems);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const updateField = useCallback((id, field, value) => {
    setItems((prev) => prev.map((it) => (it.clientId === id ? { ...it, [field]: value } : it)));
    setSaveError(null);
  }, []);

  const updateName = useCallback(
    (id, name) => updateField(id, 'name', name),
    [updateField]
  );

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.clientId !== id));
  }, []);

  const addNew = useCallback(() => {
    const newItem = {
      clientId: `manual-${Date.now()}`,
      ingredientId: null,
      name: '',
      quantity: 1,
      unit: '',
      confidence: null,
      needsConfirm: false,
      allergyWarning: false,
      storageLocation: 'fridge',
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  const saveAll = useCallback(() => {
    const validItems = items.filter((i) => (i.name || '').trim().length > 0);
    if (validItems.length === 0) {
      Alert.alert(
        isEn ? 'No ingredients' : 'Chưa có nguyên liệu',
        isEn ? 'Please add at least 1 ingredient' : 'Vui lòng thêm ít nhất 1 nguyên liệu'
      );
      return;
    }

    // Không có scanId thật (deep-link lạ / test cũ) -> không gọi BE với id giả.
    if (!scanId) {
      Alert.alert(
        isEn ? 'Cannot save' : 'Không thể lưu',
        isEn
          ? 'Missing scan session. Please scan again.'
          : 'Thiếu phiên scan. Vui lòng quét lại.'
      );
      return;
    }

    Alert.alert(
      t('home.scanAddToFridge'),
      t('home.scanConfirmAdd', { count: validItems.length }),
      [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.scanAddToFridge'),
          onPress: async () => {
            if (saving) return;
            setSaving(true);
            setSaveError(null);
            try {
              const payload = validItems.map((it) => {
                const row = {
                  name: it.name.trim(),
                  quantity: Number(it.quantity) || 1,
                  unit: (it.unit || '').trim() || 'pcs',
                  storageLocation: it.storageLocation || 'fridge',
                };
                if (it.ingredientId !== null && it.ingredientId !== undefined) {
                  row.ingredientId = Number(it.ingredientId);
                }
                return row;
              });
              await services.fridgeService.confirmScan(scanId, payload);
              showSuccess(
                isEn
                  ? `Added ${validItems.length} items to fridge`
                  : `Đã thêm ${validItems.length} món vào tủ lạnh`
              );
              navigation.popToTop();
            } catch (e) {
              setSaveError(e);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }, [items, t, navigation, scanId, services, saving, isEn]);

  const reScan = useCallback(() => {
    Alert.alert(t('home.scanReScan'), isEn ? 'Take another photo?' : 'Chụp ảnh lại?', [
      { text: t('home.cancel'), style: 'cancel' },
      { text: t('home.scanReScan'), onPress: () => navigation.goBack() },
    ]);
  }, [t, navigation, isEn]);

  const validCount = items.filter((i) => (i.name || '').trim().length > 0).length;

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
        {saveError ? (
          <ErrorState message={saveError?.message} onRetry={saveAll} style={styles.saveError} />
        ) : null}
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
                key={item.clientId}
                name={item.name}
                confidence={item.confidence}
                onChange={(name) => updateName(item.clientId, name)}
                onRemove={() => remove(item.clientId)}
                quantity={item.quantity}
                onQuantityChange={(q) => updateField(item.clientId, 'quantity', q)}
                unit={item.unit}
                onUnitChange={(u) => updateField(item.clientId, 'unit', u)}
                storageLocation={item.storageLocation}
                onStorageChange={(s) => updateField(item.clientId, 'storageLocation', s)}
                allergyWarning={item.allergyWarning}
                needsConfirm={item.needsConfirm}
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
          disabled={validCount === 0 || saving}
          loading={saving}
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
  saveError: {
    marginBottom: sp(12),
    backgroundColor: '#FFEBEE',
    borderRadius: sp(12),
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
