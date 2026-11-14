import axiosClient from '../utils/axios';

/**
 * Đăng nhập bằng Email + Mật khẩu
 * POST /api/v1/auth/email/login
 * Body: { email: string, password: string }
 */
export const emailLoginApi = async (email, password) => {
  return await axiosClient.post('/auth/email/login', { email, password });
};

/**
 * Đăng ký tài khoản (Bước 1: Gửi OTP về email)
 * POST /api/v1/auth/email/register
 * Body: { email: string }
 */
export const emailRegisterApi = async (email) => {
  return await axiosClient.post('/auth/email/register', { email });
};

/**
 * Xác nhận OTP đăng ký (Bước 2: Kích hoạt tài khoản và nhận JWT tokens)
 * POST /api/v1/auth/email/verify-otp
 * Body: { email: string, otpCode: string, password: string, name?: string }
 */
export const verifyEmailOtpApi = async ({ email, otpCode, password, name }) => {
  return await axiosClient.post('/auth/email/verify-otp', { email, otpCode, password, name });
};

/**
 * Đăng nhập bằng Google ID Token
 * POST /api/v1/auth/google
 * Body: { idToken: string }
 */
export const googleAuthApi = async (idToken) => {
  return await axiosClient.post('/auth/google', { idToken });
};

/**
 * Làm mới Access Token bằng Refresh Token
 * POST /api/v1/auth/refresh
 * Body: { refreshToken: string }
 */
export const refreshApi = async (refreshToken) => {
  return await axiosClient.post('/auth/refresh', { refreshToken });
};

/**
 * Đăng ký tài khoản nhà cung cấp thực phẩm (Bên thứ 3)
 */
export { registerSupplierAccountApi } from './supplierService';

/**
 * Đăng xuất — thu hồi Refresh Token
 * POST /api/v1/auth/logout
 * Body: { refreshToken: string }
 */
export const logoutApi = async (refreshToken) => {
  return await axiosClient.post('/auth/logout', { refreshToken });
};

/**
 * Helper thực hiện Đăng xuất đầy đủ:
 * Gọi API POST /api/v1/auth/logout + xóa toàn bộ friggy_ localStorage keys
 */
export const logoutHelper = async () => {
  const refreshToken =
    localStorage.getItem('friggy_refresh_token') || localStorage.getItem('refreshToken');
  if (refreshToken) {
    try {
      await logoutApi(refreshToken);
    } catch (err) {
      console.warn('Lỗi khi gọi API logout:', err.message);
    }
  }
  // Xóa toàn bộ localStorage keys (phần tiền tố friggy_ và legacy keys)
  localStorage.removeItem('friggy_access_token');
  localStorage.removeItem('friggy_refresh_token');
  localStorage.removeItem('friggy_user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('is_mock_user');
};
