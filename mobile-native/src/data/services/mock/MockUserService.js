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
  pushNotifications: true,
  expiryAlert: true,
  shoppingReminder: false,
};

/**
 * Gói đang active trong mock (dùng cho `isSubscribedTo`).
 *
 * Mặc định 'free' -> sau khi user "mua" gói family trong modal, đổi sang
 * 'family' để vòng poll 2 tầng báo thành công (khớp hành vi thật).
 */
let currentSubscription = {
  id: 'mock-sub-1',
  status: 'active',
  startDate: null,
  endDate: null,
  paymentRef: null,
  autoRenew: false,
  cancelledAt: null,
  plan: {
    id: 1,
    name: subscriptionMock.plan.name,
    displayName: subscriptionMock.plan.displayName,
    price: subscriptionMock.plan.price ?? 0,
    currency: subscriptionMock.plan.currency ?? 'VND',
    period: 'forever',
    features: [],
    aiUsagePerWeek: 0,
    isActive: true,
  },
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

  /**
   * `GET /family/me` — mock: trả shape `FamilyRoleDto` đã map (khớp
   * `RealFamilyService.toFamilyInfo()`).
   *
   * ⚠️ SỬA BUG DEV B: trước đây mock trả thẳng shape file JSON
   * `{ members, inviteCode }` -> KHÔNG có `role` / `groupId` / `activeCount` /
   * `maxMembers` / `owner` -> `FamilyManagementScreen` luôn rơi vào nhánh
   * "chưa có gia đình" (role='none') dù mock có sẵn 2 thành viên, và
   * `MyFridgesScreen` mất số thành viên.
   *
   * @returns {Promise<object>}
   */
  async getFamily() {
    await sleep(MOCK_DELAY / 2);

    const owner = (family.members ?? []).find((m) => m.role === 'owner') ?? null;
    const members = (family.members ?? []).filter((m) => m.role !== 'owner');
    // Nhóm còn tồn tại khi CÓ owner (người tạo nhóm).
    // ⚠️ Không được suy ra từ `members.length` -> xoá hết thành viên thường
    // nhưng owner vẫn còn thì role phải vẫn là 'owner', không phải 'none'.
    const hasGroup = Boolean(owner);

    return {
      role: hasGroup ? 'owner' : 'none',
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        email: null,
        avatar: m.avatar ?? null,
        status: 'active',
        invitedAt: null,
        joinedAt: null,
      })),
      owner: owner
        ? { id: owner.id, name: owner.name, avatar: owner.avatar ?? null }
        : null,
      activeCount: members.length,
      maxMembers: 6,
      groupId: hasGroup ? 'family-group-mock' : null,
      groupStatus: hasGroup ? 'active' : null,
      inviteCode: hasGroup ? (family.inviteCode ?? null) : null,
    };
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
    // `status` BẮT BUỘC: `HomeScreen` check `plan.status === 'active'` để quyết
    // định hiện banner "Gia đình đang hoạt động". Thiếu `status` -> luôn false.
    return {
      ...subscriptionMock.plan,
      status: 'active',
      isActive: true,
      period: null,
      features: [],
      endDate: null,
      autoRenew: false,
    };
  }

  /**
   * `GET /subscriptions/plans` — mock: map sang shape BE.
   *
   * ⚠️ SỬA BUG DEV B: `packages.json` dùng `name` tiếng Việt ("Premium",
   * "Gia đình") và `id` là slug. Nhưng:
   *   - `FamilyPlanModal` tìm gói bằng `packages.find(p => p.name === 'family')`
   *     (đúng contract BE: `SubscriptionPlanResponseDto.name` = 'free'|'individual'|'family')
   *   - `POST /subscriptions/subscribe` cần `planId` là SỐ (`@IsInt()`).
   * => Mock trả shape cũ -> modal báo "Không tìm thấy gói Family" và không mua được.
   *
   * @returns {Promise<Array<{id:number,name:string,displayName:string,price:number,currency:string,period:string,features:string[],isActive:boolean}>>}
   */
  async getAvailablePackages() {
    await sleep(MOCK_DELAY / 2);
    return packagesMock.packages.map((pkg, index) => ({
      ...pkg,
      // BE dùng id SỐ.
      id: index + 1,
      // BE dùng name chuẩn hoá, `displayName` mới là nhãn hiển thị.
      name: pkg.id === 'family-monthly' ? 'family' : 'individual',
      displayName: pkg.name,
      price: pkg.price ?? 0,
      currency: pkg.currency ?? 'VND',
      period: pkg.period ?? 'monthly',
      features: Array.isArray(pkg.features) ? pkg.features : [],
      aiUsagePerWeek: 0,
      isActive: true,
    }));
  }

  // ══════════════════════════════════════════════════════════════
  // Sprint A3 — GIA ĐÌNH (alias + thao tác mới)
  //
  // ⚠️ RÀ SOÁT DEV B — BUG ĐÃ SỬA:
  //   `FamilyManagementScreen` gọi `userService.getFamilyInfo()` nhưng mock
  //   chỉ có `getFamily()` -> `undefined is not a function` -> màn Family
  //   Management CRASH ngay khi bật `USE_MOCKS=true` (chế độ demo UI).
  //   Thêm alias + các method family/subscription mà UI gọi để mock mode
  //   chạy được đầy đủ, khớp với `RealUserService`.
  // ══════════════════════════════════════════════════════════════

  /**
   * Alias của `getFamily()` — tên mà UI mới dùng (khớp `RealUserService`).
   * @returns {Promise<object>}
   */
  async getFamilyInfo() {
    return this.getFamily();
  }

  /** POST /family/invite → gửi lời mời qua email. */
  async inviteFamilyMember(email) {
    await sleep(MOCK_DELAY);
    if (!email || !String(email).includes('@')) {
      throw new Error('Email không hợp lệ');
    }
    return { message: `Đã gửi lời mời tới ${email}` };
  }

  /** POST /family/accept → nhận lời mời bằng token. */
  async acceptFamilyInvite(token) {
    await sleep(MOCK_DELAY);
    if (!token || !String(token).trim()) {
      throw new Error('Token không hợp lệ');
    }
    return { message: 'Đã tham gia nhóm gia đình' };
  }

  /** POST /family/reject → từ chối lời mời. */
  async rejectFamilyInvite(token) {
    await sleep(MOCK_DELAY);
    if (!token || !String(token).trim()) {
      throw new Error('Token không hợp lệ');
    }
    return { message: 'Đã từ chối lời mời' };
  }

  /** DELETE /family/me → giải thể nhóm gia đình. */
  async dissolveFamilyGroup() {
    await sleep(MOCK_DELAY);
    family = { members: [], inviteCode: null };
    return { message: 'Đã giải thể nhóm gia đình' };
  }

  // ─── Sprint A3 — SUBSCRIPTION (khớp `RealUserService`) ───

  /**
   * `GET /subscriptions/me` — mock: shape `toSubscription()` của real.
   *
   * ⚠️ SỬA BUG DEV B: mock trả `{ name, displayName, price, status }` phẳng,
   * trong khi real trả `{ id, status, plan: {...} }` (plan LỒNG). UI đọc
   * `sub.plan.name` -> mock ra `undefined` -> so sánh sai gói.
   */
  async getMySubscription() {
    await sleep(MOCK_DELAY / 2);
    return JSON.parse(JSON.stringify(currentSubscription));
  }

  /**
   * `POST /subscriptions/subscribe` → QR PayOS (mock trả paymentRef giả).
   *
   * ⚠️ Shape phải khớp `toCheckout()` của real: `{ checkoutUrl, qrCode,
   * paymentRef, amount, expireAt, status }`.
   */
  /**
   * `POST /subscriptions/subscribe` → QR PayOS (mock trả paymentRef giả).
   *
   * ⚠️ Shape phải khớp `toCheckout()` của real: `{ checkoutUrl, qrCode,
   * paymentRef, amount, expireAt, status }`.
   *
   * @param {number|string} planId - id gói (BE: số).
   * @param {string} [planName] - tên gói chuẩn hoá ('family'|'individual').
   */
  async subscribe(planId, planName) {
    await sleep(MOCK_DELAY);
    if (!planId) throw new Error('Thiếu gói đăng ký');

    // Nhớ gói vừa mua để `isSubscribedTo` trả true (poll 2 tầng thoát).
    // `planName` do modal truyền vào; nếu không có, suy ra từ id (2 = family).
    const resolvedName = planName ?? (Number(planId) === 2 ? 'family' : currentSubscription.plan.name);

    currentSubscription = {
      ...currentSubscription,
      status: 'active',
      paymentRef: `mock-payment-${Date.now()}`,
      plan: {
        ...currentSubscription.plan,
        id: Number(planId) || currentSubscription.plan.id,
        name: resolvedName,
      },
    };

    return {
      checkoutUrl: null,
      qrCode: null,
      paymentRef: currentSubscription.paymentRef,
      amount: 99000,
      expireAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      status: 'pending',
    };
  }

  /** `POST /subscriptions/renew` → gia hạn (mock), shape `toCheckout()`. */
  async renewSubscription() {
    await sleep(MOCK_DELAY);
    return {
      checkoutUrl: null,
      qrCode: null,
      paymentRef: `mock-renew-${Date.now()}`,
      amount: 99000,
      expireAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      status: 'pending',
    };
  }

  /** DELETE /subscriptions/me/auto-renewal → hủy gia hạn (mock). */
  async cancelAutoRenewal() {
    await sleep(MOCK_DELAY);
    return { message: 'Đã hủy gia hạn tự động' };
  }

  /** GET /payment-transactions/me/:ref → trạng thái giao dịch (poll thanh toán). */
  async getPaymentStatus(paymentRef) {
    await sleep(MOCK_DELAY / 2);
    if (!paymentRef) throw new Error('Thiếu mã giao dịch');
    // Mock: coi như đã thanh toán -> UI thoát vòng poll.
    return { status: 'paid', paymentRef };
  }

  /**
   * Đã lên đúng gói vừa mua chưa? (chống bug poll báo thành công sớm).
   *
   * ⚠️ SỬA BUG DEV B: mock trả `true` cho MỌI gói -> poll 2 tầng trong
   * `FamilyPlanModal` báo "đã kích hoạt" dù user mua gói 'individual'.
   * Giờ so sánh đúng với gói đang active trong mock.
   */
  async isSubscribedTo(targetPlanName) {
    await sleep(MOCK_DELAY / 2);
    if (!targetPlanName) return false;
    return currentSubscription.status === 'active' && currentSubscription.plan.name === targetPlanName;
  }
}
