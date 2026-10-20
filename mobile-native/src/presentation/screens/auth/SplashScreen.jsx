/**
 * SplashScreen
 *
 * Redesigned (Sprint 8):
 * - Dùng BrandLogo component (consistent logo Friggy)
 * - Feature highlights 3 items (track expiry / AI recipes / family)
 * - Pager dots animation
 * - Get Started + Continue as guest buttons
 * - Mascot animation
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
  Animated,
  FlatList,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp, sh, sw, screenHeight } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Calendar, Sparkles, Users, Check } from 'lucide-react-native';
import { BrandLogo } from '../../components/common/BrandLogo';
import { Routes } from '../../../shared/constants/routes';
import { showInfo } from '../../utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FEATURES = [
  { icon: Calendar, key: 'splashFeature1', color: '#4CAF50' },
  { icon: Sparkles, key: 'splashFeature2', color: '#FF9800' },
  { icon: Users, key: 'splashFeature3', color: '#9C27B0' },
];

export const SplashScreen = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [featureIndex, setFeatureIndex] = useState(0);
  const scrollRef = useRef(null);
  const mascotAnim = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;

  // Mascot bounce
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(mascotAnim, {
          toValue: -8,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(mascotAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ).start();
  }, [mascotAnim]);

  // Logo fade-in
  useEffect(() => {
    Animated.timing(logoAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [logoAnim]);

  const handleScroll = useCallback((e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== featureIndex) setFeatureIndex(index);
  }, [featureIndex]);

  const goToLogin = useCallback(() => {
    navigation.navigate(Routes.Login);
  }, [navigation]);

  const continueAsGuest = useCallback(() => {
    showInfo('Tính năng khách (mock)');
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <View style={styles.topArea}>
        {/* Sparkle accents */}
        <Text
          style={[
            styles.sparkle,
            { top: sh(75), left: sw(45), color: isDark ? '#2E4D36' : '#C4EAD0', fontSize: sp(22) },
          ]}
        >
          ✦
        </Text>
        <Text
          style={[
            styles.sparkle,
            { top: sh(140), right: sw(40), color: isDark ? '#2E4D36' : '#C4EAD0', fontSize: sp(20) },
          ]}
        >
          ✦
        </Text>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text
            style={[
              styles.welcomeLine,
              { color: isDark ? AppColors.primaryLight : '#159936', fontSize: sp(26) },
            ]}
          >
            {t('auth.welcomeTo')}
          </Text>
          <Animated.View style={{ opacity: logoAnim, marginTop: sp(2) }}>
            <BrandLogo size="large" withLeaf />
          </Animated.View>
        </View>

        {/* Mascot */}
        <Animated.View
          style={[styles.mascotWrap, { transform: [{ translateY: mascotAnim }] }]}
        >
          <Image
            source={require('../../../../assets/images/onboarding_fridge.png')}
            style={styles.mascotImg}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      <View style={styles.bottomArea}>
        {/* Feature carousel */}
        <View style={styles.featureBlock}>
          <FlatList
            ref={scrollRef}
            data={FEATURES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            renderItem={({ item: f }) => (
              <View style={[styles.featureItem, { width: SCREEN_WIDTH - 48 }]}>
                <View style={[styles.featureIcon, { backgroundColor: f.color + '20' }]}>
                  <f.icon color={f.color} size={20} strokeWidth={2.2} />
                </View>
                <Text
                  style={[
                    styles.featureText,
                    { color: isDark ? '#FFFFFF' : '#1E8435', fontSize: sp(15) },
                  ]}
                >
                  {t('home.' + f.key)}
                </Text>
              </View>
            )}
          />

          {/* Dots indicator */}
          <View style={styles.dotsRow}>
            {FEATURES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === featureIndex
                      ? AppColors.primary
                      : isDark ? '#2E4D36' : '#C4EAD0',
                    width: i === featureIndex ? sp(24) : sp(8),
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* CTA buttons */}
        <Pressable
          onPress={goToLogin}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, width: '100%' }]}
        >
          <View style={styles.ctaBtn}>
            <Text style={styles.ctaText}>{t('home.splashGetStarted')}</Text>
            <ArrowRight color="#FFFFFF" size={20} strokeWidth={2.5} />
          </View>
        </Pressable>

        <Pressable
          onPress={continueAsGuest}
          hitSlop={6}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: sp(8) }]}
        >
          <Text
            style={[
              styles.guestText,
              { color: isDark ? AppColors.hintText : '#1E8435', fontSize: sp(13) },
            ]}
          >
            {t('home.splashContinueAsGuest')}
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              { color: isDark ? AppColors.hintText : '#1E8435', fontSize: sp(14) },
            ]}
          >
            {t('auth.noAccount')}
          </Text>
          <Pressable onPress={() => navigation.navigate(Routes.Register)} hitSlop={4}>
            <Text
              style={[
                styles.footerLink,
                { color: isDark ? AppColors.primaryLight : '#008435', fontSize: sp(14) },
              ]}
            >
              {t('auth.register')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topArea: {
    flex: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sparkle: {
    position: 'absolute',
  },
  titleBlock: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  welcomeLine: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    letterSpacing: 0.5,
  },
  mascotWrap: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    height: screenHeight * 0.36,
    alignItems: 'center',
  },
  mascotImg: {
    width: '78%',
    height: '100%',
  },
  bottomArea: {
    flex: 4,
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featureBlock: {
    width: '100%',
    alignItems: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: 10,
    flex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    backgroundColor: AppColors.primary,
    borderRadius: 26,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: 16,
    marginRight: 8,
    letterSpacing: 0.3,
  },
  guestText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
  },
  footerLink: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
});
