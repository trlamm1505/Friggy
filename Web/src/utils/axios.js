import axios from 'axios';
import { API_BASE_URL } from './constants';
import { showToast } from '../components/common/Toast';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Flag & Queue để xử lý gọi nhiều API cùng lúc khi refresh token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const SESSION_EXPIRED_MESSAGE = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!';

// Các API xác thực công khai: 401 ở đây là sai thông tin đăng nhập, KHÔNG phải hết phiên
const AUTH_ENDPOINTS = ['/auth/email/login', '/auth/google', '/auth/refresh', '/auth/logout'];
const isAuthEndpoint = (url = '') => AUTH_ENDPOINTS.some((path) => url.includes(path));

// Chuẩn hoá lỗi: ưu tiên message từ backend thay vì "Request failed with status code xxx"
const toFriendlyError = (error, fallback = 'Có lỗi xảy ra, vui lòng thử lại!') => {
  const message = error?.response?.data?.message || error?.message || fallback;
  const err = new Error(Array.isArray(message) ? message.join(', ') : message);
  err.status = error?.response?.status;
  return err;
};

// Kiểm tra xem phiên đăng nhập hiện tại có phải là tài khoản Mock (dev/test offline) không
const isMockSession = () => {
  if (localStorage.getItem('is_mock_user') === 'true') return true;
  const token =
    localStorage.getItem('friggy_access_token') ||
    localStorage.getItem('accessToken') ||
    '';
  if (token.startsWith('mock_token_')) return true;
  try {
    const userStr =
      localStorage.getItem('friggy_user') || localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u.username === 'manager' || u.username === '0854340045') return true;
    }
  } catch (e) {}
  return false;
};

// Xóa Token & chuyển về trang chủ Guest khi Refresh Token hết hạn
const handleSessionExpired = () => {
  // Nếu đang dùng tài khoản Mock demo, không tự động đăng xuất để tiện kiểm thử giao diện
  if (isMockSession()) {
    console.warn('[Axios] Mock mode 401: Bỏ qua hết hạn phiên đăng nhập để giữ giao diện demo.');
    return;
  }

  localStorage.removeItem('friggy_access_token');
  localStorage.removeItem('friggy_refresh_token');
  localStorage.removeItem('friggy_user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast.error(SESSION_EXPIRED_MESSAGE, { id: 'session-expired' });
  setTimeout(() => {
    window.location.href = '/';
  }, 1200);
};

// Request Interceptor: Tự động đính kèm Access Token nếu có
axiosClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('friggy_access_token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Tự động gọi API /auth/refresh khi 401, hết Refresh Token -> về trang chủ
axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi 401 Unauthorized và chưa thử retry request này
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Nếu đang dùng tài khoản Mock demo, trả lỗi êm dịu, không gọi refresh hay sessionExpired
      if (isMockSession()) {
        return Promise.reject(toFriendlyError(error, 'Chế độ xem demo: Không có phiên backend thật.'));
      }

      // API xác thực (login/google/refresh/logout) bị 401 -> trả lỗi của backend, không refresh
      if (isAuthEndpoint(originalRequest.url)) {
        return Promise.reject(toFriendlyError(error, 'Thông tin đăng nhập không hợp lệ!'));
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken =
        localStorage.getItem('friggy_refresh_token') || localStorage.getItem('refreshToken');

      if (!refreshToken) {
        isRefreshing = false;
        handleSessionExpired();
        return Promise.reject(new Error(SESSION_EXPIRED_MESSAGE));
      }

      try {
        // Dùng axios gốc gọi POST /api/v1/auth/refresh (tránh bị interceptor lặp)
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const resData = refreshResponse.data?.data || refreshResponse.data;
        const newAccessToken = resData?.accessToken;

        if (!newAccessToken) {
          throw new Error('Không lấy được Access Token mới');
        }

        // Lưu Access Token mới vào localStorage với tiền tố friggy_
        localStorage.setItem('friggy_access_token', newAccessToken);
        localStorage.setItem('accessToken', newAccessToken);

        // Cập nhật header cho request vừa bị lỗi và thực hiện lại
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return axiosClient(originalRequest);
      } catch (refreshErr) {
        const expiredErr = new Error(SESSION_EXPIRED_MESSAGE);
        processQueue(expiredErr, null);
        handleSessionExpired();
        return Promise.reject(expiredErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(toFriendlyError(error));
  }
);

export default axiosClient;
