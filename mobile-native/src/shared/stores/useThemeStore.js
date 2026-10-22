// Map ThemeProvider trong Flutter
import { create } from 'zustand';

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
  // Mặc định 'light': thiết kế gradient nền (AppGradients) được dựng cho nền
  // sáng trước. 'system' khiến máy đang ở dark mode mở app ra là tối ngay,
  // không đúng ý đồ sản phẩm. Người dùng vẫn đổi được trong App Settings.
  themeMode: 'light', // 'light' | 'dark' | 'system'
  initTheme: () => {
    try {
      const saved = mmkv.getString(STORAGE_KEY);
      if (saved) {
        set({ themeMode: saved });
      } else {
        // Không có lựa chọn đã lưu -> dùng mặc định sáng.
        set({ themeMode: 'light' });
      }
    } catch (e) {
      set({ themeMode: 'light' });
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
