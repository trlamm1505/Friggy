/**
 * RealSubscriptionService - test mapper BE -> shape UI + payload -> BE.
 *
 * Sprint A3. Theo R1 (mục 9b.4 của plan): mỗi Real*Service PHẢI có test chứng
 * minh mapper cho ra đúng shape và lỗi được map đúng.
 *
 * Trọng tâm của A3 là SỰ LỆCH SHAPE giữa BE và UI:
 *   - BE `priceVnd`      -> UI `price`
 *   - BE `billingCycle`  -> UI `period`
 *   - BE `id` là SỐ     -> mock dùng slug ("premium-monthly")
 *   - BE `plan` LỒNG    -> UI đọc phẳng
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
import { RealSubscriptionService } from '../RealSubscriptionService';

/** `SubscriptionPlanResponseDto` — đúng 8 field BE trả về. */
const bePlan = (overrides = {}) => ({
  id: 3,
  name: 'family',
  displayName: 'Gói Gia Đình',
  priceVnd: 149000,
  billingCycle: 'monthly',
  features: ['Tối đa 5 thành viên'],
  aiUsagePerWeek: -1,
  isActive: true,
  ...overrides,
});

/** `UserSubscriptionResponseDto` — `plan` LỒNG, không null. */
const beSubscription = (overrides = {}) => ({
  id: 'sub-1',
  status: 'active',
  startDate: '2026-09-01',
  endDate: '2026-10-01',
  paymentRef: null,
  autoRenew: true,
  cancelledAt: null,
  plan: bePlan(),
  createdAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

/** `SubscribeResponseDto` — 6 field. */
const beCheckout = (overrides = {}) => ({
  checkoutUrl: 'https://pay.payos.vn/web/abc123',
  qrCode: 'data:image/png;base64,iVBORw0KGgo=',
  paymentRef: 'FRIGGY-1727100000000',
  amount: 149000,
  expireAt: '2026-09-24T02:00:00Z',
  status: 'pending',
  ...overrides,
});

let service;

beforeEach(() => {
  jest.clearAllMocks();
  service = new RealSubscriptionService();
});

// ═══════════════ Mapper plans ═══════════════

describe('RealSubscriptionService - getPackages', () => {
  it('gọi GET /subscriptions/plans với skipAuth (endpoint PUBLIC)', async () => {
    ApiClient.get.mockResolvedValue([bePlan()]);

    await service.getPackages();

    expect(ApiClient.get).toHaveBeenCalledWith('/subscriptions/plans', { skipAuth: true });
  });

  it('map `priceVnd` -> `price`, `billingCycle` -> `period`, giữ `id` là SỐ', async () => {
    ApiClient.get.mockResolvedValue([bePlan()]);

    const [pkg] = await service.getPackages();

    // BE dùng `priceVnd`, UI dùng `price` -> KHÁC TÊN, phải map.
    expect(pkg.price).toBe(149000);
    // BE dùng `billingCycle`, UI dùng `period` -> KHÁC TÊN, phải map.
    expect(pkg.period).toBe('monthly');
    // `planId` gửi lên BE phải là SỐ (SubscribeDto `@IsInt() @IsPositive()`).
    expect(pkg.id).toBe(3);
    expect(typeof pkg.id).toBe('number');
    expect(pkg.name).toBe('family');
    expect(pkg.displayName).toBe('Gói Gia Đình');
    expect(pkg.features).toEqual(['Tối đa 5 thành viên']);
    expect(pkg.aiUsagePerWeek).toBe(-1);
  });

  it('response rác -> trả mảng rỗng thay vì crash UI', async () => {
    ApiClient.get.mockResolvedValue(null);
    await expect(service.getPackages()).resolves.toEqual([]);
  });
});

// ═══════════════ Mapper subscription ═══════════════

describe('RealSubscriptionService - getMySubscription', () => {
  it('map `plan` lồng -> `plan` phẳng, giữ `status`', async () => {
    ApiClient.get.mockResolvedValue(beSubscription());

    const sub = await service.getMySubscription();

    expect(ApiClient.get).toHaveBeenCalledWith('/subscriptions/me');
    expect(sub.status).toBe('active');
    expect(sub.plan.name).toBe('family');
    expect(sub.plan.price).toBe(149000);
    expect(sub.plan.period).toBe('monthly');
    expect(sub.autoRenew).toBe(true);
    expect(sub.endDate).toBe('2026-10-01');
  });

  it('BE trả null -> trả shape an toàn, không crash', async () => {
    ApiClient.get.mockResolvedValue(null);

    const sub = await service.getMySubscription();

    expect(sub.status).toBe('expired');
    expect(sub.plan.name).toBe('free');
    expect(sub.plan.price).toBe(0);
    expect(sub.autoRenew).toBe(false);
  });
});

// ═══════════════ Subscribe / renew ═══════════════

describe('RealSubscriptionService - subscribe', () => {
  it('gửi `planId` là SỐ lên BE', async () => {
    ApiClient.post.mockResolvedValue(beCheckout());

    await service.subscribe(3);

    const [url, payload] = ApiClient.post.mock.calls[0];
    expect(url).toBe('/subscriptions/subscribe');
    expect(payload).toEqual({ planId: 3 });
  });

  it('map `qrCode` (BE) -> `qrCode`, giữ `paymentRef` + `expireAt`', async () => {
    ApiClient.post.mockResolvedValue(beCheckout());

    const checkout = await service.subscribe(3);

    expect(checkout.qrCode).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(checkout.paymentRef).toBe('FRIGGY-1727100000000');
    expect(checkout.amount).toBe(149000);
    // `expireAt` 15 phút -> UI dùng để DỪNG poll, không poll vô hạn.
    expect(checkout.expireAt).toBe('2026-09-24T02:00:00Z');
    expect(checkout.status).toBe('pending');
  });

  it('BE trả `qrCodeUrl` (tên cũ) -> fallback vẫn ra QR, không mất', async () => {
    ApiClient.post.mockResolvedValue({ qrCodeUrl: 'https://cdn/x.png' });

    const checkout = await service.subscribe(3);

    expect(checkout.qrCode).toBe('https://cdn/x.png');
  });
});

// ═══════════════ Poll thanh toán ═══════════════

describe('RealSubscriptionService - poll thanh toán', () => {
  it('getPaymentStatus gọi đúng endpoint payment-transactions', async () => {
    ApiClient.get.mockResolvedValue({ status: 'paid', amount: 149000 });

    const tx = await service.getPaymentStatus('FRIGGY-1727100000000');

    expect(ApiClient.get).toHaveBeenCalledWith('/payment-transactions/me/FRIGGY-1727100000000');
    expect(tx.status).toBe('paid');
  });

  it('isSubscribedTo: status active + plan khớp -> true', async () => {
    ApiClient.get.mockResolvedValue(beSubscription());

    await expect(service.isSubscribedTo('family')).resolves.toBe(true);
  });

  it('CHỐNG BUG FLUTTER: đang gói Individual, mua Family -> KHÔNG báo thành công', async () => {
    // Flutter `package_management_screen.dart:347` chỉ check `status === 'active'`
    // -> user đang Individual (active) bấm nâng cấp Family sẽ báo thành công
    // ngay lập tức dù CHƯA thanh toán. Phải check CẢ plan.
    ApiClient.get.mockResolvedValue(
      beSubscription({ status: 'active', plan: bePlan({ id: 2, name: 'individual' }) })
    );

    await expect(service.isSubscribedTo('family')).resolves.toBe(false);
  });

  it('đang gói family nhưng status còn `pending` -> false', async () => {
    ApiClient.get.mockResolvedValue(beSubscription({ status: 'pending' }));

    await expect(service.isSubscribedTo('family')).resolves.toBe(false);
  });
});

// ═══════════════ Cancel auto-renewal ═══════════════

describe('RealSubscriptionService - cancelAutoRenewal', () => {
  it('DELETE /subscriptions/me/auto-renewal -> lấy message + endDate', async () => {
    ApiClient.delete.mockResolvedValue({
      message: 'Đã hủy gia hạn tự động. Gói sẽ hết hạn vào 2026-10-22.',
      endDate: '2026-10-22',
    });

    const res = await service.cancelAutoRenewal();

    expect(ApiClient.delete).toHaveBeenCalledWith('/subscriptions/me/auto-renewal');
    expect(res.endDate).toBe('2026-10-22');
  });
});
