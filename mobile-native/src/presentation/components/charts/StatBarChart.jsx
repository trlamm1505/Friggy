/**
 * StatBarChart
 *
 * Bar chart đơn giản (7 cột) cho weekly stats.
 * - data: [{ day: 'T2', count: 12 }, ...]
 * - maxValue: giá trị max để scale
 * - isToday: index của cột hôm nay (highlight)
 * - color: màu bar (mặc định primary)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';

export const StatBarChart = ({
  data,
  maxValue,
  isToday,
  height = 180,
  color = AppColors.primary,
  unit = '',
  style,
}) => {
  const { isDark } = useTheme();
  const max = maxValue || Math.max(...data.map((d) => d.value || 0), 1);
  const textColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const labelColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;

  return (
    <View style={[styles.container, { height: sp(height) }, style]}>
      {data.map((d, i) => {
        const v = d.value || 0;
        const heightPercent = (v / max) * 100;
        const today = i === isToday;
        const barColor = today
          ? color
          : isDark
          ? '#2E4D36'
          : '#B4ECAB';

        return (
          <View key={d.label || i} style={styles.barCol}>
            <Text
              style={[
                styles.barCount,
                { color: textColor, fontSize: sp(11) },
              ]}
              numberOfLines={1}
            >
              {v}{unit}
            </Text>
            <View
              style={[
                styles.barWrap,
                { backgroundColor: 'transparent' },
              ]}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height: `${heightPercent}%`,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.barLabel,
                { color: labelColor, fontSize: sp(11) },
                today && { color, fontWeight: 'bold' },
              ]}
            >
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barCount: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginBottom: 4,
  },
  barWrap: {
    width: '70%',
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginTop: 6,
  },
});
