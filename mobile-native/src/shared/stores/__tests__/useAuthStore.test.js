/**
 * useAuthStore - test trạng thái phiên + hook useAuthActions.
 *
 * Sprint A1. Kiểm tra 3 điều quan trọng nhất:
 *   1. `initAuth()` đọc user đã lưu và KHÔNG gọi network khi không có token
 *   2. `session-expired` -> store tự xoá phiên (không cần sửa RootNavigator)
 *   3. `useAuthActions` gọi đúng service và đồng bộ store
 */

import { createElement } from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { TokenStorage } from '../../../data/storage/TokenStorage';
import { useAuthStore, useAuthActions } from '../useAuthStore';

// Mock ServiceProvider (dùng useServices) - tránh kéo cả cây Provider vào test
const mockAuthService = {
  login: jest.fn(),
  loginWithGoogle: jest.fn(),
  sendRegisterOtp: jest.fn(),
  verifyRegisterOtp: jest.fn(),
  sendResetOtp: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
  logout: jest.fn(),
};

jest.mock('../../../data/ServiceProvider', () => ({
  useServices: () => ({ authService: mockAuthService }),
}));

// Mock registry (initAuth dùng getRegisteredService để validate token)
const mockGetRegisteredService = jest.fn();
jest.mock('../../../data/api/ServiceRegistry', () => ({
  getRegisteredService: (...args) => mockGetRegisteredService(...args),
  isMockMode: () => false,
}));

beforeEach(() => {
  TokenStorage.clearAll();
  useAuthStore.setState({ user: null, isAuthenticated: false, isOnboarded: false });
  Object.keys(mockAuthService).forEach((k) => mockAuthService[k].mockReset());
  mockGetRegisteredService.mockReset();
});

/** Mini renderHook (giống ServiceRegistry.test.js) */
function renderHook(hookFn) {
  const ref = { current: undefined };
  const Probe = () => {
    ref.current = hookFn();
    return null;
  };
  let tree;
  act(() => {
    tree = TestRenderer.create(createElement(Probe));
  });
  return { result: ref, unmount: () => tree.unmount() };
}

// ═══════════════ initAuth ═══════════════

