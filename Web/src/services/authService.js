import axiosClient from '../utils/axios';

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
 * Đăng xuất — thu hồi Refresh Token
 * POST /api/v1/auth/logout
 * Body: { refreshToken: string }
 */
export const logoutApi = async (refreshToken) => {
  return await axiosClient.post('/auth/logout', { refreshToken });
};
