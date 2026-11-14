// Map LanguageProvider trong Flutter
import { create } from 'zustand';
import { getLocales } from 'expo-localization';

const STORAGE_KEY = 'language';

let mmkv;
try {
  const { MMKV } = require('react-native-mmkv');
  mmkv = new MMKV();
} catch (e) {
  const memStore = {};
  mmkv = {
    getString: (k) => memStore[k],
    set: (k, v) => {
      memStore[k] = v;
    },
  };
}

const detectInitialLocale = () => {
  try {
    const locales = getLocales();
    if (locales && locales[0] && locales[0].languageCode === 'en') {
      return 'en';
    }
  } catch (e) {
    // ignore
  }
  return 'vi'; // Default Vietnamese
};

export const useLanguageStore = create((set) => ({
  locale: detectInitialLocale(),
  initLocale: () => {
    try {
      const saved = mmkv.getString(STORAGE_KEY);
      if (saved) {
        set({ locale: saved });
      }
    } catch (e) {
      // ignore
    }
  },
  setLocale: (lang) => {
    try {
      mmkv.set(STORAGE_KEY, lang);
    } catch (e) {
      // ignore
    }
    set({ locale: lang });
  },
  toggleLocale: () => {
    set((state) => {
      const next = state.locale === 'vi' ? 'en' : 'vi';
      try {
        mmkv.set(STORAGE_KEY, next);
      } catch (e) {
        // ignore
      }
      return { locale: next };
    });
  },
}));
