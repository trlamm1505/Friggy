/**
 * ApiClient - HTTP client dùng chung cho toàn bộ Real*Service
 *
 * Port từ: Web/src/utils/axios.js (đã chạy production) + Mobile/lib/data/services/dio_client.dart
 *
 * 8 BẮT BUỘC (P0.3):
 *   1. Response unwrap theo 3 nhánh
 *   2. Phân loại lỗi mạng vs lỗi server (ApiException.isNetworkError)
 *   3. `skipAuth` cho endpoint public (không gắn Bearer)
 *   4. Refresh token single-flight (isRefreshing + failedQueue)
 *   5. Retry giữ nguyên config gốc (method/data/headers/params)
 *   6. 401 tại endpoint AUTH -> KHÔNG refresh, KHÔNG logout
 *   7. Refresh token hết hạn theo config động (đọc expiresAt từ BE)
 *   8. KHÔNG hardcode bất kỳ giá trị BE đã làm dynamic
 */

import { create as createAxiosInstance } from 'axios';
import { appConfig } from '../../shared/config/appConfig';
import { TokenStorage } from '../storage/TokenStorage';
import { ApiException } from './ApiException';

// ─────────────────────────── Event emitter ───────────────────────────
// Screens nghe 'session-expired' để đưa user về màn Login.

const listeners = new Map();

export const onApiEvent = (event, handler) => {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => {
    listeners.get(event)?.delete(handler);
  };
};

const emitApiEvent = (event, payload) => {
  listeners.get(event)?.forEach((handler) => {
    try {
      handler(payload);
    } catch (e) {
      if (__DEV__) console.warn(`[ApiClient] listener lỗi cho "${event}":`, e);
    }
  });
};

// ─────────────────────────── Instance ───────────────────────────

