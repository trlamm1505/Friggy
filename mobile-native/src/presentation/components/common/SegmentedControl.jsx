/**
 * SegmentedControl
 *
 * 1 group các option dạng pill, dùng cho theme/language picker.
 * Hỗ trợ 2-4 options, tự responsive width.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';

export const SegmentedControl = ({
  options = [], // [{ value, label }]
  selected,
  onChange,
  color,
  style,
}) => {
  const { isDark } = useTheme();
  const activeColor = color || AppColors.primary;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#233629' : '#E8F5E9',
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange && onChange(opt.value)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: isSelected ? activeColor : 'transparent',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isSelected
                    ? '#FFFFFF'
                    : isDark
                    ? AppColors.primaryLight
                    : activeColor,
                  fontSize: sp(11),
                },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: sp(14),
    padding: sp(3),
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sp(6),
    paddingHorizontal: sp(10),
    borderRadius: sp(11),
  },
  label: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
});
