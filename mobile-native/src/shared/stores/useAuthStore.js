// Map Auth state
import { create } from 'zustand';

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
    delete: (k) => {
      delete memStore[k];
    },
  };
}

const STORAGE_USER = 'user';
const STORAGE_ONBOARDED = 'isOnboarded';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isOnboarded: false,
  initAuth: () => {
    try {
      const saved = mmkv.getString(STORAGE_USER);
      const savedOnboarded = mmkv.getString(STORAGE_ONBOARDED);
      if (saved) {
        const user = JSON.parse(saved);
        set({
          user,
          isAuthenticated: true,
          isOnboarded: savedOnboarded === 'true',
        });
      }
    } catch (e) {
      // ignore
    }
  },
  login: (user) => {
    try {
      mmkv.set(STORAGE_USER, JSON.stringify(user));
    } catch (e) {
      // ignore
    }
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    try {
      mmkv.delete(STORAGE_USER);
      mmkv.delete(STORAGE_ONBOARDED);
    } catch (e) {
      // ignore
    }
    set({ user: null, isAuthenticated: false, isOnboarded: false });
  },
  completeOnboarding: () => {
    try {
      mmkv.set(STORAGE_ONBOARDED, 'true');
    } catch (e) {
      // ignore
    }
    set({ isOnboarded: true });
  },
  setUser: (user) => set({ user }),
}));
