/**
 * IngredientStatisticsScreen
 *
 * ⚠️ SPRINT B4 — ĐÃ NỐI BE THẬT (trước đây là `weekly-stats.json` hardcode).
 *
 * Nguồn dữ liệu:
 *   - `GET /fridge/stats`        -> `FridgeStatsResponseDto`
 *     { totalSpentThisMonth, wastePercent, mealsCooked, expiringSoonCount, totalItems }
 *   - `GET /fridge/stats/chart?period=week|month` -> `FridgeStatsChartResponseDto`
 *     { period, labels[], spending[], wasteItems[] }
 *
 * ⚠️ `getFridgeStats()` / `getStatsChart()` KHÔNG có trong mock `fridgeService`
 *   (xem `RealFridgeService.js:328`) -> không đi qua `useServices().fridgeService`
 *   mà gọi trực tiếp `RealFridgeService` khi chế độ thật. Khi mock mode ->
 *   dùng số liệu mock để UI vẫn render được.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { StatsCard } from '../../components/common/StatsCard';
import { StatBarChart } from '../../components/charts/StatBarChart';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/common/Skeleton';
import { Package, TrendingUp, DollarSign, Sparkles, BarChart3 } from 'lucide-react-native';
import weeklyStats from '../../../shared/mocks/weekly-stats.json';
import { getRegisteredService, isMockMode } from '../../../data/api/ServiceRegistry';

const PERIOD_TABS = [
  { key: 'day', label: 'Theo ngày' },
  { key: 'category', label: 'Theo loại' },
  { key: 'month', label: 'Theo tháng' },
];

/**
 * Số liệu mặc định khi mock mode hoặc BE lỗi.
 */
const FALLBACK_STATS = {
  totalSpentThisMonth: 0,
  wastePercent: 0,
  mealsCooked: 0,
  expiringSoonCount: 0,
  totalItems: 0,
};

const FALLBACK_CHART = {
  labels: [],
  spending: [],
  wasteItems: [],
};

