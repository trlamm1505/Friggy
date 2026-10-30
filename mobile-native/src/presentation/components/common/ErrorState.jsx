/**
 * ErrorState
 *
 * Component hiển thị lỗi với retry button.
 * Dùng cho mọi khi service call fail.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export const ErrorState = ({
  message,
  onRetry,
  style,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const errorColor = isDark ? '#FF8A80' : AppColors.error;

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: isDark ? '#3D1F1A' : '#FFEBEE' },
        ]}
      >
        <AlertCircle color={errorColor} size={28} strokeWidth={2.2} />
      </View>
      <Text style={[styles.title, { color: errorColor }]}>
        {message || t('home.error')}
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryBtn,
            { backgroundColor: AppColors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <RefreshCw color="#FFFFFF" size={14} strokeWidth={2.5} />
          <Text style={styles.retryText}>{t('home.retry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: sp(24),
    paddingHorizontal: sp(20),
  },
  iconWrap: {
    width: sp(56),
    height: sp(56),
    borderRadius: sp(28),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp(12),
  },
  title: {
    fontSize: sp(14),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    textAlign: 'center',
    marginBottom: sp(16),
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(20),
    paddingVertical: sp(10),
    borderRadius: sp(20),
    gap: sp(6),
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: sp(13),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: sp(6),
  },
});
