/**
 * RealUserService - test mapper BE -> shape IUserService + payload -> BE.
 *
 * Sprint A2. Theo R1 (mục 9b.4 của plan): mỗi Real*Service PHẢI có test chứng
 * minh mapper cho ra đúng shape và lỗi được map đúng.
 *
 * Trọng tâm của sprint này là SỰ LỆCH SHAPE giữa BE và UI — nên test ưu tiên:
 *   1. Mapper đọc đúng field BE (`me.profile.avatarUrl`, `ingredientName`...)
 *   2. Enum lạ bị chặn, không gửi lên BE (sẽ 400)
 *   3. Payload đúng chữ ký BE (`ingredientId` số, không phải tên)
 *
 * KHÔNG test component render / navigation / style (mục 9b.5).
 */

jest.mock('../../../api/ApiClient', () => ({
  ApiClient: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    uploadFile: jest.fn(),
  },
  onApiEvent: jest.fn(),
}));

// eslint-disable-next-line import/first
import { ApiClient } from '../../../api/ApiClient';
// eslint-disable-next-line import/first
import { RealUserService } from '../RealUserService';

/** `MeResponseDto` chuẩn của BE (`be/.../users-response.dto.ts`). */
const beMeResponse = (overrides = {}) => ({
  id: 'u-1',
  name: 'Trần Quốc Lâm',
  email: 'lam@example.com',
  googleEmail: null,
  status: 'active',
  role: 'user',
  isOnboardingCompleted: false,
  profile: {
    displayName: 'Trần Quốc Lâm',
    avatarUrl: '/avatars/u-1.jpg',
    dateOfBirth: '1995-01-01',
    gender: 'male',
    bio: 'Yêu nấu ăn',
  },
  ...overrides,
});

/** `UserPreferenceResponseDto` — đủ 13 field BE trả về. */
const bePrefsResponse = (overrides = {}) => ({
  weeklyBudget: 500000,
  dailyCalorieTarget: 2000,
  dietaryStyle: 'vegetarian',
  preferSimpleRecipes: false,
  maxCookTimeMinutes: 30,
  skillLevel: 'intermediate',
  householdSize: 3,
  aiPersonalityMode: 'coach',
  primaryGoal: 'eat_healthy',
  cookingFrequency: 'weekends',
  height: 170,
  weight: 65,
  activityLevel: 'active',
  ...overrides,
});

/** `AllergyResponseDto` — BE KHÔNG có `severity`. */
const beAllergy = (overrides = {}) => ({
  id: 'a-1',
  ingredientId: 12,
  ingredientName: 'Tôm cua',
  note: 'Dị ứng nặng',
  ...overrides,
});

let service;

beforeEach(() => {
  ApiClient.post.mockReset();
  ApiClient.get.mockReset();
  ApiClient.patch.mockReset();
  ApiClient.delete.mockReset();
  ApiClient.uploadFile.mockReset();
  service = new RealUserService();
});

// ═══════════════ Mapper profile ═══════════════

