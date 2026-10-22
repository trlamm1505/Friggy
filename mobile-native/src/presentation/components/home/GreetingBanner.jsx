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
  const { t } = useTranslation();
  const { user: authUser } = useAuthStore();
  const { data: profile, loading } = useUserProfile();

  // Update greeting mỗi phút (real-time theo giờ)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Ưu tiêu user từ auth store, fallback profile
  const userName = authUser?.name || profile?.name || 'Bạn';

  // Card phẳng: nền + viền tĩnh theo theme, không gradient, không shadow.
  const bgColor = isDark ? AppColors.darkCardBg : '#FFFFFF';
  const borderColor = isDark ? '#2E4D36' : '#A5E69C';

  // Loading state
  if (loading && !authUser) {
    return (
      <View style={[styles.wrap, { backgroundColor: bgColor, borderColor }]}>
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

  const textColorPrimary = isDark ? '#FFFFFF' : '#0D4314';
  const textColorSecondary = isDark ? '#A0B5A7' : '#1B5E20';
  const greetingColor = isDark ? AppColors.primaryLight : AppColors.primaryDark;

  // Lấy first name từ full name
  const firstName = userName.split(' ').slice(-1)[0] || userName;

  return (
    <View style={[styles.wrap, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.mascotWrap}>
        <Image source={imageAsset} style={styles.mascot} resizeMode="contain" />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.greetingLabel, { color: greetingColor, fontSize: sp(12) }]}>
          {t(greetingKey)}
        </Text>
        <Text style={[styles.name, { color: textColorPrimary, fontSize: sp(28) }]} numberOfLines={1}>
          {firstName}
        </Text>
        <Text
          style={[styles.desc, { color: textColorSecondary, fontSize: sp(13) }]}
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
    marginLeft: sp(20),
    marginRight: sp(20),
    borderWidth: sp(1.5),
    overflow: 'hidden',
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