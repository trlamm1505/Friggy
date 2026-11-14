import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';

export const CustomButton = ({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'outline' | 'text' | 'gradient'
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = true,
  width,
  height = 54,
  borderRadius = 28,
}) => {
  const { isDark } = useTheme();

  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isText = variant === 'text';
  const isGradient = variant === 'gradient';

  const computedWidth = width !== undefined ? width : fullWidth ? '100%' : undefined;

  const buttonBg = isPrimary
    ? AppColors.primary
    : isOutline
    ? 'transparent'
    : isText
    ? 'transparent'
    : 'transparent';
  const textColor = isPrimary
    ? '#FFFFFF'
    : isDark
    ? AppColors.primaryLight
    : AppColors.primary;
  const borderColor = isOutline
    ? isDark
      ? AppColors.primaryLight
      : AppColors.primary
    : 'transparent';

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text
            style={[
              styles.text,
              { color: textColor, fontSize: sp(18) },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  if (isGradient) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          { width: computedWidth, opacity: pressed ? 0.85 : 1 },
          style,
        ]}
      >
        <LinearGradient
          colors={['#4CAF50', '#2E7D32']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.gradient,
            { height, borderRadius },
          ]}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: buttonBg,
          borderColor,
          borderWidth: isOutline ? 1.5 : 0,
          height,
          borderRadius,
          width: computedWidth,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.5,
  },
});
