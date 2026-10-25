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
import { RealSubscriptionService } from './RealSubscriptionService';
import { RealFamilyService } from './RealFamilyService';

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
  /**
   * Service gói dịch vụ + gia đình (Sprint A3).
   *
   * Compose thay vì đăng ký key riêng - xem giải thích ở mục "SPRINT A3 - GÓI DỊCH VỤ"
   * bên dưới. Tách file để dễ đọc, nhưng vẫn 1 key `userService` để giữ nguyên
   * cơ chế fallback của `SafeService.withFallback`.
   */
  constructor() {
    super();
    this.subscriptionService = new RealSubscriptionService();
    this.familyService = new RealFamilyService();
  }

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

  /**
   * GET /users/me/notification-settings
   *
   * TÊN FIELD PHẢI KHỚP BE (`notifications-response.dto.ts:43-45`):
   *   `pushNotifications` / `expiryAlert` / `shoppingReminder`.
   * Trước đây map nhầm thành `pushEnabled` / `expiryAlertEnabled` /
   * `shoppingReminderEnabled` -> đọc `res?.pushEnabled` luôn undefined nên
   * `=== true` ra false cho cả 3: UI hiện tắt hết dù user đang bật.
   */
  async getNotificationSettings() {
    const res = await ApiClient.get('/users/me/notification-settings');
    return {
      pushNotifications: res?.pushNotifications === true,
      expiryAlert: res?.expiryAlert === true,
      shoppingReminder: res?.shoppingReminder === true,
    };
  }

  /** PATCH /users/me/notification-settings */
  async updateNotificationSettings(settings) {
    const res = await ApiClient.patch(
      '/users/me/notification-settings',
      omitEmpty({
        pushNotifications: settings?.pushNotifications,
        expiryAlert: settings?.expiryAlert,
        shoppingReminder: settings?.shoppingReminder,
      })
    );
    return {
      pushNotifications: res?.pushNotifications === true,
      expiryAlert: res?.expiryAlert === true,
      shoppingReminder: res?.shoppingReminder === true,
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
      // Trạng thái gói: 'active' | 'pending' | 'cancelled' | 'expired'.
      // CẦN để `HomeScreen` phân biệt "đang có family" với "đang pending family".
      // Flutter KHÔNG check (`home_screen.dart:152-162`) -> bug: user bấm mua
      // family chưa thanh toán vẫn thấy banner "Gia đình đang hoạt động".
      status: res?.status ?? 'expired',
    };
  }

  // ══════════════════════════════════════════════════════════════
  // SPRINT A3 - GÓI DỊCH VỤ (compose từ RealSubscriptionService)
  // ══════════════════════════════════════════════════════════════
  //
  // VÌ SAO COMPOSE THAY VÌ ĐĂNG KÝ KEY RIÊNG (user chốt 23/10):
  //   `ServiceProvider.jsx` là file IMMUTABLE (P0.5) với 5 key cố định.
  //   `resolveServices()` chỉ duyệt key có trong mock -> domain mới sẽ không bao
  //   giờ được trả về qua `useServices()`.
  //   Flutter cũng gộp family + subscription vào cùng 1 class `ApiService`
  //   (`Mobile/lib/data/services/api_service.dart:613-806`) -> theo Flutter.
  //   Cách này giữ nguyên fallback 5xx/network của `withFallback` (mock đã có
  //   sẵn trong `MockUserService`) và KHÔNG đụng file immutable.
  //
  // Chi tiết lý do + so sánh 3 phương án: plan mục "A3 - DA DOI CHIEU FLUTTER vs BE".

  /** GET /subscriptions/plans (public) → danh sách gói. */
  async getAvailablePackages() {
    return this.subscriptionService.getPackages();
  }

  /** GET /subscriptions/me → gói hiện tại (đầy đủ, có `status`). */
  async getMySubscription() {
    return this.subscriptionService.getMySubscription();
  }

  /** POST /subscriptions/subscribe → QR PayOS. */
  async subscribe(planId) {
    return this.subscriptionService.subscribe(planId);
  }

  /** POST /subscriptions/renew → QR PayOS gia hạn. */
  async renewSubscription() {
    return this.subscriptionService.renew();
  }

  /** DELETE /subscriptions/me/auto-renewal → hủy gia hạn tự động. */
  async cancelAutoRenewal() {
    return this.subscriptionService.cancelAutoRenewal();
  }

  /** GET /payment-transactions/me/:ref → trạng thái giao dịch (poll thanh toán). */
  async getPaymentStatus(paymentRef) {
    return this.subscriptionService.getPaymentStatus(paymentRef);
  }

  /**
   * Đã lên đúng gói vừa mua chưa? (chống bug poll báo thành công sớm của Flutter)
   *
   * @param {string} targetPlanName - tên gói đang mua (vd 'family').
   */
  async isSubscribedTo(targetPlanName) {
    return this.subscriptionService.isSubscribedTo(targetPlanName);
  }

  // ══════════════════════════════════════════════════════════════
  // SPRINT A3 - GIA ĐÌNH (compose từ RealFamilyService)
  // ══════════════════════════════════════════════════════════════

  /** GET /family/me → `{ role, group }` đã map. */
  async getFamilyInfo() {
    return this.familyService.getFamily();
  }

  /**
   * `IUserService.getFamily()` — alias của `getFamilyInfo()`.
   *
   * ⚠️ B1 — vá lỗi tích hợp sau khi merge dev A (23/10):
   *   `IUserService` khai báo contract là `getFamily()`, `MockUserService` implement
   *   đúng tên đó, nhưng `RealUserService` chỉ có `getFamilyInfo()`.
   *   -> `RealUserService extends IUserService` nên `getFamily()` được kế thừa
   *      từ base và **throw** `IUserService.getFamily() must be implemented`.
   *   -> `SafeService.withFallback` KHÔNG fallback lỗi này (không phải 5xx/network)
   *      -> `MyFridgesScreen` (B1) nuốt lỗi -> mất số liệu gia đình, không có
   *      invite code, không có số thành viên.
   *
   *   Thêm alias ở đây để real khớp contract của interface -> UI không phải
   *   biết tên method nào là "đúng" của từng tầng.
   */
  async getFamily() {
    return this.getFamilyInfo();
  }

  /** POST /family/invite → gửi lời mời qua email. */
  async inviteFamilyMember(email) {
    return this.familyService.inviteMember(email);
  }

  /** POST /family/accept → chấp nhận lời mời bằng token từ email. */
  async acceptFamilyInvite(token) {
    return this.familyService.acceptInvite(token);
  }

  /** POST /family/reject → từ chối lời mời bằng token từ email. */
  async rejectFamilyInvite(token) {
    return this.familyService.rejectInvite(token);
  }

  /** DELETE /family/members/:id → xoá thành viên (owner only). */
  async removeFamilyMember(memberId) {
    return this.familyService.removeMember(memberId);
  }

  /** DELETE /family/groups → giải tán gia đình (owner only). */
  async dissolveFamilyGroup() {
    return this.familyService.dissolveGroup();
  }
}

// Đăng ký side-effect: domain 'userService' khớp key trong ServiceProvider.
registerService('userService', new RealUserService());
