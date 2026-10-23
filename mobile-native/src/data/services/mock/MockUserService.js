/**
 * Mock User Service
 */

import { IUserService } from '../../interfaces/IUserService';
import userMock from '../../../shared/mocks/user.json';
import preferencesMock from '../../../shared/mocks/user-preferences.json';
import allergiesMock from '../../../shared/mocks/allergies.json';
import familyMock from '../../../shared/mocks/family-members.json';
import subscriptionMock from '../../../shared/mocks/subscription.json';
import packagesMock from '../../../shared/mocks/packages.json';

const MOCK_DELAY = 200;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Catalog nguyên liệu rút gọn cho mock.
 *
 * `id` ở đây là `ingredientId` mà `POST /users/me/allergies` yêu cầu — không
 * phải id của bản ghi dị ứng (BE trả cái đó ở `AllergyResponseDto.id`).
 */
const INGREDIENT_CATALOG = [
  { id: 12, name: 'Tôm cua', image: null },
  { id: 34, name: 'Đậu phộng', image: null },
  { id: 7, name: 'Sữa tươi', image: null },
  { id: 21, name: 'Trứng gà', image: null },
  { id: 45, name: 'Đậu nành', image: null },
  { id: 58, name: 'Hải sản tổng hợp', image: null },
];

let profile = { ...userMock };
let preferences = { ...preferencesMock.preferences };
let allergies = JSON.parse(JSON.stringify(allergiesMock.allergies));
let family = JSON.parse(JSON.stringify(familyMock));
let notificationSettings = {
  pushEnabled: true,
  expiryAlertEnabled: true,
  shoppingReminderEnabled: false,
};

export class MockUserService extends IUserService {
  async getProfile() {
    await sleep(MOCK_DELAY / 2);
    return { ...profile };
  }

  async updateProfile(updates) {
    await sleep(MOCK_DELAY);
    profile = { ...profile, ...updates };
    return { ...profile };
  }

  async uploadAvatar(localUri) {
    await sleep(MOCK_DELAY);
    profile = { ...profile, avatar: localUri };
    return { url: localUri };
  }

  async getPreferences() {
    await sleep(MOCK_DELAY / 2);
    return { ...preferences };
  }

  async updatePreferences(prefs) {
    await sleep(MOCK_DELAY);
    preferences = { ...preferences, ...prefs };
    return { ...preferences };
  }

  async getAllergies() {
    await sleep(MOCK_DELAY / 2);
    return [...allergies];
  }

  async updateAllergies(newAllergies) {
    await sleep(MOCK_DELAY);
    allergies = [...newAllergies];
    return [...allergies];
  }

  // ─── Sprint A2: allergies thêm/xoá TỪNG DÒNG (khớp BE + Flutter) ───

  async addAllergy(ingredientId, note) {
    await sleep(MOCK_DELAY);
    if (!Number.isInteger(Number(ingredientId)) || Number(ingredientId) < 1) {
      throw new Error('ID nguyên liệu không hợp lệ');
    }
    if (allergies.some((a) => a.ingredientId === Number(ingredientId))) {
      throw new Error('Nguyên liệu đã có trong danh sách dị ứng');
    }
    const created = {
      id: `allergy-${Date.now()}`,
      ingredientId: Number(ingredientId),
      name: `Nguyên liệu #${ingredientId}`,
      note: note || null,
    };
    allergies = [...allergies, created];
    return created;
  }

  async removeAllergy(id) {
    await sleep(MOCK_DELAY);
    const idx = allergies.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Dị ứng không tồn tại');
    allergies.splice(idx, 1);
  }

  /**
   * Mock catalog nguyên liệu — chỉ phục vụ chế độ USE_MOCKS=true.
   * Danh sách rút gọn; `ingredientId` phải trùng với `allergies.json` để
   * thêm/xoá dị ứng trong mock hoạt động như thật.
   */
  async searchIngredients(search, limit = 20) {
    await sleep(MOCK_DELAY / 2);
    const keyword = (search || '').trim().toLowerCase();
    return INGREDIENT_CATALOG.filter(
      (i) => !keyword || i.name.toLowerCase().includes(keyword)
    ).slice(0, limit);
  }

  // ─── Sprint A2: onboarding ───

  async submitOnboarding(data) {
    await sleep(MOCK_DELAY);
    // BE `OnboardingDto` bắt buộc 2 field này — thiếu sẽ 400.
    if (!data?.primaryGoal || !data?.cookingFrequency) {
      throw new Error('Thiếu mục tiêu hoặc tần suất nấu ăn');
    }
    preferences = { ...preferences, ...data };
    profile = { ...profile, isOnboardingCompleted: true };
    return { ...profile };
  }

  // ─── Sprint A2: cài đặt thông báo ───

  async getNotificationSettings() {
    await sleep(MOCK_DELAY / 2);
    return { ...notificationSettings };
  }

  async updateNotificationSettings(settings) {
    await sleep(MOCK_DELAY);
    notificationSettings = { ...notificationSettings, ...settings };
    return { ...notificationSettings };
  }

  async getFamily() {
    await sleep(MOCK_DELAY / 2);
    return JSON.parse(JSON.stringify(family));
  }

  async addFamilyMember(data) {
    await sleep(MOCK_DELAY);
    const newMember = {
      id: `member-${Date.now()}`,
      name: data.name,
      role: 'member',
      avatar: null,
    };
    family.members.push(newMember);
    return newMember;
  }

  async removeFamilyMember(id) {
    await sleep(MOCK_DELAY);
    const idx = family.members.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Thành viên không tồn tại');
    family.members.splice(idx, 1);
  }

  async getCurrentPlan() {
    await sleep(MOCK_DELAY / 2);
    return { ...subscriptionMock.plan };
  }

  async getAvailablePackages() {
    await sleep(MOCK_DELAY / 2);
    return [...packagesMock.packages];
  }
}
