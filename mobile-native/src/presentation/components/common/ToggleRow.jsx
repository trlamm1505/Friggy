/**
 * ToggleRow
 *
 * Row với switch on/off, dùng cho settings screens.
 * - icon (optional)
 * - label
 * - value, onChange
 * - description (optional text bên dưới)
 * - isLast (loại bỏ border-bottom nếu là row cuối)
 */

import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';

export const ToggleRow = ({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  isLast,
  disabled,
  style,
}) => {
  const { isDark } = useTheme();
  const labelColor = disabled
    ? isDark ? AppColors.darkTextSecondary : AppColors.hintText
    : isDark ? '#FFFFFF' : AppColors.textPrimary;
  const descColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;
  const iconColor = isDark ? AppColors.primaryLight : AppColors.forestAccent;
  const borderColor = isDark ? '#2E4D36' : '#E3E8E4';

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: borderColor,
          borderBottomWidth: isLast ? 0 : 1,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {Icon ? <Icon color={iconColor} size={20} strokeWidth={2.2} /> : null}
      <View style={[styles.body, { marginLeft: Icon ? sp(12) : 0 }]}>
        <Text
          style={[styles.label, { color: labelColor, fontSize: sp(15) }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {description ? (
          <Text
            style={[
              styles.description,
              { color: descColor, fontSize: sp(12) },
            ]}
            numberOfLines={2}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: '#9DA8A0', true: AppColors.primaryLight }}
        thumbColor={value ? AppColors.primary : '#FFFFFF'}
        ios_backgroundColor="#9DA8A0"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp(14),
  },
  body: {
    flex: 1,
  },
  label: {
    fontFamily: FontFamily.regular,
  },
  description: {
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
});
