/**
 * FridgeInventoryScreen
 *
 * Redesigned (Sprint 5):
 * - Dùng useFridgeItems với search/sort/filter qua service layer
 * - Search bar live
 * - Filter chips: All / Fresh / Expiring + 4 pill storage (Ngăn mát/đông/khô/tất cả)
 * - Sort menu: Expiry / Name / Quantity / Category
 * - FridgeItem component (đã làm ở Sprint 4)
 * - Pull-to-refresh
 * - Loading / empty / error states
 * - Compact stats header
 *
 * NGUỒN SỰ THẬT (mục 5.1 + 5.2 của DEV_B_ONBOARDING_PROMPT.md):
 * 1. BỎ hàng chip category (rau/thịt/sữa/trái cây), thay bằng 4 pill storage.
 *    ✅ ĐÃ CHỐT 23/10 (prompt mục 5.2) — không phải quyết định tại thời điểm code.
 *    Lý do: BE không trả `category` theo item, mọi item có `category === undefined`
 *    -> pill luôn hiện 0 và bấm vào lọc ra list rỗng. Xem
 *    RealFridgeService.js mục "BA SAI LẦM ĐÃ BIẾT" số 2.
 *    Thay bằng 4 pill storage vì `storageLocation` là filter SERVER-SIDE thật sự
 *    (ListFridgeQueryDto nhận `storageLocation`, ingredients.service.ts:34).
 * 2. Search DEBOUNCE 300ms (prompt mục 5.1) — trước đó mỗi ký tự gọi lại
 *    `useFridgeItems` (deps = JSON.stringify(filters)) -> 1 request/ke, dễ giật
 *    và tốn băng thông. List đã nằm trong RAM nên không gọi API mới.
 * 3. `compartment` (tên UI) -> `storageLocation` (tên BE) do _buildListQuery dịch.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { COMPARTMENT_LABEL } from '../../../data/services/real/RealFridgeService';
import { Routes } from '../../../shared/constants/routes';

const STATUS_KEYS = {
  ALL: 'all',
  FRESH: 'fresh',
  EXPIRING: 'expiring',
};

// 4 pill storage — thay cho 5 chip category cũ.
// Key trùng `storageLocation` của BE (fridge|freezer|pantry). Mục 0 BƯỚC 3:
// ưu tiên nội dung BE đã trả, dịch nhãn theo cách Flutter hiển thị
// (Mobile/lib/screens/fridge_inventory_screen.dart:990-993).
// Nhãn lấy từ COMPARTMENT_LABEL trong RealFridgeService để 1 nguồn duy nhất.
const STORAGE_KEYS = {
  ALL: 'all',
  FRIDGE: 'fridge',
  FREEZER: 'freezer',
  PANTRY: 'pantry',
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

  // `searchInput` = ký tự người dùng vừa gõ (cập nhật tức thì cho SearchBar).
  // `debouncedSearch` = giá trị ĐÃ debounce, đưa vào serviceFilters.
  // Không gộp 1 biến sẽ khiến mỗi ký tự gọi lại API (deps = JSON.stringify(filters)).
  //
  // Xoá hết từ khoá KHÔNG setState trong effect (react-hooks/set-state-in-effect):
  // thay bằng derived value `search` bên dưới -> rỗng ngay, không cần render lại.
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUS_KEYS.ALL);
  const [storageFilter, setStorageFilter] = useState(STORAGE_KEYS.ALL);
  const [sort, setSort] = useState(SORT_KEYS.EXPIRY_ASC);
  const [refreshing, setRefreshing] = useState(false);

  // Debounce 300ms cho search. setState nằm trong callback của timer (không phải
  // thân effect) nên không vi phạm quy tắc cascading render.
  // Timer clear ở cleanup -> không setState sau khi unmount.
  useEffect(() => {
    const q = searchInput.trim();
    if (!q) return undefined;
    const timer = setTimeout(() => setDebouncedSearch(q), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Ô search rỗng -> không lọc, KHÔNG chờ debounce (UI phản hồi tức thì).
  const search = searchInput.trim() ? debouncedSearch : '';

  // Build service filters
  const serviceFilters = useMemo(() => {
    const f = {};
    if (search) f.search = search;
    if (statusFilter !== STATUS_KEYS.ALL) f.status = statusFilter;
    // `compartment` là tên UI; _buildListQuery dịch sang `storageLocation` của BE.
    if (storageFilter !== STORAGE_KEYS.ALL) f.compartment = storageFilter;
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
  }, [search, statusFilter, storageFilter, sort]);

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

  // Storage counts — đếm trên `items` ĐANG hiển thị (đã lọc status nhưng chưa lọc storage).
  // Cùng cách đếm cũ với category, nhưng dùng `compartment` (BE trả) thay vì
  // `category` (BE không trả) -> số luôn thật.
  const storageCounts = useMemo(() => {
    if (!items) return { all: 0, fridge: 0, freezer: 0, pantry: 0 };
    return {
      all: items.length,
      fridge: items.filter((it) => it.compartment === 'fridge').length,
      freezer: items.filter((it) => it.compartment === 'freezer').length,
      pantry: items.filter((it) => it.compartment === 'pantry').length,
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

  // 4 pill storage. Nhãn lấy từ COMPARTMENT_LABEL (nguồn duy nhất, khớp mapper ở
  // RealFridgeService) — không hardcode lần 2 để tránh lệch nhãn.
  // Nhãn "Tất cả" lấy `home.categoryAll` ("Tất cả"), KHÔNG dùng
  // `home.allCategory` ("Tất cả danh mục") — từ "danh mục" sai vì pill này
  // lọc theo ngăn lưu trữ, không theo danh mục nguyên liệu.
  const storageOptions = [
    { key: STORAGE_KEYS.ALL, label: t('home.categoryAll'), count: storageCounts.all },
    {
      key: STORAGE_KEYS.FRIDGE,
      label: COMPARTMENT_LABEL.fridge,
      count: storageCounts.fridge,
      color: '#4CAF50',
    },
    {
      key: STORAGE_KEYS.FREEZER,
      label: COMPARTMENT_LABEL.freezer,
      count: storageCounts.freezer,
      color: '#29B6F6',
    },
    {
      key: STORAGE_KEYS.PANTRY,
      label: COMPARTMENT_LABEL.pantry,
      count: storageCounts.pantry,
      color: '#FFB300',
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
    !!search || statusFilter !== STATUS_KEYS.ALL || storageFilter !== STORAGE_KEYS.ALL;

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
        <SearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder={t('home.searchHint')}
        />
      </View>

      <FilterChips
        options={statusOptions}
        selectedKey={statusFilter}
        onSelect={setStatusFilter}
        style={{ marginBottom: sp(10) }}
      />

      <FilterChips
        options={storageOptions}
        selectedKey={storageFilter}
        onSelect={setStorageFilter}
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
