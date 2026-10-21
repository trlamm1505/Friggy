/**
 * appConfig - Cấu hình app + network
 *
 * Port từ Flutter: Mobile/lib/config/app_constants.dart
 *
 * LƯU Ý QUAN TRỌNG VỀ getImageUrl():
 * BE dùng 2 host khác nhau:
 *   - API  : api.friggy.io.vn
 *   - File : file.friggy.io.vn
 * Nếu bỏ qua hàm này, ảnh sẽ KHÔNG hiển thị mà KHÔNG có lỗi nào hiện ra.
 */

const DEFAULT_API_BASE_URL = 'https://api.friggy.io.vn/api/v1';
const DEFAULT_FILE_BASE_URL = 'https://file.friggy.io.vn';

const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
const rawFileBaseUrl = process.env.EXPO_PUBLIC_FILE_BASE_URL || '';

/**
 * Cắt `/api/v1` khỏi cuối base URL để lấy server root.
 * Flutter: AppConstants.serverBaseUrl
 */
export const getServerBaseUrl = () => {
  if (rawApiBaseUrl.endsWith('/api/v1')) {
    return rawApiBaseUrl.substring(0, rawApiBaseUrl.length - '/api/v1'.length);
  }
  return rawApiBaseUrl;
};

/**
 * Host chứa file (avatar, ảnh món ăn, ảnh scan...).
 * Nếu override env rỗng và base URL là production -> dùng file.friggy.io.vn.
 * Ngược lại (dev/staging) -> dùng serverBaseUrl.
 *
 * Flutter: AppConstants.fileBaseUrl
 */
export const getFileBaseUrl = () => {
  if (rawFileBaseUrl) return rawFileBaseUrl;
  if (rawApiBaseUrl.includes('api.friggy.io.vn')) {
    return DEFAULT_FILE_BASE_URL;
  }
  return getServerBaseUrl();
};

/**
 * Chuẩn hoá URL ảnh về dạng absolute.
 *
 * Flutter: AppConstants.getImageUrl
 */
export const getImageUrl = (url) => {
  if (url === null || url === undefined) return null;
  if (typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return null;

  let formatted = trimmed;

  // BE có thể trả URL API host cho ảnh -> đổi sang file host
  if (formatted.includes('api.friggy.io.vn')) {
    formatted = formatted.replaceAll('api.friggy.io.vn', 'file.friggy.io.vn');
  }

  if (formatted.startsWith('http://') || formatted.startsWith('https://')) {
    return formatted;
  }

  if (formatted.startsWith('file.friggy.io.vn')) {
    return `https://${formatted}`;
  }

  const leadingSlash = formatted.startsWith('/') ? '' : '/';
  return `${getFileBaseUrl()}${leadingSlash}${formatted}`;
};

const rawUseMocks = process.env.EXPO_PUBLIC_USE_MOCKS;
const rawSafeFallback = process.env.EXPO_PUBLIC_SAFE_FALLBACK;

export const appConfig = {
  // Network
  API_BASE_URL: rawApiBaseUrl,
  TIMEOUT_MS: 30000,

  // Flags
  USE_MOCKS: rawUseMocks === 'true',
  SAFE_FALLBACK: rawSafeFallback !== 'false',

  // App info
  APP_NAME: 'Friggy',
  APP_VERSION: '1.0.0',
  GOOGLE_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    '717739810642-4neqbd4q4v3i65hup78shtn557u80d3s.apps.googleusercontent.com',

  // Helpers - xem P0.1 "BAT BUOC"
  getServerBaseUrl,
  getFileBaseUrl,
  getImageUrl,
};
