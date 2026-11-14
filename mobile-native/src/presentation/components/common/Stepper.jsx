/**
 * Stepper
 *
 * Bộ cộng/trừ số với min/max.
 * Dùng cho servings, quantity, age, etc.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { Plus, Minus } from 'lucide-react-native';

export const Stepper = ({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  style,
}) => {
  const { isDark } = useTheme();

  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isDark ? '#233629' : AppColors.accentGreen,
        },
        style,
      ]}
    >
      <Pressable
        onPress={dec}
        disabled={value <= min}
        style={({ pressed }) => [
          styles.btn,
          {
            opacity: pressed ? 0.7 : value <= min ? 0.4 : 1,
          },
        ]}
        hitSlop={8}
      >
        <Minus color={isDark ? AppColors.primaryLight : AppColors.forestAccent} size={18} strokeWidth={2.5} />
      </Pressable>
      <Text
        style={[
          styles.value,
          {
            color: isDark ? AppColors.primaryLight : AppColors.forestAccent,
            fontSize: sp(20),
          },
        ]}
      >
        {value}
      </Text>
      <Pressable
        onPress={inc}
        disabled={value >= max}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: AppColors.primary,
            opacity: pressed ? 0.85 : value >= max ? 0.4 : 1,
          },
        ]}
        hitSlop={8}
      >
        <Plus color="#FFFFFF" size={18} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp(8),
    paddingVertical: sp(8),
    borderRadius: sp(40),
  },
  btn: {
    width: sp(40),
    height: sp(40),
    borderRadius: sp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    minWidth: sp(40),
    textAlign: 'center',
  },
});
