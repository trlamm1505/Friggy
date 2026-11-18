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
 * API base URL có trỏ về máy local / LAN không?
 *
 * ⚠️ VÌ SAO CẦN:
 *   BE phục vụ ảnh (avatar, ảnh món ăn) từ CHÍNH server của API:
 *   `app.useStaticAssets(join(process.cwd(), 'public'))` được gọi TRƯỚC
 *   `app.setGlobalPrefix('api')` -> file tĩnh nằm ở ROOT (`/avatars/x.jpg`),
 *   KHÔNG phải `/api/v1/avatars/x.jpg`.
 *
 *   Khi đang dev (API = `http://192.168.x.x:6969` hoặc `localhost`), file base
 *   URL PHẢI suy ra từ chính API base URL. Nếu còn giữ override cũ
 *   (`EXPO_PUBLIC_FILE_BASE_URL` trỏ ngrok đã hết hạn) thì ảnh sẽ hỏng
 *   trong khi API vẫn chạy -> user thấy avatar "không hiển thị".
 */
const isLocalApiUrl = (url) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(
    String(url ?? '').trim()
  );

/**
 * File base URL đang trỏ về host PRODUCTION không?
 *
 * ⚠️ VÌ SAO CẦN:
 *   Production dùng CDN `file.friggy.io.vn` -> path `/public/x.jpg` là ĐÚNG
 *   (giữ nguyên). Mọi host khác (localhost / LAN / ngrok / staging) đều trỏ
 *   thẳng về BE (Express) -> BE serve `public/` ở ROOT -> `/public/x.jpg` 404.
 *
 *   => Chỉ giữ prefix `/public/` khi đang ở production.
 */
