/**
 * RealUserService - nối profile / preferences / allergies / onboarding với BE.
 *
 * Sprint A2. Nguồn sự thật:
 *   BE  - `be/src/modules-api/users/users.controller.ts` + `dto/users*.dto.ts`
 *   Flutter - `Mobile/lib/data/services/api_service.dart` (đã chạy production)
 *
 * Đối chiếu 23/10: BE và Flutter GIỐNG NHAU 100% cho cả 4 nhóm tính năng này
 * → theo Bước 2 mục 0 của plan: follow Flutter.
 *
 * R2: mọi URL ảnh đi qua `appConfig.getImageUrl()` (BE dùng 2 host khác nhau).
 * R5: chỉ đọc token qua ApiClient, KHÔNG import `useAuthStore` (tránh vòng lặp import).
 */

import { IUserService } from '../../interfaces/IUserService';
import { ApiClient } from '../../api/ApiClient';
import { ApiException } from '../../api/ApiException';
import { appConfig } from '../../../shared/config/appConfig';
import { registerService } from '../../api/ServiceRegistry';

// ─────────────────────────────────────────────────────────────
// ENUM — lấy từ `be/src/modules-api/users/dto/users.dto.ts`
// Không hardcode giá trị không có trong BE, không có trong BE = sẽ bị 400.
// ─────────────────────────────────────────────────────────────

const DIETARY_STYLES = ['omnivore', 'vegetarian', 'vegan', 'keto', 'halal'];
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'];
const AI_PERSONALITY_MODES = ['friendly', 'professional', 'coach'];
const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active'];

/** BE `GenderEnum` — chỉ male/female/other, không có "none". */
const GENDERS = ['male', 'female', 'other'];

// ─────────────────────────────────────────────────────────────
// GIÁ TRỊ MẶC ĐỊNH
// Chỉ dùng khi BE KHÔNG trả field (user mới chưa set). Đây là "nếu BE không đổi",
// không phải "giá trị đúng" — xem P0.3 BẮT BUỘC 8.
// Đồng bộ với default của Flutter (`user_preferences_screen.dart:32-37`).
// ─────────────────────────────────────────────────────────────

const DEFAULT_PREFS = {
  weeklyBudget: null,
  dailyCalorieTarget: null,
  dietaryStyle: 'omnivore',
  preferSimpleRecipes: false,
  maxCookTimeMinutes: null,
  skillLevel: 'beginner',
  householdSize: 1,
  aiPersonalityMode: 'friendly',
  primaryGoal: 'save_money',
  cookingFrequency: 'daily',
  height: null,
  weight: null,
  activityLevel: 'moderate',
};

/** Chỉ giữ giá trị BE thực sự nhận — tránh gửi field lạ gây 400. */
const pickEnum = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

/** Bỏ field `undefined`/`null` — BE validate `@IsOptional()` nhưng gửi null thừa gây 400. */
const omitEmpty = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));

export class RealUserService extends IUserService {
  // ══════════════════════════════════════════════════════════════
  // MAPPER
  // ══════════════════════════════════════════════════════════════

  /**
   * `MeResponseDto` + `UserProfileResponseDto` -> `UserProfile` của interface.
   *
   * BE trả profile lồng trong `me.profile` (không phải phẳng ở top):
   *   { id, name, email, status, role, isOnboardingCompleted,
   *     profile: { displayName, avatarUrl, dateOfBirth, gender, bio } }
   */
  _toUserProfile(dto) {
    if (!dto) return null;
    const p = dto.profile ?? {};
    return {
      id: dto.id,
      name: dto.name ?? p.displayName ?? null,
      email: dto.email ?? null,
      phone: null, // BE `MeResponseDto` không trả phone — giữ null, không bịa
      // R2: `avatarUrl` là đường dẫn tương đối (`/avatars/x.jpg`) → phải qua getImageUrl
      avatar: appConfig.getImageUrl(p.avatarUrl),
      birthday: p.dateOfBirth ?? null,
      gender: pickEnum(p.gender, GENDERS, null),
      bio: p.bio ?? null,
      joinDate: dto.createdAt ?? undefined,
      isOnboardingCompleted: dto.isOnboardingCompleted === true,
    };
  }

