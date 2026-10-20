import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { Check } from 'lucide-react-native';

export const CustomCheckbox = ({ checked, onChange, label, color }) => {
  const { isDark } = useTheme();
  const checkColor = color || AppColors.primary;

  return (
    <Pressable onPress={onChange} style={styles.row}>
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? checkColor : 'transparent',
            borderColor: checked
              ? checkColor
              : isDark
              ? '#2E4D36'
              : '#C0C9C3',
          },
        ]}
      >
        {checked ? <Check color="#FFFFFF" size={14} strokeWidth={3} /> : null}
      </View>
      {label ? (
        <Text
          style={[
            styles.label,
            {
              color: isDark ? '#D0D7D1' : '#6B786F',
              fontSize: sp(14),
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginLeft: 10,
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
  },
});
