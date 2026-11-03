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

// ══════════════════════════════════════════════════════════════════
// SPRINT A3 — GÓI DỊCH VỤ + GIA ĐÌNH (mock fallback)
// ══════════════════════════════════════════════════════════════════
//
// ⚠️ BẮT BUỘC — LÝ DO KỸ THUẬT (bug P0 tìm ra 24/10 khi audit A3):
//
//   `SafeService.withFallback(real, mock)` chỉ expose method có trong prototype
//   chain của MOCK (xem `SafeService.js` -> `collectNames(mockService)`).
//   Method chỉ có ở REAL mà không khai báo trong mock -> KHÔNG được proxy ->
//   `useServices().userService.<method>` là `undefined` -> UI crash.
//
//   Trước khi sửa: `RealUserService` có 12 method A3 nhưng `MockUserService`
//   chỉ có `getAvailablePackages` + `removeFamilyMember`.
//   => `userService.getMySubscription()` -> "undefined is not a function"
//   => màn "Quản lý gói" + "Quản lý gia đình" CRASH khi `USE_MOCKS=false`.
//
//   CÁCH SỬA ĐÚNG: bổ sung method vào mock (giữ mô hình "real trả thật,
//   mock là fallback" của Phase 0) — KHÔNG sửa `SafeService.js` (immutable
//   từ P0.5) và KHÔNG sửa `ServiceProvider.jsx` (immutable).
//
//   Có test chốt lại: `src/data/services/mock/__tests__/A3ProxyAudit.test.js`.

/** Gói đang active trong mock (mô phỏng `UserSubscriptionResponseDto` đã map). */
let mockSubscription = {
  id: 'sub-mock-1',
  status: 'active',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: null,
  paymentRef: null,
  autoRenew: false,
  cancelledAt: null,
  plan: {
    id: 1,
    name: 'free',
    displayName: 'Miễn phí',
    price: 0,
    currency: 'VND',
    period: 'forever',
    features: [],
    aiUsagePerWeek: 0,
    isActive: true,
  },
};

