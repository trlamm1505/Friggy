/**
 * ProgressBar
 *
 * Thanh progress cho multi-step flows (onboarding, checkout, etc).
 * - current: step hiện tại (0-indexed)
 * - total: tổng số steps
 * - showLabels: hiển thị "Bước X/Y" bên trên
 * - variant: 'linear' (1 thanh) | 'dots' (nhiều chấm)
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';

export const ProgressBar = ({
  current,
  total,
  showLabels = true,
  variant = 'linear',
  style,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  if (variant === 'dots') {
    return (
      <View style={[styles.dotsRow, style]}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i <= current
                  ? AppColors.primary
                  : isDark ? '#2E4D36' : '#E3E8E4',
                width: i === current ? sp(24) : sp(8),
              },
            ]}
          />
        ))}
      </View>
    );
  }

  // Linear variant (default)
  const progress = total > 0 ? (current + 1) / total : 0;
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress, widthAnim]);

  const widthInterpolation = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, style]}>
      {showLabels ? (
        <View style={styles.labelRow}>
          <Text
            style={[
              styles.label,
              {
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(12),
              },
            ]}
          >
            {t('home.stepOfTotal', { current: current + 1, total })}
          </Text>
          <Text
            style={[
              styles.label,
              {
                color: isDark ? AppColors.primaryLight : AppColors.primary,
                fontSize: sp(12),
              },
            ]}
          >
            {Math.round(progress * 100)}%
          </Text>
        </View>
      ) : null}
      <View
        style={[
          styles.track,
          { backgroundColor: isDark ? '#2E4D36' : '#E3E8E4' },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: AppColors.primary,
              width: widthInterpolation,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: sp(6),
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  track: {
    width: '100%',
    height: sp(6),
    borderRadius: sp(3),
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: sp(3),
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: sp(6),
  },
  dot: {
    height: sp(6),
    borderRadius: sp(3),
  },
});
