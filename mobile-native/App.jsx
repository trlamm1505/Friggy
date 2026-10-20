import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import Toast from 'react-native-toast-message';
import { AppProviders } from './src/providers/AppProviders';
import { RootNavigator } from './src/presentation/navigation/RootNavigator';
import { useAuthStore } from './src/shared/stores/useAuthStore';
import { useThemeStore } from './src/shared/stores/useThemeStore';
import { useLanguageStore } from './src/shared/stores/useLanguageStore';
import { AppColors } from './src/presentation/theme/colors';
import { seedAll } from './src/data/storage/seedData';

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
      try {
        // Khởi tạo stores
        initAuth();
        initTheme();
        initLocale();
        // Seed dữ liệu mock vào SQLite (idempotent)
        await seedAll();
      } catch (e) {
        if (__DEV__) {
          console.warn('[App] Init error:', e);
        }
      } finally {
        setIsDbReady(true);
      }
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
