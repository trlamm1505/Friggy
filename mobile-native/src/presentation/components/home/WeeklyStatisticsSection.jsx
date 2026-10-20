/**
 * WeeklyStatisticsSection
 *
 * Redesigned (Sprint 2):
 * - Data từ useWeeklyStats() thay vì mock JSON trực tiếp
 * - 3 StatCard ở top: total / best day / avg per day
 * - BarChart thay cho custom bar cũ
 * - GrowthBadge cho biết so với tuần trước
 * - Loading state với Skeleton
 * - Error state với retry
 * - Empty state nếu total = 0
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { TrendingUp, Lightbulb, ShoppingCart, ChevronRight, Calendar, Flame, BarChart3 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useWeeklyStats } from '../../hooks/useServiceHooks';
import { BarChart } from '../charts/BarChart';
import { StatCard } from '../common/StatCard';
import { GrowthBadge } from '../common/GrowthBadge';
import { Skeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';

export const WeeklyStatisticsSection = ({
  onDetailTap,
  onMealSuggestionsTap,
  onShoppingReminderTap,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { data: stats, loading, error, refetch } = useWeeklyStats();

  const computed = useMemo(() => {
    if (!stats || !stats.data || stats.data.length === 0) {
      return null;
    }
    const maxValue = Math.max(...stats.data.map((d) => d.count), 0);
    const avg = stats.total / stats.data.length;
    const bestEntry = stats.data.reduce(
      (best, cur) => (cur.count > best.count ? cur : best),
      { count: 0, day: '—' },
    );
    const growth =
      stats.previousWeek > 0
        ? Math.round(((stats.total - stats.previousWeek) / stats.previousWeek) * 100)
        : stats.total > 0
        ? 100
        : 0;
    return { maxValue, avg: Math.round(avg * 10) / 10, bestEntry, growth };
  }, [stats]);

  // Loading state
  if (loading) {
    return (
      <View style={[styles.wrap, themedWrap(isDark)]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Skeleton width="60%" height={sp(18)} />
            <Skeleton width="40%" height={sp(12)} style={{ marginTop: sp(8) }} />
          </View>
        </View>
        <View style={[styles.statRow, { marginVertical: sp(16) }]}>
          <Skeleton width="32%" height={sp(72)} borderRadius={sp(14)} />
          <Skeleton width="32%" height={sp(72)} borderRadius={sp(14)} />
          <Skeleton width="32%" height={sp(72)} borderRadius={sp(14)} />
        </View>
        <Skeleton width="100%" height={sp(120)} borderRadius={sp(12)} />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.wrap, themedWrap(isDark)]}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <BarChart3
              color={isDark ? AppColors.primaryLight : AppColors.forestAccent}
              size={20}
            />
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, marginLeft: sp(8) },
              ]}
            >
              {t('home.weeklyStats')}
            </Text>
          </View>
        </View>
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  // Empty state (no data)
  if (!computed || stats.total === 0) {
    return (
      <View style={[styles.wrap, themedWrap(isDark)]}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <BarChart3
              color={isDark ? AppColors.primaryLight : AppColors.forestAccent}
              size={20}
            />
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, marginLeft: sp(8) },
              ]}
            >
              {t('home.weeklyStats')}
            </Text>
          </View>
        </View>
        <EmptyState
          emoji="📊"
          title={t('home.noData')}
          hint={t('home.tipUseExpired')}
        />
      </View>
    );
  }

  const chartData = stats.data.map((d) => ({ label: d.day, value: d.count }));

  return (
    <View style={[styles.wrap, themedWrap(isDark)]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <BarChart3
              color={isDark ? AppColors.primaryLight : AppColors.forestAccent}
              size={20}
            />
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, marginLeft: sp(8) },
              ]}
            >
              {t('home.weeklyStats')}
            </Text>
          </View>
          <Text
            style={[
              styles.subtitle,
              { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
            ]}
          >
            {t('home.statsSubtitle')}
          </Text>
        </View>
        <GrowthBadge value={computed.growth} suffix="%" size="large" />
      </View>

      {/* 3 stat cards */}
      <View style={styles.statRow}>
        <StatCard
          layout="column"
          icon={Flame}
          value={stats.total}
          label={t('home.ingredientsCount')}
          sublabel={t('home.thisWeek')}
        />
        <StatCard
          layout="column"
          icon={Calendar}
          value={computed.bestEntry.count}
          label={computed.bestEntry.day}
          sublabel={t('home.bestDay')}
        />
        <StatCard
          layout="column"
          icon={TrendingUp}
          value={computed.avg}
          label={t('home.averagePerDay')}
        />
      </View>

      {/* Chart */}
      <View style={styles.chartWrap}>
        <BarChart data={chartData} highlightLast />
      </View>

      {/* Action rows */}
      <Pressable
        onPress={onMealSuggestionsTap}
        style={[styles.actionRow, { borderTopColor: isDark ? '#2E4D36' : '#E3E8E4' }]}
      >
        <View
          style={[
            styles.actionIcon,
            { backgroundColor: isDark ? '#233629' : '#E8F5E9' },
          ]}
        >
          <Lightbulb
            color={isDark ? AppColors.primaryLight : AppColors.forestAccent}
            size={18}
          />
        </View>
        <Text
          style={[
            styles.actionText,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary },
          ]}
        >
          {t('home.mealSuggestions')}
        </Text>
        <ChevronRight
          color={isDark ? AppColors.darkTextSecondary : AppColors.hintText}
          size={18}
        />
      </Pressable>

      <Pressable
        onPress={onShoppingReminderTap}
        style={[styles.actionRow, { borderTopColor: isDark ? '#2E4D36' : '#E3E8E4' }]}
      >
        <View
          style={[
            styles.actionIcon,
            { backgroundColor: isDark ? '#233629' : '#E8F5E9' },
          ]}
        >
          <ShoppingCart
            color={isDark ? AppColors.primaryLight : AppColors.forestAccent}
            size={18}
          />
        </View>
        <Text
          style={[
            styles.actionText,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary },
          ]}
        >
          {t('home.shoppingReminder')}
        </Text>
        <ChevronRight
          color={isDark ? AppColors.darkTextSecondary : AppColors.hintText}
          size={18}
        />
      </Pressable>

      <Pressable
        onPress={onDetailTap}
        style={[styles.detailBtn, { borderTopColor: isDark ? '#2E4D36' : '#E3E8E4' }]}
      >
        <Text
          style={[
            styles.detailText,
            { color: isDark ? AppColors.primaryLight : AppColors.primary },
          ]}
        >
          {t('common.seeMore')}
        </Text>
      </Pressable>
    </View>
  );
};

const themedWrap = (isDark) => ({
  backgroundColor: isDark ? '#19271E' : '#FFFFFF',
  borderColor: isDark ? '#2E4D36' : '#A5E69C',
});

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: sp(20),
    borderRadius: sp(20),
    borderWidth: 1,
    padding: sp(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: sp(16),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: sp(16),
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    fontSize: sp(12),
    marginTop: sp(4),
    marginLeft: sp(28),
  },
  statRow: {
    flexDirection: 'row',
    gap: sp(8),
    marginBottom: sp(12),
  },
  chartWrap: {
    marginVertical: sp(8),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp(12),
    borderTopWidth: 1,
  },
  actionIcon: {
    width: sp(32),
    height: sp(32),
    borderRadius: sp(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    fontSize: sp(14),
    marginLeft: sp(12),
  },
  detailBtn: {
    paddingVertical: sp(12),
    alignItems: 'center',
    borderTopWidth: 1,
  },
  detailText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    fontSize: sp(13),
  },
});
