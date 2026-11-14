/**
 * Test hồi quy cho các hành vi vừa sửa trong `MockUserService`.
 *
 * ⚠️ BỐI CẢNH (sau merge PR #69):
 *   Quá trình giải quyết conflict để lại 2 khối implement trùng lặp cho
 *   cùng 12 method trong 1 class -> method sau ghi đè method trước, và 2 biến
 *   state (`mockSubscription`, `mockPendingPayment`) bị rơi -> `ReferenceError`.
 *   Hậu quả: 9 test FAIL + 29 ESLint error.
 *
 *   File này CHỐT lại các hành vi sau khi gộp, để lần refactor sau không
 *   vô tình phá:
 *   1. `subscribe(planId, planName)` — 2 tham số (FamilyPlanModal truyền 2).
 *   2. `subscribe` throw khi gói không tồn tại.
 *   3. `getPaymentStatus` trả 'paid' khi giao dịch KHÔNG còn pending
 *      (nếu luôn 'pending' -> poll 2 tầng trong `PayOSPaymentSheet` quay
 *      vô hạn trong mock mode).
 *   4. `getFamilyInfo` trả shape ĐẦY ĐỦ (có `groupId`/`groupStatus`).
 *   5. `dissolveFamilyGroup` reset luôn gói về Free -> banner family tắt.
 *   6. `getCurrentPlan` đọc `status` từ state (không hardcode 'active').
 *   7. Không còn method trùng tên trong prototype chain.
 */

