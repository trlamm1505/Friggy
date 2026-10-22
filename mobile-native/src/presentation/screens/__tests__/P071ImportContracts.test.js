/**
 * P0.7.1 - Bug đã phát hiện nhờ chạy app thật (bài học từ log Expo 21/10/2026).
 *
 * VẤN ĐỀ:
 *   HomeScreen / FridgeInventoryScreen / UserProfileScreen import
 *     import { AppColors, AppGradients } from '../../theme/colors';
 *   Nhưng `AppGradients` thực ra được export từ `'../../theme/gradients'`
 *   (file colors.js KHÔNG có AppGradients).
 *   Hậu quả: AppGradients = undefined, gọi .getBackground() ném
 *   "Cannot read property 'getBackground' of undefined" - app crash ngay
 *   sau khi đăng nhập xong onboarding.
 *
 *   200 test P0.1-P0.7 pass mà không phát hiện, vì:
 *   - jest-expo không render được cây component đầy đủ (LinearGradient,
 *     SafeAreaInsets, react-navigation... cần runtime native).
 *   - Test render component cũ chỉ stub EmptyState, không chạm HomeScreen.
 *
 * BÀI HỌC:
 *   "Test xanh KHÔNG đồng nghĩa runtime đúng" - chính xác cái cam kết mục 0
 *   trong plan đã cảnh báo.
 *
 * MỤC TIÊU TEST NÀY:
 *   - Import được 3 screen mà KHÔNG throw lúc require
 *   - Import AppGradients từ đúng file
 *   - AppGradients.getBackground trả về object có {colors, locations}
 *
 * LƯU Ý: KHÔNG test render đầy đủ (cần Expo runtime). Mức này đủ bắt lỗi
 * "import undefined - gọi undefined.method" trước khi chạy app.
 */

// Tách import test AppGradients trước, vì đây là test "không crash lúc require".
import { AppGradients } from '../../../presentation/theme/gradients';
import { AppColors } from '../../../presentation/theme/colors';

describe('P0.7.1: AppGradients tồn tại và đúng shape', () => {
  it('AppColors export được từ colors.js', () => {
    expect(AppColors).toBeDefined();
    expect(typeof AppColors).toBe('object');
  });

  it('AppGradients export được từ gradients.js (KHÔNG phải colors.js)', () => {
    expect(AppGradients).toBeDefined();
    expect(typeof AppGradients).toBe('object');
  });

  it('AppGradients.getBackground là function', () => {
    expect(typeof AppGradients.getBackground).toBe('function');
  });

  it('getBackground(false) -> lightBackground có 2 field colors+locations', () => {
    const bg = AppGradients.getBackground(false);
    expect(Array.isArray(bg.colors)).toBe(true);
    expect(Array.isArray(bg.locations)).toBe(true);
    expect(bg.colors.length).toBeGreaterThan(0);
  });

  it('getBackground(true) -> darkBackground có 2 field colors+locations', () => {
    const bg = AppGradients.getBackground(true);
    expect(Array.isArray(bg.colors)).toBe(true);
    expect(Array.isArray(bg.locations)).toBe(true);
  });
});

describe('P0.7.1: 3 screen import không throw lúc require', () => {
  // Trước khi sửa: import HomeScreen ném "Cannot read property 'getBackground'
  // of undefined" vì AppGradients bị resolve thành undefined.
  // Sau khi sửa: import thành công vì tách được nguồn.

  // Dùng require, không phải import, để module load lúc chạy test chứ không
  // phải parse tĩnh lúc jest collect - khi đó lỗi crash nếu có vẫn xảy ra.
  it('HomeScreen require được, không throw', () => {
    expect(() => {
      require('../../../presentation/screens/home/HomeScreen');
    }).not.toThrow();
  });

  it('FridgeInventoryScreen require được, không throw', () => {
    expect(() => {
      require('../../../presentation/screens/fridge/FridgeInventoryScreen');
    }).not.toThrow();
  });

  it('UserProfileScreen require được, không throw', () => {
    expect(() => {
      require('../../../presentation/screens/profile/UserProfileScreen');
    }).not.toThrow();
  });
});

