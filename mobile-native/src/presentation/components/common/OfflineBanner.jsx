/**
 * OfflineBanner - thanh cảnh báo "đang offline".
 *
 * Hiện khi mất mạng, tự ẩn khi có mạng trở lại.
 *
 * ⚠️ VÌ SAO CẦN:
 *   Khi offline, app vẫn hiển thị dữ liệu (từ cache local). Nếu không có
 *   banner, user tưởng dữ liệu là mới nhất -> quyết định sai (vd nấu món
 *   đã hết hạn vì tưởng còn tươi).
 *
 * R7: comment tiếng Việt.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { sp } from '../../utils/responsive';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const OfflineBanner = ({ testID = 'offline-banner' }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();

  // Đang online -> không hiện gì cả.
  if (!isOffline) return null;

  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#3A2F14' : '#FFF4E0',
          borderColor: isDark ? '#6B5417' : '#FFE0B2',
        },
      ]}
    >
      <WifiOff size={16} strokeWidth={2.2} color={isDark ? '#FFD54F' : '#E09A00'} />
      <Text
        style={[styles.text, { color: isDark ? '#FFE082' : '#8D5A00', fontSize: sp(12) }]}
        numberOfLines={2}
      >
        {t('offline.banner')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(8),
    paddingHorizontal: sp(14),
    paddingVertical: sp(9),
    borderRadius: sp(12),
    borderWidth: 1,
    marginHorizontal: sp(16),
    marginTop: sp(10),
  },
  text: {
    flex: 1,
    fontWeight: '600',
  },
});

export default OfflineBanner;
