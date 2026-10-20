/**
 * StatCard
 *
 * Card nhỏ hiển thị 1 metric: value + label + optional sublabel + icon.
 * Dùng cho dashboard, dashboard row, weekly stats header.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';

export const StatCard = ({
  icon: Icon,
  value,
  label,
  sublabel,
  iconBg,
  iconColor,
  layout = 'row', // 'row' | 'column'
  style,
}) => {
  const { isDark } = useTheme();
  const finalIconBg = iconBg || (isDark ? '#233629' : '#E8F5E9');
  const finalIconColor = iconColor || (isDark ? AppColors.primaryLight : AppColors.forestAccent);
  const labelColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;

  if (layout === 'column') {
    return (
      <View
        style={[
          styles.colCard,
          {
            backgroundColor: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
            borderColor: isDark ? AppColors.darkCardBorder : AppColors.border,
          },
          style,
        ]}
      >
        {Icon && (
          <View style={[styles.colIcon, { backgroundColor: finalIconBg }]}>
            <Icon color={finalIconColor} size={18} />
          </View>
        )}
        <Text
          style={[
            styles.colValue,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary },
          ]}
        >
          {value}
        </Text>
        <Text style={[styles.colLabel, { color: labelColor }]}>{label}</Text>
        {sublabel ? <Text style={[styles.colSub, { color: labelColor }]}>{sublabel}</Text> : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.rowCard,
        {
          backgroundColor: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
          borderColor: isDark ? AppColors.darkCardBorder : AppColors.border,
        },
        style,
      ]}
    >
      {Icon && (
        <View style={[styles.rowIcon, { backgroundColor: finalIconBg }]}>
          <Icon color={finalIconColor} size={18} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.rowValue,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary },
          ]}
        >
          {value}
        </Text>
        <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
      </View>
      {sublabel ? (
        <Text style={[styles.rowSub, { color: labelColor }]}>{sublabel}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp(12),
    borderRadius: sp(14),
    borderWidth: 1,
    gap: sp(12),
  },
  rowIcon: {
    width: sp(40),
    height: sp(40),
    borderRadius: sp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowValue: {
    fontSize: sp(18),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  rowLabel: {
    fontSize: sp(11),
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginTop: 2,
  },
  rowSub: {
    fontSize: sp(11),
    fontFamily: FontFamily.medium,
  },
  colCard: {
    flex: 1,
    padding: sp(12),
    borderRadius: sp(14),
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  colIcon: {
    width: sp(36),
    height: sp(36),
    borderRadius: sp(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp(8),
  },
  colValue: {
    fontSize: sp(20),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  colLabel: {
    fontSize: sp(11),
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginTop: 2,
  },
  colSub: {
    fontSize: sp(10),
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
});
