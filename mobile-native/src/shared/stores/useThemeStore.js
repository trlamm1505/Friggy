// Map ThemeProvider trong Flutter
import { create } from 'zustand';
import { Appearance } from 'react-native';

const STORAGE_KEY = 'themeMode';

let mmkv;
try {
  const { MMKV } = require('react-native-mmkv');
  mmkv = new MMKV();
} catch (e) {
  // MMKV not available - fallback to in-memory
  const memStore = {};
  mmkv = {
    getString: (k) => memStore[k],
    set: (k, v) => {
      memStore[k] = v;
    },
  };
}

export const useThemeStore = create((set) => ({
  themeMode: 'system', // 'light' | 'dark' | 'system'
  initTheme: () => {
    try {
      const saved = mmkv.getString(STORAGE_KEY);
      if (saved) {
        set({ themeMode: saved });
      } else {
        const sys = Appearance.getColorScheme();
        set({ themeMode: sys === 'dark' ? 'dark' : 'light' });
      }
    } catch (e) {
      // fallback
    }
  },
  setThemeMode: (mode) => {
    try {
      mmkv.set(STORAGE_KEY, mode);
    } catch (e) {
      // ignore
    }
    set({ themeMode: mode });
  },
}));