describe('P0.7.1: 3 file KHÔNG import AppGradients từ colors (đã sửa)', () => {
  // Bắt nguyên nhân tận gốc: nếu ai refactor lại nhập nhằng,
  // nhét AppGradients vào colors, test này FAIL ngay.
  // Cách test: quét trực tiếp source code thay vì render.
  const fs = require('fs');
  const path = require('path');

  // __dirname tồn tại trong Jest nhưng eslint của project chưa khai báo global.
  // Dùng process.cwd() vì test chạy từ mobile-native/.
  const ROOT = process.cwd();

  const offenders = [
    // P0.7.1: 3 file đều import AppGradients sai từ colors.js -> crash
    // P0.8: gradient đã được KHÔI PHỤC (theo 12 ảnh thiết kế). Home + Fridge
    //       dùng AppGradients từ gradients.js. UserProfile dùng nền đơn
    //       (ảnh 12 - trang tài khoản nền trắng) nên không có gradient.
    'src/presentation/screens/home/HomeScreen.jsx',
    'src/presentation/screens/fridge/FridgeInventoryScreen.jsx',
    'src/presentation/screens/profile/UserProfileScreen.jsx',
  ];

  offenders.forEach((rel) => {
    it(`KHÔNG có "AppGradients" trong import từ colors.js: ${path.basename(rel)}`, () => {
      const full = path.join(ROOT, rel);
      const src = fs.readFileSync(full, 'utf8');

      const importLine = src
        .split('\n')
        .find((l) => l.includes("from '") && l.includes('theme/colors'));

      expect(importLine).toBeDefined();
      expect(importLine).not.toMatch(/AppGradients/);
    });
  });

  it('Cả 3 file KHÔNG import AppGradients từ colors.js (luôn đúng, kể cả P0.8)', () => {
    offenders.forEach((rel) => {
      const full = path.join(ROOT, rel);
      const src = fs.readFileSync(full, 'utf8');

      // Chỉ kiểm DÒNG IMPORT từ colors.js - vì P0.8 đã khôi phục gradient nên
      // Home/Fridge vẫn dùng AppGradients (từ gradients.js, đúng chỗ).
      const colorsImport = src
        .split('\n')
        .find((l) => l.includes("from '") && l.includes('theme/colors'));
      expect(colorsImport).toBeDefined();
      expect(colorsImport).not.toMatch(/AppGradients/);
    });
  });
});

describe('P0.8: gradient được khôi phục theo 12 ảnh thiết kế', () => {
  // P0.8 đảo ngược P0.7.2: 12 ảnh thiết kế có gradient nền rõ ràng ở Home,
  // Fridge, Login, Splash, AI Chat. Gradient phải đến từ token
  // `AppGradients` (gradients.js) - KHÔNG hardcode mảng màu trong component.
  const fs = require('fs');
  const path = require('path');
  const ROOT = process.cwd();

  const gradientScreens = [
    'src/presentation/screens/home/HomeScreen.jsx',
    'src/presentation/screens/fridge/FridgeInventoryScreen.jsx',
    'src/presentation/screens/auth/SplashScreen.jsx',
    'src/presentation/screens/auth/LoginScreen.jsx',
    'src/presentation/screens/ai/AiChatScreen.jsx',
  ];

  gradientScreens.forEach((rel) => {
    // Gradient được render gián tiếp qua <ScreenBackground> (lớp dùng chung) hoặc
    // trực tiếp trong màn hình. Cả hai đều hợp lệ, miễn là màu đến từ token.
    const usesSharedBackground = /ScreenBackground/.test(
      fs.readFileSync(path.join(ROOT, rel), 'utf8')
    );

    it(`${path.basename(rel)} dùng LinearGradient từ token AppGradients`, () => {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      if (usesSharedBackground) {
        // Màn hình dùng lớp nền dùng chung -> hợp đồng nằm ở ScreenBackground.jsx,
        // mà chính file đó mới phải vẽ gradient từ token.
        const shared = fs.readFileSync(
          path.join(ROOT, 'src/presentation/components/common/ScreenBackground.jsx'),
          'utf8'
        );
        expect(shared).toMatch(/from 'expo-linear-gradient'/);
        expect(shared).toMatch(/AppGradients\.getBackground/);
      } else {
        expect(src).toMatch(/from 'expo-linear-gradient'/);
        expect(src).toMatch(/AppGradients\.getBackground/);
      }
    });

    it(`${path.basename(rel)} KHÔNG hardcode mảng màu gradient riêng`, () => {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      // Gradient PHẢI đến từ token AppGradients.getBackground(...).
      // Cấm mảng hex màu viết tay: colors={['#FFFFFF', '#F5FCF4', ...]}
      // hoặc ternary: colors={isDark ? ['#0E1611', ...] : [...]}
      // (Lưu ý: colors={[AppColors.primary]} trong RefreshControl là hợp lệ,
      //  nên regex bắt buộc phải có hex literal '#' trong mảng.)
      expect(src).not.toMatch(/colors=\{\s*\[[^\]]*#/);
      expect(src).not.toMatch(/colors=\{isDark\s*\?/);
    });
  });
});
