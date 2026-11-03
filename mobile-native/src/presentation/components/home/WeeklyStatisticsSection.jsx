/**
 * WeeklyStatisticsSection
 *
 * Redesign (flat card, không gradient/shadow — đồng bộ GreetingBanner +
 * PremiumBanner):
 * - Bỏ BarChart + 3 StatCard cũ, thay bằng 2 stat card nằm ngang
 * - Mỗi card có ảnh minh hoạ ở đầu, số liệu to, nhãn phụ
 * - Header có link "Xem chi tiết >" trỏ sang trang thống kê chi tiết
 * - Loading skeleton / Error / Empty giữ nguyên pattern cũ
 *
 * Ảnh minh hoạ để trống (null) — cấu trúc layout đã sẵn sàng, chờ thay ảnh.
 */

import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useWeeklyStats } from '../../hooks/useServiceHooks';
import { Skeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';

// Ảnh minh hoạ. Để null trước khi có asset — ô ảnh vẫn giữ đúng kích thước
// để layout không nhảy khi thay ảnh sau này.
const COOKED_ART = require('../../../../assets/images/left.png'); // bữa đã nấu
const ATTENTION_ART = require('../../../../assets/images/right.png'); // cần chú ý

export const WeeklyStatisticsSection = ({ onDetailTap }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { data: stats, loading, error, refetch } = useWeeklyStats();

  // ⚠️ B3: typedef `WeeklyStats` đã đổi sang shape của `GET /fridge/stats`
  // (`FridgeStatsResponseDto`): { mealsCooked, expiringSoonCount,
  // totalSpentThisMonth, wastePercent, totalItems }.
  // Trước đây đọc `stats.data[]` (shape tuần cũ) -> luôn rỗng -> UI rơi vào
  // EmptyState dù BE có trả số liệu thật.
  const cookedCount = stats?.mealsCooked ?? 0;
  const attentionCount = stats?.expiringSoonCount ?? 0;

  const hasData = cookedCount > 0 || attentionCount > 0;

  const surfaceColor = isDark ? '#19271E' : '#FFFFFF';
  const borderColor = isDark ? '#2E4D36' : '#A5E69C';
  const textPrimary = isDark ? '#FFFFFF' : AppColors.textPrimary;

  const renderHeader = (withLink) => (
    <View style={styles.headerRow}>
      <Text style={[styles.title, { color: textPrimary }]}>{t('home.weeklyStats')}</Text>
      {withLink && (
        <Pressable
          onPress={onDetailTap}
          style={({ pressed }) => [styles.detailLink, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text
            style={[
              styles.detailLinkText,
              { color: isDark ? AppColors.primaryLight : AppColors.primary },
            ]}
          >
            {t('recipe.viewDetail')}
          </Text>
          <ChevronRight
            color={isDark ? AppColors.primaryLight : AppColors.primary}
            size={14}
            strokeWidth={2.5}
          />
        </Pressable>
      )}
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.surface, { backgroundColor: surfaceColor, borderColor }]}>
          {renderHeader(false)}
          <View style={styles.statRow}>
            {[0, 1].map((i) => (
              <View
                key={i}
                style={[styles.statCard, { backgroundColor: surfaceColor, borderColor }]}
              >
                <Skeleton width="100%" height={sp(56)} borderRadius={sp(10)} />
                <Skeleton width="70%" height={sp(11)} style={{ marginTop: sp(8) }} />
                <Skeleton width="55%" height={sp(10)} />
                <Skeleton width="45%" height={sp(22)} style={{ marginTop: sp(6) }} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.surface, { backgroundColor: surfaceColor, borderColor }]}>
          {renderHeader(false)}
          <ErrorState onRetry={refetch} />
        </View>
      </View>
    );
  }

  // Empty state (no data)
  if (!hasData) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.surface, { backgroundColor: surfaceColor, borderColor }]}>
          {renderHeader(false)}
          <EmptyState emoji="📊" title={t('home.noData')} hint={t('home.tipUseExpired')} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.surface, { backgroundColor: surfaceColor, borderColor }]}>
        {renderHeader(true)}

        <View style={styles.statRow}>
          <StatBlock
            isDark={isDark}
            art={COOKED_ART}
            tone="green"
            title={t('home.weeklyStatsCooked')}
            sub={t('home.weeklyStatsCookedSub')}
            value={cookedCount}
            unit={t('common.items')}
          />
          <StatBlock
            isDark={isDark}
            art={ATTENTION_ART}
            tone="red"
            title={t('home.weeklyStatsAttention')}
            sub={t('home.weeklyStatsAttentionSub')}
            value={attentionCount}
            unit={t('common.items')}
          />
        </View>
      </View>
    </View>
  );
};

const StatBlock = ({ isDark, art, tone, title, sub, value, unit }) => (
  <View
    style={[
      styles.statCard,
      {
        backgroundColor: isDark ? '#19271E' : '#FFFFFF',
        borderColor: isDark ? '#2E4D36' : '#A5E69C',
      },
    ]}
  >
    <View style={styles.artWrap}>
      {art ? (
        <Image source={art} style={styles.art} resizeMode="contain" />
      ) : (
        <View style={[styles.artPlaceholder, { borderColor: isDark ? '#2E4D36' : '#A5E69C' }]} />
      )}
    </View>
    <Text
      style={[styles.statTitle, { color: tone === 'red' ? AppColors.error : AppColors.primary }]}
    >
      {title}
    </Text>
    <Text
      style={[
        styles.statSub,
        { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
      ]}
    >
      {sub}
    </Text>
    <View style={styles.statValueRow}>
      <Text style={[styles.statValue, { color: isDark ? '#FFFFFF' : AppColors.textPrimary }]}>
        {value}
      </Text>
      <Text
        style={[
          styles.statUnit,
          { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
        ]}
      >
        {unit}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: sp(20),
  },
  // Card lớn bọc ngoài: nền + viền tĩnh, KHÔNG shadow (đồng bộ 2 banner trên).
  surface: {
    borderRadius: sp(20),
    borderWidth: sp(1.5),
    padding: sp(16),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp(14),
  },
  title: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: sp(16),
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(2),
  },
  detailLinkText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    fontSize: sp(12),
  },
  statRow: {
    flexDirection: 'row',
    gap: sp(10),
  },
  // 2 card nằm ngang, mỗi card co giãn đều nhau.
  statCard: {
    flex: 1,
    borderRadius: sp(16),
    borderWidth: 1,
    padding: sp(12),
  },
  artWrap: {
    width: '100%',
    height: sp(56),
    alignItems: 'center',
    justifyContent: 'center',
  },
  art: {
    width: '100%',
    height: '100%',
  },
  // Chỗ trống chờ ảnh — viền mờ để vẫn thấy vùng ảnh sắp thay.
  artPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: sp(10),
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.35,
  },
  statTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: sp(12),
    marginTop: sp(8),
  },
  statSub: {
    fontFamily: FontFamily.regular,
    fontSize: sp(10.5),
    marginTop: sp(1),
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: sp(6),
    gap: sp(3),
  },
  statValue: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    fontSize: sp(26),
  },
  statUnit: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    fontSize: sp(11),
  },
});
