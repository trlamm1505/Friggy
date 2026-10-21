/**
 * TokenStorage - Quản lý token + user data trong MMKV
 *
 * Port từ Flutter: Mobile/lib/config/app_constants.dart (4 storage keys)
 * Bổ sung sau merge BE 21/10 (commit 43f0103): 2 keys hết hạn động.
 *
 * Storage keys PHẢI giống hệt Flutter để Flutter/RN đọc chung được data:
 *   access_token, refresh_token, user_id, user_data
 *
 * Keys mới (optional - app vẫn chạy nếu thiếu):
 *   token_expires_at, refresh_expires_at
 */

let mmkv;
try {
  const { MMKV } = require('react-native-mmkv');
  mmkv = new MMKV();
} catch (_e) {
  // Fallback in-memory khi MMKV chưa load (test, web, chưa rebuild native)
  const memStore = {};
  mmkv = {
    getString: (k) => memStore[k],
    set: (k, v) => {
      memStore[k] = v;
    },
    contains: (k) => memStore[k] !== undefined,
    delete: (k) => {
      delete memStore[k];
    },
  };
}

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
  USER_DATA: 'user_data',
  TOKEN_EXPIRES_AT: 'token_expires_at',
  REFRESH_EXPIRES_AT: 'refresh_expires_at',
};

/** Buffer 60s: coi token là hết hạn sớm hơn để tránh hết hạn giữa chừng request */
const EXPIRY_BUFFER_MS = 60 * 1000;

const readString = (key) => {
  try {
    const v = mmkv.getString(key);
    return v === undefined || v === null ? null : v;
  } catch (_e) {
    return null;
  }
};

const writeString = (key, value) => {
  try {
    mmkv.set(key, value);
  } catch (_e) {
    // ignore - storage lỗi không được làm crash app
  }
};

const removeKey = (key) => {
  try {
    mmkv.delete(key);
  } catch (_e) {
    // ignore
  }
};

export const TokenStorage = {
  KEYS,

  // ---------- Access token ----------
  getAccessToken: () => readString(KEYS.ACCESS_TOKEN),
  setAccessToken: (token) => writeString(KEYS.ACCESS_TOKEN, token),

  // ---------- Refresh token ----------
  getRefreshToken: () => readString(KEYS.REFRESH_TOKEN),
  setRefreshToken: (token) => writeString(KEYS.REFRESH_TOKEN, token),

  // ---------- User ----------
  getUserId: () => readString(KEYS.USER_ID),
  setUserId: (id) => writeString(KEYS.USER_ID, String(id)),

  getUserData: () => {
    const raw = readString(KEYS.USER_DATA);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  },
  setUserData: (user) => {
    if (!user) {
      removeKey(KEYS.USER_DATA);
      return;
    }
    writeString(KEYS.USER_DATA, JSON.stringify(user));
  },

  // ---------- Expiry động (sau merge BE 21/10) ----------
  /**
   * Lưu thời điểm hết hạn của cả 2 token.
   * @param {{accessExpiresAt?: number, refreshExpiresAt?: number}} expiry - timestamp (ms)
   */
  setTokenExpiry: ({ accessExpiresAt, refreshExpiresAt } = {}) => {
    if (accessExpiresAt !== undefined && accessExpiresAt !== null) {
      writeString(KEYS.TOKEN_EXPIRES_AT, String(accessExpiresAt));
    }
    if (refreshExpiresAt !== undefined && refreshExpiresAt !== null) {
      writeString(KEYS.REFRESH_EXPIRES_AT, String(refreshExpiresAt));
    }
  },

  /** @returns {number|null} timestamp (ms), null nếu chưa có -> coi như chưa hết hạn */
  getAccessExpiresAt: () => {
    const raw = readString(KEYS.TOKEN_EXPIRES_AT);
    return raw === null ? null : Number(raw);
  },

  /** @returns {number|null} timestamp (ms), null nếu chưa có */
  getRefreshExpiresAt: () => {
    const raw = readString(KEYS.REFRESH_EXPIRES_AT);
    return raw === null ? null : Number(raw);
  },

  /**
   * Access token còn hạn không? Có buffer 60s.
   * Chưa có thông tin hết hạn -> coi như CHƯA hết hạn (để app vẫn chạy).
   */
  isAccessTokenExpired: () => {
    const exp = TokenStorage.getAccessExpiresAt();
    if (exp === null || Number.isNaN(exp)) return false;
    return Date.now() >= exp - EXPIRY_BUFFER_MS;
  },

  /** Refresh token còn hạn không? Có buffer 60s. */
  isRefreshTokenExpired: () => {
    const exp = TokenStorage.getRefreshExpiresAt();
    if (exp === null || Number.isNaN(exp)) return false;
    return Date.now() >= exp - EXPIRY_BUFFER_MS;
  },

  // ---------- Session ----------
  /**
   * Đúng logic Flutter: chỉ kiểm tra access_token có và không rỗng.
   * KHÔNG kiểm tra hết hạn ở đây - ApiClient lo phần đó.
   */
  isLoggedIn: () => {
    const token = TokenStorage.getAccessToken();
    return !!token && token.length > 0;
  },

  /** Xóa CẢ 6 keys trong 1 lần */
  clearAll: () => {
    Object.values(KEYS).forEach(removeKey);
  },
};

export default TokenStorage;
