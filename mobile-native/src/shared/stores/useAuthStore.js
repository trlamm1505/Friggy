/**
 * useAuthStore - Map Auth state.
 *
 * Sprint A1: chuyển từ mock cứng sang đọc/ghi thật qua TokenStorage + service.
 *
 * Nguồn sự thật:
 *   - TokenStorage (access_token / refresh_token / user_data / user_id)
 *   - ApiClient (POST /auth/email/login, GET /users/me, POST /auth/logout)
 *
 * R5: chỉ đọc token qua `TokenStorage`, KHÔNG import `useAuthStore` từ service.
 * R7: comment tiếng Việt.
 *
 * ⚠️ Phân tách trách nhiệm:
 *   - Store (file này) = trạng thái + persist LOCAL. Không gọi network.
 *   - `useAuthActions` (hook cuối file) = gọi network qua service đã resolve
 *     (real nếu đã đăng ký, mock nếu đang ở chế độ mock).
 *   Lý do tách: store là zustand, không có React context -> không lấy được
 *   service từ `useServices()` bên trong action. Hook là nơi duy nhất được
 *   phép dùng hook React.
 */

import { create } from 'zustand';
import { useCallback } from 'react';
import { TokenStorage } from '../../data/storage/TokenStorage';
import { onApiEvent } from '../../data/api/ApiClient';
import { getRegisteredService, isMockMode } from '../../data/api/ServiceRegistry';
import { useServices } from '../../data/ServiceProvider';

// ─────────────────────────── MMKV (chỉ cho cờ onboarding) ───────────────────────────

let mmkv;
try {
  const { MMKV } = require('react-native-mmkv');
  mmkv = new MMKV();
} catch (_e) {
  const memStore = {};
  mmkv = {
    getString: (k) => memStore[k],
    set: (k, v) => {
      memStore[k] = v;
    },
    delete: (k) => {
      delete memStore[k];
    },
  };
}

const STORAGE_ONBOARDED = 'isOnboarded';
const STORAGE_USER = 'user'; // key cũ (mock) - giữ để đọc lại dữ liệu mock cũ

/**
 * Quyết định trạng thái onboarding.
 *
 * Ưu tiên BE (`user.isOnboardingCompleted`) vì đó là nguồn sự thật:
 * user đã onboarding ở Web thì mở app mobile không được hỏi lại.
 * Nếu user không có field này (mock) -> dùng cờ local.
 */
const resolveOnboarded = (user, localFlag) => {
  if (typeof user?.isOnboardingCompleted === 'boolean') {
    return user.isOnboardingCompleted;
  }
  return localFlag === 'true';
};

/** Đọc user đã lưu: ưu tiên TokenStorage (thật), fallback key cũ (mock). */
const readStoredUser = () => {
  const fromToken = TokenStorage.getUserData();
  if (fromToken) return fromToken;
  try {
    const raw = mmkv.getString(STORAGE_USER);
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
};

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isOnboarded: false,

  /**
   * Khôi phục phiên khi mở app.
   *
   * KHÔNG gọi network ở đây (App.jsx gọi trước khi Provider render xong).
   * Thay vào đó: đọc local để app vào đúng màn ngay, rồi validate token
   * ở nền bằng `GET /users/me` (nếu không ở chế độ mock).
   */
  initAuth: () => {
    try {
      const saved = readStoredUser();
      const localOnboarded = mmkv.getString(STORAGE_ONBOARDED);
      if (saved) {
        set({
          user: saved,
          // Khôi phục phiên khi mở app -> set ngay isAuthenticated.
          // (Khác với `login()` sau đăng nhập: đó là lúc muốn hiện video trước.)
          isAuthenticated: true,
          isOnboarded: resolveOnboarded(saved, localOnboarded),
        });
      }
    } catch (_e) {
      // ignore - lỗi storage không được làm crash app
    }

    // Validate token ở nền. Nếu token chết, ApiClient đã xử lý refresh hoặc
    // emit 'session-expired' -> listener bên dưới sẽ logout.
    //
    // CHỈ gọi khi thực sự có token: gọi `GET /users/me` mà không có token sẽ
    // tạo 401 vô nghĩa (và trong mock mode lại gây nhiễu).
    if (!isMockMode() && TokenStorage.getAccessToken()) {
      const authService = getRegisteredService('authService');
      if (authService?.getCurrentUser) {
        authService
          .getCurrentUser()
          .then((fresh) => {
            if (!fresh) return;
            const localOnboarded = mmkv.getString(STORAGE_ONBOARDED);
            set({
              user: fresh,
              isAuthenticated: true,
              isOnboarded: resolveOnboarded(fresh, localOnboarded),
            });
          })
          .catch(() => {
            // Lỗi 401 đã được ApiClient xử lý (clear token + session-expired).
            // Lỗi mạng -> giữ phiên local, app vẫn dùng được offline.
          });
      }
    }
  },

  /**
   * Lưu user + token vừa nhận được VÀ kích hoạt phiên ngay lập tức.
   *
   * RootNavigator render theo `isAuthenticated`:
   *   !isAuthenticated -> AuthFlow
   *   isAuthenticated  -> OnboardingFlow / MainFlow
   *
   * Đăng nhập xong vào thẳng Main/Onboarding, KHÔNG qua màn hình video
   * "Đăng nhập thành công" (màn đó không phát được video trên Expo Go và
   * đã bị gỡ bỏ - xem LoginScreen/RegisterScreen).
   */
  login: (user) => {
    try {
      if (user?.id) TokenStorage.setUserId(user.id);
      if (user) TokenStorage.setUserData(user);
    } catch (_e) {
      // ignore
    }
    const localOnboarded = mmkv.getString(STORAGE_ONBOARDED);
    set({
      user,
      isAuthenticated: true,
      isOnboarded: resolveOnboarded(user, localOnboarded),
    });
  },

  /**
   * Xoá phiên local. KHÔNG gọi network (offline-safe).
   * Dùng khi: logout chủ động (sau khi đã gọi API), hoặc session-expired.
   */
  logout: () => {
    try {
      TokenStorage.clearAll();
      mmkv.delete(STORAGE_USER);
      mmkv.delete(STORAGE_ONBOARDED);
    } catch (_e) {
      // ignore
    }
    set({ user: null, isAuthenticated: false, isOnboarded: false });
  },

  completeOnboarding: () => {
    try {
      mmkv.set(STORAGE_ONBOARDED, 'true');
    } catch (_e) {
      // ignore
    }
    set({ isOnboarded: true });
  },

  setUser: (user) => {
    try {
      if (user?.id) TokenStorage.setUserId(user.id);
      if (user) TokenStorage.setUserData(user);
    } catch (_e) {
      // ignore
    }
    set({ user });
  },
}));

