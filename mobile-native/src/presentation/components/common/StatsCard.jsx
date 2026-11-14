/**
 * StatsCard
 *
 * Card hiển thị 1 thống kê: label + big number + growth %.
 * - icon, value, label
 * - growth (số % so với tuần trước)
 * - color: primary | success | warning | error
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

const COLOR_MAP = {
  primary: AppColors.primary,
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#FF5252',
  info: '#2196F3',
};

export const StatsCard = ({
  icon: Icon,
  value,
  label,
  unit,
  growth,
  growthLabel,
  color = 'primary',
  size = 'medium',
  style,
}) => {
  const { isDark } = useTheme();
  const accent = COLOR_MAP[color] || COLOR_MAP.primary;
  const labelColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;

  const isLarge = size === 'large';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#19271E' : '#F4F7F4',
          borderColor: isDark ? '#2E4D36' : 'transparent',
          padding: isLarge ? sp(20) : sp(14),
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: accent + '20',
            width: isLarge ? sp(40) : sp(32),
            height: isLarge ? sp(40) : sp(32),
            borderRadius: isLarge ? sp(20) : sp(16),
          },
        ]}
      >
        {Icon ? <Icon color={accent} size={isLarge ? 20 : 16} /> : null}
      </View>

      {label ? (
        <Text
          style={[
            styles.label,
            { color: labelColor, fontSize: sp(isLarge ? 13 : 11) },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : null}

      <View style={styles.valueRow}>
        <Text
          style={[
            styles.value,
            {
              color: isDark ? '#FFFFFF' : AppColors.textPrimary,
              fontSize: sp(isLarge ? 32 : 22),
            },
          ]}
        >
          {value}
        </Text>
        {unit ? (
          <Text
            style={[
              styles.unit,
              { color: labelColor, fontSize: sp(isLarge ? 14 : 11) },
            ]}
          >
            {unit}
          </Text>
        ) : null}
      </View>

      {growth != null ? (
        <View style={styles.growthRow}>
          {growth > 0 ? (
            <TrendingUp color={COLOR_MAP.success} size={12} />
          ) : growth < 0 ? (
            <TrendingDown color={COLOR_MAP.error} size={12} />
          ) : (
            <Minus color={labelColor} size={12} />
          )}
          <Text
            style={[
              styles.growthText,
              {
                color:
                  growth > 0
                    ? COLOR_MAP.success
                    : growth < 0
                    ? COLOR_MAP.error
                    : labelColor,
                fontSize: sp(11),
              },
            ]}
          >
            {growth > 0 ? '+' : ''}{growth}% {growthLabel || ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 100,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginTop: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  value: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  unit: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginLeft: 2,
    marginBottom: 3,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  growthText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: 2,
  },
});
