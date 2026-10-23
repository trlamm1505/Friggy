/**
 * App.jsx - entry point.
 *
 * Phase 0 (P0.6):
 *   1. Chi seed khi USE_MOCKS=true (da chot o muc 8b cua plan).
 *      Ly do: neu app vua co du lieu seed gia vua co du lieu that tu API,
 *      rat kho chan doan "3 item trong list - tu API hay tu seed?".
 *
 * ⚠️ File nay KHONG immutable. Moi sprint them 1 dong import Real service
 * o vung "Sprint import-side-effect" ben duoi khi service do da duoc tao.
 * Chi them DUNG 1 DONG - dung viet import cho service chua ton tai
 * (import file khong co = app crash ngay).
 *
 * ⚠️ KHONG duoc them `eslint-disable` o day. File nay la entry point,
 *   moi sprint deu cham vao - tat lint se bien mat lop bao ve o noi can nhat.
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import Toast from 'react-native-toast-message';
import { AppProviders } from './src/providers/AppProviders';
import { RootNavigator } from './src/presentation/navigation/RootNavigator';
import { useAuthStore } from './src/shared/stores/useAuthStore';
import { useThemeStore } from './src/shared/stores/useThemeStore';
import { useLanguageStore } from './src/shared/stores/useLanguageStore';
import { AppColors } from './src/presentation/theme/colors';
import { initAppShell } from './src/data/appInit';

// ══════════════════════════════════════════════════════════════════
// Sprint import-side-effect
// ══════════════════════════════════════════════════════════════════
// Mỗi Real*Service tự đăng ký vào ServiceRegistry bằng side-effect import.
// ServiceProvider.jsx đọc registry đó, nên chỉ cần import là domain đó
// tự chuyển từ mock sang thật - không sửa ServiceProvider/useServiceHooks.
//
// CÁCH DÙNG (mỗi sprint thêm ĐÚNG 1 DÒNG, ngay dưới comment này):
//   Sprint A1:  import './src/data/services/real/RealAuthService';
//   Sprint A2:  import './src/data/services/real/RealUserService';
//   Sprint B1:  import './src/data/services/real/realFridge.register';
//
// ⚠️ CHỈ import SAU KHI file đó đã được tạo trong src/data/services/real/.
//    Import file không tồn tại = app crash ngay khi khởi động
//    ("Unable to resolve module"), kể cả khi USE_MOCKS=true.
//    Phase 0 chưa có Real*Service nào (tạo ở A1/B1 trở đi) nên vùng này
//    để trống là đúng.
//
// ──────────────────────────────────────────────────────────────────
// B1 — Fridge CRUD (đã tạo file, đăng ký key 'fridgeService')
//
// ⚠️ VÌ SAO IMPORT Ở ĐÂY MÀ KHÔNG Ở SERVICE PROVIDER:
// `ServiceProvider.jsx` là file IMMUTABLE từ P0.5 (không sửa được).
// Cơ chế registry yêu cầu side-effect import ở entry point.
//
// TÁC DỤNG:
//   USE_MOCKS=false -> `resolveServices()` bọc `RealFridgeService` trong
//   `withFallback()` -> domain 'fridgeService' gọi BE thật.
//   USE_MOCKS=true  -> vẫn là mock (không đổi hành vi UI design).
// ──────────────────────────────────────────────────────────────────
import './src/data/services/real/RealFridgeService';
// ══════════════════════════════════════════════════════════════════

// Sprint A1: đăng ký RealAuthService (side-effect registerService).
// Auth là domain NHẠY CẢM - không bao giờ fallback sang mock (xem ServiceRegistry).
import './src/data/services/real/RealAuthService';

// Sprint A2: đăng ký RealUserService (profile / preferences / allergies / onboarding).
import './src/data/services/real/RealUserService';

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [isDbReady, setIsDbReady] = useState(false);

  const initAuth = useAuthStore((s) => s.initAuth);
  const initTheme = useThemeStore((s) => s.initTheme);
  const initLocale = useLanguageStore((s) => s.initLocale);

  useEffect(() => {
    (async () => {
      initAuth();
      initTheme();
      initLocale();
      // P0.6: chi seed khi USE_MOCKS=true (xem src/data/appInit.test.js)
      await initAppShell();
      setIsDbReady(true);
    })();
  }, []);

  if (!fontsLoaded || !isDbReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <AppProviders>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar barStyle="dark-content" />
      </NavigationContainer>
      <Toast />
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.lightBackground,
  },
});
