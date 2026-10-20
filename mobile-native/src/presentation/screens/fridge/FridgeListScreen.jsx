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

const getDaysToExpiry = (expiryDate) => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
};

const sortItems = (items, sortKey, sortOptions) => {
  return [...items].sort((a, b) => {
    switch (sortKey) {
      case sortOptions.EXPIRY_ASC:
        return new Date(a.expiryDate) - new Date(b.expiryDate);
      case sortOptions.EXPIRY_DESC:
        return new Date(b.expiryDate) - new Date(a.expiryDate);
      case sortOptions.NAME_ASC:
        return a.name.localeCompare(b.name);
      case sortOptions.NAME_DESC:
        return b.name.localeCompare(a.name);
      case sortOptions.URGENT_FIRST: {
        const aDays = getDaysToExpiry(a.expiryDate);
        const bDays = getDaysToExpiry(b.expiryDate);
        if (aDays < 0 && bDays >= 0) return -1;
        if (aDays >= 0 && bDays < 0) return 1;
        return aDays - bDays;
      }
      default:
        return 0;
    }
  });
};

export const FridgeListScreen = ({
  config,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { data: items, loading, error, refetch } = useFridgeItems();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(config.statusFilterDefault || 'all');
  const [categoryFilter, setCategoryFilter] = useState(config.categoryFilterDefault || 'all');
  const [sort, setSort] = useState(config.defaultSort);

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

  // Bước 3: Filter theo category
  const categoryFiltered = useMemo(() => {
    if (categoryFilter === 'all') return statusFiltered;
    return statusFiltered.filter((it) => it.category === categoryFilter);
  }, [statusFiltered, categoryFilter]);

  // Bước 4: Search
  const searched = useMemo(() => {
    if (!search.trim()) return categoryFiltered;
    const q = search.toLowerCase().trim();
    return categoryFiltered.filter((it) => it.name.toLowerCase().includes(q));
  }, [categoryFiltered, search]);

  // Bước 5: Sort
  const filteredItems = useMemo(
    () => sortItems(searched, sort, config.sortOptions),
    [searched, sort, config.sortOptions],
  );

  // Counts
  const counts = useMemo(() => {
    const c = { all: baseItems.length };
    config.statusChips.forEach((chip) => {
      c[chip.key] = baseItems.filter((it) => config.statusFilterFn(it, chip.key)).length;
    });
    if (config.categoryChips) {
      config.categoryChips.forEach((chip) => {
        if (chip.key === 'all') return;
        c[chip.key] = baseItems.filter((it) => it.category === chip.key).length;
      });
    }
    return c;
  }, [baseItems, config]);

  const statusChips = useMemo(
    () =>
      config.statusChips.map((chip) => ({
        ...chip,
        label: t(chip.labelKey, { defaultValue: chip.labelKey }),
        count: counts[chip.key] || 0,
      })),
    [config.statusChips, counts, t],
  );

  const categoryChips = useMemo(
    () =>
      config.categoryChips
        ? config.categoryChips.map((chip) => ({
            ...chip,
            label: t(chip.labelKey, { defaultValue: chip.labelKey }),
            count: counts[chip.key] || 0,
          }))
        : null,
    [config.categoryChips, counts, t],
  );

  const sortOptions = useMemo(
    () =>
      config.sortOptionsArray.map((opt) => ({
        key: opt.key,
        label: t(opt.labelKey, { defaultValue: opt.labelKey }),
      })),
    [config.sortOptionsArray, t],
  );

  const currentSortLabel = useMemo(
    () => sortOptions.find((o) => o.key === sort)?.label || '',
    [sortOptions, sort],
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
          <Skeleton width="100%" height={sp(42)} borderRadius={sp(12)} style={{ marginBottom: sp(8) }} />
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

  const hasFilters = !!search || statusFilter !== 'all' || (categoryFilter !== 'all' && categoryChips);

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
              { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(13) },
            ]}
          >
            {filteredItems.length > 0
              ? t('home.resultCount', { count: filteredItems.length })
              : t('home.resultCountEmpty')}
          </Text>
        </View>
        {config.sortOptionsArray ? (
          <SortMenu
            current={sort}
            options={sortOptions}
            onSelect={setSort}
            label={currentSortLabel}
          />
        ) : null}
      </View>

      <View style={{ paddingHorizontal: sp(20), marginBottom: sp(12) }}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('home.searchHint')}
        />
      </View>

      <FilterChips
        options={statusChips}
        selectedKey={statusFilter}
        onSelect={setStatusFilter}
        style={{ marginBottom: sp(8) }}
      />

      {categoryChips ? (
        <FilterChips
          options={categoryChips}
          selectedKey={categoryFilter}
          onSelect={setCategoryFilter}
          style={{ marginBottom: sp(12) }}
        />
      ) : (
        <View style={{ height: sp(4) }} />
      )}

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
            <EmptyState
              emoji="🔍"
              title={t('home.noResults')}
              hint={t('home.noResultsHint')}
            />
          ) : null
        }
        renderItem={({ item }) => <FridgeItem item={item} />}
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