export const IngredientStatisticsScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [period, setPeriod] = useState('day');

  const [stats, setStats] = useState(FALLBACK_STATS);
  const [chart, setChart] = useState(FALLBACK_CHART);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Chế độ mock -> dùng số liệu mock (không gọi BE).
    if (isMockMode()) {
      setStats({
        ...FALLBACK_STATS,
        totalItems: weeklyStats.total ?? 0,
        mealsCooked: weeklyStats.total ?? 0,
      });
      setChart({
        labels: weeklyStats.data.map((d) => d.day),
        spending: weeklyStats.data.map((d) => d.count),
        wasteItems: weeklyStats.data.map(() => 0),
      });
      setLoading(false);
      return;
    }

    try {
      // `getFridgeStats` / `getStatsChart` không có trong mock -> lấy service
      // đã đăng ký thật từ registry.
      require('../../../data/services/real/RealFridgeService');
      const fridgeService = getRegisteredService('fridgeService');
      if (!fridgeService) throw new Error(t('home.error'));

      const [statsDto, chartDto] = await Promise.all([
        fridgeService.getFridgeStats(),
        fridgeService.getStatsChart('week'),
      ]);

      setStats({
        totalSpentThisMonth: statsDto?.totalSpentThisMonth ?? 0,
        wastePercent: statsDto?.wastePercent ?? 0,
        mealsCooked: statsDto?.mealsCooked ?? 0,
        expiringSoonCount: statsDto?.expiringSoonCount ?? 0,
        totalItems: statsDto?.totalItems ?? 0,
      });

      setChart({
        labels: chartDto?.labels ?? [],
        spending: chartDto?.spending ?? [],
        wasteItems: chartDto?.wasteItems ?? [],
      });
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // `loadData` là async -> setState chỉ chạy sau `await`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  /**
   * Dữ liệu cho biểu đồ cột.
   *
   * BE `spending` là TIỀN (VND), `wasteItems` là SỐ MÓN hỏng.
   * => Vẽ 2 nhóm: "chi tiêu" và "lãng phí" (đơn vị khác nhau -> chuẩn hoá
   * về % để so sánh được trên cùng thang).
   */
  const chartData = useMemo(() => {
    if (chart.labels.length === 0) {
      return weeklyStats.data.map((d) => ({ label: d.day, value: d.count }));
    }

    const maxSpending = Math.max(...chart.spending, 1);
    const maxWaste = Math.max(...chart.wasteItems, 1);

    return chart.labels.map((label, i) => {
      const spendingPercent = Math.round(((chart.spending[i] ?? 0) / maxSpending) * 100);
      const wastePercent = Math.round(((chart.wasteItems[i] ?? 0) / maxWaste) * 100);
      // Ưu tiên chi tiêu; nếu không có chi tiêu thì dùng lãng phí.
      const value = spendingPercent > 0 ? spendingPercent : wastePercent;
      return { label, value };
    });
  }, [chart]);

  const totalSpentK = Math.round((stats.totalSpentThisMonth ?? 0) / 1000);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
        <View style={{ padding: 20 }}>
          <Skeleton width="55%" height={sp(22)} borderRadius={sp(11)} />
          <Skeleton
            width="100%"
            height={sp(150)}
            borderRadius={sp(20)}
            style={{ marginTop: sp(16) }}
          />
          <Skeleton
            width="100%"
            height={sp(90)}
            borderRadius={sp(16)}
            style={{ marginTop: sp(12) }}
          />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
        <View style={{ padding: 20 }}>
          <ErrorState message={error?.message} onRetry={loadData} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text
          style={[
            styles.title,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(22) },
          ]}
        >
          {t('home.statsTitle')}
        </Text>

        {/* Hero card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? '#19271E' : '#E8F5E9',
              borderColor: isDark ? '#2E4D36' : '#A5E69C',
            },
          ]}
        >
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: (isDark ? AppColors.primaryLight : AppColors.primary) + '20' },
            ]}
          >
            <BarChart3 color={isDark ? AppColors.primaryLight : AppColors.primary} size={26} />
          </View>
          <Text
            style={[
              styles.heroLabel,
              {
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(13),
              },
            ]}
          >
            {t('home.statsTotalItems')}
          </Text>
          <View style={styles.heroValueRow}>
            <Text
              style={[
                styles.heroValue,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(40) },
              ]}
            >
              {stats.totalItems}
            </Text>
            {stats.expiringSoonCount > 0 ? (
              <View style={styles.heroGrowth}>
                <TrendingUp color={AppColors.primary} size={14} />
                <Text style={[styles.heroGrowthText, { color: AppColors.primary, fontSize: sp(13) }]}>
                  {stats.expiringSoonCount} {t('home.statsExpiringSoon')}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[
              styles.heroSub,
              {
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(12),
              },
            ]}
          >
            {t('home.statsVsLastWeek')}
          </Text>
        </View>

        {/* Mini stats row */}
        <View style={styles.statsRow}>
          <StatsCard
            icon={Package}
            value={String(stats.mealsCooked)}
            unit={t('home.statsMeals')}
            label={t('home.statsMealsCooked')}
            color="primary"
            style={{ marginRight: 8 }}
          />
          <StatsCard
            icon={TrendingUp}
            value={String(Math.round(stats.wastePercent))}
            unit="%"
            label={t('home.statsTotalWasted')}
            color="error"
          />
        </View>

        <View style={styles.statsRow}>
          <StatsCard
            icon={DollarSign}
            value={String(totalSpentK)}
            unit="k"
            label={t('home.statsSpentThisMonth')}
            color="success"
            style={{ marginRight: 8 }}
          />
          <StatsCard
            icon={Sparkles}
            value={String(stats.expiringSoonCount)}
            unit={t('home.statsItems')}
            label={t('home.statsExpiringSoon')}
            color="info"
          />
        </View>

        {/* Period selector */}
        <View style={{ marginTop: 28 }}>
          <SegmentedControl options={PERIOD_TABS} selectedKey={period} onSelect={setPeriod} />
        </View>

        {/* Bar chart by day */}
        <View
          style={[
            styles.chartCard,
            {
              backgroundColor: isDark ? '#19271E' : '#F4F7F4',
              borderColor: isDark ? '#2E4D36' : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              styles.chartTitle,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) },
            ]}
          >
            {t('home.statsByDay')}
          </Text>
          <StatBarChart
            data={chartData}
            isToday={chartData.length - 1}
            height={180}
            color={AppColors.primary}
            unit=""
          />
        </View>

        {/* Tip card */}
        <View
          style={[
            styles.tipCard,
            {
              backgroundColor: isDark ? '#1B3324' : '#E8F5E9',
              borderColor: isDark ? '#2E4D36' : '#A5E69C',
            },
          ]}
        >
          <View style={[styles.tipBadge, { backgroundColor: AppColors.primary }]}>
            <Sparkles color="#FFFFFF" size={14} />
            <Text style={styles.tipBadgeText}>{t('home.statsTip')}</Text>
          </View>
          <Text
            style={[
              styles.tipText,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(14) },
            ]}
          >
            {t('home.statsTipContent')}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  heroCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 16,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroLabel: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  heroValue: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  heroGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    marginBottom: 6,
    gap: 2,
  },
  heroGrowthText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginLeft: 2,
  },
  heroSub: {
    fontFamily: FontFamily.regular,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  chartCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  chartTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginBottom: 16,
  },
  tipCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  tipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  tipBadgeText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: 11,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  tipText: {
    fontFamily: FontFamily.regular,
    marginTop: 10,
    lineHeight: 20,
  },
});
