/**
 * SettingsMenuItem
 *
 * Một row trong SettingsSection: icon + label + optional right element (chevron/switch/custom).
 * - variant: 'default' (có chevron) | 'value' (hiển thị value + chevron) | 'custom' (slot cho right custom)
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { ChevronRight } from 'lucide-react-native';

export const SettingsMenuItem = ({
  icon: Icon,
  label,
  value,
  onPress,
  isLast,
  customRight,
  disabled,
  destructive,
  iconColor,
  style,
}) => {
  const { isDark } = useTheme();
  const labelColor = destructive
    ? '#FF5252'
    : isDark
    ? '#FFFFFF'
    : AppColors.textPrimary;
  const iconColorResolved =
    iconColor ||
    (destructive
      ? '#FF5252'
      : isDark
      ? AppColors.primaryLight
      : AppColors.forestAccent);
  const chevronColor = isDark ? AppColors.darkTextSecondary : AppColors.hintText;
  const borderColor = isDark ? '#2E4D36' : '#E3E8E4';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: borderColor,
          borderBottomWidth: isLast ? 0 : 1,
          opacity: pressed ? 0.7 : disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {Icon ? <Icon color={iconColorResolved} size={20} strokeWidth={2.2} /> : null}
      <Text
        style={[
          styles.label,
          { color: labelColor, fontSize: sp(15), marginLeft: Icon ? sp(12) : 0 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {customRight ? (
        customRight
      ) : (
        <>
          {value ? (
            <Text
              style={[
                styles.value,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  fontSize: sp(13),
                },
              ]}
              numberOfLines={1}
            >
              {value}
            </Text>
          ) : null}
          {onPress ? <ChevronRight color={chevronColor} size={18} /> : null}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp(14),
  },
  label: {
    flex: 1,
    fontFamily: FontFamily.regular,
  },
  value: {
    fontFamily: FontFamily.regular,
    marginRight: sp(4),
  },
});
