/**
 * Skeleton - placeholder loading
 *
 * Dùng cho mọi chỗ cần loading state để có UX mượt hơn.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';

export const Skeleton = ({ width = '100%', height = sp(16), borderRadius = sp(8), style }) => {
  const { isDark } = useTheme();
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.9, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const bg = isDark ? '#1F2E25' : '#E8F0EA';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: bg,
          opacity: anim,
        },
        style,
      ]}
    />
  );
};

export const SkeletonGroup = ({ children, style }) => {
  return <View style={[{ gap: sp(8) }, style]}>{children}</View>;
};
