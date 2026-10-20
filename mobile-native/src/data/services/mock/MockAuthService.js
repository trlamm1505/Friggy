/**
 * Mock Auth Service
 *
 * Implement IAuthService sử dụng mock JSON data. Trả về Promise để UI
 * chạy đồng bộ như khi gọi API thật. Sau này có thể swap sang RealAuthService
 * thông qua ServiceProvider.
 */

import { IAuthService } from '../../interfaces/IAuthService';
import userMock from '../../../shared/mocks/user.json';

// In-memory token store (thay thế cho real token storage)
let mockToken = null;
let mockUser = null;

const MOCK_DELAY = 250; // ms - simulate network delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockAuthService extends IAuthService {
  async login(credentials) {
    await sleep(MOCK_DELAY);

    if (!credentials.email || !credentials.password) {
      throw new Error('Email và mật khẩu không được để trống');
    }
    if (credentials.password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
    }

    mockToken = `mock-token-${Date.now()}`;
    mockUser = { ...userMock, email: credentials.email };
    return { user: mockUser, token: mockToken };
  }

  async register(data) {
    await sleep(MOCK_DELAY);

    if (!data.email || !data.password || !data.name) {
      throw new Error('Vui lòng điền đầy đủ thông tin');
    }
    if (data.password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
    }

    mockToken = `mock-token-${Date.now()}`;
    mockUser = { ...userMock, ...data };
    return { user: mockUser, token: mockToken };
  }

  async logout() {
    await sleep(MOCK_DELAY / 2);
    mockToken = null;
    mockUser = null;
  }

  async refreshToken() {
    await sleep(MOCK_DELAY);
    if (!mockToken) {
      throw new Error('Không có token để refresh');
    }
    mockToken = `mock-token-${Date.now()}`;
    return { token: mockToken };
  }

  async forgotPassword(email) {
    await sleep(MOCK_DELAY);
    if (!email) {
      throw new Error('Email không được để trống');
    }
    return { message: `Email đặt lại mật khẩu đã được gửi tới ${email}` };
  }

  async getCurrentUser() {
    return mockUser;
  }

  async changePassword(currentPassword, newPassword) {
    await sleep(MOCK_DELAY);
    if (!currentPassword || !newPassword) {
      throw new Error('Vui lòng nhập đầy đủ mật khẩu');
    }
    if (newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
    }
    // mock - no-op
  }
}
