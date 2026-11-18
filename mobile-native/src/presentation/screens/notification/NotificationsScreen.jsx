/**
 * NotificationsScreen
 *
 * Redesigned (Sprint 9):
 * - Group by date (Today / Yesterday / This week / Earlier) - dùng section header
 * - Stats bar trên: "5 unread / 23 total"
 * - Settings icon cho notification settings
 * - Mark all read nổi bật hơn
 * - NotificationItem đã có sẵn ở Sprint 4
 *
 * ⚠️ ĐỒNG BỘ VỚI BE:
 *   BE có `GET /notifications` (phân trang), `PATCH /notifications/:id/read`,
 *   `PATCH /notifications/read-all`, `DELETE /notifications/:id`.
 *   Màn này dùng đủ 4 endpoint:
 *     - phân trang  -> `getNotificationsPage({ page })`
 *     - đánh dấu đọc -> `markAsRead(id)`
 *     - đánh dấu đọc hết -> `markAllAsRead()`
 *     - xoá -> `deleteNotification(id)`
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { CheckCheck, Settings as SettingsIcon, BellOff } from 'lucide-react-native';
import { useServices } from '../../../data/ServiceProvider';
import { NotificationItem } from '../../components/notification/NotificationItem';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterChips } from '../../components/common/FilterChips';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/common/Skeleton';
import { showSuccess, showError } from '../../utils/helpers';
import { Routes } from '../../../shared/constants/routes';
import { SCREEN_ROUTE_MAP } from '../../../shared/constants/pushRoutes';

const FILTER_KEYS = {
  ALL: 'all',
  UNREAD: 'unread',
  EXPIRING: 'expiring',
  RECIPES: 'recipe',
  SYSTEM: 'system',
};

/** Số item BE trả về 1 trang (khớp `DEFAULT_LIMIT` của RealNotificationService). */
const PAGE_SIZE = 20;

/**
 * Map loại thông báo BE -> route đích khi user bấm vào.
 *
 * ⚠️ BE `NotificationType` có 17 giá trị (xem `prisma/schema.prisma`).
 *   `PushNotificationManager.SCREEN_ROUTE_MAP` map theo `data.screen` của
 *   payload PUSH. Ở đây map theo `type` của thông báo TRONG DB (đọc từ
 *   danh sách) -> bổ sung những route mà danh sách có thể mở tới.
 */
const TYPE_ROUTE_MAP = {
  expiry_warning: Routes.FridgeInventory,
  plan_ready: Routes.RecipeSuggestions,
  subscription_reminder: Routes.PackageManagement,
};

/**
 * Lấy route đích từ 1 thông báo.
 *
 * @param {object} item
 * @returns {string|null} route hợp lệ hoặc null
 */
export const resolveItemRoute = (item) => {
  if (!item) return null;

  // Ưu tiên route BE gửi kèm trong `metadata` (nếu có).
  const screen = item?.metadata?.screen ?? item?.metadata?.targetScreen;
  if (screen) {
    // Dùng lại map của PushNotificationManager để 1 nguồn sự thật.
    const mapped = SCREEN_ROUTE_MAP[screen];
    if (mapped) return mapped;
  }

  const rawType = item?.rawType ?? item?.type;
  return TYPE_ROUTE_MAP[rawType] ?? null;
};

// Group by date helper
const groupByDate = (items) => {
  if (!items) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  };

  for (const item of items) {
    const itemDate = new Date(item.createdAt || item.time || Date.now());
    itemDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) groups.today.push(item);
    else if (diffDays === 1) groups.yesterday.push(item);
    else if (diffDays <= 7) groups.thisWeek.push(item);
    else groups.earlier.push(item);
  }

  const result = [];
  if (groups.today.length) result.push({ title: 'Hôm nay', data: groups.today });
  if (groups.yesterday.length) result.push({ title: 'Hôm qua', data: groups.yesterday });
  if (groups.thisWeek.length) result.push({ title: 'Tuần này', data: groups.thisWeek });
  if (groups.earlier.length) result.push({ title: 'Trước đó', data: groups.earlier });
  return result;
};

