/**
 * EmptyState
 *
 * Component hiển thị trạng thái rỗng: emoji + title + hint + optional action.
 * Dùng cho mọi list/section khi data rỗng.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';

export const EmptyState = ({
  emoji = '📭',
  title,
  hint,
  actionText,
  onAction,
  style,
}) => {
  const { isDark } = useTheme();
  const titleColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const hintColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.emoji}>{emoji}</Text>
      {title ? (
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      ) : null}
      {hint ? (
        <Text style={[styles.hint, { color: hintColor }]}>{hint}</Text>
      ) : null}
      {actionText && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: isDark ? '#233629' : AppColors.accentGreen,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.actionText,
              { color: isDark ? AppColors.primaryLight : AppColors.primaryDark },
            ]}
          >
            {actionText}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: sp(32),
    paddingHorizontal: sp(20),
  },
  emoji: {
    fontSize: sp(48),
    marginBottom: sp(12),
  },
  title: {
    fontSize: sp(15),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    textAlign: 'center',
    marginBottom: sp(4),
  },
  hint: {
    fontSize: sp(12),
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
    lineHeight: sp(17),
  },
  action: {
    marginTop: sp(16),
    paddingHorizontal: sp(20),
    paddingVertical: sp(10),
    borderRadius: sp(20),
  },
  actionText: {
    fontSize: sp(13),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
});
