/**
 * Test `MockUserService` phần A3 (gói dịch vụ + gia đình).
 *
 * Sprint A3 (24/10).
 *
 * ⚠️ VÌ SAO TEST NÀY QUAN TRỌNG:
 *   `SafeService.withFallback` chỉ proxy method có trong prototype chain của
 *   MOCK. Method A3 thiếu ở mock = UI crash khi `USE_MOCKS=false`.
 *   Test này chốt shape + hành vi của mock cho đúng với `RealSubscriptionService`
 *   và `RealFamilyService` (fallback phải trả CÙNG SHAPE, không phải shape khác).
 */

describe('MockUserService - A3 subscriptions', () => {
  let service;

  beforeEach(() => {
    // State của mock là MODULE-LEVEL (`mockSubscription`, `mockPendingPayment`)
    // -> test trước đó có thể để lại giao dịch pending.
    // `jest.resetModules()` + require lại -> state sạch cho mỗi test.
    jest.resetModules();
    const Mod = require('../MockUserService');
    service = new Mod.MockUserService();
  });

  it('getMySubscription trả shape giống `toSubscription()`', async () => {
    const sub = await service.getMySubscription();
    expect(sub).toHaveProperty('status');
    expect(sub).toHaveProperty('plan');
    expect(sub.plan).toHaveProperty('id');
    expect(sub.plan).toHaveProperty('name');
    expect(sub.plan).toHaveProperty('displayName');
    expect(sub.plan).toHaveProperty('price');
    expect(sub.plan).toHaveProperty('period');
    expect(Array.isArray(sub.plan.features)).toBe(true);
  });

  it('subscribe trả shape giống `toCheckout()` (có qrCode + paymentRef)', async () => {
    const pkg = await service.getAvailablePackages();
    const target = pkg[0];
    const checkout = await service.subscribe(target.id);

    expect(checkout).toHaveProperty('qrCode');
    expect(checkout).toHaveProperty('paymentRef');
    expect(checkout).toHaveProperty('amount');
    expect(checkout).toHaveProperty('expireAt');
    expect(checkout.status).toBe('pending');
    expect(checkout.qrCode).toBeTruthy();
  });

  it('subscribe với planId không tồn tại -> throw', async () => {
    await expect(service.subscribe('khong-ton-tai')).rejects.toThrow();
  });

  it('findPendingPayment trả giao dịch pending sau khi subscribe (khôi phục QR)', async () => {
    expect(await service.findPendingPayment()).toBeNull();
    const pkg = await service.getAvailablePackages();
    const checkout = await service.subscribe(pkg[0].id);

    const pending = await service.findPendingPayment();
    expect(pending).not.toBeNull();
    expect(pending.paymentRef).toBe(checkout.paymentRef);
    expect(pending.qrCode).toBeTruthy();
  });

  it('renewSubscription trả shape checkout (gia hạn)', async () => {
    const checkout = await service.renewSubscription();
    expect(checkout).toHaveProperty('qrCode');
    expect(checkout).toHaveProperty('paymentRef');
    expect(checkout.status).toBe('pending');
  });

  it('cancelAutoRenewal trả message + endDate', async () => {
    const res = await service.cancelAutoRenewal();
    expect(typeof res.message).toBe('string');
    expect(res).toHaveProperty('endDate');
  });

  it('getPaymentStatus trả shape { status, amount, paidAt }', async () => {
    const status = await service.getPaymentStatus('ref-abc');
    expect(status).toHaveProperty('status');
    expect(status).toHaveProperty('amount');
    expect(status).toHaveProperty('paidAt');
  });

  it('isSubscribedTo chỉ true khi status=active VÀ plan khớp', async () => {
    expect(await service.isSubscribedTo('free')).toBe(true);
    expect(await service.isSubscribedTo('family')).toBe(false);
  });

  it('getCurrentPlan phải có `status` (HomeScreen check family plan)', async () => {
    const plan = await service.getCurrentPlan();
    expect(plan).toHaveProperty('status');
    expect(plan).toHaveProperty('endDate');
    expect(plan).toHaveProperty('autoRenew');
    expect(plan).toHaveProperty('name');
  });
});

describe('MockUserService - A3 family', () => {
  let service;

  beforeEach(() => {
    jest.resetModules();
    const Mod = require('../MockUserService');
    service = new Mod.MockUserService();
  });

  it('getFamilyInfo trả shape giống `toFamilyInfo()`', async () => {
    const info = await service.getFamilyInfo();
    expect(['owner', 'member', 'none']).toContain(info.role);
    expect(Array.isArray(info.members)).toBe(true);
    expect(info).toHaveProperty('activeCount');
    expect(info).toHaveProperty('maxMembers');
    expect(info).toHaveProperty('groupId');
  });

  it('inviteFamilyMember trả { message } và validate email', async () => {
    const res = await service.inviteFamilyMember('ban@example.com');
    expect(typeof res.message).toBe('string');
    expect(res.message).toContain('ban@example.com');

    await expect(service.inviteFamilyMember('khong-phai-email')).rejects.toThrow();
  });

  it('acceptFamilyInvite / rejectFamilyInvite trả { message }', async () => {
    const accept = await service.acceptFamilyInvite('token-123');
    expect(typeof accept.message).toBe('string');

    const reject = await service.rejectFamilyInvite('token-123');
    expect(typeof reject.message).toBe('string');

    await expect(service.acceptFamilyInvite('')).rejects.toThrow();
    await expect(service.rejectFamilyInvite('')).rejects.toThrow();
  });

  it('dissolveFamilyGroup trả message + reset group', async () => {
    const res = await service.dissolveFamilyGroup();
    expect(typeof res.message).toBe('string');

    const info = await service.getFamilyInfo();
    expect(info.role).toBe('none');
    expect(info.groupId).toBeNull();
  });
});
