/**
 * User Service Interface
 *
 * Quản lý user profile, preferences, allergies, family members, subscription.
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string|null} [phone]
 * @property {string|null} [avatar]
 * @property {string|null} [birthday]
 * @property {'male'|'female'|'other'|null} [gender]
 * @property {string|null} [bio]
 * @property {string} [joinDate]
 * @property {boolean} [isFamilyPlan]
 */

/**
 * @typedef {Object} UserPreferences
 * @property {'none'|'vegetarian'|'vegan'|'halal'} diet
 * @property {'mild'|'medium'|'spicy'} spiceLevel
 * @property {number} cookingTime
 * @property {number} servings
 */

/**
 * @typedef {Object} Allergy
 * @property {string} id
 * @property {string} name
 * @property {'low'|'medium'|'high'} severity
 */

/**
 * @typedef {Object} FamilyMember
 * @property {string} id
 * @property {string} name
 * @property {'owner'|'member'} role
 * @property {string|null} [avatar]
 */

/**
 * @typedef {Object} FamilyInfo
 * @property {FamilyMember[]} members
 * @property {string} [inviteCode]
 */

/**
 * @typedef {Object} SubscriptionPlan
 * @property {'free'|'premium'|'family'} name
 * @property {string} displayName
 * @property {number} price
 * @property {string} currency
 * @property {string|null} [period]
 */

/**
 * @typedef {Object} SubscriptionPackage
 * @property {string} id
 * @property {string} name
 * @property {number} price
 * @property {string} currency
 * @property {string} period
 * @property {string[]} features
 */

export class IUserService {
  /**
   * Lấy thông tin profile hiện tại
   * @returns {Promise<UserProfile>}
   */
  async getProfile() {
    throw new Error('IUserService.getProfile() must be implemented');
  }

  /**
   * Cập nhật profile
   * @param {Partial<UserProfile>} updates
   * @returns {Promise<UserProfile>}
   */
  async updateProfile(updates) {
    throw new Error('IUserService.updateProfile() must be implemented');
  }

  /**
   * Upload avatar
   * @param {string} localUri - file:// URI
   * @returns {Promise<{url: string}>}
   */
  async uploadAvatar(localUri) {
    throw new Error('IUserService.uploadAvatar() must be implemented');
  }

  /**
   * Lấy preferences
   * @returns {Promise<UserPreferences>}
   */
  async getPreferences() {
    throw new Error('IUserService.getPreferences() must be implemented');
  }

  /**
   * Cập nhật preferences
   * @param {Partial<UserPreferences>} prefs
   * @returns {Promise<UserPreferences>}
   */
  async updatePreferences(prefs) {
    throw new Error('IUserService.updatePreferences() must be implemented');
  }

  /**
   * Lấy danh sách allergies
   * @returns {Promise<Allergy[]>}
   */
  async getAllergies() {
    throw new Error('IUserService.getAllergies() must be implemented');
  }

  /**
   * Cập nhật allergies (thay thế toàn bộ)
   * @param {Allergy[]} allergies
   * @returns {Promise<Allergy[]>}
   */
  async updateAllergies(allergies) {
    throw new Error('IUserService.updateAllergies() must be implemented');
  }

  /**
   * Lấy thông tin family
   * @returns {Promise<FamilyInfo>}
   */
  async getFamily() {
    throw new Error('IUserService.getFamily() must be implemented');
  }

  /**
   * Thêm thành viên family
   * @param {{name: string}} data
   * @returns {Promise<FamilyMember>}
   */
  async addFamilyMember(data) {
    throw new Error('IUserService.addFamilyMember() must be implemented');
  }

  /**
   * Xóa thành viên family
   * @param {string} id
   * @returns {Promise<void>}
   */
  async removeFamilyMember(id) {
    throw new Error('IUserService.removeFamilyMember() must be implemented');
  }

  /**
   * Lấy gói subscription hiện tại
   * @returns {Promise<SubscriptionPlan>}
   */
  async getCurrentPlan() {
    throw new Error('IUserService.getCurrentPlan() must be implemented');
  }

  /**
   * Lấy danh sách gói có thể đăng ký
   * @returns {Promise<SubscriptionPackage[]>}
   */
  async getAvailablePackages() {
    throw new Error('IUserService.getAvailablePackages() must be implemented');
  }
}
