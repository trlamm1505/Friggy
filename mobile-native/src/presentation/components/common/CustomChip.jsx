import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';

export const CustomChip = ({ label, selected, onPress, color }) => {
  const { isDark } = useTheme();
  const activeColor = color || AppColors.primary;
  const bg = selected
    ? activeColor
    : isDark
    ? '#233629'
    : '#E8F5E9';
  const textColor = selected
    ? '#FFFFFF'
    : isDark
    ? AppColors.primaryLight
    : activeColor;
  const borderColor = selected
    ? activeColor
    : isDark
    ? '#2E4D36'
    : '#A5D6A7';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: bg, borderColor, borderWidth: 1.2 },
      ]}
    >
      <Text style={[styles.text, { color: textColor, fontSize: sp(12.5) }]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  text: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
});
