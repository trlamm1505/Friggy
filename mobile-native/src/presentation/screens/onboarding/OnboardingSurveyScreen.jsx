/**
 * OnboardingSurveyScreen
 *
 * Redesigned (Sprint 7):
 * - ProgressBar component (linear, có label "Bước X/Y" + %)
 * - Animated entry: slide in cho mỗi step
 * - i18n đầy đủ (4 steps: diet, spice, allergies, family size)
 * - Step 3 multi-select (allergies) thay vì single
 * - Skip button cuối
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../shared/stores/useAuthStore';
import { showSuccess } from '../../utils/helpers';
import { Check } from 'lucide-react-native';
import { ProgressBar } from '../../components/common/ProgressBar';
import { CustomButton } from '../../components/common/CustomButton';

const STEPS = [
  {
    titleKey: 'home.onboardingStep1Title',
    key: 'diet',
    multi: false,
    options: [
      { value: 'none', labelKey: 'home.dietNormal' },
      { value: 'vegetarian', labelKey: 'home.dietVegetarian' },
      { value: 'vegan', labelKey: 'home.dietVegan' },
      { value: 'halal', labelKey: 'home.dietHalal' },
    ],
  },
  {
    titleKey: 'home.onboardingStep2Title',
    key: 'spice',
    multi: false,
    options: [
      { value: 'none', labelKey: 'home.spiceNone' },
      { value: 'mild', labelKey: 'home.spiceMild' },
      { value: 'medium', labelKey: 'home.spiceMedium' },
      { value: 'hot', labelKey: 'home.spiceHot' },
    ],
  },
  {
    titleKey: 'home.onboardingStep3Title',
    key: 'allergies',
    multi: true,
    options: [
      { value: 'none', labelKey: 'Không có' },
      { value: 'shrimp', labelKey: 'Tôm' },
      { value: 'crab', labelKey: 'Cua' },
      { value: 'peanut', labelKey: 'Đậu phộng' },
      { value: 'milk', labelKey: 'Sữa' },
      { value: 'gluten', labelKey: 'Gluten' },
    ],
  },
  {
    titleKey: 'home.onboardingStep4Title',
    key: 'familySize',
    multi: false,
    options: [
      { value: '1', labelKey: '1 người' },
      { value: '2', labelKey: '2 người' },
      { value: '3-4', labelKey: '3-4 người' },
      { value: '5+', labelKey: '5+ người' },
    ],
  },
];

export const OnboardingSurveyScreen = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { completeOnboarding } = useAuthStore();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    diet: '',
    spice: '',
    allergies: [],
    familySize: '',
  });

  const current = STEPS[step];

  // Slide animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    slideAnim.setValue(40);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [step, slideAnim]);

  const handleSelect = useCallback(
    (value) => {
      if (current.multi) {
        // Multi-select (cho allergies)
        setAnswers((prev) => {
          if (value === 'none') {
            return { ...prev, [current.key]: prev[current.key].length === 0 || prev[current.key][0] === 'none' ? [] : ['none'] };
          }
          let next = prev[current.key].filter((v) => v !== 'none');
          if (next.includes(value)) {
            next = next.filter((v) => v !== value);
          } else {
            next = [...next, value];
          }
          return { ...prev, [current.key]: next };
        });
      } else {
        setAnswers((prev) => ({ ...prev, [current.key]: value }));
      }
    },
    [current],
  );

  const canProceed = useMemo(() => {
    if (current.multi) return answers[current.key].length > 0;
    return !!answers[current.key];
  }, [current, answers]);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
      showSuccess(t('home.onboardingComplete'));
      navigation.reset({ index: 0, routes: [{ name: 'MainFlow' }] });
    }
  }, [step, completeOnboarding, navigation, t]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  const handleSkip = useCallback(() => {
    completeOnboarding();
    navigation.reset({ index: 0, routes: [{ name: 'MainFlow' }] });
  }, [completeOnboarding, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <LinearGradient
        colors={isDark ? ['#0E1611', '#142017', '#1B2E21'] : ['#FFFFFF', '#F5FCF4', '#C7EFC2']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Top bar with skip */}
      <View style={styles.topBar}>
        <Pressable onPress={handleBack} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
          <Text
            style={[
              styles.topBarText,
              {
                color: step > 0
                  ? isDark ? AppColors.primaryLight : AppColors.primary
                  : isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(14),
              },
            ]}
          >
            {t('home.onboardingBack')}
          </Text>
        </Pressable>
        <Pressable onPress={handleSkip} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
          <Text
            style={[
              styles.topBarText,
              { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(14) },
            ]}
          >
            {t('home.onboardingSkip')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress bar */}
        <ProgressBar
          current={step}
          total={STEPS.length}
          showLabels
          style={{ marginBottom: sp(32) }}
        />

        {/* Animated content */}
        <Animated.View
          style={{
            transform: [{ translateX: slideAnim }],
            opacity: slideAnim.interpolate({ inputRange: [0, 40], outputRange: [1, 0.3] }),
          }}
        >
          <Text
            style={[
              styles.title,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(26) },
            ]}
          >
            {t(current.titleKey)}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(14) },
            ]}
          >
            {current.multi ? 'Có thể chọn nhiều' : t('home.onboardingSelectOne')}
          </Text>

          <View style={{ marginTop: 24 }}>
            {current.options.map((opt) => {
              const selected = current.multi
                ? answers[current.key].includes(opt.value)
                : answers[current.key] === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleSelect(opt.value)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: selected
                        ? isDark
                          ? '#1E3A25'
                          : AppColors.accentGreen
                        : isDark
                        ? '#19271E'
                        : '#F2F5F3',
                      borderColor: selected
                        ? AppColors.primary
                        : isDark
                        ? '#2E4D36'
                        : '#E3E8E4',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) },
                    ]}
                  >
                    {t(opt.labelKey, { defaultValue: opt.labelKey })}
                  </Text>
                  {selected ? (
                    <View style={[styles.checkBadge, { backgroundColor: AppColors.primary }]}>
                      <Check color="#FFFFFF" size={14} strokeWidth={3} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <CustomButton
          title={
            step === STEPS.length - 1
              ? t('home.onboardingFinish')
              : t('home.onboardingNext')
          }
          onPress={handleNext}
          disabled={!canProceed}
          height={52}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
  },
  topBarText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    marginTop: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  optionText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
});
