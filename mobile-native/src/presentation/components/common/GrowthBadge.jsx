/**
 * GrowthBadge
 *
 * Badge hiển thị % growth với màu sắc tự động:
 * - Tăng: xanh lá
 * - Giảm: đỏ
 * - 0: xám
 * - Arrow icon tương ứng
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';

export const GrowthBadge = ({ value = 0, size = 'small', suffix = '%' }) => {
  const { isDark } = useTheme();
  const isUp = value > 0;
  const isDown = value < 0;
  const isZero = value === 0;

  const bg = isUp
    ? isDark
      ? '#1B3324'
      : '#E8F5E9'
    : isDown
    ? isDark
      ? '#3D1F1A'
      : '#FFEBEE'
    : isDark
    ? '#2A2F2C'
    : '#F0F2F1';

  const fg = isUp
    ? isDark
      ? AppColors.primaryLight
      : AppColors.primaryDark
    : isDown
    ? isDark
      ? '#FF8A80'
      : AppColors.error
    : isDark
    ? AppColors.darkTextSecondary
    : AppColors.textSecondary;

  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const iconSize = size === 'large' ? 14 : 12;
  const textSize = size === 'large' ? sp(12) : sp(11);

  const displayValue = isUp ? `+${value}` : `${value}`;
  const displayText = isZero ? '0' : `${displayValue}${suffix}`;

  return (
    <View style={[styles.badge, { backgroundColor: bg, paddingHorizontal: size === 'large' ? sp(10) : sp(7) }]}>
      <Icon color={fg} size={iconSize} strokeWidth={2.5} />
      <Text style={[styles.text, { color: fg, fontSize: textSize, marginLeft: sp(3) }]}>
        {displayText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp(3),
    borderRadius: sp(10),
  },
  text: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
});