describe('MockUserService - hồi quy sau gộp khối trùng lặp', () => {
  let service;

  beforeEach(() => {
    // State là MODULE-LEVEL -> reset module để mỗi test có state sạch.
    jest.resetModules();
    const Mod = require('../MockUserService');
    service = new Mod.MockUserService();
  });

  // ─── 7. Không còn method trùng tên ───
  it('mỗi method chỉ được khai báo MỘT lần trong class', () => {
    // Chỉ kiểm tra prototype TRỰC TIẾP (class `MockUserService`).
    // Base class có thể khai báo method mà subclass override — đó là bình
    // thường, KHÔNG phải lỗi `no-dupe-class-members` của ESLint.
    const own = Object.getOwnPropertyNames(Object.getPrototypeOf(service)).filter(
      (n) => n !== 'constructor'
    );
    const counts = {};
    for (const n of own) counts[n] = (counts[n] || 0) + 1;

    const duplicated = Object.entries(counts)
      .filter(([, count]) => count > 1)
      .map(([name]) => name);

    expect(duplicated).toEqual([]);
  });

  // ─── 1. subscribe nhận 2 tham số ───
  it('subscribe(planId, planName) cập nhật đúng gói trong state', async () => {
    const packages = await service.getAvailablePackages();
    const family = packages.find((p) => p.name === 'family');
    expect(family).toBeDefined();

    const checkout = await service.subscribe(family.id, family.name);

    expect(checkout.status).toBe('pending');
    expect(checkout.qrCode).toBeTruthy();
    expect(checkout.paymentRef).toBeTruthy();
    expect(checkout.amount).toBe(family.price);

    // `isSubscribedTo` phải trả true -> poll 2 tầng thoát được.
    expect(await service.isSubscribedTo('family')).toBe(true);
    expect(await service.isSubscribedTo('individual')).toBe(false);
  });

  it('subscribe khớp gói theo `planName` khi `planId` không map được', async () => {
    // `FamilyPlanModal` truyền `planId` SỐ của BE; fallback theo `planName`.
    const checkout = await service.subscribe(999, 'family');
    expect(checkout.qrCode).toBeTruthy();
    expect(await service.isSubscribedTo('family')).toBe(true);
  });

  // ─── 2. subscribe throw khi gói không tồn tại ───
  it('subscribe với planId + planName không tồn tại -> throw', async () => {
    await expect(service.subscribe('khong-ton-tai')).rejects.toThrow();
  });

  // ─── 3. getPaymentStatus thoát poll ───
  it('getPaymentStatus trả "pending" cho giao dịch đang chờ', async () => {
    const packages = await service.getAvailablePackages();
    const checkout = await service.subscribe(packages[0].id);

    const status = await service.getPaymentStatus(checkout.paymentRef);
    expect(status.status).toBe('pending');
  });

  it('getPaymentStatus trả "paid" cho giao dịch KHÔNG pending (poll thoát được)', async () => {
    const status = await service.getPaymentStatus('ref-khong-ton-tai');
    expect(status.status).toBe('paid');
    expect(status).toHaveProperty('amount');
    expect(status).toHaveProperty('paidAt');
  });

  // ─── 4. getFamilyInfo shape đầy đủ ───
  it('getFamilyInfo trả shape đầy đủ (có groupId + groupStatus)', async () => {
    const info = await service.getFamilyInfo();
    expect(info).toHaveProperty('role');
    expect(info).toHaveProperty('members');
    expect(info).toHaveProperty('owner');
    expect(info).toHaveProperty('activeCount');
    expect(info).toHaveProperty('maxMembers');
    expect(info).toHaveProperty('groupId');
    expect(info).toHaveProperty('groupStatus');
    expect(info).toHaveProperty('inviteCode');
  });

  it('getFamilyInfo khớp `maxMembers` của BE (5)', async () => {
    const info = await service.getFamilyInfo();
    // BE: be/src/modules-api/family/family.service.ts -> MAX_MEMBERS = 5
    expect(info.maxMembers).toBe(5);
  });

  // ─── 5. dissolveFamilyGroup reset gói ───
  it('dissolveFamilyGroup reset gói về Free (banner family phải tắt)', async () => {
    const packages = await service.getAvailablePackages();
    const family = packages.find((p) => p.name === 'family');
    await service.subscribe(family.id, family.name);
    expect(await service.isSubscribedTo('family')).toBe(true);

    await service.dissolveFamilyGroup();

    // Gói phải về free + không còn active.
    expect(await service.isSubscribedTo('family')).toBe(false);
    const plan = await service.getCurrentPlan();
    expect(plan.name).toBe('free');
    expect(plan.status).not.toBe('active');

    // Nhóm gia đình cũng phải giải thể.
    const info = await service.getFamilyInfo();
    expect(info.role).toBe('none');
    expect(info.groupId).toBeNull();
  });

  // ─── 6. getCurrentPlan đọc status từ state ───
  it('getCurrentPlan phản ánh status thật (không hardcode "active")', async () => {
    const before = await service.getCurrentPlan();
    expect(before.status).toBe('active'); // gói free mặc định -> active

    await service.dissolveFamilyGroup();

    const after = await service.getCurrentPlan();
    expect(after.status).toBe('cancelled');
    expect(after.isActive).toBe(false);
  });

  it('getCurrentPlan có đủ field mà HomeScreen đọc', async () => {
    const plan = await service.getCurrentPlan();
    expect(plan).toHaveProperty('name');
    expect(plan).toHaveProperty('displayName');
    expect(plan).toHaveProperty('status');
    expect(plan).toHaveProperty('isActive');
    expect(plan).toHaveProperty('endDate');
    expect(plan).toHaveProperty('autoRenew');
  });

  // ─── findPendingPayment (chỉ có ở Dev B, phải giữ lại) ───
  it('findPendingPayment trả null trước khi có giao dịch', async () => {
    expect(await service.findPendingPayment()).toBeNull();
  });

  it('renewSubscription cũng ghi vào mockPendingPayment (khôi phục QR được)', async () => {
    const checkout = await service.renewSubscription();
    const pending = await service.findPendingPayment();
    expect(pending).not.toBeNull();
    expect(pending.paymentRef).toBe(checkout.paymentRef);
  });

  // ─── getPaymentHistory (màn "Lịch sử thanh toán" trong Profile) ───
  it('getPaymentHistory trả shape `{ items, total, page, limit }` khớp real', async () => {
    const res = await service.getPaymentHistory(1, 20);

    expect(Array.isArray(res.items)).toBe(true);
    expect(typeof res.total).toBe('number');
    expect(res.page).toBe(1);
    expect(res.limit).toBe(20);
    expect(res.items.length).toBeGreaterThan(0);
    // Mỗi item phải có đủ field mà UI đọc.
    expect(res.items[0]).toHaveProperty('paymentRef');
    expect(res.items[0]).toHaveProperty('type');
    expect(res.items[0]).toHaveProperty('planName');
    expect(res.items[0]).toHaveProperty('amount');
    expect(res.items[0]).toHaveProperty('status');
    expect(res.items[0]).toHaveProperty('createdAt');
  });

  it('getPaymentHistory phân trang đúng (page 2 -> item khác trang 1)', async () => {
    const page1 = await service.getPaymentHistory(1, 1);
    const page2 = await service.getPaymentHistory(2, 1);

    expect(page1.items).toHaveLength(1);
    expect(page2.items).toHaveLength(1);
    expect(page1.items[0].id).not.toBe(page2.items[0].id);
    expect(page2.page).toBe(2);
  });
});