  /**
   * `UserPreferenceResponseDto` -> `UserPreferencesFull`.
   *
   * BE trả đủ 13 field nhưng có thể `null` (user mới chưa set) → thay bằng
   * DEFAULT_PREFS chứ KHÔNG để `undefined`, để UI luôn có giá trị hiển thị được.
   */
  _toPreferences(dto) {
    if (!dto) return { ...DEFAULT_PREFS };
    return {
      weeklyBudget: dto.weeklyBudget ?? DEFAULT_PREFS.weeklyBudget,
      dailyCalorieTarget: dto.dailyCalorieTarget ?? DEFAULT_PREFS.dailyCalorieTarget,
      dietaryStyle: pickEnum(dto.dietaryStyle, DIETARY_STYLES, DEFAULT_PREFS.dietaryStyle),
      preferSimpleRecipes: dto.preferSimpleRecipes === true,
      maxCookTimeMinutes: dto.maxCookTimeMinutes ?? DEFAULT_PREFS.maxCookTimeMinutes,
      skillLevel: pickEnum(dto.skillLevel, SKILL_LEVELS, DEFAULT_PREFS.skillLevel),
      householdSize: dto.householdSize ?? DEFAULT_PREFS.householdSize,
      aiPersonalityMode: pickEnum(
        dto.aiPersonalityMode,
        AI_PERSONALITY_MODES,
        DEFAULT_PREFS.aiPersonalityMode
      ),
      primaryGoal: dto.primaryGoal ?? DEFAULT_PREFS.primaryGoal,
      cookingFrequency: dto.cookingFrequency ?? DEFAULT_PREFS.cookingFrequency,
      height: dto.height ?? DEFAULT_PREFS.height,
      weight: dto.weight ?? DEFAULT_PREFS.weight,
      activityLevel: pickEnum(dto.activityLevel, ACTIVITY_LEVELS, DEFAULT_PREFS.activityLevel),
    };
  }

  /** `AllergyResponseDto` -> `Allergy`. BE trả `ingredientName`, interface dùng `name`. */
  _toAllergy(dto) {
    if (!dto) return null;
    return {
      id: String(dto.id),
      ingredientId: Number(dto.ingredientId),
      name: dto.ingredientName ?? '',
      note: dto.note ?? null,
    };
  }

  /** Shape `UserPreferencesFull` -> payload `UpdatePreferencesDto` (bỏ field rỗng). */
  _prefsToPayload(prefs) {
    return omitEmpty({
      weeklyBudget: prefs.weeklyBudget,
      dailyCalorieTarget: prefs.dailyCalorieTarget,
      dietaryStyle: pickEnum(prefs.dietaryStyle, DIETARY_STYLES, undefined),
      preferSimpleRecipes: prefs.preferSimpleRecipes,
      maxCookTimeMinutes: prefs.maxCookTimeMinutes,
      skillLevel: pickEnum(prefs.skillLevel, SKILL_LEVELS, undefined),
      householdSize: prefs.householdSize,
      aiPersonalityMode: pickEnum(prefs.aiPersonalityMode, AI_PERSONALITY_MODES, undefined),
      primaryGoal: prefs.primaryGoal,
      cookingFrequency: prefs.cookingFrequency,
      height: prefs.height,
      weight: prefs.weight,
      activityLevel: pickEnum(prefs.activityLevel, ACTIVITY_LEVELS, undefined),
    });
  }

  // ══════════════════════════════════════════════════════════════
  // PROFILE
  // ══════════════════════════════════════════════════════════════

  /** GET /users/me */
  async getProfile() {
    const res = await ApiClient.get('/users/me');
    return this._toUserProfile(res);
  }

  /**
   * PATCH /users/me/profile - `UpdateProfileDto` chỉ nhận 4 field:
   * name / dateOfBirth / gender / bio. `email` KHÔNG sửa được ở đây
   * (BE đã xác nhận qua `@IsOptional()` của các field kia).
   */
  async updateProfile(updates) {
    const payload = omitEmpty({
      name: updates?.name,
      // BE validate `@IsISO8601()` → UI dd/mm/yyyy phải đổi sang ISO trước khi gửi.
      dateOfBirth: updates?.birthday || updates?.dateOfBirth,
      gender: pickEnum(updates?.gender, GENDERS, undefined),
      bio: updates?.bio,
    });

    const res = await ApiClient.patch('/users/me/profile', payload);
    return this._toUserProfile(res);
  }

