import React, { createContext, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { AppColors } from './colors';
import { useThemeStore } from '../../shared/stores/useThemeStore';

const ThemeContext = createContext({
  isDark: false,
  colors: AppColors,
  themeMode: 'system',
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const { themeMode, setThemeMode, initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
    // initTheme là action của zustand store (hàm ổn định) -> thêm vào deps an toàn.
  }, [initTheme]);

  // isDark được SUY RA trực tiếp từ themeMode + systemScheme thay vì giữ
  // state + effect. Cách cũ gây 1 render với isDark sai (mặc định false)
  // trước khi effect chạy -> nháy nền sáng ở dark mode.
  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';

  const value = {
    isDark,
    colors: AppColors,
    themeMode,
    toggleTheme: () => setThemeMode(isDark ? 'light' : 'dark'),
    setTheme: setThemeMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
