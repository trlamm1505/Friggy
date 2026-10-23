/**
 * RealAuthService - test mapper, error mapping, session persist.
 *
 * Sprint A1. Theo quy tắc R1 (mục 9b.4 của plan): mỗi Real*Service PHẢI có test
 * chứng minh mapper cho ra đúng shape và lỗi được map đúng.
 *
 * KHÔNG test component render / navigation / style (mục 9b.5).
 *
 * Cách chạy: mock `ApiClient` bằng jest.mock -> kiểm soát response BE trả về.
 */

import { ApiException } from '../../../api/ApiException';
import { TokenStorage } from '../../../storage/TokenStorage';

// Mock ApiClient trước khi import service (service gọi ApiClient.post/get lúc runtime)
jest.mock('../../../api/ApiClient', () => ({
  ApiClient: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  onApiEvent: jest.fn(),
}));

// eslint-disable-next-line import/first
import { ApiClient } from '../../../api/ApiClient';
// eslint-disable-next-line import/first
import { RealAuthService } from '../RealAuthService';

/**
 * JWT giả với payload `exp` ở tương lai (để decode được).
 *
 * KHÔNG dùng `Buffer` - đó là API Node, không tồn tại trong React Native runtime.
 * Dùng `btoa` (có sẵn trong RN/Hermes) + decode base64 thủ công.
 */
const makeJwt = (expSeconds) => {
  const json = JSON.stringify({ sub: 'u1', exp: expSeconds });
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return `header.${base64}.signature`;
};

const FUTURE = Math.floor(Date.now() / 1000) + 3600;

/** Response login chuẩn của BE (AuthResponseDto) */
const beLoginResponse = () => ({
  accessToken: makeJwt(FUTURE),
  refreshToken: makeJwt(FUTURE + 86400),
  user: {
    id: 'u-1',
    name: 'Trần Quốc Lâm',
    email: 'lam@example.com',
    googleEmail: null,
    status: 'active',
    role: 'user',
    isOnboardingCompleted: false,
  },
  isNewUser: false,
});

let service;

beforeEach(() => {
  ApiClient.post.mockReset();
  ApiClient.get.mockReset();
  TokenStorage.clearAll();
  service = new RealAuthService();
});

// ═══════════════ Mapper: BE -> shape của IAuthService ═══════════════