const isProductionFileHost = () => {
  const host = getFileBaseUrl();
  return /(^|\.)friggy\.io\.vn$/i.test(host.replace(/^https?:\/\//, '').replace(/\/.*$/, ''));
};

/**
 * Cắt `/api/v1` khỏi cuối base URL để lấy server root.
 * Flutter: AppConstants.serverBaseUrl
 */
export const getServerBaseUrl = () => {
  const trimmed = rawApiBaseUrl.replace(/\/+$/, '');
  if (trimmed.endsWith('/api/v1')) {
    return trimmed.substring(0, trimmed.length - '/api/v1'.length);
  }
  return trimmed;
};

/**
 * Host chứa file (avatar, ảnh món ăn, ảnh scan...).
 * Nếu override env rỗng và base URL là production -> dùng file.friggy.io.vn.
 * Ngược lại (dev/staging) -> dùng serverBaseUrl.
 *
 * Flutter: AppConstants.fileBaseUrl
 */
export const getFileBaseUrl = () => {
  // ⚠️ API đang trỏ về máy local/LAN -> file tĩnh cũng nằm trên máy đó.
  //   BỎ QUA override `EXPO_PUBLIC_FILE_BASE_URL` (thường là URL ngrok đã
  //   hết hạn) để ảnh không bị hỏng trong khi API vẫn chạy bình thường.
  if (isLocalApiUrl(rawApiBaseUrl)) {
    return getServerBaseUrl();
  }

  if (rawFileBaseUrl) return rawFileBaseUrl.replace(/\/+$/, '');
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

  // URI file LOCAL (avatar offline, ảnh nháp trong máy) -> giữ nguyên.
  // Nếu prefix base URL vào, `<Image>` sẽ không load được (offline).
  if (
    formatted.startsWith('file://') ||
    formatted.startsWith('content://') ||
    formatted.startsWith('ph://') ||
    formatted.startsWith('data:') ||
    formatted.startsWith('assets-library://')
  ) {
    return formatted;
  }

  if (formatted.startsWith('file.friggy.io.vn')) {
    return `https://${formatted}`;
  }

  // ⚠️ BE (và seed SQL cũ) có thể lưu path kèm prefix `/public/`.
  //   - Ở MỌI môi trường dev (localhost / LAN / ngrok): Express serve thư mục
  //     `public/` ở ROOT -> `/public/x.jpg` bị 404 -> phải bỏ prefix.
  //   - Ở PRODUCTION: `file.friggy.io.vn` tự xử lý -> GIỮ NGUYÊN path
  //     để không đổi hành vi của app đang chạy.
  //
  //   Quy tắc: bỏ prefix khi file base URL KHÔNG phải host production.
  if (formatted.startsWith('/public/') && !isProductionFileHost()) {
    formatted = formatted.substring('/public'.length);
  }

  const leadingSlash = formatted.startsWith('/') ? '' : '/';
  return `${getFileBaseUrl()}${leadingSlash}${formatted}`;
};

const rawUseMocks = process.env.EXPO_PUBLIC_USE_MOCKS;
const rawSafeFallback = process.env.EXPO_PUBLIC_SAFE_FALLBACK;
const rawOfflineEnabled = process.env.EXPO_PUBLIC_OFFLINE_ENABLED;

/**
 * Header để bỏ qua trang cảnh báo của ngrok.
 *
 * ⚠️ VÌ SAO CẦN:
 *   Khi truy cập `https://xxx.ngrok-free.dev/...` từ trình duyệt, ngrok chèn
 *   một trang HTML "ngrok-skip-browser-warning" trước khi trả response thật.
 *   Header này bảo ngrok BỎ QUA trang cảnh báo đó.
 *
 * ⚠️ Gửi header này tới host khác (VD production) là vô hại - server đơn giản
 *   bỏ qua header lạ. Vì vậy ta gửi LUÔN, không phân nhánh theo tên miền
 *   (ngrok custom domain có thể không chứa chuỗi "ngrok").
 */
export const NGROK_SKIP_BROWSER_WARNING = 'ngrok-skip-browser-warning';

/** Header dùng chung cho MỌI request (REST + SSE). */
export const EXTRA_HEADERS = {
  [NGROK_SKIP_BROWSER_WARNING]: 'true',
};

export const appConfig = {
  // Network
  API_BASE_URL: rawApiBaseUrl,
  TIMEOUT_MS: 30000,

  // Flags
  USE_MOCKS: rawUseMocks === 'true',

  /**
   * `SAFE_FALLBACK` — cho phép trả DỮ LIỆU GIẢ (mock) khi BE lỗi hay không.
   *
   * ⚠️ MẶC ĐỊNH = `false` (KHÔNG trả dữ liệu giả):
   *   App tủ lạnh mà hiện "Cà chua hết hạn" của tủ ảo thì NGUY HIỂM hơn cả
   *   lỗi — user có thể bỏ món thật trong nhà. Vì vậy mặc định an toàn là
   *   không có mock, chỉ bật khi chủ động muốn (demo UI / BE down).
   *
   * ⚠️ CỜ NÀY ĐỘC LẬP VỚI `OFFLINE_ENABLED`:
   *   `SAFE_FALLBACK=false` KHÔNG được tắt tầng offline. Xem `OFFLINE_ENABLED`.
   */
  SAFE_FALLBACK: rawSafeFallback === 'true',

  /**
   * `OFFLINE_ENABLED` — bật TẦNG OFFLINE (đọc cache SQLite + ghi hàng đợi).
   *
   * ⚠️ VÌ SAO TÁCH KHỎI `SAFE_FALLBACK`:
   *   Trước đây `withFallback` dùng chung 1 cờ `enabled`. `enabled=false`
   *   khiến hàm `return realService` — trả thẳng service thật, KHÔNG có proxy
   *   -> `cacheFallback` (đọc cache) và `mutationHandler` (ghi hàng đợi)
   *   KHÔNG BAO GIỜ chạy -> toàn bộ kiến trúc offline là code chết.
   *   => Tách 2 cờ: bật offline + tắt mock là 2 quyết định độc lập.
   *
   * ⚠️ MẶC ĐỊNH = `true` (an toàn): không có env vẫn có offline.
   */
  OFFLINE_ENABLED: rawOfflineEnabled !== 'false',

  // App info
  APP_NAME: 'Friggy',
  APP_VERSION: '1.0.0',
  /**
   * URI scheme của app. PHẢI khớp với `expo.scheme` trong app.json.
   *
   * Vì sao cần: `AuthSession.makeRedirectUri()` dùng scheme này để Google
   * redirect về đúng app. Nếu lệch với app.json, Google báo
   * "Error 400: redirect_uri_mismatch".
   */
  APP_SCHEME: 'friggy',
  GOOGLE_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    '717739810642-4neqbd4q4v3i65hup78shtn557u80d3s.apps.googleusercontent.com',

  // Helpers - xem P0.1 "BAT BUOC"
  getServerBaseUrl,
  getFileBaseUrl,
  getImageUrl,

  // Headers dùng chung (ngrok bypass warning)
  EXTRA_HEADERS,
  NGROK_SKIP_BROWSER_WARNING,
};
