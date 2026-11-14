import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';

export const SocialButton = ({ type, onPress, fullWidth = true }) => {
  const { isDark } = useTheme();
  const config = {
    google: {
      label: 'Google',
      bg: '#FFFFFF',
      text: '#1F1F1F',
      border: '#DADCE0',
      icon: 'G',
      iconBg: '#FFFFFF',
      iconColor: '#4285F4',
    },
    apple: {
      label: 'Apple',
      bg: '#000000',
      text: '#FFFFFF',
      border: '#000000',
      icon: '',
      iconBg: '#000000',
      iconColor: '#FFFFFF',
    },
    facebook: {
      label: 'Facebook',
      bg: '#1877F2',
      text: '#FFFFFF',
      border: '#1877F2',
      icon: 'f',
      iconBg: '#1877F2',
      iconColor: '#FFFFFF',
    },
  }[type] || { label: type, bg: '#FFFFFF', text: '#000', border: '#DADCE0', icon: '', iconBg: '#FFFFFF', iconColor: '#000' };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          borderWidth: 1,
          width: fullWidth ? '100%' : undefined,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
        <Text style={[styles.iconText, { color: config.iconColor, fontSize: sp(18) }]}>
          {config.icon}
        </Text>
      </View>
      <Text style={[styles.label, { color: config.text, fontSize: sp(15) }]}>
        Tiếp tục với {config.label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 28,
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontWeight: '900',
  },
  label: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
});
