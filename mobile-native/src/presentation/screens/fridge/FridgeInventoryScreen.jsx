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

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Refrigerator } from 'lucide-react-native';
import { FridgeItem } from '../../components/fridge/FridgeItem';
import { FridgeItemActions } from '../../components/fridge/FridgeItemActions';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterChips } from '../../components/common/FilterChips';
import { SortMenu } from '../../components/common/SortMenu';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/common/Skeleton';
import { ScreenBackground } from '../../components/common/ScreenBackground';
import { useFridgeItems } from '../../hooks/useServiceHooks';
import { sortFridgeItems } from '../../utils/fridgeItems';
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
  // Item đang mở sheet thao tác (sửa số lượng / dùng hết / xóa). null = đóng.
  const [actionsItem, setActionsItem] = useState(null);

  const openActions = useCallback((item) => setActionsItem(item), []);
  const closeActions = useCallback(() => setActionsItem(null), []);

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

  /**
   * Filter SERVER-SIDE — CỐ Ý ĐỂ TRỐNG.
   *
   * ⚠️ B1 — sửa lỗi "mỗi ký tự gõ = 1 request" + "count trên pill sai":
   *   Bản cũ truyền search + sort + status + compartment vào `useFridgeItems()`.
   *   Deps của hook là `JSON.stringify(filters)` -> BẤT KỲ thay đổi filter nào
   *   cũng đổi chuỗi deps -> gọi lại API. Debounce 300ms chỉ giảm tần suất,
   *   không triệt tiêu (vẫn 1 request mỗi 300ms khi gõ, và mỗi lần đổi sort
   *   cũng gọi API dù BE không có sort param).
   *
   *   Vấn đề lớn hơn: nếu `compartment` chạy server-side thì list trả về CHỈ
   *   chứa 1 ngăn -> đếm count trên các pill ngăn khác ra 0. Số trên pill mất
   *   hết ý nghĩa "còn bao nhiêu món ở ngăn này" (bấm "Ngăn đông" thì pill
   *   "Ngăn mát" nhảy về 0 dù tủ vẫn còn món ngăn mát).
   *
   *   Flutter production làm đúng như vậy: `_loadIngredients()` gọi
   *   `getFridgeItems()` 1 LẦN, rồi lọc storage + search client-side
   *   (fridge_inventory_screen.dart:59-99 và :669-677).
   *
   *   => Tải full list 1 lần, mọi filter lọc client-side trên list đã có.
   *      Đúng spec mục 5.1: "list đã nằm trong RAM, không gọi API mới".
   *      Pull-to-refresh vẫn gọi lại API -> dữ liệu luôn mới.
   */
  const serviceFilters = useMemo(() => ({}), []);

  const { data: items, loading, error, refetch } = useFridgeItems(serviceFilters);

  /**
   * Lọc + sắp xếp CLIENT-SIDE trên list đã tải.
   *
   * Thứ tự: status -> storage -> search -> sort. (Sắp xếp cuối cùng để sort
   * theo đúng tập kết quả đang hiển thị.)
   */
  const visibleItems = useMemo(() => {
    let list = items || [];

    // 1. Status — client-side. `expiring` KHÔNG gửi `expiringSoon` lên server vì
    //    BE `fridge.service.ts:findAll` BỎ QUA param đó -> client-side là cách
    //    duy nhất cho kết quả đúng.
    if (statusFilter !== STATUS_KEYS.ALL) {
      list = list.filter((it) => it.status === statusFilter);
    }

    // 2. Storage (`compartment` là tên UI của `storageLocation` của BE).
    if (storageFilter !== STORAGE_KEYS.ALL) {
      list = list.filter((it) => it.compartment === storageFilter);
    }

    // 3. Search — client-side, không gọi API mới.
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((it) => (it.name || '').toLowerCase().includes(q));
    }

    // 4. Sort — client-side (BE không có sort param).
    return sortFridgeItems(list, sort);
  }, [items, statusFilter, storageFilter, search, sort]);

  /**
   * Phạm vi dùng để ĐẾM count trên pill trạng thái.
   * = đã lọc storage + search, CHƯA lọc status.
   *
   * ⚠️ B1 — sửa lỗi count sai:
   *   Bản cũ đếm trên `items` đã qua bộ lọc của service (search + sort + status
   *   + storage) -> bấm pill "Sắp hết hạn" thì pill "Tươi" đổi thành 0 và
   *   ngược lại. Số trên pill lúc đó KHÔNG còn nghĩa là "còn bao nhiêu món ở
   *   trạng thái này" mà là "còn bao nhiêu món sau khi lọc" -> vô nghĩa.
   *   Giờ: mỗi nhóm pill đếm trong phạm vi của chính nó (cross-filtering).
   */
  const itemsInStorageScope = useMemo(() => {
    let list = items || [];
    if (storageFilter !== STORAGE_KEYS.ALL) {
      list = list.filter((it) => it.compartment === storageFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((it) => (it.name || '').toLowerCase().includes(q));
    }
    return list;
  }, [items, storageFilter, search]);

  /**
   * Phạm vi dùng để ĐẾM count trên pill ngăn lưu trữ.
   * = đã lọc status + search, CHƯA lọc storage.
   */
  const itemsInStatusScope = useMemo(() => {
    let list = items || [];
    if (statusFilter !== STATUS_KEYS.ALL) {
      list = list.filter((it) => it.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((it) => (it.name || '').toLowerCase().includes(q));
    }
    return list;
  }, [items, statusFilter, search]);

  // Stats — tổng quan của tủ (không phụ thuộc bộ lọc đang bật).
  const stats = useMemo(() => {
    if (!items) return { total: 0, expiring: 0, fresh: 0 };
    return {
      total: items.length,
      expiring: items.filter((it) => it.status === 'expiring').length,
      fresh: items.filter((it) => it.status === 'fresh').length,
    };
  }, [items]);

  // Storage counts — đếm trong `itemsInStatusScope` (đã lọc status + search).
  // Dùng `compartment` (BE trả) thay vì `category` (BE không trả) -> số luôn thật.
  const storageCounts = useMemo(() => {
    if (!itemsInStatusScope) return { all: 0, fridge: 0, freezer: 0, pantry: 0 };
    return {
      all: itemsInStatusScope.length,
      fridge: itemsInStatusScope.filter((it) => it.compartment === 'fridge').length,
      freezer: itemsInStatusScope.filter((it) => it.compartment === 'freezer').length,
      pantry: itemsInStatusScope.filter((it) => it.compartment === 'pantry').length,
    };
  }, [itemsInStatusScope]);

  // Status counts — đếm trong `itemsInStorageScope` (đã lọc storage + search).
  const statusCounts = useMemo(() => {
    if (!itemsInStorageScope) return { all: 0, fresh: 0, expiring: 0 };
    return {
      all: itemsInStorageScope.length,
      fresh: itemsInStorageScope.filter((it) => it.status === 'fresh').length,
      expiring: itemsInStorageScope.filter((it) => it.status === 'expiring').length,
    };
  }, [itemsInStorageScope]);

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

  // Refetch mỗi lần màn được focus lại (trừ lần đầu).
  //
  // `native-stack` GIỮ screen mounted sau khi push -> `useFridgeItems` không tự
  // chạy lại (deps không đổi) -> sau khi thêm nguyên liệu ở
  // `ManualAddIngredientScreen`, quay lại màn này vẫn thấy list CŨ.
  //
  // Flutter xử lý bằng `Navigator.pop(context, true)` rồi màn trước đọc kết quả
  // để reload (manual_add_ingredient_screen.dart:644). Ở RN không có "kết quả
  // trả về" theo cách đó, nên chuẩn là `useFocusEffect`.
  //
  // Lần focus ĐẦU bỏ qua: `useAsyncData` đã gọi fetch lúc mount, gọi thêm ở đây
  // là 1 request thừa. `isFirstFocus` là ref nên không cần nằm trong deps.
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return undefined;
      }
      refetch();
      return undefined;
    }, [refetch])
  );

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
          {visibleItems.length} {t('home.resultCount', { count: '' }).replace('{{count}} ', '')}
        </Text>
        <SortMenu options={sortOptions} selectedKey={sort} onSelect={setSort} />
      </View>

      <FlatList
        data={visibleItems}
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
