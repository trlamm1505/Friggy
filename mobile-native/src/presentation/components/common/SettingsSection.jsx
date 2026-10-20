/**
 * SettingsSection
 *
 * Section với title + body card chứa các menu items.
 * Dùng cho UserProfileScreen và tất cả settings-style screens.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';

export const SettingsSection = ({ title, children, style }) => {
  const { isDark } = useTheme();
  const titleColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;
  const bodyBg = isDark ? '#19271E' : '#FFFFFF';
  const bodyBorder = isDark ? '#2E4D36' : '#A5E69C';

  return (
    <View style={[styles.section, style]}>
      {title ? (
        <Text
          style={[
            styles.title,
            { color: titleColor, fontSize: sp(11) },
          ]}
        >
          {title.toUpperCase()}
        </Text>
      ) : null}
      <View
        style={[
          styles.body,
          {
            backgroundColor: bodyBg,
            borderColor: bodyBorder,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: sp(20),
    marginTop: sp(16),
  },
  title: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.8,
    marginBottom: sp(8),
    marginLeft: sp(8),
  },
  body: {
    borderRadius: sp(16),
    borderWidth: 1,
    overflow: 'hidden',
  },
});
