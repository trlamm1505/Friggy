import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      setIsDark(systemScheme === 'dark');
    } else {
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode, systemScheme]);

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
