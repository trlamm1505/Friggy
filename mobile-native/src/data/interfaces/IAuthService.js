/**
 * Auth Service Interface
 *
 * Tất cả các service implementation (Mock, Real) phải implement interface này.
 * UI chỉ gọi qua interface, không biết về implementation cụ thể.
 *
 * Sau này muốn đổi sang Real API chỉ cần swap implementation trong ServiceProvider.
 */

/**
 * @typedef {Object} AuthUser
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} [phone]
 * @property {string|null} [avatar]
 * @property {string} [joinDate]
 */

/**
 * @typedef {Object} LoginCredentials
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} RegisterData
 * @property {string} name
 * @property {string} email
 * @property {string} password
 * @property {string} [phone]
 */

export class IAuthService {
  /**
   * Đăng nhập bằng email + password
   * @param {LoginCredentials} credentials
   * @returns {Promise<{user: AuthUser, token: string}>}
   */
  async login(credentials) {
    throw new Error('IAuthService.login() must be implemented');
  }

  /**
   * Đăng ký tài khoản mới
   * @param {RegisterData} data
   * @returns {Promise<{user: AuthUser, token: string}>}
   */
  async register(data) {
    throw new Error('IAuthService.register() must be implemented');
  }

  /**
   * Đăng xuất
   * @returns {Promise<void>}
   */
  async logout() {
    throw new Error('IAuthService.logout() must be implemented');
  }

  /**
   * Refresh access token
   * @returns {Promise<{token: string}>}
   */
  async refreshToken() {
    throw new Error('IAuthService.refreshToken() must be implemented');
  }

  /**
   * Quên mật khẩu - gửi email reset
   * @param {string} email
   * @returns {Promise<{message: string}>}
   */
  async forgotPassword(email) {
    throw new Error('IAuthService.forgotPassword() must be implemented');
  }

  /**
   * Lấy thông tin user hiện tại từ token đã lưu
   * @returns {Promise<AuthUser|null>}
   */
  async getCurrentUser() {
    throw new Error('IAuthService.getCurrentUser() must be implemented');
  }

  /**
   * Đổi mật khẩu
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<void>}
   */
  async changePassword(currentPassword, newPassword) {
    throw new Error('IAuthService.changePassword() must be implemented');
  }
}
