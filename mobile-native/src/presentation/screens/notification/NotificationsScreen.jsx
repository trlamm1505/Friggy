/**
 * NotificationsScreen
 *
 * Redesigned (Sprint 9):
 * - Group by date (Today / Yesterday / This week / Earlier) - dùng section header
 * - Stats bar trên: "5 unread / 23 total"
 * - Settings icon cho notification settings
 * - Mark all read nổi bật hơn
 * - NotificationItem đã có sẵn ở Sprint 4
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useNavigation } from '@react-navigation/native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { CheckCheck, Settings as SettingsIcon, BellOff } from 'lucide-react-native';
import { useNotifications } from '../../hooks/useServiceHooks';
import { useServices } from '../../../data/ServiceProvider';
import { NotificationItem } from '../../components/notification/NotificationItem';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterChips } from '../../components/common/FilterChips';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/common/Skeleton';
import { showSuccess } from '../../utils/helpers';

const FILTER_KEYS = {
  ALL: 'all',
  UNREAD: 'unread',
  EXPIRING: 'expiring',
  RECIPES: 'recipe',
  SYSTEM: 'system',
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
  const navigation = useNavigation();
  const services = useServices();
  const { data: items, loading, error, refetch } = useNotifications();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(FILTER_KEYS.ALL);

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
    if (!items) return { all: 0, unread: 0, expiring: 0, recipe: 0, system: 0 };
    return {
      all: items.length,
      unread: items.filter((it) => !it.read).length,
      expiring: items.filter((it) => it.type === 'expiring').length,
      recipe: items.filter((it) => it.type === 'recipe').length,
      system: items.filter((it) => it.type === 'system').length,
    };
  }, [items]);

  const markAllRead = useCallback(async () => {
    if (!items) return;
    try {
      await services.notificationService.markAllAsRead();
      refetch();
      showSuccess('Đã đánh dấu tất cả là đã đọc');
    } catch (_e) {
      // silent
    }
  }, [items, services, refetch]);

  const onNotificationPress = useCallback(
    async (item) => {
      if (!item.read) {
        try {
          await services.notificationService.markAsRead(item.id);
          refetch();
        } catch (_e) {
          // silent
        }
      }
    },
    [services, refetch]
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
  if (loading && !items) {
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

  if (error && !items) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
        <ErrorState onRetry={refetch} style={{ marginTop: sp(40) }} />
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
        renderItem={({ item }) => <NotificationItem item={item} onPress={onNotificationPress} />}
        ItemSeparatorComponent={() => <View style={{ height: sp(10) }} />}
        SectionSeparatorComponent={() => <View style={{ height: sp(4) }} />}
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
});
