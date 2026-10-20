/**
 * SearchBar
 *
 * Reusable search bar với:
 * - Search icon bên trái
 * - Clear button bên phải (khi có text)
 * - Cancel button optional (khi focus)
 * - Tự quản lý focus state
 * - Press X để clear
 */

import React, { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';

export const SearchBar = ({
  value,
  onChangeText,
  placeholder,
  onFocus,
  onBlur,
  autoFocus = false,
  style,
  showCancel = false,
  onCancel,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const widthAnim = useRef(new Animated.Value(showCancel ? 0 : 1)).current;

  const animateTo = (val) => {
    Animated.timing(widthAnim, {
      toValue: val,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleFocus = (e) => {
    setFocused(true);
    if (showCancel) animateTo(1);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    if (showCancel && !value) animateTo(0);
    if (onBlur) onBlur(e);
  };

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  const handleCancel = () => {
    onChangeText('');
    setFocused(false);
    inputRef.current?.blur();
    animateTo(0);
    if (onCancel) onCancel();
  };

  const bg = isDark ? '#19271E' : '#F4F7F4';
  const border = focused
    ? AppColors.primary
    : isDark
    ? '#2E4D36'
    : '#E3E8E4';
  const textColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const placeholderColor = isDark ? AppColors.darkTextSecondary : AppColors.hintText;
  const iconColor = focused
    ? AppColors.primary
    : isDark
    ? AppColors.darkTextSecondary
    : AppColors.textSecondary;

  // Width khi có cancel: 75% / 25% split, không có cancel: 100%
  const inputWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: showCancel ? ['100%', '75%'] : ['100%', '100%'],
  });
  const cancelWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '23%'],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.inputWrap, { width: inputWidth }]}>
        <View
          style={[
            styles.inputInner,
            {
              backgroundColor: bg,
              borderColor: border,
              borderWidth: focused ? 1.5 : 1,
            },
          ]}
        >
          <Search color={iconColor} size={18} />
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder || t('home.searchHint')}
            placeholderTextColor={placeholderColor}
            style={[
              styles.input,
              {
                color: textColor,
                fontFamily: FontFamily.regular,
              },
            ]}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoFocus={autoFocus}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {value ? (
            <Pressable onPress={handleClear} hitSlop={8}>
              <View
                style={[
                  styles.clearBtn,
                  { backgroundColor: isDark ? '#2E4D36' : '#D5DED7' },
                ]}
              >
                <X
                  color={isDark ? AppColors.darkTextSecondary : AppColors.textSecondary}
                  size={12}
                  strokeWidth={2.5}
                />
              </View>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>

      {showCancel ? (
        <Animated.View
          style={[
            styles.cancelWrap,
            {
              width: cancelWidth,
              opacity: widthAnim,
            },
          ]}
        >
          <Pressable onPress={handleCancel} hitSlop={8}>
            <Animated.Text
              style={[
                styles.cancelText,
                { color: isDark ? AppColors.primaryLight : AppColors.primary },
              ]}
            >
              {t('home.cancel')}
            </Animated.Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(8),
  },
  inputWrap: {
    // width animated
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(12),
    height: sp(42),
    borderRadius: sp(12),
    gap: sp(8),
  },
  input: {
    flex: 1,
    fontSize: sp(14),
    padding: 0,
  },
  clearBtn: {
    width: sp(18),
    height: sp(18),
    borderRadius: sp(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cancelText: {
    fontSize: sp(14),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
});
