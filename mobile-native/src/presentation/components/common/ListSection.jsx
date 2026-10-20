/**
 * ListSection
 *
 * Reusable section với title + action + children.
 * Dùng cho ingredients list, steps list, hoặc bất kỳ list nào cần header.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';

export const ListSection = ({
  title,
  actionText,
  onAction,
  children,
  style,
  titleIcon: TitleIcon,
  titleIconColor,
}) => {
  const { isDark } = useTheme();
  const titleColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const actionColor = isDark ? AppColors.primaryLight : AppColors.primary;
  const iconColor =
    titleIconColor || (isDark ? AppColors.primaryLight : AppColors.forestAccent);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          {TitleIcon ? <TitleIcon color={iconColor} size={18} /> : null}
          <Text style={[styles.title, { color: titleColor, marginLeft: TitleIcon ? sp(8) : 0 }]}>
            {title}
          </Text>
        </View>
        {actionText ? (
          <Pressable onPress={onAction} hitSlop={8}>
            <Text style={[styles.action, { color: actionColor }]}>{actionText}</Text>
          </Pressable>
        ) : null}
      </View>
      <View>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: sp(8),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp(12),
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: sp(17),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  action: {
    fontSize: sp(13),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
});
