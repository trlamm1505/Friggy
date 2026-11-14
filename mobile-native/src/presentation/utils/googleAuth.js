/**
 * googleAuth - lấy Google ID Token để gọi POST /auth/google.
 *
 * Sprint A1. Q1 trong plan đã chốt: dùng `expo-auth-session` + Google Provider
 * (KHÔNG dùng `expo-google-sign-in`).
 *
 * Vì sao cần file riêng:
 *   - `expo-auth-session` là SDK native -> không chạy được trong Jest.
 *     Import nó ở top-level của màn hình sẽ làm vỡ test của cả app.
 *   - => Import lazy (require) bên trong hàm, chỉ khi user thực sự bấm nút Google.
 *
 * BE nhận `{ idToken }` - đây là ID token (JWT) của Google, KHÔNG phải access token.
 * Xem `Web/src/services/authService.js` -> `googleAuthApi(idToken)`.
 *
 * ⚠️ API expo-auth-session SDK 57 (đã khác SDK cũ):
 *   - `ResponseType.IdToken` KHÔNG còn tồn tại -> dùng chuỗi `'id_token'`.
 *     Enum `ResponseType` chỉ còn `Code` và `Token`; Google chỉ trả id_token ở
 *     luồng implicit (`response_type=id_token`), nên phải truyền string.
 *   - `makeAuthUrlAsync()` / `promptAsync()` BẮT BUỘC tham số `discovery`
 *     (trước đây discovery là optional) -> phải lấy từ Google.
 *   - `redirectUri` không được tự chế -> phải dùng `AuthSession.makeRedirectUri()`
 *     để expo-linking tự suy ra scheme từ app config.
 */

import { appConfig } from '../../shared/config/appConfig';

/** Google OIDC discovery document (BE dùng cũng issuer này để verify id_token). */
const GOOGLE_DISCOVERY = 'https://accounts.google.com';

/**
 * Google KHÔNG chấp nhận `response_type=id_token` với PKCE code flow mặc định.
 * Tắt PKCE để server trả thẳng id_token trong fragment (luồng implicit).
 * @see https://developers.google.com/identity/protocols/oauth2/openid-connect#implicit
 */
const buildGoogleAuthRequest = async () => {
  const AuthSession = require('expo-auth-session');

  const clientId = appConfig.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Chưa cấu hình GOOGLE_CLIENT_ID cho đăng nhập Google');
  }

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: ['openid', 'email', 'profile'],
    redirectUri: AuthSession.makeRedirectUri({
      scheme: appConfig.APP_SCHEME,
      path: 'oauthredirect',
    }),
    responseType: 'id_token',
    usePKCE: false,
    extraParams: { nonce: generateNonce() },
  });

  // SDK 57 bắt buộc truyền discovery document vào cả 2 hàm này.
  const discovery = await AuthSession.fetchDiscoveryAsync(GOOGLE_DISCOVERY);

  return { request, discovery };
};

/** Nonce ngẫu nhiên để chống replay token (Google yêu cầu khi dùng id_token). */
const generateNonce = () => {
  // expo-crypto đã có sẵn (dùng cho PKCE). Nếu không có -> fallback Math.random
  // (yếu hơn nhưng vẫn hơn việc không có nonce).
  try {
    const Crypto = require('expo-crypto');
    const bytes = new Uint8Array(16);
    Crypto.getRandomBytes(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (_e) {
    return String(Date.now()) + String(Math.floor(Math.random() * 1e9));
  }
};

/**
 * Lấy Google ID Token qua expo-auth-session.
 *
 * @returns {Promise<string|null>} ID token, hoặc null nếu user huỷ
 * @throws {Error} khi SDK lỗi (mạng, cấu hình client id sai...)
 */
export const getGoogleIdToken = async () => {
  const { request, discovery } = await buildGoogleAuthRequest();

  const redirectUrl = await request.makeAuthUrlAsync(discovery);
  const result = await request.promptAsync(discovery, { url: redirectUrl });

  if (result?.type !== 'success') {
    // User huỷ hoặc lỗi -> trả null, UI hiện thông báo nhẹ nhàng
    if (result?.type === 'cancel' || result?.type === 'dismiss') {
      return null;
    }
    throw new Error(
      result?.params?.error_description ||
        result?.error?.message ||
        'Không thể đăng nhập bằng Google'
    );
  }

  const idToken = result?.params?.id_token;
  if (!idToken) {
    throw new Error('Không lấy được Google ID Token');
  }

  return idToken;
};
