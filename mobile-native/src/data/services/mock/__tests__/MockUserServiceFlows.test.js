/**
 * Test E2E các luồng chính của `MockUserService` (mock mode).
 *
 * Mục tiêu: chứng minh chuỗi hành vi mà UI thực sự gọi chạy đúng end-to-end
 * trong mock mode (`USE_MOCKS=true`) — đúng thứ mà plan yêu cầu ở mục 3.3.
 *
 * Mỗi test mô phỏng chuỗi gọi thật của 1 màn hình:
 *   - FamilyPlanModal : subscribe -> poll 2 tầng -> isSubscribedTo
 *   - PackageManagementScreen : findPendingPayment -> subscribe -> poll -> renew
 *   - FamilyManagementScreen : getFamilyInfo -> invite -> dissolve
 *   - HomeScreen : getCurrentPlan -> getMySubscription (banner family)
 */

describe('MockUserService - E2E các luồng UI chính', () => {
  let service;

  beforeEach(() => {
    jest.resetModules();
    const Mod = require('../MockUserService');
    service = new Mod.MockUserService();
  });

  // ─────────────────────────────────────────────────────────
  // Luồng 1: FamilyPlanModal — mua gói Family + poll 2 tầng
  // ─────────────────────────────────────────────────────────
  it('FamilyPlanModal: subscribe -> poll 2 tầng -> báo thành công', async () => {
    // 1. Lấy danh sách gói, tìm gói family (contract BE: name === 'family').
    const packages = await service.getAvailablePackages();
    const familyPlan = packages.find((p) => p.name === 'family');
    expect(familyPlan).toBeDefined();

    // 2. Không có pending trước khi mua.
    expect(await service.findPendingPayment()).toBeNull();

    // 3. Mua gói -> trả về QR (khớp `toCheckout()` của real).
    const checkout = await service.subscribe(familyPlan.id, familyPlan.name);
    expect(checkout.qrCode).toBeTruthy();
    expect(checkout.checkoutUrl).toBeTruthy();
    expect(checkout.paymentRef).toBeTruthy();
    expect(checkout.amount).toBe(familyPlan.price);
    expect(checkout.expireAt).toBeTruthy();
    expect(checkout.status).toBe('pending');

    // 4. Tầng 1 poll: giao dịch đang chờ -> 'pending'.
    const tx = await service.getPaymentStatus(checkout.paymentRef);
    expect(tx.status).toBe('pending');

    // 5. Tầng 2 poll: đã lên đúng gói chưa -> true.
    expect(await service.isSubscribedTo(familyPlan.name)).toBe(true);

    // 6. `findPendingPayment` khôi phục được QR cũ (luồng 409 của BE).
    const pending = await service.findPendingPayment();
    expect(pending.paymentRef).toBe(checkout.paymentRef);
    expect(pending.qrCode).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────
  // Luồng 2: HomeScreen — banner family chỉ hiện khi gói active
  // ─────────────────────────────────────────────────────────
  it('HomeScreen: banner family chỉ hiện khi plan.status === "active"', async () => {
    // Mặc định gói free -> không có banner family.
    const freePlan = await service.getCurrentPlan();
    expect(freePlan.name).toBe('free');
    expect(freePlan.status === 'active' && freePlan.name === 'family').toBe(false);

    // Mua family -> banner bật.
    const packages = await service.getAvailablePackages();
    const familyPlan = packages.find((p) => p.name === 'family');
    await service.subscribe(familyPlan.id, familyPlan.name);

    const activePlan = await service.getCurrentPlan();
    expect(activePlan.name).toBe('family');
    expect(activePlan.status === 'active').toBe(true);

    // Giải thể nhóm -> banner tắt (dù vẫn còn `status` khác 'active').
    await service.dissolveFamilyGroup();
    const afterPlan = await service.getCurrentPlan();
    expect(afterPlan.status === 'active' && afterPlan.name === 'family').toBe(false);
  });

  // ─────────────────────────────────────────────────────────
  // Luồng 3: PackageManagementScreen — quản lý gói + gia hạn
  // ─────────────────────────────────────────────────────────
  it('PackageManagementScreen: load gói -> subscribe -> renew -> cancel auto-renew', async () => {
    // Load màn hình: 2 call song song.
    const packages = await service.getAvailablePackages();
    const subscription = await service.getMySubscription();
    expect(Array.isArray(packages)).toBe(true);
    expect(subscription).toHaveProperty('plan');
    expect(subscription.plan).toHaveProperty('name');
    expect(subscription.plan).toHaveProperty('displayName');
    expect(subscription.plan).toHaveProperty('price');
    expect(subscription.plan).toHaveProperty('features');

    // Nâng cấp.
    const individual = packages.find((p) => p.name === 'individual');
    const checkout = await service.subscribe(individual.id, individual.name);
    expect(checkout.status).toBe('pending');
    expect(await service.isSubscribedTo('individual')).toBe(true);

    // Gia hạn -> QR mới, pending được ghi lại.
    const renewCheckout = await service.renewSubscription();
    expect(renewCheckout.qrCode).toBeTruthy();
    expect(renewCheckout.paymentRef).toBeTruthy();
    expect(renewCheckout.status).toBe('pending');
    expect((await service.findPendingPayment()).paymentRef).toBe(renewCheckout.paymentRef);

    // Hủy gia hạn tự động.
    const cancelled = await service.cancelAutoRenewal();
    expect(typeof cancelled.message).toBe('string');
    expect(cancelled).toHaveProperty('endDate');
  });

  // ─────────────────────────────────────────────────────────
  // Luồng 4: FamilyManagementScreen — mời / giải thể
  // ─────────────────────────────────────────────────────────
  it('FamilyManagementScreen: getFamilyInfo -> invite -> dissolve', async () => {
    const info = await service.getFamilyInfo();
    expect(['owner', 'member', 'none']).toContain(info.role);
    expect(Array.isArray(info.members)).toBe(true);
    expect(info.maxMembers).toBe(5);

    // Mời bằng email hợp lệ -> trả message.
    const invited = await service.inviteFamilyMember('ban@example.com');
    expect(typeof invited.message).toBe('string');

    // Mời bằng email sai -> throw (UI bắt và hiện lỗi).
    await expect(service.inviteFamilyMember('khong-hop-le')).rejects.toThrow();

    // Token rỗng -> throw.
    await expect(service.acceptFamilyInvite('')).rejects.toThrow();
    await expect(service.rejectFamilyInvite('')).rejects.toThrow();

    // Giải thể -> role 'none' + groupId null.
    await service.dissolveFamilyGroup();
    const after = await service.getFamilyInfo();
    expect(after.role).toBe('none');
    expect(after.groupId).toBeNull();
  });

  // ─────────────────────────────────────────────────────────
  // Luồng 5: Onboarding — payload đủ field BE nhận
  // ─────────────────────────────────────────────────────────
  it('Onboarding: submitOnboarding nhận đủ field và validate', async () => {
    const payload = {
      primaryGoal: 'save_money',
      cookingFrequency: 'daily',
      householdSize: 3,
      dietaryStyle: 'none',
      activityLevel: 'medium',
      height: 170,
      weight: 65,
      allergies: [],
    };
    const result = await service.submitOnboarding(payload);
    expect(result).toBeTruthy();

    // Thiếu field bắt buộc -> throw (khớp BE `@IsNotEmpty`).
    await expect(service.submitOnboarding({ cookingFrequency: 'daily' })).rejects.toThrow();
  });

  // ─────────────────────────────────────────────────────────
  // Luồng 6: Profile / Preferences / Allergies
  // ─────────────────────────────────────────────────────────
  it('Profile: đọc/ghi profile, preferences và allergies', async () => {
    const profile = await service.getProfile();
    expect(profile).toBeTruthy();

    const updated = await service.updateProfile({ fullName: 'Nguyễn Test' });
    expect(updated).toBeTruthy();
    expect((await service.getProfile()).fullName).toBe('Nguyễn Test');

    const prefs = await service.getPreferences();
    expect(prefs).toBeTruthy();
    const updatedPrefs = await service.updatePreferences({ ...prefs, ...prefs.preferences });
    expect(updatedPrefs).toBeTruthy();

    const allergies = await service.getAllergies();
    expect(Array.isArray(allergies)).toBe(true);

    // Thêm dị ứng với `ingredientId` SỐ hợp lệ (BE `POST /users/me/allergies`).
    // `allergies.json` đã có sẵn ingredientId 12 và 34 -> dùng 45 (Tôm cua là 12).
    const created = await service.addAllergy(45, 'dị ứng test');
    expect(created.ingredientId).toBe(45);
    const afterAdd = await service.getAllergies();
    expect(afterAdd.length).toBe(allergies.length + 1);

    // Thêm lại cùng nguyên liệu -> throw (BE chặn trùng).
    await expect(service.addAllergy(45)).rejects.toThrow();

    // Thêm ingredientId đã có sẵn trong danh sách -> throw.
    await expect(service.addAllergy(12)).rejects.toThrow();

    // `ingredientId` không hợp lệ -> throw.
    await expect(service.addAllergy(0)).rejects.toThrow();
    await expect(service.addAllergy('abc')).rejects.toThrow();

    // Xoá dị ứng theo `id` bản ghi.
    await service.removeAllergy(created.id);
    const afterRemove = await service.getAllergies();
    expect(afterRemove.length).toBe(allergies.length);

    // Xoá id không tồn tại -> throw.
    await expect(service.removeAllergy('allergy-khong-ton-tai')).rejects.toThrow();
  });
});
