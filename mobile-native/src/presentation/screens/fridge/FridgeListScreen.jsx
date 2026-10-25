/**
 * FridgeListScreen
 *
 * Generic config-driven screen cho AllAvailableItemsScreen + AllExpiredItemsScreen.
 * - Loại bỏ duplicate logic (~300 dòng)
 * - Config truyền vào quyết định filter/sort/title/empty state
 *
 * Sau này AllAvailableItemsScreen và AllExpiredItemsScreen chỉ cần pass config.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { useFridgeItems } from '../../hooks/useServiceHooks';
import { FridgeItem } from '../../components/fridge/FridgeItem';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterChips } from '../../components/common/FilterChips';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/common/Skeleton';
import { SortMenu } from '../../components/common/SortMenu';
import { sortFridgeItems } from '../../utils/fridgeItems';
import { FridgeItemActions } from '../../components/fridge/FridgeItemActions';

/**
 * ⚠️ B1 — gộp logic sort về 1 nguồn (`utils/fridgeItems.js`):
 *   Trước đây `FridgeListScreen` có `sortItems` riêng, còn `FridgeInventoryScreen`
 *   dùng sort của service. Hai bản khác nhau: bản của list screen dùng
 *   `new Date(a.expiryDate)` — với `expiryDate` null là `Invalid Date` ->
 *   comparator trả `NaN` -> thứ tự NGẪU NHIÊN (item không có hạn dùng lung
 *   tung giữa list). Bản dùng chung xử lý riêng case null (luôn đứng cuối).
 *
 *   Key của `config.sortOptionsArray` / `config.defaultSort` đã trùng đúng tên
 *   key mà `sortFridgeItems` hiểu (`expiry_asc` | `expiry_desc` | `name_asc` |
 *   `name_desc`), nên truyền thẳng, không cần bảng map.
 */
export const FridgeListScreen = ({ config }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { data: items, loading, error, refetch } = useFridgeItems();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(config.statusFilterDefault || 'all');
  const [sort, setSort] = useState(config.defaultSort);
  // Item đang mở sheet thao tác (sửa số lượng / dùng hết / xóa). null = đóng.
  const [actionsItem, setActionsItem] = useState(null);

  const openActions = useCallback((item) => setActionsItem(item), []);
  const closeActions = useCallback(() => setActionsItem(null), []);

  // Bước 1: Lọc theo điều kiện tiên quyết (chỉ fresh+expiring, hoặc expiring+expired)
  const baseItems = useMemo(() => {
    if (!items) return [];
    return items.filter(config.baseFilter);
  }, [items, config.baseFilter]);

  // Bước 2: Filter theo status
  const statusFiltered = useMemo(() => {
    if (statusFilter === 'all') return baseItems;
    if (typeof config.statusFilterFn === 'function') {
      return baseItems.filter((it) => config.statusFilterFn(it, statusFilter));
    }
    return baseItems.filter((it) => it.status === statusFilter);
  }, [baseItems, statusFilter, config]);

  // Bước 3: Search
  //
  // KHÔNG còn bước lọc theo category: `FridgeItemResponseDto` của BE không trả
  // field `category` -> mọi item có `category === undefined` -> filter luôn ra
  // list rỗng. Quyết định bỏ: DEV_B_ONBOARDING_PROMPT.md mục 5.2 (chốt 23/10).
  const searched = useMemo(() => {
    if (!search.trim()) return statusFiltered;
    const q = search.toLowerCase().trim();
    return statusFiltered.filter((it) => it.name.toLowerCase().includes(q));
  }, [statusFiltered, search]);

  // Bước 5: Sort — dùng bản sort dùng chung (`fridgeItems.js`) để xử lý đúng
  // case item KHÔNG có hạn dùng (luôn đứng cuối, không làm thứ tự lung tung).
  const filteredItems = useMemo(() => sortFridgeItems(searched, sort), [searched, sort]);

  // Counts
  const counts = useMemo(() => {
    const c = { all: baseItems.length };
    config.statusChips.forEach((chip) => {
      c[chip.key] = baseItems.filter((it) => config.statusFilterFn(it, chip.key)).length;
    });
    return c;
  }, [baseItems, config]);

  const statusChips = useMemo(
    () =>
      config.statusChips.map((chip) => ({
        ...chip,
        label: t(chip.labelKey, { defaultValue: chip.labelKey }),
        count: counts[chip.key] || 0,
      })),
    [config.statusChips, counts, t]
  );

  const sortOptions = useMemo(
    () =>
      config.sortOptionsArray.map((opt) => ({
        key: opt.key,
        label: t(opt.labelKey, { defaultValue: opt.labelKey }),
      })),
    [config.sortOptionsArray, t]
  );

  // Loading state
  if (loading && !items) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(22) },
            ]}
          >
            {t(config.titleKey)}
          </Text>
        </View>
        <View style={{ paddingHorizontal: sp(20), gap: sp(10) }}>
          <Skeleton
            width="100%"
            height={sp(42)}
            borderRadius={sp(12)}
            style={{ marginBottom: sp(8) }}
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={sp(72)} borderRadius={sp(14)} />
          ))}
        </View>
      </View>
    );
  }

  // Error state
  if (error && !items) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
        <ErrorState onRetry={refetch} style={{ marginTop: sp(40) }} />
      </View>
    );
  }

  const hasFilters = !!search || statusFilter !== 'all';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.title,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(22) },
            ]}
          >
            {t(config.titleKey)}
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
            {filteredItems.length > 0
              ? t('home.resultCount', { count: filteredItems.length })
              : t('home.resultCountEmpty')}
          </Text>
        </View>
        {config.sortOptionsArray ? (
          <SortMenu selectedKey={sort} options={sortOptions} onSelect={setSort} />
        ) : null}
      </View>

      <View style={{ paddingHorizontal: sp(20), marginBottom: sp(12) }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('home.searchHint')} />
      </View>

      <FilterChips
        options={statusChips}
        selectedKey={statusFilter}
        onSelect={setStatusFilter}
        style={{ marginBottom: sp(12) }}
      />

      <FlatList
        data={filteredItems}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: sp(24) }}
        ItemSeparatorComponent={() => <View style={{ height: sp(10) }} />}
        ListEmptyComponent={
          baseItems.length === 0 ? (
            <EmptyState
              emoji={config.emptyEmoji}
              title={t(config.emptyTitleKey, { defaultValue: config.emptyTitleKey })}
              hint={t(config.emptyHintKey, { defaultValue: config.emptyHintKey })}
            />
          ) : hasFilters ? (
            <EmptyState emoji="🔍" title={t('home.noResults')} hint={t('home.noResultsHint')} />
          ) : null
        }
        renderItem={({ item }) => <FridgeItem item={item} onPress={openActions} />}
      />

      {/* Sheet thao tác: sửa số lượng / đánh dấu dùng hết / xóa.
          `key={actionsItem?.id}` -> mỗi item là 1 instance mới, state trong
          sheet (số lượng, đơn vị) khởi tạo đúng ngay, không cần setState
          trong effect. */}
      <FridgeItemActions
        key={actionsItem?.id ?? 'none'}
        item={actionsItem}
        visible={actionsItem !== null}
        onClose={closeActions}
        onChanged={refetch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: sp(20),
    paddingTop: sp(8),
    paddingBottom: sp(12),
    gap: sp(8),
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginTop: sp(4),
  },
});