  /**
   * POST /users/me/avatar - multipart, field tên là `file`
   * (`@UseInterceptors(FileInterceptor('file', ...))`).
   *
   * BE trả `{ avatarUrl }` (đường dẫn tương đối). Interface khai báo `{ url }`
   * nên map lại — nhưng đã qua `getImageUrl()` sẵn để không "ảnh vô" (R2).
   */
  async uploadAvatar(localUri) {
    const res = await ApiClient.uploadFile('/users/me/avatar', localUri, 'file');
    return { url: appConfig.getImageUrl(res?.avatarUrl) };
  }

  // ══════════════════════════════════════════════════════════════
  // PREFERENCES
  // ══════════════════════════════════════════════════════════════

  /**
   * GET /users/me/preferences - BE có thể trả `null` (user chưa set preferences)
   * → trả về DEFAULT_PREFS để UI có sẵn giá trị, không crash.
   */
  async getPreferences() {
    const res = await ApiClient.get('/users/me/preferences');
    return this._toPreferences(res);
  }

  /** PATCH /users/me/preferences */
  async updatePreferences(prefs) {
    const res = await ApiClient.patch('/users/me/preferences', this._prefsToPayload(prefs));
    return this._toPreferences(res);
  }

  // ══════════════════════════════════════════════════════════════
  // ALLERGIES — thêm/xoá TỪNG DÒNG (không có endpoint thay thế toàn bộ)
  // ══════════════════════════════════════════════════════════════

  /** GET /users/me/allergies */
  async getAllergies() {
    const res = await ApiClient.get('/users/me/allergies');
    return Array.isArray(res) ? res.map((d) => this._toAllergy(d)).filter(Boolean) : [];
  }

  /**
   * POST /users/me/allergies - `AddAllergyDto` BẮT BUỘC `ingredientId` (int >= 1).
   * Gửi tên nguyên liệu tự do sẽ bị 400 → UI phải có picker trỏ `GET /ingredients`.
   * Trùng cũng 400 (BE trả "Nguyên liệu đã có trong danh sách dị ứng").
   */
  async addAllergy(ingredientId, note) {
    const id = Number(ingredientId);
    if (!Number.isInteger(id) || id < 1) {
      throw new ApiException('ID nguyên liệu không hợp lệ', { statusCode: 400 });
    }
    const res = await ApiClient.post('/users/me/allergies', omitEmpty({ ingredientId: id, note }));
    return this._toAllergy(res);
  }

  /** DELETE /users/me/allergies/:id - BE trả 204, không có body để unwrap. */
  async removeAllergy(id) {
    await ApiClient.delete(`/users/me/allergies/${id}`);
  }

  /**
   * Tìm nguyên liệu trong catalog — BẮT BUỘC cho việc thêm dị ứng.
   *
   * BE `AddAllergyDto` nhận `ingredientId` (int) trỏ vào catalog, không nhận
   * tên tự do. UI phải có picker gọi hàm này, không tự bịa tên.
   *
   * `GET /ingredients` trả phân trang `{ data, total, page, limit }` — service
   * trả về mảng phẳng để UI dùng thẳng, giống quy ước của plan với `GET /recipes`.
   *
   * @param {string} search
   * @param {number} [limit]
   * @returns {Promise<Array<{id:number, name:string, imagePath?:string|null}>>}
   */
  async searchIngredients(search, limit = 20) {
    const res = await ApiClient.get('/ingredients', {
      params: { search, limit, page: 1 },
    });
    const items = Array.isArray(res) ? res : res?.data;
    if (!Array.isArray(items)) return [];
    return items.map((d) => ({
      id: Number(d.id),
      name: d.name ?? '',
      // R2: ảnh nguyên liệu là đường dẫn tương đối -> phải qua getImageUrl
      image: appConfig.getImageUrl(d.imagePath),
    }));
  }

  // ══════════════════════════════════════════════════════════════
  // ONBOARDING
  // ══════════════════════════════════════════════════════════════

