/**
 * FridgeInventoryScreen
 *
 * Redesigned (Sprint 5):
 * - Dùng useFridgeItems với search/sort/filter qua service layer
 * - Search bar live
 * - Filter chips: All / Fresh / Expiring + Category chips
 * - Sort menu: Expiry / Name / Quantity / Category
 * - FridgeItem component (đã làm ở Sprint 4)
 * - Pull-to-refresh
 * - Loading / empty / error states
 * - Compact stats header
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Refrigerator } from 'lucide-react-native';
import { FridgeItem } from '../../components/fridge/FridgeItem';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterChips } from '../../components/common/FilterChips';
import { SortMenu } from '../../components/common/SortMenu';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/common/Skeleton';
import { ScreenBackground } from '../../components/common/ScreenBackground';
import { useFridgeItems } from '../../hooks/useServiceHooks';
import { Routes } from '../../../shared/constants/routes';

const STATUS_KEYS = {
  ALL: 'all',
  FRESH: 'fresh',
  EXPIRING: 'expiring',
};

const CATEGORY_KEYS = {
  ALL: 'all',
  VEGETABLE: 'vegetable',
  MEAT: 'meat',
  DAIRY: 'dairy',
  FRUIT: 'fruit',
};

const SORT_KEYS = {
  EXPIRY_ASC: 'expiry_asc',
  EXPIRY_DESC: 'expiry_desc',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  QUANTITY_ASC: 'quantity_asc',
  QUANTITY_DESC: 'quantity_desc',
};

export const FridgeInventoryScreen = ({ fridge, isEmbedded = false, onRename }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUS_KEYS.ALL);
  const [categoryFilter, setCategoryFilter] = useState(CATEGORY_KEYS.ALL);
  const [sort, setSort] = useState(SORT_KEYS.EXPIRY_ASC);
  const [refreshing, setRefreshing] = useState(false);

  // Build service filters
  const serviceFilters = useMemo(() => {
    const f = {};
    if (search.trim()) f.search = search.trim();
    if (statusFilter !== STATUS_KEYS.ALL) f.status = statusFilter;
    if (categoryFilter !== CATEGORY_KEYS.ALL) f.category = categoryFilter;
    if (sort === SORT_KEYS.EXPIRY_ASC) {
      f.sortBy = 'expiry';
      f.sortDir = 'asc';
    } else if (sort === SORT_KEYS.EXPIRY_DESC) {
      f.sortBy = 'expiry';
      f.sortDir = 'desc';
    } else if (sort === SORT_KEYS.NAME_ASC) {
      f.sortBy = 'name';
      f.sortDir = 'asc';
    } else if (sort === SORT_KEYS.NAME_DESC) {
      f.sortBy = 'name';
      f.sortDir = 'desc';
    } else if (sort === SORT_KEYS.QUANTITY_ASC) {
      f.sortBy = 'quantity';
      f.sortDir = 'asc';
    } else if (sort === SORT_KEYS.QUANTITY_DESC) {
      f.sortBy = 'quantity';
      f.sortDir = 'desc';
    }
    return f;
  }, [search, statusFilter, categoryFilter, sort]);

  const { data: items, loading, error, refetch } = useFridgeItems(serviceFilters);

  // Stats
  const stats = useMemo(() => {
    if (!items) return { total: 0, expiring: 0, fresh: 0 };
    return {
      total: items.length,
      expiring: items.filter((it) => it.status === 'expiring').length,
      fresh: items.filter((it) => it.status === 'fresh').length,
    };
  }, [items]);

  // Category counts (tính từ items đang hiển thị - đã filter status nhưng chưa filter category)
  const categoryCounts = useMemo(() => {
    if (!items) return { all: 0, vegetable: 0, meat: 0, dairy: 0, fruit: 0 };
    return {
      all: items.length,
      vegetable: items.filter((it) => it.category === 'vegetable').length,
      meat: items.filter((it) => it.category === 'meat').length,
      dairy: items.filter((it) => it.category === 'dairy').length,
      fruit: items.filter((it) => it.category === 'fruit').length,
    };
  }, [items]);

  // Status counts
  const statusCounts = useMemo(() => {
    if (!items) return { all: 0, fresh: 0, expiring: 0 };
    return {
      all: items.length,
      fresh: items.filter((it) => it.status === 'fresh').length,
      expiring: items.filter((it) => it.status === 'expiring').length,
    };
  }, [items]);

  const statusOptions = [
    // Nhãn riêng cho hàng trạng thái. Trước đây dùng chung key home.all
    // "Tất cả" với hàng danh mục -> 2 pill xanh giống hệt nhau, người dùng
    // không phân biệt được pill nào đang lọc trạng thái/category.
    { key: STATUS_KEYS.ALL, label: t('home.allStatus'), count: statusCounts.all },
    {
      key: STATUS_KEYS.FRESH,
      label: t('home.filterFresh'),
      count: statusCounts.fresh,
      color: AppColors.primary,
    },
    {
      key: STATUS_KEYS.EXPIRING,
      label: t('home.filterExpiring'),
      count: statusCounts.expiring,
      color: '#FF9800',
    },
  ];

  const categoryOptions = [
    { key: CATEGORY_KEYS.ALL, label: t('home.allCategory'), count: categoryCounts.all },
    {
      key: CATEGORY_KEYS.VEGETABLE,
      label: t('home.categoryVegetable'),
      count: categoryCounts.vegetable,
      color: '#4CAF50',
    },
    {
      key: CATEGORY_KEYS.MEAT,
      label: t('home.categoryMeat'),
      count: categoryCounts.meat,
      color: '#E57373',
    },
    {
      key: CATEGORY_KEYS.DAIRY,
      label: t('home.categoryDairy'),
      count: categoryCounts.dairy,
      color: '#FFB300',
    },
    {
      key: CATEGORY_KEYS.FRUIT,
      label: t('home.categoryFruit'),
      count: categoryCounts.fruit,
      color: '#FF7043',
    },
  ];

  const sortOptions = [
    { key: SORT_KEYS.EXPIRY_ASC, label: t('home.sortExpiryAsc') },
    { key: SORT_KEYS.EXPIRY_DESC, label: t('home.sortExpiryDesc') },
    { key: SORT_KEYS.NAME_ASC, label: t('home.sortNameAsc') },
    { key: SORT_KEYS.NAME_DESC, label: t('home.sortNameDesc') },
    { key: SORT_KEYS.QUANTITY_ASC, label: t('home.sortQuantityAsc') },
    { key: SORT_KEYS.QUANTITY_DESC, label: t('home.sortQuantityDesc') },
  ];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  }, [refetch]);

  // Loading state lần đầu
  if (loading && !items) {
    return (
      <ScreenBackground>
        <View style={{ paddingHorizontal: sp(20), gap: sp(10), marginTop: sp(8) }}>
          <Skeleton width="60%" height={sp(20)} style={{ marginBottom: sp(8) }} />
          <Skeleton width="40%" height={sp(13)} />
          <Skeleton
            width="100%"
            height={sp(42)}
            borderRadius={sp(12)}
            style={{ marginTop: sp(8), marginBottom: sp(8) }}
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={sp(72)} borderRadius={sp(14)} />
          ))}
        </View>
      </ScreenBackground>
    );
  }

  // Error state
  if (error && !items) {
    return (
      <ScreenBackground>
        <ErrorState onRetry={refetch} style={{ marginTop: sp(60) }} />
      </ScreenBackground>
    );
  }

  const hasFilters =
    search || statusFilter !== STATUS_KEYS.ALL || categoryFilter !== CATEGORY_KEYS.ALL;

  return (
    <ScreenBackground>
      {/* Bỏ FriggyAppBar + nút back: màn này là TAB GỐC (được MainTabs render),
          không phải màn được push nên `navigation.goBack()` không có ý nghĩa.
          AppBar cũ còn đảm nhiệm phần chừa chỗ status bar, nên giữ lại inset ở header. */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, sp(8)) + sp(4) }]}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Refrigerator
              color={isDark ? AppColors.primaryLight : AppColors.forestAccent}
              size={22}
            />
            <Text
              style={[styles.title, { color: isDark ? '#FFFFFF' : '#0D4314', fontSize: sp(22) }]}
              numberOfLines={1}
            >
              {fridge?.name || t('home.myFridge')}
            </Text>
          </View>
          <Text
            style={[
              styles.subtitle,
              {
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(13),
              },
            ]}
          >
            {t('home.fridgeStats', { total: stats.total, expiring: stats.expiring })}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate(Routes.ManualAddIngredient)}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: AppColors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Plus color="#FFFFFF" size={20} strokeWidth={2.5} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: sp(20), marginBottom: sp(12) }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('home.searchHint')} />
      </View>

      <FilterChips
        options={statusOptions}
        selectedKey={statusFilter}
        onSelect={setStatusFilter}
        style={{ marginBottom: sp(10) }}
      />

      <FilterChips
        options={categoryOptions}
        selectedKey={categoryFilter}
        onSelect={setCategoryFilter}
        style={{ marginBottom: sp(14) }}
      />

      <View style={styles.sortRow}>
        <Text
          style={[
            styles.resultText,
            {
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              fontSize: sp(12),
            },
          ]}
        >
          {items.length} {t('home.resultCount', { count: '' }).replace('{{count}} ', '')}
        </Text>
        <SortMenu options={sortOptions} selectedKey={sort} onSelect={setSort} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: 100 + insets.bottom }}
        ItemSeparatorComponent={() => <View style={{ height: sp(10) }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[AppColors.primary]}
            tintColor={isDark ? AppColors.primaryLight : AppColors.primary}
            progressBackgroundColor={isDark ? AppColors.darkCardBg : '#FFFFFF'}
          />
        }
        ListEmptyComponent={
          hasFilters ? (
            <EmptyState emoji="🔍" title={t('home.noResults')} hint={t('home.noResultsHint')} />
          ) : (
            <EmptyState
              emoji="🥬"
              title={t('home.noData')}
              hint={t('fridge.emptyFridge')}
              actionText={t('home.addNew')}
              onAction={() => navigation.navigate(Routes.ManualAddIngredient)}
            />
          )
        }
        renderItem={({ item }) => <FridgeItem item={item} />}
      />
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(20),
    paddingTop: sp(8),
    paddingBottom: sp(12),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginLeft: sp(8),
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginTop: sp(4),
    marginLeft: sp(30),
  },
  addBtn: {
    width: sp(42),
    height: sp(42),
    borderRadius: sp(21),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp(20),
    marginBottom: sp(12),
  },
  resultText: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
  },
});