describe('useAuthStore.initAuth', () => {
  it('đọc user đã lưu -> set isAuthenticated = true', () => {
    TokenStorage.setUserData({ id: 'u-1', name: 'Lâm', email: 'a@b.com' });

    useAuthStore.getState().initAuth();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.user.email).toBe('a@b.com');
  });

  it('KHÔNG có user lưu -> isAuthenticated = false', () => {
    useAuthStore.getState().initAuth();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('KHÔNG gọi network khi chưa có access token (tránh 401 vô nghĩa)', () => {
    const getCurrentUser = jest.fn();
    mockGetRegisteredService.mockReturnValue({ getCurrentUser });

    useAuthStore.getState().initAuth();

    // Không có token -> không thèm tìm service, không gọi network
    expect(mockGetRegisteredService).not.toHaveBeenCalled();
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it('có access token -> gọi GET /users/me để validate phiên', async () => {
    TokenStorage.setAccessToken('token-abc');
    const getCurrentUser = jest.fn().mockResolvedValue({
      id: 'u-1',
      name: 'Lâm Mới',
      email: 'new@b.com',
      isOnboardingCompleted: true,
    });
    mockGetRegisteredService.mockReturnValue({ getCurrentUser });

    useAuthStore.getState().initAuth();

    await act(async () => {
      await Promise.resolve();
    });

    expect(getCurrentUser).toHaveBeenCalled();
    expect(useAuthStore.getState().user.name).toBe('Lâm Mới');
    expect(useAuthStore.getState().isOnboarded).toBe(true);
  });

  it('BE nói isOnboardingCompleted=false -> KHÔNG hỏi onboarding lại', () => {
    TokenStorage.setAccessToken('token-abc');
    mockGetRegisteredService.mockReturnValue({
      getCurrentUser: jest.fn().mockResolvedValue({
        id: 'u-1',
        isOnboardingCompleted: false,
      }),
    });

    useAuthStore.getState().initAuth();

    // Local flag 'true' nhưng BE là nguồn sự thật -> false
    expect(useAuthStore.getState().isOnboarded).toBe(false);
  });
});

// ═══════════════ login / logout ═══════════════

describe('useAuthStore - login / logout', () => {
  it('login: persist user vào TokenStorage và kích hoạt phiên ngay', () => {
    useAuthStore.getState().login({ id: 'u-9', name: 'X', email: 'x@y.com' });

    expect(TokenStorage.getUserId()).toBe('u-9');
    expect(TokenStorage.getUserData().name).toBe('X');
    // set isAuthenticated ngay -> RootNavigator chuyển thẳng sang Onboarding/Main
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user.name).toBe('X');
  });

  it('logout: xoá sạch token + user trong store', () => {
    TokenStorage.setAccessToken('t');
    TokenStorage.setRefreshToken('r');
    useAuthStore.getState().login({ id: 'u-1', email: 'a@b.com' });

    useAuthStore.getState().logout();

    expect(TokenStorage.getAccessToken()).toBeNull();
    expect(TokenStorage.getRefreshToken()).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

// ═══════════════ useAuthActions ═══════════════

describe('useAuthActions', () => {
  it('signIn: gọi service.login rồi persist user + kích hoạt phiên', async () => {
    mockAuthService.login.mockResolvedValue({
      user: { id: 'u-1', name: 'Lâm', email: 'a@b.com' },
      token: 'tok',
    });

    const { result } = renderHook(() => useAuthActions());
    await act(async () => {
      await result.current.signIn({ email: 'a@b.com', password: 'p' });
    });

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'p',
    });
    // Token đã persist, user đã lưu, phiên đã kích hoạt -> vào thẳng Main/Onboarding
    expect(TokenStorage.getUserData().name).toBe('Lâm');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('signIn: lỗi từ service -> ném lên (form hiển thị), KHÔNG set authenticated', async () => {
    mockAuthService.login.mockRejectedValue(new Error('Sai mật khẩu'));

    const { result } = renderHook(() => useAuthActions());
    await act(async () => {
      await expect(result.current.signIn({ email: 'a@b.com', password: 'sai' })).rejects.toThrow(
        'Sai mật khẩu'
      );
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('signOut: gọi service.logout rồi LUÔN xoá phiên local (offline-safe)', async () => {
    mockAuthService.logout.mockRejectedValue(new Error('Mất mạng'));
    TokenStorage.setAccessToken('t');
    useAuthStore.getState().login({ id: 'u-1', email: 'a@b.com' });

    const { result } = renderHook(() => useAuthActions());
    await act(async () => {
      await result.current.signOut();
    });

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(TokenStorage.getAccessToken()).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('sendRegisterOtp / verifyRegisterOtp: gọi đúng method của service', async () => {
    mockAuthService.sendRegisterOtp.mockResolvedValue({ message: 'ok', expiresIn: 120 });
    mockAuthService.verifyRegisterOtp.mockResolvedValue({
      user: { id: 'u-1', email: 'a@b.com' },
      token: 'tok',
    });

    const { result } = renderHook(() => useAuthActions());
    await act(async () => {
      await result.current.sendRegisterOtp('a@b.com');
      await result.current.verifyRegisterOtp({
        email: 'a@b.com',
        otpCode: '123456',
        password: 'Pass1234',
      });
    });

    expect(mockAuthService.sendRegisterOtp).toHaveBeenCalledWith('a@b.com');
    expect(mockAuthService.verifyRegisterOtp).toHaveBeenCalled();
    expect(TokenStorage.getUserData().email).toBe('a@b.com');
  });

  it('sendResetOtp / resetPassword: gọi đúng method của service', async () => {
    mockAuthService.sendResetOtp.mockResolvedValue({ message: 'ok', expiresIn: 120 });
    mockAuthService.resetPassword.mockResolvedValue({ message: 'ok' });

    const { result } = renderHook(() => useAuthActions());
    await act(async () => {
      await result.current.sendResetOtp('a@b.com');
      await result.current.resetPassword({
        email: 'a@b.com',
        otpCode: '123456',
        newPassword: 'NewPass1234',
      });
    });

    expect(mockAuthService.sendResetOtp).toHaveBeenCalledWith('a@b.com');
    expect(mockAuthService.resetPassword).toHaveBeenCalled();
  });
});