// ─────────────────────────── Nghe session-expired ───────────────────────────
// ApiClient emit 'session-expired' khi refresh token hết hạn.
// Store tự xoá phiên -> RootNavigator chuyển về AuthFlow (không cần sửa file navigation).

onApiEvent('session-expired', () => {
  useAuthStore.getState().logout();
});

// ═══════════════════════════════════════════════════════════════════
// useAuthActions - hook gọi network qua service đã resolve
// ═══════════════════════════════════════════════════════════════════

/**
 * Hook dùng trong component (màn hình auth, profile).
 *
 * Dùng `useServices()` để lấy authService đã resolve:
 *   - real service nếu đã đăng ký và không ở chế độ mock
 *   - mock service nếu đang ở chế độ mock (USE_MOCKS=true)
 *
 * @returns {object} các action auth + trạng thái từ store
 */
export const useAuthActions = () => {
  const { authService } = useServices();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);

  /** Đăng nhập email + mật khẩu. Lỗi được ném lên để form hiển thị. */
  const signIn = useCallback(
    async (credentials) => {
      const result = await authService.login(credentials);
      useAuthStore.getState().login(result?.user);
      return result;
    },
    [authService]
  );

  /** Đăng nhập Google bằng ID token. */
  const signInWithGoogle = useCallback(
    async (idToken) => {
      const result = await authService.loginWithGoogle(idToken);
      useAuthStore.getState().login(result?.user);
      return result;
    },
    [authService]
  );

  /**
   * Đăng ký 2 bước: gửi OTP -> xác nhận OTP.
   * @returns {Promise<{message: string, expiresIn: number}>} thông tin OTP
   */
  const sendRegisterOtp = useCallback(
    async (email) => authService.sendRegisterOtp(email),
    [authService]
  );

  /** Bước 2 đăng ký: xác nhận OTP -> nhận token + user. */
  const verifyRegisterOtp = useCallback(
    async (payload) => {
      const result = await authService.verifyRegisterOtp(payload);
      useAuthStore.getState().login(result?.user);
      return result;
    },
    [authService]
  );

  /** Quên mật khẩu bước 1: gửi OTP reset. */
  const sendResetOtp = useCallback(async (email) => authService.sendResetOtp(email), [authService]);

  /** Quên mật khẩu bước 2: đặt mật khẩu mới. */
  const resetPassword = useCallback(
    async (payload) => authService.resetPassword(payload),
    [authService]
  );

  /** Đổi mật khẩu (cần đã đăng nhập). */
  const changePassword = useCallback(
    async (currentPassword, newPassword) =>
      authService.changePassword(currentPassword, newPassword),
    [authService]
  );

  /**
   * Đăng xuất: gọi API thu hồi refresh token, LUÔN xoá token local.
   *
   * Offline vẫn phải thoát được -> nuốt lỗi API, KHÔNG ném lên UI.
   * (Lý do: đăng xuất là hành động user chủ động, báo lỗi "mất mạng" ở
   * màn hình logout chỉ gây nhiễu - user vẫn cần thoát app.)
   */
  const signOut = useCallback(async () => {
    try {
      await authService.logout();
    } catch (_e) {
      // API lỗi (offline / token hết hạn) -> vẫn xoá phiên local bên dưới
    } finally {
      useAuthStore.getState().logout();
    }
  }, [authService]);

  return {
    user,
    isAuthenticated,
    isOnboarded,
    signIn,
    signInWithGoogle,
    sendRegisterOtp,
    verifyRegisterOtp,
    sendResetOtp,
    resetPassword,
    changePassword,
    signOut,
  };
};
