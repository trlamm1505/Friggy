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
 * @property {number} ingredientId - ID nguyên liệu trong catalog (BE yêu cầu, KHÔNG phải tên tự do)
 * @property {string} name
 * @property {string|null} [note]
 */

/**
 * @typedef {Object} UserPreferencesFull
 * @property {number|null} weeklyBudget - Ngân sách tuần (VND)
 * @property {number|null} dailyCalorieTarget
 * @property {'omnivore'|'vegetarian'|'vegan'|'keto'|'halal'} dietaryStyle
 * @property {boolean} preferSimpleRecipes
 * @property {number|null} maxCookTimeMinutes
 * @property {'beginner'|'intermediate'|'advanced'} skillLevel
 * @property {number} householdSize
 * @property {'friendly'|'professional'|'coach'} aiPersonalityMode
 * @property {string|null} primaryGoal - save_money | reduce_waste | eat_healthy | convenience
 * @property {string|null} cookingFrequency - daily | few_times_week | weekends | rarely
 * @property {number|null} height
 * @property {number|null} weight
 * @property {'sedentary'|'light'|'moderate'|'active'} activityLevel
 */

/**
 * @typedef {Object} NotificationSettings
 * Tên field khớp BE `notifications-response.dto.ts:43-45`.
 * @property {boolean} pushNotifications
 * @property {boolean} expiryAlert
 * @property {boolean} shoppingReminder
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
   *
   * @deprecated Sprint A2 - BE KHÔNG có endpoint thay thế toàn bộ.
   * Theo `api_service.dart:185-202` (Flutter đã chạy production), allergies được
   * thêm/xoá TỪNG DÒNG. Giữ lại method này cho mock cũ, code mới dùng
   * {@link addAllergy} / {@link removeAllergy}.
   * @param {Allergy[]} allergies
   * @returns {Promise<Allergy[]>}
   */
  async updateAllergies(allergies) {
    throw new Error('IUserService.updateAllergies() must be implemented');
  }

  /**
   * Thêm 1 dị ứng.
   *
   * BE `AddAllergyDto` yêu cầu `ingredientId` (int, >=1) — tham chiếu tới
   * `GET /ingredients`, KHÔNG phải tên nguyên liệu tự do. Gửi tên sẽ bị 400.
   *
   * @param {number} ingredientId
   * @param {string} [note]
   * @returns {Promise<Allergy>}
   */
  async addAllergy(ingredientId, note) {
    throw new Error('IUserService.addAllergy() must be implemented');
  }

  /**
   * Xoá 1 dị ứng theo id (BE soft-delete, trả 204 No Content).
   * @param {string} id
   * @returns {Promise<void>}
   */
  async removeAllergy(id) {
    throw new Error('IUserService.removeAllergy() must be implemented');
  }

  /**
   * Tìm nguyên liệu trong catalog — cần cho picker thêm dị ứng.
   *
   * BE `AddAllergyDto` nhận `ingredientId` (int), KHÔNG nhận tên tự do, nên UI
   * bắt buộc phải chọn từ catalog thay vì gõ tay.
   *
   * @param {string} search
   * @param {number} [limit]
   * @returns {Promise<Array<{id:number, name:string, image?:string|null}>>}
   */
  async searchIngredients(search, limit = 20) {
    throw new Error('IUserService.searchIngredients() must be implemented');
  }

  /**
   * Hoàn tất survey onboarding.
   *
   * BE `OnboardingDto` BẮT BUỘC `primaryGoal` + `cookingFrequency` (không optional)
   * — thiếu sẽ 400. Tất cả field khác là optional.
   *
   * @param {Object} data
   * @param {string} data.primaryGoal
   * @param {string} data.cookingFrequency
   * @returns {Promise<UserProfile>}
   */
  async submitOnboarding(data) {
    throw new Error('IUserService.submitOnboarding() must be implemented');
  }

  /**
   * Cài đặt thông báo.
   * @returns {Promise<NotificationSettings>}
   */
  async getNotificationSettings() {
    throw new Error('IUserService.getNotificationSettings() must be implemented');
  }

  /**
   * Cập nhật cài đặt thông báo.
   * @param {Partial<NotificationSettings>} settings
   * @returns {Promise<NotificationSettings>}
   */
  async updateNotificationSettings(settings) {
    throw new Error('IUserService.updateNotificationSettings() must be implemented');
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
