/**
 * BackCircleButton - P0.8
 *
 * Nút back tròn mint dùng cho các màn Profile detail
 * (ảnh 6: UserAllergies, ảnh 9: ChangePassword,
 *  ảnh 10: AppSettings, ảnh 11: PersonalInfo).
 *
 * Flutter tương ứng: container 40x40, bg accentGreen,
 * icon ChevronLeft primary. Match image.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';

export const BackCircleButton = ({ onPress, color, size = 40 }) => {
  const { isDark } = useTheme();
  const iconColor = color || (isDark ? AppColors.primaryLight : AppColors.primary);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isDark ? AppColors.darkIconBg : AppColors.accentGreen,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View pointerEvents="none">
        <ChevronLeft color={iconColor} size={sp(22)} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
