/**
 * BarChart
 *
 * Custom bar chart đơn giản, không phụ thuộc chart library nặng.
 * Hỗ trợ:
 * - 1 series với max auto-compute
 * - Highlight bar "today" (index cuối)
 * - Tap on bar → onBarPress(item, index)
 * - Animation fade-in
 * - Empty state
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';

const BAR_HEIGHT = sp(70);
const BAR_WIDTH_RATIO = 0.55; // so với width column

export const BarChart = ({
  data = [],
  highlightLast = true,
  onBarPress,
  valueSuffix = '',
  emptyText = '—',
}) => {
  const { isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  if (!data || data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary }]}>
          {emptyText}
        </Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value || 0), 1);

  const getBarColor = (idx) => {
    if (highlightLast && idx === data.length - 1) return AppColors.primary;
    if (isDark) return '#2E4D36';
    return '#B4ECAB';
  };

  const getBarHeightColor = (idx) => {
    if (highlightLast && idx === data.length - 1) return AppColors.primary;
    if (isDark) return '#3D6647';
    return '#C8E6C9';
  };

  return (
    <Animated.View style={[styles.row, { opacity: fadeAnim }]}>
      {data.map((d, i) => {
        const heightPercent = ((d.value || 0) / maxValue) * 100;
        const isToday = highlightLast && i === data.length - 1;
        return (
          <Pressable
            key={d.label || i}
            onPress={() => onBarPress && onBarPress(d, i)}
            style={({ pressed }) => [styles.col, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={styles.valueWrap}>
              <Text
                style={[
                  styles.valueText,
                  {
                    color: isToday
                      ? AppColors.primary
                      : isDark
                      ? '#FFFFFF'
                      : AppColors.textPrimary,
                    fontWeight: isToday ? FontWeights.bold : FontWeights.semibold,
                  },
                ]}
              >
                {d.value || 0}
                {valueSuffix}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(heightPercent, 4)}%`,
                    backgroundColor: getBarColor(i),
                    borderTopColor: getBarHeightColor(i),
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isToday
                    ? AppColors.primary
                    : isDark
                    ? AppColors.darkTextSecondary
                    : AppColors.textSecondary,
                  fontWeight: isToday ? FontWeights.bold : FontWeights.medium,
                },
              ]}
            >
              {d.label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_HEIGHT + sp(50),
    paddingTop: sp(8),
  },
  col: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  valueWrap: {
    height: sp(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueText: {
    fontSize: sp(10),
    fontFamily: FontFamily.semibold,
  },
  barTrack: {
    width: `${BAR_WIDTH_RATIO * 100}%`,
    height: BAR_HEIGHT,
    justifyContent: 'flex-end',
    marginTop: sp(4),
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: sp(4),
    borderTopRightRadius: sp(4),
    borderTopWidth: 1,
  },
  label: {
    fontSize: sp(10),
    fontFamily: FontFamily.medium,
    marginTop: sp(6),
  },
  empty: {
    height: BAR_HEIGHT + sp(50),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: sp(13),
    fontFamily: FontFamily.medium,
  },
});
