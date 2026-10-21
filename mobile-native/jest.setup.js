/**
 * Jest setup - mock các module native không chạy được trong môi trường Node
 *
 * Theo P0.6d: mock react-native-mmkv, expo-sqlite, expo-localization
 */

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => {
    const store = new Map();
    return {
      getString: (k) => store.get(k),
      set: (k, v) => store.set(k, v),
      delete: (k) => store.delete(k),
      contains: (k) => store.has(k),
      getAllKeys: () => Array.from(store.keys()),
      clearAll: () => store.clear(),
    };
  }),
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'vi' }],
}));
