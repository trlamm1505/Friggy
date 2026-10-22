/**
 * SegmentedControl
 *
 * 1 group các option dạng pill, dùng cho theme/language picker.
 * Hỗ trợ 2-4 options, tự responsive width.
 *
 * API: nhận `options` là mảng object, mỗi item có `key` + `label`.
 *      (Trước đây dùng `value`, nhưng các màn hình recipe truyền `key`
 *       -> `opt.value` là undefined -> React cảnh báo thiếu `key` prop.)
 *
 *   <SegmentedControl options={TABS} selectedKey={activeTab} onSelect={setActiveTab} />
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';

export const SegmentedControl = ({
  options = [], // [{ key, label }]
  selectedKey,
  onSelect,
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
      {options.map((opt, index) => {
        // Ưu tiên `key` của option, fallback sang index để luôn có key hợp lệ
        const optKey = opt.key ?? index;
        const isSelected = selectedKey === opt.key;
        return (
          <Pressable
            key={optKey}
            onPress={() => onSelect && onSelect(opt.key)}
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
