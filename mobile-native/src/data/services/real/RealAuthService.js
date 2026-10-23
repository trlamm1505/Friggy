/**
 * RealAuthService - nối auth thật với BE.
 *
 * Sprint A1. Nguồn sự thật: BE controller `be/src/modules-api/auth/auth.controller.ts`
 * + DTO `be/src/modules-api/auth/dto/auth.dto.ts` / `auth-response.dto.ts`.
 *
 * ⚠️ QUY TẮC AN TOÀN - AUTH KHÔNG BAO GIỜ FALLBACK SANG MOCK:
 * SafeService (P0.6b) fallback mock khi lỗi 5xx / network. Nếu áp dụng cho auth,
 * đăng nhập hỏng sẽ "thành công" bằng user giả -> tạo phiên giả, mất tiền khi
 * đăng ký gói, và user không biết mình đang trong app giả.
 * => `_throwAuthError()` đổi lỗi 5xx/network thành ApiException 4xx (statusCode 400)
 *    để SafeService ném lên UI, UI hiển thị đúng lỗi thật.
 *    4xx thật (sai mật khẩu, OTP sai, email trùng) -> giữ nguyên, không đổi message.
 *
 * R2: mọi URL ảnh đi qua `appConfig.getImageUrl()` (BE dùng 2 host khác nhau).
 * R5: chỉ đọc token qua `TokenStorage`, KHÔNG import `useAuthStore`.
 */

import { IAuthService } from '../../interfaces/IAuthService';
import { ApiClient } from '../../api/ApiClient';
import { ApiException } from '../../api/ApiException';
import { TokenStorage } from '../../storage/TokenStorage';
import { appConfig } from '../../../shared/config/appConfig';
import { registerService } from '../../api/ServiceRegistry';

/** Endpoint public: không gắn Bearer, 401 = sai thông tin chứ không phải hết phiên */
const PUBLIC = { skipAuth: true, skipAuthRefresh: true };

/**
 * Đọc `exp` từ JWT payload để biết token hết hạn lúc nào.
 *
 * BE KHÔNG trả `expiresAt`/`expiresIn` trong response login (AuthResponseDto chỉ có
 * accessToken/refreshToken/user/isNewUser). ApiClient có sẵn hàm này nhưng là private
 * và ApiClient.js là file Phase 0 (ngoài phạm vi sửa của Sprint A1) -> copy logic tối thiểu.
 *
 * @param {string} token
 * @returns {number|undefined} timestamp (ms)
 */
const decodeJwtExpiry = (token) => {
  if (!token || typeof token !== 'string') return undefined;
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = decodeURIComponent(
      Array.from(atob(padded))
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    const payload = JSON.parse(json);
    if (payload?.exp) return payload.exp * 1000;
  } catch (_e) {
    // Token không phải JWT hoặc decode lỗi -> bỏ qua, app vẫn chạy được
  }
  return undefined;
};

export class RealAuthService extends IAuthService {
  constructor() {
    super();
    // ══════════════════════════════════════════════════════════════
    // QUY TẮC AN TOÀN - ĐỔI MỘT DÒNG NÀY ĐỔI HÀNH VI CẢ APP
    // ══════════════════════════════════════════════════════════════
    // ServiceRegistry đọc cờ này để KHÔNG bọc withFallback cho domain auth.
    // Lý do: nếu đăng nhập lỗi mà fallback sang MockAuthService, app sẽ
    // "đăng nhập thành công" bằng user giả -> user tưởng đã vào tài khoản thật,
    // và mọi thao tác sau đó (đăng ký gói, đổi mật khẩu) ghi vào tài khoản giả.
    // Lỗi hiển thị "không kết nối được" còn tốt hơn lỗi âm thầm mất dữ liệu.
    this.criticalAuth = true;
  }

  // ═══════════════════════════════════════════════════════════════
  // MAPPER - BE -> shape của IAuthService
  // ═══════════════════════════════════════════════════════════════

  /**
   * BE `AuthUserDto` / `MeResponseDto` -> `AuthUser` của interface.
   * BE có `name`/`email` nullable -> giữ null thay vì undefined.
   */
  _toAuthUser(dto) {
    if (!dto) return null;
    const avatarPath = dto.profile?.avatarUrl ?? dto.avatarUrl ?? null;
    return {
      id: dto.id,
      name: dto.name ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      // R2: ảnh phải qua getImageUrl (BE API host vs file host khác nhau)
      avatar: appConfig.getImageUrl(avatarPath),
      joinDate: dto.createdAt ?? undefined,
      isOnboardingCompleted: dto.isOnboardingCompleted === true,
      role: dto.role ?? undefined,
      status: dto.status ?? undefined,
    };
  }

