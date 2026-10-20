import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';

export const CustomDivider = ({ text, style }) => {
  const { isDark } = useTheme();
  const dividerColor = isDark ? '#2E4D36' : '#E8ECE9';
  const textColor = isDark ? AppColors.hintText : AppColors.hintText;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.line, { backgroundColor: dividerColor }]} />
      {text ? (
        <Text style={[styles.text, { color: textColor, fontSize: sp(13) }]}>
          {text}
        </Text>
      ) : null}
      <View style={[styles.line, { backgroundColor: dividerColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    flex: 1,
    height: 1,
  },
  text: {
    marginHorizontal: 16,
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
  },
});