/** Giao dịch đang chờ (mô phỏng `PaymentTransactionDetailDto` có `qrCode`). */
let mockPendingPayment = null;

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

  /**
   * Gói hiện tại (dạng phẳng) — shape giống `RealUserService.getCurrentPlan()`.
   *
   * ⚠️ PHẢI có `status`: `HomeScreen` kiểm `plan?.status === 'active'` mới biết
   * user đang có Gói Family thật (BE trả `pending` khi chưa thanh toán).
   * Thiếu `status` -> banner hiện sai trạng thái.
   */
  async getCurrentPlan() {
    await sleep(MOCK_DELAY / 2);
    return {
      ...subscriptionMock.plan,
      status: mockSubscription.status,
      endDate: mockSubscription.endDate,
      autoRenew: mockSubscription.autoRenew,
    };
  }

  async getAvailablePackages() {
    await sleep(MOCK_DELAY / 2);
    return [...packagesMock.packages];
  }

  // ─── Sprint A3: gói dịch vụ (subscriptions) ───
  //
  // 12 method dưới đây BẮT BUỘC phải nằm trong prototype chain của mock,
  // nếu không `SafeService.withFallback` sẽ KHÔNG proxy chúng -> UI gọi
  // `userService.getMySubscription()` sẽ nhận `undefined` -> crash.
  // Xem `__tests__/A3ProxyAudit.test.js` (test chốt hành vi này).

  /** Gói hiện tại — shape giống `toSubscription()` của `RealSubscriptionService`. */
  async getMySubscription() {
    await sleep(MOCK_DELAY / 2);
    return JSON.parse(JSON.stringify(mockSubscription));
  }

  /**
   * Bắt đầu thanh toán — mock trả shape `toCheckout()`.
   * Ghi lại vào `mockPendingPayment` để `findPendingPayment()` trả về,
   * mô phỏng đúng hành vi BE (đã có giao dịch pending thì trả 409).
   */
  async subscribe(planId) {
    await sleep(MOCK_DELAY);
    const pkg = packagesMock.packages.find((p) => String(p.id) === String(planId));
    if (!pkg) throw new Error('Gói dịch vụ không tồn tại');

    mockPendingPayment = {
      checkoutUrl: `https://checkout.mock/${pkg.id}`,
      qrCode: 'MOCK_QR_CODE',
      paymentRef: `mock-ref-${Date.now()}`,
      amount: pkg.price,
      expireAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      status: 'pending',
    };
    return { ...mockPendingPayment };
  }

  /** Gia hạn gói — mock trả shape `toCheckout()`. */
  async renewSubscription() {
    await sleep(MOCK_DELAY);
    mockPendingPayment = {
      checkoutUrl: 'https://checkout.mock/renew',
      qrCode: 'MOCK_QR_RENEW',
      paymentRef: `mock-renew-${Date.now()}`,
      amount: mockSubscription.plan.price,
      expireAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      status: 'pending',
    };
    return { ...mockPendingPayment };
  }

  /** Hủy gia hạn tự động. */
  async cancelAutoRenewal() {
    await sleep(MOCK_DELAY);
    mockSubscription = { ...mockSubscription, autoRenew: false };
    return {
      message: 'Đã hủy gia hạn tự động.',
      endDate: mockSubscription.endDate ?? null,
    };
  }

  /** Trạng thái giao dịch — mock luôn `pending` (không có webhook thật). */
  async getPaymentStatus(paymentRef) {
    await sleep(MOCK_DELAY / 2);
    return {
      status: mockPendingPayment?.paymentRef === paymentRef ? 'pending' : 'pending',
      amount: mockPendingPayment?.amount ?? 0,
      paidAt: null,
    };
  }

  /** Đã lên đúng gói chưa — dùng khi poll thanh toán. */
  async isSubscribedTo(targetPlanName) {
    await sleep(MOCK_DELAY / 2);
    return mockSubscription.status === 'active' && mockSubscription.plan.name === targetPlanName;
  }

  /**
   * Giao dịch đang chờ thanh toán — dùng khôi phục QR thay vì tạo mới.
   * BE trả 409 khi đã có pending -> Flutter/RN tra cứu lại thay vì báo lỗi.
   */
  async findPendingPayment() {
    await sleep(MOCK_DELAY / 2);
    return mockPendingPayment ? { ...mockPendingPayment } : null;
  }

  // ─── Sprint A3: gia đình (family) ───

  /**
   * Thông tin gia đình + role — shape giống `toFamilyInfo()`.
   * Mock RN (`family-members.json`) không có `role` -> tự suy ra:
   *   - có `inviteCode` -> 'owner'
   *   - không có        -> 'none' (chưa có gia đình -> empty state)
   */
  async getFamilyInfo() {
    await sleep(MOCK_DELAY / 2);
    const isOwner = Boolean(family.inviteCode);
    const owner = isOwner ? family.members.find((m) => m.role === 'owner') : null;
    const members = family.members
      .filter((m) => m.role !== 'owner')
      .map((m) => ({ ...m, status: 'active' }));

    return {
      role: isOwner ? 'owner' : 'none',
      members,
      owner: owner ? { ...owner } : null,
      activeCount: members.length,
      maxMembers: 5,
      groupId: isOwner ? 'mock-family-group' : null,
      groupStatus: isOwner ? 'active' : null,
      inviteCode: family.inviteCode ?? null,
    };
  }

  /** Mời thành viên qua email — BE trả CHỈ `{ message }`. */
  async inviteFamilyMember(email) {
    await sleep(MOCK_DELAY);
    if (!email || !email.includes('@')) throw new Error('Email không hợp lệ');
    return { message: `Đã gửi lời mời tới ${email}` };
  }

  /** Chấp nhận lời mời bằng token. */
  async acceptFamilyInvite(token) {
    await sleep(MOCK_DELAY);
    if (!token) throw new Error('Token không hợp lệ');
    return { message: 'Đã tham gia gia đình thành công!' };
  }

  /** Từ chối lời mời bằng token. */
  async rejectFamilyInvite(token) {
    await sleep(MOCK_DELAY);
    if (!token) throw new Error('Token không hợp lệ');
    return { message: 'Đã từ chối lời mời' };
  }

  /** Giải tán gia đình (owner only). */
  async dissolveFamilyGroup() {
    await sleep(MOCK_DELAY);
    family = { members: [], inviteCode: null };
    mockSubscription = {
      ...mockSubscription,
      status: 'cancelled',
      plan: {
        ...mockSubscription.plan,
        id: 1,
        name: 'free',
        displayName: 'Miễn phí',
        price: 0,
        period: 'forever',
      },
    };
    return { message: 'Đã giải tán gia đình' };
  }
}
