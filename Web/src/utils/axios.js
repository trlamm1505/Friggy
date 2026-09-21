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

// Xóa Token & chuyển về trang chủ Guest khi Refresh Token hết hạn
const handleSessionExpired = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
  setTimeout(() => {
    window.location.href = '/';
  }, 1200);
};

// Request Interceptor: Tự động đính kèm Access Token nếu có
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
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
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Nếu chính API /auth/refresh bị 401 -> Refresh token đã hết hạn
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/google')) {
        handleSessionExpired();
        return Promise.reject(error);
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

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        isRefreshing = false;
        handleSessionExpired();
        return Promise.reject(error);
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

        // Lưu Access Token mới vào localStorage
        localStorage.setItem('accessToken', newAccessToken);

        // Cập nhật header cho request vừa bị lỗi và thực hiện lại
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return axiosClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        handleSessionExpired();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'Có lỗi xảy ra, vui lòng thử lại!';
    return Promise.reject(new Error(Array.isArray(message) ? message.join(', ') : message));
  }
);

export default axiosClient;
