/**
 * CatalogPickerModal
 *
 * Modal tra cứu nguyên liệu trong danh mục hệ thống — dùng cho màn review
 * kết quả scan AI (`CameraPreviewScreen`).
 *
 * ── VÌ SAO CẦN ─────────────────────────────────────────────────────────────
 * AI nhận diện ảnh/receipt/barcode rất hay ra món KHÔNG có trong bảng
 * `ingredients` (VD "Táo đỏ" — danh mục seed không có nhóm Trái cây).
 * `ai-service/.../validator.agent.ts:60` đánh dấu `needsConfirm = true` cho
 * các món đó, và `DetectionItem` chỉ cho sửa TEXT tên — không có cách nào
 * gắn món đó với một `ingredientId` hợp lệ trong danh mục.
 *
 * Hệ quả: user sửa tên thủ công rồi bấm "Thêm vào tủ lạnh" -> BE
 * (`fridge.service.ts:497`) ném 400 "Nguyên liệu 'X' chưa có trong danh mục
 * hệ thống" -> **toàn bộ lô thất bại** (BE không bọc transaction, các món
 * trước đó đã vào tủ, món sau thì mất).
 *
 * Modal này cho user chọn đúng món trong danh mục -> BE resolve chắc chắn.
 *
 * ── VÌ SAO SEARCH Ở SERVER ────────────────────────────────────────────────
 * `GET /ingredients?search=` là endpoint DUY NHẤT để tra danh mục
 * (`ingredients.controller.ts` chỉ có GET, không có POST cho user thường).
 * `RealFridgeService.searchIngredients()` đã bọc sẵn phần unwrap envelope +
 * map về shape UI — dùng lại để không lặp lại logic mapping.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { X, Search, Check } from 'lucide-react-native';
import { useServices } from '../../../data/ServiceProvider';

const RESULT_LIMIT = 20;

export const CatalogPickerModal = ({ visible, onClose, onSelect, initialQuery = '' }) => {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const services = useServices();
  const isEn = i18n.language === 'en';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const timerRef = useRef(null);
  const requestIdRef = useRef(0);

  const runSearch = useCallback(
    (keyword) => {
      const q = keyword.trim();
      requestIdRef.current += 1;
      const currentId = requestIdRef.current;

      setLoading(true);
      setError(null);
      services.fridgeService
        .searchIngredients(q, RESULT_LIMIT)
        .then((list) => {
          if (currentId !== requestIdRef.current) return;
          setResults(Array.isArray(list) ? list : []);
        })
        .catch(() => {
          if (currentId !== requestIdRef.current) return;
          setResults([]);
          setError(isEn ? 'Failed to load the catalog' : 'Không tải được danh mục');
        })
        .finally(() => {
          if (currentId === requestIdRef.current) setLoading(false);
        });
    },
    [services, isEn]
  );

  const handleQueryChange = useCallback(
    (text) => {
      setQuery(text);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => runSearch(text), 300);
    },
    [runSearch]
  );

  // Nạp danh sách đầu tiên khi modal mở.
  //
  // ⚠️ `setState` KHÔNG được gọi đồng bộ trong thân effect (rule
  // `react-hooks/set-state-in-effect`) -> gây cascading render. Vì vậy ta gọi
  // hàm async và chỉ setState SAU khi `await` (setState trong callback async
  // là hợp lệ).
  useEffect(() => {
    if (!visible) return undefined;

    let cancelled = false;
    const load = async () => {
      try {
        const list = await services.fridgeService.searchIngredients(query, RESULT_LIMIT);
        if (cancelled) return;
        setResults(Array.isArray(list) ? list : []);
      } catch {
        if (cancelled) return;
        setResults([]);
        setError(isEn ? 'Failed to load the catalog' : 'Không tải được danh mục');
      }
    };
    load();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSelect = useCallback(
    (option) => {
      onSelect?.(option);
      onClose?.();
    },
    [onSelect, onClose]
  );

  const surface = {
    backgroundColor: isDark ? '#19271E' : '#FFFFFF',
    borderColor: isDark ? '#2E4D36' : '#E3E8E4',
  };
  const textColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const subColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={onClose} />
        <View style={[styles.sheet, surface, { paddingBottom: Math.max(sp(16), insets.bottom) }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: textColor }]}>
              {t('fridge.pickFromCatalog')}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X color={subColor} size={22} />
            </Pressable>
          </View>

          {/* Ô tìm kiếm */}
          <View style={[styles.searchBox, surface]}>
            <Search color={subColor} size={18} />
            <TextInput
              value={query}
              onChangeText={handleQueryChange}
              placeholder={t('fridge.searchCatalog')}
              placeholderTextColor={subColor}
              style={[styles.searchInput, { color: textColor }]}
              autoFocus
            />
            {loading ? <ActivityIndicator size="small" color={AppColors.primary} /> : null}
          </View>

          {error ? (
            <Text style={[styles.errorText, { color: AppColors.error }]}>{error}</Text>
          ) : null}

          {!loading && results.length === 0 && !error ? (
            <Text style={[styles.emptyText, { color: subColor }]}>{t('fridge.notInCatalog')}</Text>
          ) : null}

          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item)}
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.categoryName ? (
                    <Text style={[styles.rowMeta, { color: subColor }]} numberOfLines={1}>
                      {item.categoryName}
                      {item.defaultUnit ? ` · ${item.defaultUnit}` : ''}
                    </Text>
                  ) : null}
                </View>
                <Check color={AppColors.primary} size={16} strokeWidth={2.5} />
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: sp(17),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(8),
    borderWidth: 1,
    borderRadius: sp(24),
    paddingHorizontal: sp(14),
    paddingVertical: sp(8),
  },
  searchInput: {
    flex: 1,
    fontSize: sp(14),
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    paddingVertical: sp(4),
  },
  list: {
    marginTop: sp(10),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
    gap: sp(10),
  },
  rowName: {
    fontSize: sp(15),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  rowMeta: {
    fontSize: sp(12),
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  emptyText: {
    fontSize: sp(13),
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    marginTop: sp(24),
  },
  errorText: {
    fontSize: sp(13),
    fontFamily: FontFamily.regular,
    marginTop: sp(12),
    textAlign: 'center',
  },
});