  /**
   * Lưu token + user vào TokenStorage.
   * `clearAll()` xoá cả 6 keys nên gọi `setUserData` SAU `setAccessToken` (không xung đột).
   */
  _persistSession(accessToken, refreshToken, user) {
    if (accessToken) TokenStorage.setAccessToken(accessToken);
    if (refreshToken) TokenStorage.setRefreshToken(refreshToken);

    const accessExpiresAt = decodeJwtExpiry(accessToken);
    const refreshExpiresAt = decodeJwtExpiry(refreshToken);
    TokenStorage.setTokenExpiry({ accessExpiresAt, refreshExpiresAt });

    const mappedUser = this._toAuthUser(user);
    if (mappedUser?.id) TokenStorage.setUserId(mappedUser.id);
    if (mappedUser) TokenStorage.setUserData(mappedUser);

    return mappedUser;
  }

  /**
   * Chuẩn hoá lỗi cho các call auth.
   * - 4xx (sai mật khẩu, OTP sai, email trùng) -> giữ nguyên lỗi BE
   * - 5xx / network -> đổi thành 4xx để KHÔNG fallback mock, UI hiện lỗi thật
   */
  _throwAuthError(e) {
    const status = e?.statusCode ?? e?.response?.status ?? null;

    if (status !== null && status >= 400 && status < 500) {
      throw e; // lỗi của user -> ném nguyên vẹn lên UI
    }

    const isNetwork = e?.isNetworkError === true;
    throw new ApiException(
      isNetwork
        ? 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại'
        : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại sau',
      {
        statusCode: 400,
        isNetworkError: isNetwork,
        data: e?.data ?? null,
      }
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ĐĂNG NHẬP
  // ═══════════════════════════════════════════════════════════════

  /**
   * POST /auth/email/login
   * BE trả `{ accessToken, refreshToken, user, isNewUser }` -> map sang `{ user, token }`.
   */
  async login(credentials) {
    try {
      const res = await ApiClient.post(
        '/auth/email/login',
        { email: credentials.email, password: credentials.password },
        PUBLIC
      );

      const user = this._persistSession(res?.accessToken, res?.refreshToken, res?.user);
      return { user, token: res?.accessToken };
    } catch (e) {
      this._throwAuthError(e);
    }
  }

  /**
   * POST /auth/google - đăng nhập bằng Google ID token.
   * @param {string} idToken - ID token từ SDK Google
   */
  async loginWithGoogle(idToken) {
    try {
      const res = await ApiClient.post('/auth/google', { idToken }, PUBLIC);
      const user = this._persistSession(res?.accessToken, res?.refreshToken, res?.user);
      return { user, token: res?.accessToken };
    } catch (e) {
      this._throwAuthError(e);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ĐĂNG KÝ - 2 BƯỚC (OTP)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Bước 1: POST /auth/email/register -> gửi OTP về email.
   * BE trả `{ message, expiresIn }` - `expiresIn` là giây, động theo config admin.
   *
   * @param {string} email
   * @returns {Promise<{message: string, expiresIn: number}>}
   */
  async sendRegisterOtp(email) {
    try {
      const res = await ApiClient.post('/auth/email/register', { email }, PUBLIC);
      return {
        message: res?.message ?? 'Mã OTP đã được gửi',
        expiresIn: Number(res?.expiresIn) || 0,
      };
    } catch (e) {
      this._throwAuthError(e);
    }
  }

  /**
   * Bước 2: POST /auth/email/verify-otp -> xác nhận OTP + tạo tài khoản + nhận JWT.
   * BE yêu cầu đủ 4 field: email, otpCode, password, name.
   *
   * @param {{email: string, otpCode: string, password: string, name?: string}} payload
   */
  async verifyRegisterOtp({ email, otpCode, password, name }) {
    try {
      const res = await ApiClient.post(
        '/auth/email/verify-otp',
        { email, otpCode, password, ...(name ? { name } : {}) },
        PUBLIC
      );
      const user = this._persistSession(res?.accessToken, res?.refreshToken, res?.user);
      return { user, token: res?.accessToken, isNewUser: res?.isNewUser === true };
    } catch (e) {
      this._throwAuthError(e);
    }
  }

  /**
   * Đăng ký 1 lần (gửi + xác nhận liền). Dùng khi đã có sẵn mã OTP.
   * UI đăng ký dùng 2 hàm riêng ở trên để hiện màn hình nhập OTP.
   */
  async register(data) {
    if (!data?.otpCode) {
      throw new ApiException('Cần mã OTP để hoàn tất đăng ký', { statusCode: 400 });
    }
    await this.sendRegisterOtp(data.email);
    return this.verifyRegisterOtp({
      email: data.email,
      otpCode: data.otpCode,
      password: data.password,
      name: data.name,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // QUÊN MẬT KHẨU - 2 BƯỚC (OTP)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Bước 1: POST /auth/email/forgot-password -> gửi OTP reset.
   * BE cố tình trả message trung tính (không lộ email có tồn tại hay không).
   */
  async sendResetOtp(email) {
    try {
      const res = await ApiClient.post('/auth/email/forgot-password', { email }, PUBLIC);
      return {
        message: res?.message ?? 'Mã OTP đặt lại mật khẩu đã được gửi',
        expiresIn: Number(res?.expiresIn) || 0,
      };
    } catch (e) {
      this._throwAuthError(e);
    }
  }

  /**
   * Bước 2: POST /auth/email/reset-password -> đặt mật khẩu mới bằng OTP.
   */
  async resetPassword({ email, otpCode, newPassword }) {
    try {
      const res = await ApiClient.post(
        '/auth/email/reset-password',
        { email, otpCode, newPassword },
        PUBLIC
      );
      return { message: res?.message ?? 'Đặt lại mật khẩu thành công' };
    } catch (e) {
      this._throwAuthError(e);
    }
  }

  /** POST /auth/email/forgot-password - giữ tương thích với interface cũ */
  async forgotPassword(email) {
    return this.sendResetOtp(email);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHIÊN ĐĂNG NHẬP
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /users/me - lấy user hiện tại (dùng khi mở app, validate token còn sống).
   * BE trả `MeResponseDto` có thêm `profile` (chứa avatarUrl).
   */
  async getCurrentUser() {
    try {
      const res = await ApiClient.get('/users/me');
      const user = this._persistSession(
        TokenStorage.getAccessToken(),
        TokenStorage.getRefreshToken(),
        res
      );
      return user;
    } catch (e) {
      this._throwAuthError(e);
    }
  }

  /**
   * POST /auth/refresh - lấy access token mới.
   * ApiClient đã tự refresh khi gặp 401, hàm này dùng cho trường hợp chủ động.
   */
  async refreshToken() {
    try {
      const refreshToken = TokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new ApiException('Không có phiên đăng nhập để làm mới', { statusCode: 401 });
      }
      const res = await ApiClient.post('/auth/refresh', { refreshToken }, PUBLIC);
      const accessToken = res?.accessToken;
      if (!accessToken) {
        throw new ApiException('Không lấy được Access Token mới', { statusCode: 400 });
      }
      TokenStorage.setAccessToken(accessToken);
      TokenStorage.setTokenExpiry({
        accessExpiresAt: decodeJwtExpiry(accessToken),
        refreshExpiresAt: TokenStorage.getRefreshExpiresAt(),
      });
      return { token: accessToken };
    } catch (e) {
      this._throwAuthError(e);
    }
  }

  /**
   * POST /auth/logout - thu hồi refresh token.
   * LUÔN xoá token local, kể cả khi API lỗi (offline-safe).
   */
  async logout() {
    const refreshToken = TokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await ApiClient.post('/auth/logout', { refreshToken });
      }
    } catch (_e) {
      // Offline hoặc token đã hết hạn -> vẫn phải xoá token local
    } finally {
      TokenStorage.clearAll();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ĐỔI MẬT KHẨU
  // ═══════════════════════════════════════════════════════════════

  /**
   * POST /auth/email/change-password - cần đã đăng nhập.
   * BE dùng POST (không phải PATCH) và cần cả mật khẩu cũ.
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const res = await ApiClient.post('/auth/email/change-password', {
        currentPassword,
        newPassword,
      });
      return { message: res?.message ?? 'Đổi mật khẩu thành công' };
    } catch (e) {
      this._throwAuthError(e);
    }
  }
}

// Đăng ký side-effect: domain 'authService' khớp key trong ServiceProvider.
registerService('authService', new RealAuthService());
