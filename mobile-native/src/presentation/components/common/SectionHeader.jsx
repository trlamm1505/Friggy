import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';

export const SectionHeader = ({ title, actionText, onAction, style }) => {
  const { isDark } = useTheme();
  const titleColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const actionColor = isDark ? AppColors.primaryLight : AppColors.primary;

  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.title, { color: titleColor, fontSize: sp(17) }]}>
        {title}
      </Text>
      {actionText ? (
        <Pressable onPress={onAction}>
          <Text style={[styles.action, { color: actionColor, fontSize: sp(13) }]}>
            {actionText}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  action: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
});
