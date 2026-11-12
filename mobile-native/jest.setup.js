/**
 * Jest setup - mock các module native không chạy được trong môi trường Node
 *
 * Theo P0.6d: mock react-native-mmkv, expo-sqlite, expo-localization
 * Thêm P0 (offline): mock expo-network
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

/**
 * Mock `expo-sqlite` bằng engine giả (SQLite thật không chạy được trong Node).
 *
 * ⚠️ P0 (offline): dùng `createExpoSqliteMock()` thay vì `jest.fn()` rỗng, để
 *    test được logic cache + hàng đợi đồng bộ (query thật, dữ liệu thật).
 *    `__resetFakeDb()` được export để xoá sạch dữ liệu giữa các test case.
 */
jest.mock('expo-sqlite', () => {
  // eslint-disable-next-line global-require
  const { createExpoSqliteMock } = require('./src/data/offline/__tests__/helpers/fakeSqlite');
  return createExpoSqliteMock();
});

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'vi' }],
}));

/**
 * Mock `expo-network`.
 *
 * ⚠️ Mặc định = ONLINE. Đa số test cần trạng thái online để hành vi
 *    mặc định của app (gọi API thật) được giữ nguyên.
 *    Test offline sẽ gọi `__setNetworkStateForTest({ type: 'NONE' })`.
 */
jest.mock('expo-network', () => {
  const NetworkStateType = {
    NONE: 'NONE',
    WIFI: 'WIFI',
    CELLULAR: 'CELLULAR',
    ETHERNET: 'ETHERNET',
    VPN: 'VPN',
    UNKNOWN: 'UNKNOWN',
  };

  let currentState = {
    type: NetworkStateType.WIFI,
    isConnected: true,
    isInternetReachable: true,
    details: { isConnectionExpensive: false },
  };

  const listeners = new Set();

  return {
    NetworkStateType,
    getNetworkStateAsync: jest.fn(async () => currentState),
    addNetworkStateListener: jest.fn((listener) => {
      listeners.add(listener);
      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    }),
    /** Test-only: đổi trạng thái mạng + bắn listener. */
    __setNetworkStateForTest: (next) => {
      currentState = { ...currentState, ...next };
      listeners.forEach((listener) => listener(currentState));
    },
    __resetNetworkStateForTest: () => {
      currentState = {
        type: NetworkStateType.WIFI,
        isConnected: true,
        isInternetReachable: true,
        details: { isConnectionExpensive: false },
      };
      listeners.clear();
    },
  };
});
