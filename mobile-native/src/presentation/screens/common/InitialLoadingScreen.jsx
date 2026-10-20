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
  const videoRef = useRef(null);

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
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      {player && (
        <VideoView
          ref={videoRef}
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      )}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(28) }]}>
          <Text style={{ color: isDark ? '#FFFFFF' : AppColors.textPrimary }}>Fri</Text>
          <Text style={{ color: isDark ? AppColors.primaryLight : AppColors.primary }}>ggy</Text>
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(13) }]}>
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
