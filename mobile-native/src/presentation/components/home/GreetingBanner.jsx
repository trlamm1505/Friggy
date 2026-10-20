/**
 * GreetingBanner
 *
 * Redesigned (Sprint 3):
 * - Tự fetch user profile qua useUserProfile()
 * - Tự update greeting theo giờ real-time (mỗi phút)
 * - Subtitle dùng i18n key tương ứng
 * - Loading skeleton
 * - Friendly time-of-day greeting prefix
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { getGreetingAsset } from '../../utils/greetingHelper';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '../../hooks/useServiceHooks';
import { useAuthStore } from '../../../shared/stores/useAuthStore';
import { Skeleton } from '../common/Skeleton';

const getGreetingKey = (now = new Date()) => {
  const h = now.getHours();
  if (h < 12) return 'home.goodMorning';
  if (h < 18) return 'home.goodAfternoon';
  return 'home.goodEvening';
};

export const GreetingBanner = () => {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const { user: authUser } = useAuthStore();
  const { data: profile, loading } = useUserProfile();

  // Update greeting mỗi phút (real-time theo giờ)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Ưu tiên user từ auth store, fallback profile
  const userName = authUser?.name || profile?.name || 'Bạn';

  // Loading state
  if (loading && !authUser) {
    return (
      <View
        style={[
          styles.wrap,
          {
            backgroundColor: isDark ? AppColors.darkCardBg : '#FFFFFF',
            borderColor: isDark ? AppColors.darkCardBorder : 'rgba(255,255,255,0.7)',
          },
        ]}
      >
        <View style={styles.mascotWrap}>
          <Skeleton width={sp(80)} height={sp(80)} borderRadius={sp(40)} />
        </View>
        <View style={styles.textWrap}>
          <Skeleton width="60%" height={sp(20)} style={{ marginBottom: sp(6) }} />
          <Skeleton width="90%" height={sp(13)} />
        </View>
      </View>
    );
  }

  const imageAsset = getGreetingAsset(now);
  const greetingKey = getGreetingKey(now);

  const bannerColors = isDark
    ? ['#19271E', '#1B2E21', '#223A28', '#2E4D36']
    : ['#FFFFFF', '#F2FAF1', '#B4ECAB', '#7DD969'];
  const stops = [0.0, 0.48, 0.80, 1.0];
  const textColorPrimary = isDark ? '#FFFFFF' : '#0D4314';
  const textColorSecondary = isDark ? '#A0B5A7' : '#1B5E20';
  const greetingColor = isDark ? AppColors.primaryLight : AppColors.primaryDark;
  const borderColor = isDark ? '#2E4D36' : 'rgba(255,255,255,0.7)';
  const glowColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)';

  // Lấy first name từ full name
  const firstName = userName.split(' ').slice(-1)[0] || userName;

  return (
    <View
      style={[
        styles.wrap,
        { borderColor },
      ]}
    >
      <LinearGradient
        colors={bannerColors}
        locations={stops}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.glow, { backgroundColor: glowColor }]} />
      <View style={styles.mascotWrap}>
        <Image
          source={imageAsset}
          style={styles.mascot}
          resizeMode="contain"
        />
      </View>
      <View style={styles.textWrap}>
        <Text
          style={[
            styles.greetingLabel,
            { color: greetingColor, fontSize: sp(12) },
          ]}
        >
          {t(greetingKey)}
        </Text>
        <Text
          style={[
            styles.name,
            { color: textColorPrimary, fontSize: sp(28) },
          ]}
          numberOfLines={1}
        >
          {firstName}
        </Text>
        <Text
          style={[
            styles.desc,
            { color: textColorSecondary, fontSize: sp(13) },
          ]}
          numberOfLines={2}
        >
          {t('home.readyToHelpShort')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    height: sp(170),
    borderRadius: sp(26),
    borderWidth: 1.4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  glow: {
    position: 'absolute',
    right: sp(10),
    top: sp(10),
    width: sp(120),
    height: sp(120),
    borderRadius: sp(60),
  },
  mascotWrap: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: sp(148),
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  mascot: {
    width: '100%',
    height: '100%',
  },
  textWrap: {
    position: 'absolute',
    left: sp(16),
    top: sp(14),
    bottom: sp(14),
    right: sp(150),
    justifyContent: 'center',
  },
  greetingLabel: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginBottom: sp(2),
  },
  name: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    lineHeight: sp(32),
  },
  desc: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginTop: sp(2),
    lineHeight: sp(17),
  },
});