const client = createAxiosInstance({
  baseURL: appConfig.API_BASE_URL,
  timeout: appConfig.TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// Client gốc, KHÔNG qua interceptor - dùng để gọi /auth/refresh tránh loop vô hạn
const rawClient = createAxiosInstance({
  baseURL: appConfig.API_BASE_URL,
  timeout: appConfig.TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// BẮT BUỘC 6: 401 ở các endpoint này = sai thông tin đăng nhập (sai mật khẩu,
// email sai, OTP sai), KHÔNG phải hết phiên. Source: commit BE 70aa944.
const SKIP_AUTH_REFRESH_ENDPOINTS = [
  '/auth/email/login',
  '/auth/email/register',
  '/auth/email/verify-otp',
  '/auth/email/forgot-password',
  '/auth/email/reset-password',
  '/auth/google',
  '/auth/phone/send-otp',
  '/auth/phone/verify',
];

const isAuthEndpoint = (url = '') => SKIP_AUTH_REFRESH_ENDPOINTS.some((path) => url.includes(path));

// ─────────────────────── BẮT BUỘC 4: single-flight ───────────────────────

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

/** Xóa token + báo cho app biết phiên hết hạn */
const handleSessionExpired = () => {
  TokenStorage.clearAll();
  emitApiEvent('session-expired');
};

/**
 * BẮT BUỘC 7: suy ra thời điểm hết hạn từ response BE.
 * Ưu tiên `expiresAt` BE trả về -> fallback decode JWT payload `exp`.
 * TUYỆT ĐỐI không hardcode 7 ngày (BE đã chuyển sang config động).
 */
const extractExpiry = (token) => {
  if (!token || typeof token !== 'string') return undefined;
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  try {
    // RN/Hermes có `atob` global. KHÔNG dùng `Buffer` - đó là API Node,
    // không tồn tại trong React Native runtime.
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = decodeURIComponent(
      Array.from(atob(padded))
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    const payload = JSON.parse(json);
    if (payload?.exp) return payload.exp * 1000; // giây -> ms
  } catch (_e) {
    // token không phải JWT hoặc decode lỗi -> bỏ qua, không chặn luồng
  }
  return undefined;
};

/**
 * Lưu access + refresh token mới kèm thời điểm hết hạn.
 *
 * BẮT BUỘC 7/8 - thứ tự ưu tiên:
 *   1. `expiresAt` / `accessExpiresAt` BE trả về  -> luôn dùng
 *   2. `expiresIn` (giây) BE trả về             -> quy đổi từ thời điểm hiện tại
 *   3. decode JWT payload `exp`                  -> khi BE không trả field nào
 *   4. ACCESS_TTL_FALLBACK_SECONDS               -> cuối cùng, CHỈ để app không vỡ
 *
 * Mục 4 KHÔNG phải "giá trị đúng": nếu admin đổi `token.accessTtl` trên BE,
 * BE sẽ trả `expiresAt`/`expiresIn` nên nhánh 1-2 được dùng và giá trị này không bao giờ chạm tới.
 */
const persistTokens = (data) => {
  if (!data) return;

  const now = Date.now();

  if (data.accessToken) {
    TokenStorage.setAccessToken(data.accessToken);
  }
  if (data.refreshToken) {
    TokenStorage.setRefreshToken(data.refreshToken);
  }

  const accessExpiresAt =
    data.accessExpiresAt ??
    data.expiresAt ??
    (data.expiresIn !== undefined && data.expiresIn !== null
      ? now + Number(data.expiresIn) * 1000
      : undefined) ??
    extractExpiry(data.accessToken) ??
    now + ACCESS_TTL_FALLBACK_SECONDS * 1000;

  const refreshExpiresAt = data.refreshExpiresAt ?? extractExpiry(data.refreshToken) ?? undefined;

  TokenStorage.setTokenExpiry({ accessExpiresAt, refreshExpiresAt });
};

// BẮT BUỘC 8: hằng số fallback CHỈ dùng khi BE không trả field nào.
// Không phải "giá trị đúng" - sẽ sai nếu admin đổi config trên BE.
const ACCESS_TTL_FALLBACK_SECONDS = 900;

// ─────────────────────── BẮT BUỘC 1 + 3: interceptors ───────────────────────

client.interceptors.request.use(
  (config) => {
    // BẮT BUỘC 3: endpoint public -> không gắn Bearer
    if (config.skipAuth) return config;

    const token = TokenStorage.getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  // ── BẮT BUỘC 1: unwrap 3 nhánh ──
  (response) => {
    const body = response.data;

    // Nhánh 1: có `data` khác null -> trả thẳng `data`
    if (body && typeof body === 'object' && 'data' in body && body.data !== null) {
      return body.data;
    }

    // Nhánh 2: `success: true` -> trả `data` (có thể null = hợp lệ, ví dụ xoá thành công)
    if (body && typeof body === 'object' && body.success === true) {
      return body.data ?? null;
    }

    // Nhánh 3: `success: false` -> lỗi dù HTTP 200
    if (body && typeof body === 'object' && body.success === false) {
      return Promise.reject(
        new ApiException(body.message || 'Thao tác thất bại', {
          statusCode: response.status,
          data: body,
          isNetworkError: false,
        })
      );
    }

    // Không có wrapper nào khớp -> trả nguyên body (endpoint trả thẳng)
    return body;
  },

  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    // ── BẮT BUỘC 6 + 4: xử lý 401 ──
    if (status === 401 && originalRequest && !originalRequest._retry) {
      // 401 ở endpoint AUTH = sai thông tin đăng nhập -> trả lỗi cho form, KHÔNG refresh
      if (originalRequest.skipAuthRefresh || isAuthEndpoint(originalRequest.url)) {
        return Promise.reject(ApiException.fromAxiosError(error));
      }

      // 401 ở /auth/refresh = hết phiên chắc chắn
      if (originalRequest.url?.includes('/auth/refresh')) {
        handleSessionExpired();
        return Promise.reject(
          new ApiException('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!', {
            statusCode: 401,
          })
        );
      }

      // Đang refresh -> request này xếp hàng chờ (BẮT BUỘC 4)
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            // BẮT BUỘC 5: giữ nguyên method/data/params của request gốc
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return client.request(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = TokenStorage.getRefreshToken();

      if (!refreshToken || TokenStorage.isRefreshTokenExpired()) {
        isRefreshing = false;
        const expiredErr = new ApiException('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!', {
          statusCode: 401,
        });
        processQueue(expiredErr, null);
        handleSessionExpired();
        return Promise.reject(expiredErr);
      }

      try {
        // rawClient: KHÔNG qua interceptor -> không loop vô hạn
        const refreshResponse = await rawClient.request({
          method: 'post',
          url: '/auth/refresh',
          data: { refreshToken },
          headers: { 'Content-Type': 'application/json' },
        });

        // BẮT BUỘC 1: áp dụng cùng quy tắc unwrap
        const resData = refreshResponse.data?.data ?? refreshResponse.data;
        const newAccessToken = resData?.accessToken;

        if (!newAccessToken) {
          throw new Error('Không lấy được Access Token mới');
        }

        persistTokens(resData);

        client.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

        // BẮT BUỘC 5: giữ nguyên config gốc khi replay
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return client.request(originalRequest);
      } catch (_refreshErr) {
        const expiredErr = new ApiException('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!', {
          statusCode: 401,
        });
        processQueue(expiredErr, null);
        handleSessionExpired();
        return Promise.reject(expiredErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(ApiException.fromAxiosError(error));
  }
);

// ─────────────────────────── Public API ───────────────────────────

/**
 * Gọi GET/POST/PATCH/PUT/DELETE.
 * @param {string} url
 * @param {object} [options]
 * @param {boolean} [options.skipAuth] - endpoint public, không gắn Bearer
 * @param {boolean} [options.skipAuthRefresh] - 401 ở endpoint này là lỗi form, không refresh
 */
const request = async (method, url, data, options = {}) => {
  const config = { ...options };
  if (data !== undefined && method !== 'get' && method !== 'delete') {
    config.data = data;
  }
  return client.request({ ...config, method, url });
};

export const ApiClient = {
  client,
  onApiEvent,

  get: (url, options) => request('get', url, undefined, options),
  post: (url, data, options) => request('post', url, data, options),
  patch: (url, data, options) => request('patch', url, data, options),
  put: (url, data, options) => request('put', url, data, options),
  delete: (url, options) => request('delete', url, undefined, options),

  /**
   * Upload file qua FormData (avatar, scan ảnh/receipt).
   * @param {string} url
   * @param {string} uri - URI cục bộ của file
   * @param {string} [fieldName='file']
   * @param {object} [formFields] - các field text kèm theo
   */
  uploadFile: async (url, uri, fieldName = 'file', formFields = {}) => {
    const formData = new FormData();
    formData.append(fieldName, {
      uri,
      name: uri.split('/').pop() || 'upload',
      type: 'image/jpeg',
    });
    Object.entries(formFields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, String(value));
    });

    // KHÔNG set Content-Type thủ công - axios/FormData phải tự set boundary
    return client.request({
      method: 'post',
      url,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Dùng cho các flow đặc biệt cần gọi trực tiếp (vd: OAuth, streaming) */
  raw: rawClient,
};

export default ApiClient;
