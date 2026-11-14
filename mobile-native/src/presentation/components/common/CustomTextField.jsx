import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';

export const CustomTextField = ({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  prefixIcon: PrefixIcon,
  suffixIcon,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  ...props
}) => {
  const { isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const fillColor = isDark ? '#19271E' : '#F2F5F3';
  const textColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const hintColor = isDark ? AppColors.hintText : AppColors.hintText;
  const iconColor = isDark ? AppColors.primaryLight : '#8C9890';
  const borderColor = error
    ? AppColors.error
    : isFocused
    ? isDark
      ? AppColors.primaryLight
      : AppColors.primary
    : isDark
    ? '#2E4D36'
    : 'transparent';

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text
          style={[
            styles.label,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: fillColor,
            borderColor,
            borderWidth: isFocused || error ? 1.5 : 1,
          },
        ]}
      >
        {PrefixIcon ? (
          <View style={styles.prefixIcon}>
            {typeof PrefixIcon === 'function' ? (
              <PrefixIcon color={iconColor} size={22} />
            ) : (
              PrefixIcon
            )}
          </View>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || hint}
          placeholderTextColor={hintColor}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            {
              color: textColor,
              fontSize: sp(15),
              minHeight: multiline ? 80 : 50,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            inputStyle,
          ]}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setIsSecure(!isSecure)}
            style={styles.suffixIcon}
            hitSlop={8}
          >
            {isSecure ? (
              <EyeOff color={hintColor} size={22} />
            ) : (
              <Eye color={hintColor} size={22} />
            )}
          </Pressable>
        ) : suffixIcon ? (
          <View style={styles.suffixIcon}>{suffixIcon}</View>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.error, { color: AppColors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  label: {
    fontSize: sp(14),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginBottom: 8,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 16,
  },
  prefixIcon: {
    marginRight: 4,
  },
  suffixIcon: {
    marginLeft: 4,
    padding: 4,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    paddingVertical: 14,
  },
  error: {
    fontSize: sp(12),
    marginTop: 4,
    marginLeft: 12,
  },
});
