import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Bell, ChevronLeft, Leaf } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Routes } from '../../../shared/constants/routes';
import { useUnreadCount } from '../../hooks/useServiceHooks';

export const FriggyAppBar = ({
  showBackButton = false,
  onBackTap,
  onNotificationTap,
  backgroundColor,
  unreadCount: propUnread,
}) => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  /**
   * Số thông báo chưa đọc THẬT từ BE (`GET /notifications/unread-count`).
   *
   * ⚠️ TRƯỚC ĐÂY dùng `notificationsMock` -> badge luôn hiển thị số của mock
   *   data (4) bất kể user đã đọc hết hay chưa -> SAI.
   * ⚠️ `useUnreadCount` tự fallback về `0` khi lỗi/offline/chưa đăng nhập.
   */
  const { data: realUnread, refetch: refetchUnread } = useUnreadCount();

  // unreadCount được SUY RA thay vì giữ state + effect:
  // - nếu caller truyền propUnread -> dùng prop
  // - nếu không -> dùng số thật từ BE
  const [localUnread, setLocalUnread] = useState(null);
  const unreadCount =
    localUnread ?? (propUnread !== undefined ? propUnread : (realUnread ?? 0));

  const handleNotification = useCallback(async () => {
    if (onNotificationTap) {
      await onNotificationTap();
    } else {
      await navigation.navigate(Routes.Notifications);
    }
  // Bỏ ghi đè cục bộ -> badge quay về số thật từ BE.
  // `useUnreadCount` chỉ fetch 1 lần lúc mount, nên gọi `refetch` để
  // lấy số mới (user có thể đã đánh dấu đọc ở màn danh sách).
  setLocalUnread(null);
  refetchUnread?.();
  }, [navigation, onNotificationTap, refetchUnread]);

  // ⚠️ `useFocusEffect` (không phải `useEffect`):
  //   Badge phải cập nhật mỗi lần user quay lại màn hiện tại (ví dụ: đọc
  //   hết thông báo ở tab Thông báo rồi quay lại Home). `useEffect` chỉ chạy
  //   lúc mount -> badge vẫn hiển thị số cũ -> SAI.
  useFocusEffect(
    useCallback(() => {
      refetchUnread?.();
    }, [refetchUnread])
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: backgroundColor || 'transparent',
          // P0.7.2: chừa chỗ cho status bar + notch (insets.top > 0 trên iPhone/Android
          // có tai thỏ). Trước đây cứng 4px nên header tràn lên dưới status bar.
          paddingTop: Math.max(insets.top, sp(8)) + sp(4),
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {showBackButton ? (
            <Pressable
              onPress={onBackTap || (() => navigation.goBack())}
              style={styles.backButton}
              hitSlop={8}
            >
              <ChevronLeft color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={28} />
            </Pressable>
          ) : null}
          <View style={styles.logoRow}>
            <Text
              style={[
                styles.logo,
                {
                  color: isDark ? '#FFFFFF' : AppColors.textPrimary,
                  fontSize: sp(26),
                },
              ]}
            >
              <Text style={{ color: isDark ? '#FFFFFF' : AppColors.textPrimary }}>Fri</Text>
              <Text style={{ color: isDark ? AppColors.primaryLight : AppColors.primary }}>
                ggy
              </Text>
            </Text>
            <View
              style={[
                styles.leafBadge,
                { backgroundColor: isDark ? AppColors.primaryLight : AppColors.primary },
              ]}
            >
              <Leaf color={isDark ? '#0E1611' : '#FFFFFF'} size={14} strokeWidth={2.5} />
            </View>
          </View>
        </View>
        <Pressable onPress={handleNotification} style={styles.bellWrap}>
          <View
            style={[
              styles.bell,
              {
                backgroundColor: isDark ? '#19271E' : '#FFFFFF',
                borderColor: isDark ? '#2E4D36' : 'transparent',
                borderWidth: isDark ? 1.2 : 0,
              },
            ]}
          >
            <Bell color={isDark ? AppColors.primaryLight : '#2E7D32'} size={22} />
            {unreadCount > 0 ? (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: AppColors.welcomeDeepGreen,
                    borderColor: isDark ? '#19271E' : '#FFFFFF',
                  },
                ]}
              >
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: sp(16),
    paddingBottom: sp(4),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  logo: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    letterSpacing: -0.5,
  },
  leafBadge: {
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  bellWrap: {
    padding: 0,
  },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
    lineHeight: 10,
  },
});