  /**
   * POST /users/me/onboarding - `OnboardingDto` BẮT BUỘC `primaryGoal` +
   * `cookingFrequency` (không `@IsOptional()`) → thiếu là 400.
   *
   * Theo Flutter (`onboarding_survey_screen.dart:176-186`): submit onboarding
   * TRƯỚC, rồi mới loop POST allergies. Lỗi 1 allergy không được chặn luồng.
   */
  async submitOnboarding(data) {
    if (!data?.primaryGoal || !data?.cookingFrequency) {
      throw new ApiException('Thiếu mục tiêu hoặc tần suất nấu ăn', { statusCode: 400 });
    }
    const payload = omitEmpty({
      primaryGoal: data.primaryGoal,
      cookingFrequency: data.cookingFrequency,
      dietaryStyle: pickEnum(data.dietaryStyle, DIETARY_STYLES, undefined),
      height: data.height,
      weight: data.weight,
      activityLevel: pickEnum(data.activityLevel, ACTIVITY_LEVELS, undefined),
    });
    const res = await ApiClient.post('/users/me/onboarding', payload);
    return this._toUserProfile(res);
  }

  // ══════════════════════════════════════════════════════════════
  // CÀI ĐẶT THÔNG BÁO
  // ══════════════════════════════════════════════════════════════

  /** GET /users/me/notification-settings */
  async getNotificationSettings() {
    const res = await ApiClient.get('/users/me/notification-settings');
    return {
      pushEnabled: res?.pushEnabled === true,
      expiryAlertEnabled: res?.expiryAlertEnabled === true,
      shoppingReminderEnabled: res?.shoppingReminderEnabled === true,
    };
  }

  /** PATCH /users/me/notification-settings */
  async updateNotificationSettings(settings) {
    const res = await ApiClient.patch(
      '/users/me/notification-settings',
      omitEmpty({
        pushEnabled: settings?.pushEnabled,
        expiryAlertEnabled: settings?.expiryAlertEnabled,
        shoppingReminderEnabled: settings?.shoppingReminderEnabled,
      })
    );
    return {
      pushEnabled: res?.pushEnabled === true,
      expiryAlertEnabled: res?.expiryAlertEnabled === true,
      shoppingReminderEnabled: res?.shoppingReminderEnabled === true,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // SUBSCRIPTION
  // ══════════════════════════════════════════════════════════════

  /**
   * GET /subscriptions/me - gói dịch vụ hiện tại.
   *
   * VÌ SAO CẦN METHOD NÀY (Sprint A2, fix 23/10):
   *   `HomeScreen` gọi `useCurrentPlan()` ngay khi mount. Trước đây
   *   `RealUserService` KHÔNG override method này -> JS prototype chain resolve
   *   tới `IUserService.getCurrentPlan()` vốn chỉ `throw`, dẫn tới warn:
   *   "IUserService.getCurrentPlan() must be implemented".
   *   `SafeService.withFallback` không cứu được vì guard của nó kiểm
   *   `typeof realService[name] === 'function'` - method KẾ THỪA cũng là function.
   *
   * BE trả `UserSubscriptionResponseDto` với `plan` LỒNG BÊN TRONG, và tên field
   * KHÁC hẳn mock:
   *   - `plan.name`         -> interface dùng `name`
   *   - `plan.displayName`  -> interface dùng `displayName`
   *   - `plan.priceVnd`     -> interface dùng `price`   (KHÁC TÊN)
   *   - `plan.billingCycle` -> interface dùng `period`  (KHÁC TÊN)
   *   - `features: string[]`
   * Map sang shape interface để `HomeScreen` đọc `plan.name` /
   * `plan.displayName` không vỡ (`HomeScreen.jsx:49-51` kiểm tra family plan).
   */
  async getCurrentPlan() {
    const res = await ApiClient.get('/subscriptions/me');
    const plan = res?.plan ?? res ?? {};
    return {
      name: plan.name ?? 'free',
      displayName: plan.displayName ?? 'Miễn phí',
      price: typeof plan.priceVnd === 'number' ? plan.priceVnd : (plan.price ?? 0),
      currency: 'VND',
      period: plan.billingCycle ?? plan.period ?? null,
      features: Array.isArray(plan.features) ? plan.features : [],
      isActive: plan.isActive !== false,
      // Ngày hết hạn: null = gói free vĩnh viễn.
      endDate: res?.endDate ?? null,
      autoRenew: res?.autoRenew === true,
    };
  }
}

// Đăng ký side-effect: domain 'userService' khớp key trong ServiceProvider.
registerService('userService', new RealUserService());
