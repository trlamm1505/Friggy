/**
 * ScreenBackground
 *
 * Lớp nền dùng chung cho MỌI màn hình trong app (và cả 4 tab chính).
 *
 * ⚠️ VÌ SAO CẦN FILE NÀY (lỗi thật đã gặp 22/10/2026):
 *   Home + Tủ lạnh vẽ `LinearGradient` với `AppGradients.getBackground(isDark)`,
 *   nhưng View cha KHÔNG có backgroundColor. Trong React Navigation, nền mặc
 *   định của NavigationContainer là TRẮNG và nằm BENEATH cả cây view -> khi bật
 *   dark mode, gradient tối có vẽ đè lên nền trắng, nhưng các thẻ con bên
 *   trong vẫn giữ màu trắng cứng => màn hình "vừa tối vừa trắng".
 *   Sửa gốc: cho chính component này set backgroundColor theo isDark, đặt
 *   LinearGradient phủ absoluteFill, rồi children render ĐÈ LÊN trên.
 *   Nhờ vậy không màn hình nào còn "mất trắng" nữa, kể cả khi theme đổi giữa
 *   chừng (đây là lý do không hardcode trong từng file).
 *
 * CÁCH DÙNG:
 *   <ScreenBackground>
 *     ...nội dung màn hình...
 *   </ScreenBackground>
 *
 * Gradient lấy từ token `AppGradients` (gradients.js) — KHÔNG hardcode mảng màu.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { AppGradients } from '../../theme/gradients';

export const ScreenBackground = ({ children, style, withGradient = true }) => {
  const { isDark } = useTheme();

  // Nền phẳng phía dưới: đảm bảo không bao giờ lộ màu trắng mặc định của
  // NavigationContainer, kể cả lúc theme đang đổi (render 1 frame trước khi
  // gradient kịp vẽ).
  const flatBg = isDark ? AppColors.darkBackground : AppColors.lightBackground;

  return (
    <View style={[styles.root, { backgroundColor: flatBg }, style]}>
      {withGradient ? (
        <LinearGradient
          colors={AppGradients.getBackground(isDark).colors}
          locations={AppGradients.getBackground(isDark).locations}
          start={AppGradients.getBackground(isDark).start}
          end={AppGradients.getBackground(isDark).end}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      ) : null}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});