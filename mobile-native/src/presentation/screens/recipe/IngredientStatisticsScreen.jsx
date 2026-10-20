/**
 * IngredientStatisticsScreen
 *
 * Redesigned (Sprint 9):
 * - StatsCard component (3-4 cards: Used, Wasted, Saved, Average)
 * - StatBarChart cho by-day
 * - SegmentedControl: By day / By category / By month
 * - Tip card ở dưới
 * - Hero card ở trên với big number
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
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
import { Package, TrendingUp, DollarSign, Sparkles, BarChart3 } from 'lucide-react-native';
import weeklyStats from '../../../shared/mocks/weekly-stats.json';

const PERIOD_TABS = [
  { key: 'day', label: 'Theo ngày' },
  { key: 'category', label: 'Theo loại' },
  { key: 'month', label: 'Theo tháng' },
];

export const IngredientStatisticsScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [period, setPeriod] = useState('day');

  const maxCount = useMemo(() => Math.max(...weeklyStats.data.map((d) => d.count), 1), []);
  const growth = useMemo(
    () => Math.round(((weeklyStats.total - weeklyStats.previousWeek) / weeklyStats.previousWeek) * 100),
    [],
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(22) }]}>
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
          <Text style={[styles.heroLabel, { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(13) }]}>
            Tổng nguyên liệu tuần này
          </Text>
          <View style={styles.heroValueRow}>
            <Text style={[styles.heroValue, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(40) }]}>
              {weeklyStats.total}
            </Text>
            <View style={styles.heroGrowth}>
              <TrendingUp color={AppColors.primary} size={14} />
              <Text style={[styles.heroGrowthText, { color: AppColors.primary, fontSize: sp(13) }]}>
                +{growth}%
              </Text>
            </View>
          </View>
          <Text style={[styles.heroSub, { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(12) }]}>
            {t('home.statsVsLastWeek')}
          </Text>
        </View>

        {/* Mini stats row */}
        <View style={styles.statsRow}>
          <StatsCard
            icon={Package}
            value="42"
            unit="món"
            label={t('home.statsTotalUsed')}
            growth={15}
            color="primary"
            style={{ marginRight: 8 }}
          />
          <StatsCard
            icon={TrendingUp}
            value="6"
            unit="món"
            label={t('home.statsTotalWasted')}
            growth={-20}
            color="error"
          />
        </View>

        <View style={styles.statsRow}>
          <StatsCard
            icon={DollarSign}
            value="320"
            unit="k"
            label={t('home.statsSavedMoney')}
            growth={25}
            color="success"
            style={{ marginRight: 8 }}
          />
          <StatsCard
            icon={Sparkles}
            value="6.3"
            unit="/ngày"
            label={t('home.statsAverage')}
            growth={8}
            color="info"
          />
        </View>

        {/* Period selector */}
        <View style={{ marginTop: 28 }}>
          <SegmentedControl
            options={PERIOD_TABS}
            selectedKey={period}
            onSelect={setPeriod}
          />
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
          <Text style={[styles.chartTitle, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) }]}>
            {t('home.statsByDay')}
          </Text>
          <StatBarChart
            data={weeklyStats.data.map((d) => ({ label: d.day, value: d.count }))}
            isToday={weeklyStats.data.length - 1}
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
          <Text style={[styles.tipText, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(14) }]}>
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