describe('RealUserService - mapper profile', () => {
  it('đọc avatar từ me.profile.avatarUrl qua getImageUrl (R2 - 2 host khác nhau)', async () => {
    ApiClient.get.mockResolvedValue(beMeResponse());
    const result = await service.getProfile();

    expect(ApiClient.get).toHaveBeenCalledWith('/users/me');
    // đường dẫn tương đối phải được ghép thành URL tuyệt đối
    expect(result.avatar).toMatch(/^https?:\/\//);
    expect(result.avatar).toContain('u-1.jpg');
  });

  it('profile null -> vẫn trả shape hợp lệ, KHÔNG crash', async () => {
    ApiClient.get.mockResolvedValue(beMeResponse({ profile: null }));
    const result = await service.getProfile();

    expect(result.avatar).toBeNull();
    expect(result.name).toBe('Trần Quốc Lâm');
  });
});

// ═══════════════ Enum: chặn giá trị BE không nhận ═══════════════

describe('RealUserService - enum an toàn (giá trị lạ gây 400)', () => {
  it('gender lạ -> trả null thay vì giữ nguyên giá trị BE không nhận', async () => {
    ApiClient.get.mockResolvedValue(beMeResponse({ profile: { gender: 'khac' } }));
    const result = await service.getProfile();

    // BE `GenderEnum` chỉ có male/female/other
    expect(result.gender).toBeNull();
  });

  it('dietaryStyle lạ -> fallback omnivore (default Flutter), không gửi giá trị rác lên BE', async () => {
    ApiClient.get.mockResolvedValue(bePrefsResponse({ dietaryStyle: 'none' }));
    const prefs = await service.getPreferences();

    // 'none' là giá trị của mock RN cũ, BE enum KHÔNG có
    expect(prefs.dietaryStyle).toBe('omnivore');
  });

  it('activityLevel lạ -> fallback moderate', async () => {
    ApiClient.get.mockResolvedValue(bePrefsResponse({ activityLevel: 'so_am' }));
    const prefs = await service.getPreferences();

    expect(prefs.activityLevel).toBe('moderate');
  });

  it('BE trả null cho preferences -> trả đủ 13 field mặc định, không undefined', async () => {
    ApiClient.get.mockResolvedValue(null);
    const prefs = await service.getPreferences();

    expect(prefs.dietaryStyle).toBe('omnivore');
    expect(prefs.skillLevel).toBe('beginner');
    expect(prefs.householdSize).toBe(1);
    expect(prefs.weeklyBudget).toBeNull();
  });
});

// ═══════════════ Allergies: payload đúng chữ ký BE ═══════════════

describe('RealUserService - allergies theo chữ ký BE', () => {
  it('GET allergies: map ingredientName -> name (không có field severity)', async () => {
    ApiClient.get.mockResolvedValue([beAllergy()]);
    const list = await service.getAllergies();

    expect(ApiClient.get).toHaveBeenCalledWith('/users/me/allergies');
    expect(list[0]).toEqual({
      id: 'a-1',
      ingredientId: 12,
      name: 'Tôm cua',
      note: 'Dị ứng nặng',
    });
  });

  it('POST allergy: gửi ingredientId DẠNG SỐ (BE @IsInt, gửi tên sẽ 400)', async () => {
    ApiClient.post.mockResolvedValue(beAllergy());
    await service.addAllergy('12'); // UI có thể truyền string từ picker

    expect(ApiClient.post).toHaveBeenCalledWith(
      '/users/me/allergies',
      expect.objectContaining({ ingredientId: 12 })
    );
  });

  it('ingredientId không phải số -> ném lỗi NGAY, không gọi API', async () => {
    await expect(service.addAllergy('tôm')).rejects.toThrow();
    // Chặn ở client để không mất 1 round-trip và không nhận 400 khó hiểu
    expect(ApiClient.post).not.toHaveBeenCalled();
  });

  it('ingredientId 0 -> ném lỗi (BE @Min(1))', async () => {
    await expect(service.addAllergy(0)).rejects.toThrow();
    expect(ApiClient.post).not.toHaveBeenCalled();
  });

  it('DELETE allergy: đúng path + trả 204 không có body', async () => {
    ApiClient.delete.mockResolvedValue(undefined);
    await service.removeAllergy('a-1');

    expect(ApiClient.delete).toHaveBeenCalledWith('/users/me/allergies/a-1');
  });
});

// ═══════════════ Onboarding: 2 field BẮT BUỘC ═══════════════

describe('RealUserService - onboarding', () => {
  it('thiếu primaryGoal -> ném lỗi ngay, không gọi API', async () => {
    await expect(service.submitOnboarding({ cookingFrequency: 'daily' })).rejects.toThrow();
    expect(ApiClient.post).not.toHaveBeenCalled();
  });

  it('thiếu cookingFrequency -> ném lỗi ngay (BE bắt buộc cả 2)', async () => {
    await expect(service.submitOnboarding({ primaryGoal: 'save_money' })).rejects.toThrow();
    expect(ApiClient.post).not.toHaveBeenCalled();
  });

  it('đủ 2 field -> gửi đúng payload, trả profile đã map', async () => {
    ApiClient.post.mockResolvedValue(beMeResponse({ isOnboardingCompleted: true }));
    const result = await service.submitOnboarding({
      primaryGoal: 'save_money',
      cookingFrequency: 'daily',
      dietaryStyle: 'vegetarian',
      householdSize: 2,
    });

    const [url, payload] = ApiClient.post.mock.calls[0];
    expect(url).toBe('/users/me/onboarding');
    expect(payload).toEqual(
      expect.objectContaining({ primaryGoal: 'save_money', cookingFrequency: 'daily' })
    );
    expect(result.isOnboardingCompleted).toBe(true);
  });
});

// ═══════════════ Avatar: multipart ═══════════════

describe('RealUserService - avatar', () => {
  it('upload đúng field "file" + map avatarUrl qua getImageUrl', async () => {
    ApiClient.uploadFile.mockResolvedValue({ avatarUrl: '/avatars/new.jpg' });
    const result = await service.uploadAvatar('file:///tmp/a.jpg');

    // BE dùng `@UseInterceptors(FileInterceptor('file', ...))`
    expect(ApiClient.uploadFile).toHaveBeenCalledWith(
      '/users/me/avatar',
      'file:///tmp/a.jpg',
      'file'
    );
    expect(result.url).toMatch(/^https?:\/\//);
  });
});

// ═══════════════ PATCH: loại field null/undefined ═══════════════

describe('RealUserService - payload PATCH', () => {
  it('updatePreferences bỏ field rỗng, KHÔNG gửi null lên BE', async () => {
    ApiClient.patch.mockResolvedValue(bePrefsResponse());
    await service.updatePreferences({
      dietaryStyle: 'vegan',
      weeklyBudget: null,
      height: undefined,
      dailyCalorieTarget: 1800,
    });

    const payload = ApiClient.patch.mock.calls[0][1];
    expect(payload.dietaryStyle).toBe('vegan');
    expect(payload.dailyCalorieTarget).toBe(1800);
    expect('weeklyBudget' in payload).toBe(false);
    expect('height' in payload).toBe(false);
  });

  it('updateProfile KHÔNG gửi email (BE UpdateProfileDto không có field này)', async () => {
    ApiClient.patch.mockResolvedValue(beMeResponse());
    await service.updateProfile({
      name: 'Tên mới',
      email: 'doi-mail@example.com',
      birthday: '1995-01-01',
      gender: 'male',
    });

    const payload = ApiClient.patch.mock.calls[0][1];
    expect(payload.name).toBe('Tên mới');
    expect(payload.dateOfBirth).toBe('1995-01-01');
    expect('email' in payload).toBe(false);
  });
});

// ═══════════════ Picker nguyên liệu ═══════════════

describe('RealUserService - searchIngredients', () => {
  it('GET /ingredients trả phân trang -> trả mảng phẳng cho UI', async () => {
    ApiClient.get.mockResolvedValue({
      data: [{ id: 12, name: 'Tôm cua', imagePath: '/img/tom.jpg' }],
      total: 1,
      page: 1,
      limit: 20,
    });

    const list = await service.searchIngredients('tôm');

    expect(ApiClient.get).toHaveBeenCalledWith('/ingredients', {
      params: { search: 'tôm', limit: 20, page: 1 },
    });
    expect(Array.isArray(list)).toBe(true);
    expect(list[0].name).toBe('Tôm cua');
  });

  it('response rác -> trả mảng rỗng thay vì crash UI', async () => {
    ApiClient.get.mockResolvedValue(null);
    await expect(service.searchIngredients('x')).resolves.toEqual([]);
  });
});

// ═══════════════ Subscription: getCurrentPlan ═══════════════
// Fix 23/10: `HomeScreen` gọi `useCurrentPlan()` ngay khi mount. `RealUserService`
// không override method này -> prototype chain resolve tới `IUserService` vốn chỉ
// `throw` -> warn "IUserService.getCurrentPlan() must be implemented".
// `SafeService.withFallback` không cứu được: guard của nó check
// `typeof realService[name] === 'function'`, mà method KẾ THỪA cũng là function.

describe('RealUserService - getCurrentPlan', () => {
  it('gọi GET /subscriptions/me và map `plan` lồng -> shape phẳng của interface', async () => {
    ApiClient.get.mockResolvedValue({
      id: 'sub-1',
      status: 'active',
      startDate: '2026-09-01',
      endDate: '2026-10-01',
      autoRenew: true,
      plan: {
        id: 1,
        name: 'individual',
        displayName: 'Gói Cá Nhân',
        priceVnd: 25000,
        billingCycle: 'monthly',
        features: ['Tối đa 3 tủ lạnh'],
        aiUsagePerWeek: 50,
        isActive: true,
      },
    });

    const plan = await service.getCurrentPlan();

    expect(ApiClient.get).toHaveBeenCalledWith('/subscriptions/me');
    // `priceVnd` của BE phải ra `price` của interface.
    expect(plan.name).toBe('individual');
    expect(plan.displayName).toBe('Gói Cá Nhân');
    expect(plan.price).toBe(25000);
    // `billingCycle` của BE phải ra `period` của interface.
    expect(plan.period).toBe('monthly');
    expect(plan.features).toEqual(['Tối đa 3 tủ lạnh']);
  });

  it('BE trả null -> trả gói free, HomeScreen không vỡ', async () => {
    ApiClient.get.mockResolvedValue(null);

    const plan = await service.getCurrentPlan();

    expect(plan.name).toBe('free');
    expect(plan.displayName).toBe('Miễn phí');
    expect(plan.price).toBe(0);
    expect(plan.features).toEqual([]);
  });

  it('`plan` lồng thiếu field -> fallback an toàn, không trả undefined', async () => {
    ApiClient.get.mockResolvedValue({ plan: { name: 'free' } });

    const plan = await service.getCurrentPlan();

    expect(plan.displayName).toBe('Miễn phí');
    expect(plan.price).toBe(0);
    expect(plan.features).toEqual([]);
  });
});

// ═══════════════ Cài đặt thông báo ═══════════════
// Bug A2 (sửa 23/10): service đọc `pushEnabled` / `expiryAlertEnabled` /
// `shoppingReminderEnabled`, nhưng BE thật trả `pushNotifications` /
// `expiryAlert` / `shoppingReminder` (`notifications-response.dto.ts:43-45`).
// Vì so sánh `=== true` với `undefined` ra false -> UI hiện TẮT hết dù user
// đang bật. Test dưới đây chốt lại tên field để lỗi này không tái diễn.

describe('RealUserService - notification settings', () => {
  /** `NotificationSettingsResponseDto` — đúng tên field BE. */
  const beNotifSettings = (overrides = {}) => ({
    pushNotifications: true,
    expiryAlert: true,
    shoppingReminder: false,
    ...overrides,
  });

  it('get đọc đúng tên field BE (không phải `*Enabled`)', async () => {
    ApiClient.get.mockResolvedValue(beNotifSettings());

    const settings = await service.getNotificationSettings();

    expect(ApiClient.get).toHaveBeenCalledWith('/users/me/notification-settings');
    expect(settings).toEqual({
      pushNotifications: true,
      expiryAlert: true,
      shoppingReminder: false,
    });
  });

  it('BE trả `true` thì service trả `true` — KHÔNG rơi về false do đọc sai tên', async () => {
    // Chốt đúng bug: trước đây đọc `res.pushEnabled` (undefined) -> false.
    ApiClient.get.mockResolvedValue({
      pushNotifications: true,
      expiryAlert: true,
      shoppingReminder: true,
    });

    const settings = await service.getNotificationSettings();

    expect(settings.pushNotifications).toBe(true);
    expect(settings.expiryAlert).toBe(true);
    expect(settings.shoppingReminder).toBe(true);
  });

  it('update gửi đúng tên field lên BE', async () => {
    ApiClient.patch.mockResolvedValue(beNotifSettings({ shoppingReminder: true }));

    await service.updateNotificationSettings({
      pushNotifications: false,
      expiryAlert: true,
      shoppingReminder: true,
    });

    const [url, payload] = ApiClient.patch.mock.calls[0];
    expect(url).toBe('/users/me/notification-settings');
    expect(payload).toEqual({
      pushNotifications: false,
      expiryAlert: true,
      shoppingReminder: true,
    });
    // Tên field cũ KHÔNG được gửi lên (BE sẽ bỏ qua -> user tưởng đã lưu).
    expect('pushEnabled' in payload).toBe(false);
    expect('expiryAlertEnabled' in payload).toBe(false);
    expect('shoppingReminderEnabled' in payload).toBe(false);
  });

  it('update chỉ gửi field được đổi, bỏ field null/undefined', async () => {
    ApiClient.patch.mockResolvedValue(beNotifSettings());

    await service.updateNotificationSettings({ pushNotifications: false });

    const payload = ApiClient.patch.mock.calls[0][1];
    expect(payload).toEqual({ pushNotifications: false });
    expect('expiryAlert' in payload).toBe(false);
    expect('shoppingReminder' in payload).toBe(false);
  });

  it('BE trả thiếu field -> trả false, không trả undefined (UI toggle cần boolean)', async () => {
    ApiClient.get.mockResolvedValue({});

    const settings = await service.getNotificationSettings();

    expect(settings.pushNotifications).toBe(false);
    expect(settings.expiryAlert).toBe(false);
    expect(settings.shoppingReminder).toBe(false);
  });
});

// ═══════════════ Gia đình: getFamily theo contract IUserService ═══════════════
// Bug B1 (sau khi merge dev A 23/10): `IUserService` khai báo `getFamily()`,
// `MockUserService` implement đúng tên đó, nhưng `RealUserService` chỉ có
// `getFamilyInfo()` -> `getFamily()` được KẾ THỪA từ base và throw
// "must be implemented". `SafeService.withFallback` không cứu được (lỗi này
// không phải 5xx/network) -> màn "Tủ lạnh của tôi" (B1) mất số liệu gia đình.

describe('RealUserService - getFamily (contract IUserService)', () => {
  /** `FamilyRoleDto` của BE = `{ role, group }`. */
  const beFamilyRole = (overrides = {}) => ({
    role: 'owner',
    group: {
      id: 'g-1',
      status: 'active',
      activeCount: 2,
      maxMembers: 5,
      owner: { id: 'u-1', name: 'Chủ gia đình', avatar: null },
      members: [{ id: 'u-2', name: 'Thành viên', status: 'active', avatar: null }],
    },
    ...overrides,
  });

  it('getFamily() gọi GET /family/me và trả shape đã map', async () => {
    ApiClient.get.mockResolvedValue(beFamilyRole());

    const family = await service.getFamily();

    expect(ApiClient.get).toHaveBeenCalledWith('/family/me');
    expect(family.role).toBe('owner');
    expect(family.activeCount).toBe(2);
    expect(family.members).toHaveLength(1);
    expect(family.groupId).toBe('g-1');
  });

  it('getFamily() và getFamilyInfo() trả CÙNG kết quả (alias)', async () => {
    ApiClient.get.mockResolvedValue(beFamilyRole());

    const viaContract = await service.getFamily();
    const viaName = await service.getFamilyInfo();

    expect(viaContract).toEqual(viaName);
  });

  it('BE không có group -> role "none", KHÔNG crash', async () => {
    ApiClient.get.mockResolvedValue({ role: 'none', group: null });

    const family = await service.getFamily();

    expect(family.role).toBe('none');
    expect(family.members).toEqual([]);
    expect(family.activeCount).toBe(0);
  });
});
