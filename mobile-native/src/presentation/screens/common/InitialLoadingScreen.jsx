/**
 * InitialLoadingScreen - màn hình chờ khi app khởi động.
 *
 * ĐÂY LÀ MÀN HÌNH DUY NHẤT phát video trong app.
 *
 * Lịch sử (để không phá lại):
 *   - Ban đầu video nằm ở đây, chạy tốt trên Expo Go.
 *   - Được tạm gỡ khi thêm màn hình "Đăng nhập thành công".
 *   - Màn hình đó không phát được video -> đã gỡ hẳn, video quay về đây.
 *
 * GHI CHÚ QUAN TRỌNG:
 *   Pattern `p.play()` trong `setup` là pattern ĐÃ CHỨNG MINH CHẠY TỐT
 *   (chính màn hình này chạy được). Đừng đổi sang chờ `statusChange`:
 *   nếu event đó không bắn thì video không bao giờ phát.
 *
 *   Khác biệt cấu trúc so với màn hình trong stack có animation:
 *   màn này nằm ở ROOT navigator (không animation) nên SurfaceView
 *   mặc định hiển thị bình thường.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import loadingVideo from '../../../../assets/videos/loading_login.mp4';

export const InitialLoadingScreen = () => {
  const { isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pattern gốc, đã hoạt động tốt - giữ nguyên.
  const player = useVideoPlayer(loadingVideo, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: Platform.OS !== 'web',
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [fadeAnim]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      {player && (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      )}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Text
          style={[
            styles.title,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(28) },
          ]}
        >
          <Text style={{ color: isDark ? '#FFFFFF' : AppColors.textPrimary }}>Fri</Text>
          <Text style={{ color: isDark ? AppColors.primaryLight : AppColors.primary }}>ggy</Text>
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              fontSize: sp(13),
            },
          ]}
        >
          Đang tải...
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    letterSpacing: 1.2,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
  },
});
