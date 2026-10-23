/**
 * FridgeSummaryCards
 *
 * Redesigned (Sprint 3):
 * - Data từ useFridgeSummary() hook
 * - Loading skeleton
 * - Empty state nếu expired = 0
 * - Hiển thị số món + alert badge
 * - Animation khi số expired > 0
 *
 * B1 — ghi chú: component này KHÔNG cần sửa logic.
 * `useFridgeSummary()` -> `fridgeService.getSummary()` -> khi `USE_MOCKS=false`
 * đã gọi BE thật (`GET /fridge/stats` + `GET /fridge`) qua `RealFridgeService`.
 * Nhánh `error` bên dưới chính là nơi nhận lỗi 4xx (401) mà không làm vỡ Home —
 * nhờ vậy B1 không cần đụng file này.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { ChevronRight, AlertCircle, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useFridgeSummary } from '../../hooks/useServiceHooks';
import { Skeleton } from '../common/Skeleton';
import expiredTomato from '../../../../assets/images/expired_tomato.png';
import availableVeggies from '../../../../assets/images/available_veggies.png';

export const FridgeSummaryCards = ({ onExpiringTap, onAvailableTap }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { data: summary, loading, error } = useFridgeSummary();

  // P0.6c: lỗi service KHÔNG được làm crash Home.
  // Trước đây chỉ chặn `loading || !summary`, nên khi service trả lỗi 4xx
  // (SafeService không fallback) thì loading=false + summary=undefined -> rơi
  // xuống nhánh render bên dưới và đọc summary.expiredCount => TypeError.
  if (error) {
    return (
      <View style={styles.row}>
        {[0, 1].map((i) => (
          <View
            key={i}
            style={[
              styles.skeletonCard,
              {
                backgroundColor: isDark ? AppColors.darkCardBg : '#FFFFFF',
                borderColor: isDark ? AppColors.darkCardBorder : AppColors.border,
                marginLeft: i > 0 ? sp(14) : 0,
              },
            ]}
          >
            <Text
              style={{
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(13),
                textAlign: 'center',
              }}
            >
              {i === 0 ? t('home.expiredIngredients') : t('home.availableIngredients')}
            </Text>
            <Text
              style={{
                color: isDark ? AppColors.textSecondary : AppColors.hintText,
                fontSize: sp(11),
                textAlign: 'center',
                marginTop: sp(4),
              }}
            >
              {t('common.cannotLoad')}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  // Loading state
  if (loading || !summary) {
    return (
      <View style={styles.row}>
        {[0, 1].map((i) => (
          <View
            key={i}
            style={[
              styles.skeletonCard,
              {
                backgroundColor: isDark ? AppColors.darkCardBg : '#FFFFFF',
                borderColor: isDark ? AppColors.darkCardBorder : AppColors.border,
                marginLeft: i > 0 ? sp(14) : 0,
              },
            ]}
          >
            <Skeleton width={60} height={60} borderRadius={30} style={{ marginBottom: sp(12) }} />
            <Skeleton width="70%" height={sp(12)} style={{ marginBottom: sp(8) }} />
            <Skeleton width="50%" height={sp(24)} style={{ marginBottom: sp(12) }} />
            <Skeleton width="80%" height={sp(28)} borderRadius={sp(14)} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <SummaryCard
        isDark={isDark}
        title={t('home.expiredIngredients')}
        count={summary.expiredCount}
        buttonText={t('home.checkNow')}
        image={expiredTomato}
        onPress={onExpiringTap}
        isExpired
      />
      <View style={{ width: sp(14) }} />
      <SummaryCard
        isDark={isDark}
        title={t('home.availableIngredients')}
        count={summary.availableCount}
        buttonText={t('home.viewFridge')}
        image={availableVeggies}
        onPress={onAvailableTap}
        isExpired={false}
      />
    </View>
  );
};

const SummaryCard = ({ isDark, title, count, buttonText, image, onPress, isExpired }) => {
  const { t } = useTranslation();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation nếu có expired items
  useEffect(() => {
    if (isExpired && count > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isExpired, count, pulseAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const gradientColors = isExpired
    ? isDark
      ? ['#2A1C19', '#38231E']
      : ['#FAF1EB', '#F4DCD1']
    : isDark
      ? ['#19271E', '#1E3325']
      : ['#F3FCF2', '#D6F3CF'];
  const borderColor = isExpired
    ? isDark
      ? '#5E352B'
      : 'rgba(241,180,164,0.85)'
    : isDark
      ? '#2E4D36'
      : 'rgba(165,230,156,0.85)';
  const titleColor = isExpired
    ? isDark
      ? '#FF8A80'
      : '#B71C1C'
    : isDark
      ? AppColors.primaryLight
      : '#0F5A24';
  const buttonBg = isExpired
    ? isDark
      ? '#4A2822'
      : 'rgba(232,188,176,0.80)'
    : isDark
      ? '#233629'
      : 'rgba(200,230,201,0.90)';

  // Empty state cho expired
  if (isExpired && count === 0) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }]}
      >
        <View
          style={[
            styles.card,
            {
              borderColor: isDark ? '#2E4D36' : 'rgba(165,230,156,0.85)',
              backgroundColor: isDark ? '#19271E' : '#F3FCF2',
            },
          ]}
        >
          <LinearGradient
            colors={isDark ? ['#19271E', '#1E3325'] : ['#F3FCF2', '#D6F3CF']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.mascotWrap}>
            <View
              style={[styles.emptyIconWrap, { backgroundColor: isDark ? '#233629' : '#C8E6C9' }]}
            >
              <Sparkles color={isDark ? AppColors.primaryLight : AppColors.primaryDark} size={32} />
            </View>
          </View>
          <Text
            style={[
              styles.title,
              { color: isDark ? AppColors.primaryLight : AppColors.primaryDark, fontSize: sp(12) },
            ]}
          >
            {t('home.noExpired')}
          </Text>
          <Text
            style={[
              styles.emptyHint,
              {
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(10),
              },
            ]}
          >
            {t('home.noExpiredHint')}
          </Text>
          <View
            style={[
              styles.button,
              { backgroundColor: isDark ? '#233629' : 'rgba(200,230,201,0.90)' },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                {
                  color: isDark ? AppColors.primaryLight : AppColors.primaryDark,
                  fontSize: sp(11),
                },
              ]}
              numberOfLines={1}
            >
              {t('home.tapToView')}
            </Text>
            <ChevronRight
              color={isDark ? AppColors.primaryLight : AppColors.primaryDark}
              size={14}
              strokeWidth={2.5}
            />
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }]}>
      <View style={[styles.card, { borderColor, backgroundColor: gradientColors[0] }]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.mascotWrap}>
          <Animated.View
            style={{ width: '100%', height: '100%', transform: [{ scale: pulseScale }] }}
          >
            <Image source={image} style={styles.mascot} resizeMode="contain" />
          </Animated.View>
          {/* Urgent badge cho expired */}
          {isExpired && count > 0 && (
            <View style={styles.urgentBadge}>
              <AlertCircle color="#FFF" size={10} strokeWidth={3} />
              <Text style={styles.urgentText}>{t('home.expiringUrgent')}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.title, { color: titleColor, fontSize: sp(12) }]}>{title}</Text>
        <View style={styles.countRow}>
          <Text style={[styles.count, { color: titleColor, fontSize: sp(24) }]}>{count}</Text>
          <Text style={[styles.unit, { color: titleColor + 'CC', fontSize: sp(11) }]}>
            {t('home.items')}
          </Text>
        </View>
        <View style={[styles.button, { backgroundColor: buttonBg }]}>
          <Text
            style={[styles.buttonText, { color: titleColor, fontSize: sp(11) }]}
            numberOfLines={1}
          >
            {buttonText}
          </Text>
          <ChevronRight color={titleColor} size={14} strokeWidth={2.5} />
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: sp(20),
  },
  card: {
    flex: 1,
    height: sp(200),
    paddingVertical: sp(12),
    paddingHorizontal: sp(10),
    borderRadius: sp(24),
    borderWidth: 1.2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  mascotWrap: {
    height: sp(76),
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mascot: {
    width: '100%',
    height: '100%',
  },
  urgentBadge: {
    position: 'absolute',
    top: 0,
    right: sp(2),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.error,
    paddingHorizontal: sp(5),
    paddingVertical: sp(2),
    borderRadius: sp(8),
    gap: sp(2),
  },
  urgentText: {
    color: '#FFF',
    fontSize: sp(8),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginLeft: sp(2),
  },
  emptyIconWrap: {
    width: sp(60),
    height: sp(60),
    borderRadius: sp(30),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    textAlign: 'center',
    lineHeight: sp(14),
  },
  emptyHint: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
    marginTop: sp(2),
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  count: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  unit: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: sp(4),
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: sp(7),
    paddingHorizontal: sp(10),
    borderRadius: sp(20),
  },
  buttonText: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginRight: sp(2),
  },
  skeletonCard: {
    flex: 1,
    height: sp(200),
    padding: sp(12),
    borderRadius: sp(24),
    borderWidth: 1.2,
    alignItems: 'center',
  },
});
