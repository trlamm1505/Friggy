import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../../shared/stores/useAuthStore';
import loadingVideo from '../../../../assets/videos/loading_login.mp4';

export const LoginSuccessVideoScreen = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const videoRef = useRef(null);
  const { isOnboarded, completeOnboarding } = useAuthStore();

  const player = useVideoPlayer(loadingVideo, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    const t = setTimeout(() => {
      // After login success, RootNavigator will re-render based on
      // isAuthenticated && isOnboarded state.
      // If !isOnboarded → OnboardingFlow
      // If isOnboarded → MainFlow
      // We reset to AuthFlow which will be replaced immediately by RootNavigator
      // because isAuthenticated is now true.
      navigation.getParent()?.reset({
        index: 0,
        routes: [{ name: 'AuthFlow' }],
      });
    }, 3000);
    return () => clearTimeout(t);
  }, [isOnboarded, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {player && (
        <VideoView
          ref={videoRef}
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
        />
      )}
      <View style={styles.textOverlay}>
        <Text style={[styles.text, { color: '#FFFFFF', fontSize: sp(22) }]}>
          Đăng nhập thành công
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  textOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  text: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