export const NotificationsScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const services = useServices();

  /**
   * Danh sách thông báo.
   *
   * ⚠️ Dùng `getNotificationsPage` (BE `GET /notifications?page=&limit=`) thay vì
   *   `useNotifications` để có PHÂN TRANG + `unreadCount` chính xác từ BE
   *   (thay vì đếm tay từ items đã tải -> thiếu ở trang sau).
   */
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(FILTER_KEYS.ALL);

  /**
   * Tải trang thông báo.
   *
   * @param {number} targetPage - trang cần tải
   * @param {boolean} [append] - true -> nối vào danh sách hiện tại (load more)
   */
  const loadPage = useCallback(
    async (targetPage, append = false) => {
      try {
        if (!append) setError(null);

        const result = await services.notificationService.getNotificationsPage({
          page: targetPage,
          limit: PAGE_SIZE,
        });

        const list = Array.isArray(result?.data) ? result.data : [];

        setItems((prev) => (append ? [...prev, ...list] : list));
        setPage(result?.page ?? targetPage);
        setTotalPages(result?.totalPages ?? 1);
        setUnreadCount(result?.unreadCount ?? 0);
      } catch (e) {
        if (!append) setError(e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [services]
  );

  // Tải trang đầu khi mount.
  useEffect(() => {
    // `loadPage` là async -> setState chỉ chạy SAU `await` -> không setState
    // đồng bộ trong thân effect (rule `react-hooks/set-state-in-effect`).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPage(1);
  }, [loadPage]);

  /**
   * Pull-to-refresh -> tải lại trang đầu, bỏ các trang cũ.
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPage(1);
  }, [loadPage]);

  /**
   * Load more -> tải trang kế tiếp khi cuộn tới cuối.
   *
   * ⚠️ Chặn gọi trùng: `loadingMore` + so sánh `page >= totalPages`.
   */
  const onEndReached = useCallback(() => {
    if (loadingMore || loading) return;
    if (page >= totalPages) return;

    setLoadingMore(true);
    loadPage(page + 1, true);
  }, [loadingMore, loading, page, totalPages, loadPage]);

  // Filter + search
  const filteredItems = useMemo(() => {
    if (!items) return [];
    let result = items;
    if (filter === FILTER_KEYS.UNREAD) result = result.filter((it) => !it.read);
    else if (filter !== FILTER_KEYS.ALL) result = result.filter((it) => it.type === filter);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (it) =>
          (it.title || '').toLowerCase().includes(q) || (it.message || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, filter, search]);

  // Group by date
  const sections = useMemo(() => groupByDate(filteredItems), [filteredItems]);

  // Counts
  const counts = useMemo(() => {
    const list = items ?? [];
    return {
      all: list.length,
      // `unreadCount` từ BE là con số CHÍNH XÁC (toàn bộ thông báo chưa
      // đọc, không phải chỉ trang đang tải) -> dùng số này cho badge.
      unread: unreadCount || list.filter((it) => !it.read).length,
      expiring: list.filter((it) => it.type === 'expiring').length,
      recipe: list.filter((it) => it.type === 'recipe').length,
      system: list.filter((it) => it.type === 'system').length,
    };
  }, [items, unreadCount]);

  const markAllRead = useCallback(async () => {
    if (!items?.length) return;
    try {
      await services.notificationService.markAllAsRead();
      // Update cục bộ ngay (không chờ refetch) -> UI phản hồi tức thì.
      setItems((prev) => prev.map((it) => ({ ...it, read: true, isRead: true })));
      setUnreadCount(0);
      showSuccess('Đã đánh dấu tất cả là đã đọc');
    } catch (_e) {
      showError('Không thể đánh dấu tất cả là đã đọc');
    }
  }, [items, services]);

  /**
   * Xoá 1 thông báo (`DELETE /notifications/:id` — BE soft-delete).
   */
  const deleteItem = useCallback(
    (item) => {
      if (!item?.id) return;

      Alert.alert(
        'Xoá thông báo',
        'Bạn có chắc muốn xoá thông báo này?',
        [
          { text: 'Huỷ', style: 'cancel' },
          {
            text: 'Xoá',
            style: 'destructive',
            onPress: async () => {
              // Optimistic: xoá khỏi list ngay, rollback nếu API lỗi.
              const snapshot = items;
              setItems((prev) => prev.filter((it) => it.id !== item.id));

              try {
                await services.notificationService.deleteNotification(item.id);
                if (!item.read) {
                  setUnreadCount((c) => Math.max(0, c - 1));
                }
              } catch (_e) {
                setItems(snapshot);
                showError('Không thể xoá thông báo');
              }
            },
          },
        ]
      );
    },
    [items, services]
  );

  /**
   * Bấm vào 1 thông báo:
   *   1. Đánh dấu đã đọc (`PATCH /notifications/:id/read`) nếu chưa đọc.
   *   2. Điều hướng tới màn liên quan (nếu có route).
   */
  const onNotificationPress = useCallback(
    async (item) => {
      if (!item?.read) {
        // Optimistic -> badge cập nhật tức thì.
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, read: true, isRead: true } : it))
        );
        setUnreadCount((c) => Math.max(0, c - 1));

        try {
          await services.notificationService.markAsRead(item.id);
        } catch (_e) {
          // Rollback trạng thái đọc.
          setItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, read: false, isRead: false } : it))
          );
          setUnreadCount((c) => c + 1);
        }
      }

      const route = resolveItemRoute(item);
      if (route) {
        navigation.navigate(route);
      }
    },
    [services, navigation]
  );

  const filterOptions = [
    { key: FILTER_KEYS.ALL, label: 'Tất cả', count: counts.all },
    { key: FILTER_KEYS.UNREAD, label: 'Chưa đọc', count: counts.unread, color: '#FF9800' },
    { key: FILTER_KEYS.EXPIRING, label: 'Hết hạn', count: counts.expiring, color: '#FF9800' },
    {
      key: FILTER_KEYS.RECIPES,
      label: 'Công thức',
      count: counts.recipe,
      color: AppColors.primary,
    },
    { key: FILTER_KEYS.SYSTEM, label: 'Hệ thống', count: counts.system, color: '#2196F3' },
  ];

  // Loading
  //
  // ⚠️ B8: `useNotifications` dùng `initialValue = []` -> `!items` LUÔN false
  // (mảng rỗng là truthy) -> nhánh skeleton/error KHÔNG BAO GIỜ chạy.
  // Điều kiện đúng phải là "chưa có phần tử nào": `!items?.length`.
  if (loading && !items?.length) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
        <View style={{ padding: sp(20), gap: sp(10) }}>
          <Skeleton width="100%" height={sp(60)} borderRadius={sp(12)} />
          <Skeleton width="100%" height={sp(42)} borderRadius={sp(12)} />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={sp(80)} borderRadius={sp(14)} />
          ))}
        </View>
      </View>
    );
  }

  if (error && !items?.length) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
        <ErrorState
          message={t('offline.readFailed')}
          onRetry={() => loadPage(1)}
          style={{ marginTop: sp(40) }}
        />
      </View>
    );
  }

  const hasUnread = counts.unread > 0;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />

      {/* Header with stats + settings */}
      <View style={styles.headerBlock}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.title,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(22) },
            ]}
          >
            Thông báo
          </Text>
          {hasUnread ? (
            <View style={styles.statsRow}>
              <View style={[styles.unreadBadge, { backgroundColor: AppColors.primary }]}>
                <Text style={styles.unreadBadgeText}>{counts.unread}</Text>
              </View>
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    fontSize: sp(12),
                  },
                ]}
              >
                chưa đọc
              </Text>
              <Text
                style={[
                  styles.dot,
                  { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
                ]}
              >
                ·
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    fontSize: sp(12),
                  },
                ]}
              >
                {counts.all} tổng
              </Text>
            </View>
          ) : null}
        </View>
        <Pressable
          onPress={() => navigation.navigate('AppSettings')}
          hitSlop={6}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              backgroundColor: isDark ? '#19271E' : '#E8F5E9',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <SettingsIcon color={isDark ? AppColors.primaryLight : AppColors.primary} size={18} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: sp(20), marginBottom: sp(10) }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm thông báo..." />
      </View>

      <FilterChips
        options={filterOptions}
        selectedKey={filter}
        onSelect={setFilter}
        style={{ marginBottom: sp(12) }}
      />

      {hasUnread ? (
        <Pressable
          onPress={markAllRead}
          style={({ pressed }) => [
            styles.markAllBar,
            {
              backgroundColor: isDark ? '#19271E' : AppColors.accentGreen,
              borderColor: isDark ? '#2E4D36' : '#A5E69C',
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <CheckCheck color={isDark ? AppColors.primaryLight : AppColors.primary} size={16} />
          <Text
            style={[
              styles.markAllText,
              { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(13) },
            ]}
          >
            Đánh dấu tất cả là đã đọc
          </Text>
        </Pressable>
      ) : null}

      {/* SectionList grouped by date */}
      <SectionList
        sections={sections}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: sp(24) }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  fontSize: sp(11),
                },
              ]}
            >
              {section.title.toUpperCase()}
            </Text>
            <Text
              style={[
                styles.sectionCount,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.hintText,
                  fontSize: sp(11),
                },
              ]}
            >
              {section.data.length}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <NotificationItem
            item={item}
            onPress={onNotificationPress}
            onLongPress={deleteItem}
            onDelete={deleteItem}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: sp(10) }} />}
        SectionSeparatorComponent={() => <View style={{ height: sp(4) }} />}
        // ── Pull-to-refresh ──────────────────────────────────────────
        // Kéo xuống để đồng bộ lại danh sách từ BE (thông báo mới có thể
        // đã tới từ cron job trong lúc user đang ở màn khác).
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? AppColors.primaryLight : AppColors.primary}
            colors={[isDark ? AppColors.primaryLight : AppColors.primary]}
          />
        }
        // ── Load more ─────────────────────────────────────────────────
        // BE phân trang (`totalPages`). Khi cuộn gần cuối -> tải trang kế.
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: sp(16) }}>
              <Skeleton width="100%" height={sp(50)} borderRadius={sp(12)} />
            </View>
          ) : page < totalPages && items.length > 0 ? (
            <Pressable onPress={onEndReached} style={styles.loadMoreBtn}>
              <Text style={styles.loadMoreText}>Tải thêm</Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          search || filter !== FILTER_KEYS.ALL ? (
            <EmptyState
              emoji="🔍"
              title="Không có kết quả"
              hint="Thử thay đổi bộ lọc hoặc từ khóa"
            />
          ) : (
            <View style={{ marginTop: 40 }}>
              <EmptyState
                icon={BellOff}
                emoji="🔔"
                title="Không có thông báo"
                hint="Bạn sẽ thấy thông báo về hạn sử dụng và công thức ở đây"
              />
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp(20),
    paddingTop: sp(8),
    paddingBottom: sp(12),
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  unreadBadge: {
    minWidth: sp(22),
    height: sp(20),
    borderRadius: sp(10),
    paddingHorizontal: sp(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: 11,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginLeft: 4,
  },
  dot: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginHorizontal: 2,
  },
  iconBtn: {
    width: sp(36),
    height: sp(36),
    borderRadius: sp(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: sp(20),
    marginBottom: sp(12),
    paddingVertical: sp(10),
    borderRadius: sp(12),
    borderWidth: 1,
    gap: 6,
  },
  markAllText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginLeft: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: sp(12),
    paddingBottom: sp(8),
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  loadMoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sp(14),
    marginTop: sp(8),
  },
  loadMoreText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    color: AppColors.primary,
    fontSize: sp(13),
  },
});
