/**
 * FilterChips
 *
 * Horizontal scrollable chip group dùng cho filter.
 * Tự động scroll, hỗ trợ badge count tùy chọn.
 */

import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';

export const FilterChip = ({ label, count, selected, onPress, color, style }) => {
  const { isDark } = useTheme();
  const activeColor = color || AppColors.primary;

  const bg = selected
    ? activeColor
    : isDark
    ? '#1F2E25'
    : '#F4F7F4';
  const textColor = selected
    ? '#FFFFFF'
    : isDark
    ? '#FFFFFF'
    : AppColors.textPrimary;
  const borderColor = selected
    ? activeColor
    : isDark
    ? '#2E4D36'
    : '#E3E8E4';
  const countBg = selected
    ? 'rgba(255,255,255,0.25)'
    : isDark
    ? '#2E4D36'
    : '#FFFFFF';
  const countText = selected
    ? '#FFFFFF'
    : isDark
    ? AppColors.primaryLight
    : activeColor;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: 1.2,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
      {count != null && (
        <View style={[styles.countWrap, { backgroundColor: countBg }]}>
          <Text style={[styles.countText, { color: countText }]} numberOfLines={1}>
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

export const FilterChips = ({
  options = [], // [{ key, label, count, color? }]
  selectedKey,
  onSelect,
  style,
  contentStyle,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, contentStyle]}
      style={[styles.container, style]}
    >
      {options.map((opt) => (
        <FilterChip
          key={opt.key}
          label={opt.label}
          count={opt.count}
          color={opt.color}
          selected={selectedKey === opt.key}
          onPress={() => onSelect && onSelect(opt.key)}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  scroll: {
    paddingHorizontal: sp(20),
    gap: sp(8),
    paddingVertical: sp(2),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    // Chip nằm trong ScrollView ngang: KHÔNG cho co lại, chip phải giữ đủ
    // bề ngang để chữ "Sắp hết hạn" không bị cắt.
    flexShrink: 0,
    paddingHorizontal: sp(14),
    paddingVertical: sp(8),
    borderRadius: sp(20),
  },
  label: {
    fontSize: sp(12.5),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    // KHÔNG đặt flexShrink ở đây: Text co lại sẽ bị numberOfLines cắt thành
    // "Sắp hết hạ..." . Để label tự giữ bề rộng, chip lo phần này.
  },
  countWrap: {
    marginLeft: sp(6),
    paddingHorizontal: sp(7),
    paddingVertical: sp(1),
    borderRadius: sp(8),
    minWidth: sp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: sp(10),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
});