describe('RealAuthService - mapper', () => {
  it('login: map BE AuthResponseDto -> { user, token } đúng shape interface', async () => {
    ApiClient.post.mockResolvedValue(beLoginResponse());

    const result = await service.login({ email: 'lam@example.com', password: 'Pass1234' });

    expect(result.token).toBe(beLoginResponse().accessToken);
    expect(result.user).toEqual({
      id: 'u-1',
      name: 'Trần Quốc Lâm',
      email: 'lam@example.com',
      phone: null,
      avatar: null,
      joinDate: undefined,
      isOnboardingCompleted: false,
      role: 'user',
      status: 'active',
    });
  });

  it('login: gọi đúng endpoint + payload (email, password)', async () => {
    ApiClient.post.mockResolvedValue(beLoginResponse());

    await service.login({ email: 'a@b.com', password: 'secret' });

    expect(ApiClient.post).toHaveBeenCalledWith(
      '/auth/email/login',
      { email: 'a@b.com', password: 'secret' },
      expect.objectContaining({ skipAuth: true, skipAuthRefresh: true })
    );
  });

  it('BE trả name/email null -> giữ null (không đổi thành undefined)', async () => {
    ApiClient.post.mockResolvedValue({
      ...beLoginResponse(),
      user: { ...beLoginResponse().user, name: null, email: null },
    });

    const result = await service.login({ email: 'x@y.com', password: 'p' });

    expect(result.user.name).toBeNull();
    expect(result.user.email).toBeNull();
  });

  it('getCurrentUser: đọc avatarUrl qua getImageUrl (R2 - 2 host khác nhau)', async () => {
    ApiClient.get.mockResolvedValue({
      id: 'u-1',
      name: 'Lâm',
      email: 'a@b.com',
      status: 'active',
      role: 'user',
      isOnboardingCompleted: true,
      profile: { displayName: 'Lâm', avatarUrl: '/avatars/me.png' },
    });

    const user = await service.getCurrentUser();

    // Ảnh phải là URL absolute (có host file), không phải path tương đối
    expect(user.avatar).toMatch(/^https?:\/\//);
    expect(user.avatar).toContain('/avatars/me.png');
    expect(user.isOnboardingCompleted).toBe(true);
  });

  it('getCurrentUser: gọi GET /users/me', async () => {
    ApiClient.get.mockResolvedValue(beLoginResponse().user);

    await service.getCurrentUser();

    expect(ApiClient.get).toHaveBeenCalledWith('/users/me');
  });
});

// ═══════════════ Persist session ═══════════════

describe('RealAuthService - persist session', () => {
  it('login: lưu access/refresh token + user + userId vào TokenStorage', async () => {
    const res = beLoginResponse();
    ApiClient.post.mockResolvedValue(res);

    await service.login({ email: 'a@b.com', password: 'p' });

    expect(TokenStorage.getAccessToken()).toBe(res.accessToken);
    expect(TokenStorage.getRefreshToken()).toBe(res.refreshToken);
    expect(TokenStorage.getUserId()).toBe('u-1');
    expect(TokenStorage.getUserData().email).toBe('lam@example.com');
  });

  it('login: suy ra thời điểm hết hạn từ JWT exp (BE không trả expiresAt)', async () => {
    const res = beLoginResponse();
    ApiClient.post.mockResolvedValue(res);

    await service.login({ email: 'a@b.com', password: 'p' });

    const exp = TokenStorage.getAccessExpiresAt();
    expect(exp).toBeGreaterThan(Date.now());
    expect(exp).toBeLessThanOrEqual(FUTURE * 1000 + 1000);
  });

  it('logout: xoá SẠCH cả 6 keys', async () => {
    ApiClient.post.mockResolvedValue(beLoginResponse());
    await service.login({ email: 'a@b.com', password: 'p' });

    ApiClient.post.mockResolvedValue(undefined);
    await service.logout();

    expect(TokenStorage.getAccessToken()).toBeNull();
    expect(TokenStorage.getRefreshToken()).toBeNull();
    expect(TokenStorage.getUserId()).toBeNull();
    expect(TokenStorage.getUserData()).toBeNull();
    expect(TokenStorage.getAccessExpiresAt()).toBeNull();
    expect(TokenStorage.getRefreshExpiresAt()).toBeNull();
  });

  it('logout: gọi API thu hồi refresh token', async () => {
    ApiClient.post.mockResolvedValue(beLoginResponse());
    await service.login({ email: 'a@b.com', password: 'p' });
    ApiClient.post.mockClear();

    await service.logout();

    expect(ApiClient.post).toHaveBeenCalledWith('/auth/logout', {
      refreshToken: beLoginResponse().refreshToken,
    });
  });

  it('logout OFFLINE: vẫn xoá token local (offline-safe)', async () => {
    ApiClient.post.mockResolvedValue(beLoginResponse());
    await service.login({ email: 'a@b.com', password: 'p' });

    // API lỗi mạng -> logout vẫn phải dọn dẹp local
    ApiClient.post.mockRejectedValue(new ApiException('Mất mạng', { isNetworkError: true }));

    await expect(service.logout()).resolves.toBeUndefined();
    expect(TokenStorage.getAccessToken()).toBeNull();
  });
});

// ═══════════════ Error mapping ═══════════════

describe('RealAuthService - error mapping', () => {
  it('401 sai mật khẩu -> giữ nguyên lỗi BE, KHÔNG đổi thành 400', async () => {
    const beErr = new ApiException('Email hoặc mật khẩu không chính xác', { statusCode: 401 });
    ApiClient.post.mockRejectedValue(beErr);

    await expect(service.login({ email: 'a@b.com', password: 'sai' })).rejects.toBe(beErr);
  });

  it('409 email đã đăng ký -> giữ nguyên message BE', async () => {
    const beErr = new ApiException('Email đã được đăng ký', { statusCode: 409 });
    ApiClient.post.mockRejectedValue(beErr);

    await expect(service.sendRegisterOtp('a@b.com')).rejects.toBe(beErr);
  });

  it('lỗi 5xx -> đổi thành 4xx để KHÔNG fallback mock (an toàn auth)', async () => {
    ApiClient.post.mockRejectedValue(new ApiException('Server lỗi', { statusCode: 500 }));

    try {
      await service.login({ email: 'a@b.com', password: 'p' });
      throw new Error('phải throw');
    } catch (e) {
      expect(e.statusCode).toBe(400);
      expect(e.message).not.toBe('Server lỗi');
    }
  });

  it('lỗi mạng -> message tiếng Việt nói rõ mất mạng, KHÔNG fallback mock', async () => {
    ApiClient.post.mockRejectedValue(new ApiException('Network Error', { isNetworkError: true }));

    try {
      await service.login({ email: 'a@b.com', password: 'p' });
      throw new Error('phải throw');
    } catch (e) {
      expect(e.isNetworkError).toBe(true);
      expect(e.statusCode).toBe(400);
      expect(e.message).toMatch(/mạng/i);
    }
  });
});

// ═══════════════ OTP đăng ký / đặt lại mật khẩu ═══════════════

describe('RealAuthService - OTP 2 bước', () => {
  it('sendRegisterOtp: đọc expiresIn ĐỘNG từ BE (không hardcode 300)', async () => {
    // BE đọc TTL từ Redis/DB -> admin đổi runtime được
    ApiClient.post.mockResolvedValue({ message: 'OTP đã gửi', expiresIn: 120 });

    const res = await service.sendRegisterOtp('a@b.com');

    expect(res.expiresIn).toBe(120);
    expect(ApiClient.post).toHaveBeenCalledWith(
      '/auth/email/register',
      { email: 'a@b.com' },
      expect.objectContaining({ skipAuth: true })
    );
  });

  it('verifyRegisterOtp: gửi đủ 4 field BE yêu cầu', async () => {
    ApiClient.post.mockResolvedValue(beLoginResponse());

    await service.verifyRegisterOtp({
      email: 'a@b.com',
      otpCode: '123456',
      password: 'Pass1234',
      name: 'Lâm',
    });

    expect(ApiClient.post).toHaveBeenCalledWith(
      '/auth/email/verify-otp',
      { email: 'a@b.com', otpCode: '123456', password: 'Pass1234', name: 'Lâm' },
      expect.objectContaining({ skipAuth: true })
    );
  });

  it('verifyRegisterOtp: trả isNewUser để UI biết user mới hay cũ', async () => {
    ApiClient.post.mockResolvedValue({ ...beLoginResponse(), isNewUser: true });

    const res = await service.verifyRegisterOtp({
      email: 'a@b.com',
      otpCode: '123456',
      password: 'Pass1234',
    });

    expect(res.isNewUser).toBe(true);
  });

  it('sendResetOtp: gọi forgot-password và trả expiresIn', async () => {
    ApiClient.post.mockResolvedValue({ message: 'OTP reset đã gửi', expiresIn: 90 });

    const res = await service.sendResetOtp('a@b.com');

    expect(res.expiresIn).toBe(90);
    expect(ApiClient.post).toHaveBeenCalledWith(
      '/auth/email/forgot-password',
      { email: 'a@b.com' },
      expect.objectContaining({ skipAuth: true })
    );
  });

  it('resetPassword: gửi otpCode + newPassword (KHÔNG phải currentPassword)', async () => {
    ApiClient.post.mockResolvedValue({ message: 'Đặt lại thành công' });

    await service.resetPassword({
      email: 'a@b.com',
      otpCode: '123456',
      newPassword: 'NewPass1234',
    });

    expect(ApiClient.post).toHaveBeenCalledWith(
      '/auth/email/reset-password',
      { email: 'a@b.com', otpCode: '123456', newPassword: 'NewPass1234' },
      expect.objectContaining({ skipAuth: true })
    );
  });
});

// ═══════════════ Đổi mật khẩu ═══════════════

describe('RealAuthService - changePassword', () => {
  it('dùng POST (KHÔNG phải PATCH) + gửi cả 2 mật khẩu', async () => {
    ApiClient.post.mockResolvedValue({ message: 'Đổi mật khẩu thành công' });

    await service.changePassword('OldPass1234', 'NewPass1234');

    expect(ApiClient.post).toHaveBeenCalledWith('/auth/email/change-password', {
      currentPassword: 'OldPass1234',
      newPassword: 'NewPass1234',
    });
  });

  it('mật khẩu cũ sai -> ném lỗi BE (400) lên UI', async () => {
    const beErr = new ApiException('Mật khẩu hiện tại không đúng', { statusCode: 400 });
    ApiClient.post.mockRejectedValue(beErr);

    await expect(service.changePassword('sai', 'NewPass1234')).rejects.toBe(beErr);
  });
});

// ═══════════════ An toàn: auth không bao giờ fallback mock ═══════════════

describe('RealAuthService - cờ criticalAuth', () => {
  it('đánh dấu criticalAuth = true để ServiceRegistry KHÔNG bọc fallback', () => {
    expect(service.criticalAuth).toBe(true);
  });
});
