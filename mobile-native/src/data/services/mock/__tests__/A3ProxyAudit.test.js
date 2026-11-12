/**
 * A3 PROXY AUDIT — method A3 phải đi qua SafeService proxy.
 *
 * ⚠️ BUG ĐÃ TÌM RA (24/10, session audit A3):
 *   `SafeService.withFallback(real, mock)` chỉ expose method có trong prototype
 *   chain của MOCK (xem `SafeService.js` -> `collectNames(mockService)`).
 *
 *   `MockUserService` (A2) chỉ có `getAvailablePackages` + `removeFamilyMember`.
 *   Còn 11 method A3 (`getMySubscription`, `subscribe`, `renewSubscription`,
 *   `cancelAutoRenewal`, `getPaymentStatus`, `isSubscribedTo`,
 *   `findPendingPayment`, `getFamilyInfo`, `inviteFamilyMember`,
 *   `acceptFamilyInvite`, `rejectFamilyInvite`, `dissolveFamilyGroup`)
 *   CHỈ có trong `RealUserService` -> KHÔNG được proxy.
 *
 *   Hậu quả runtime: `userService.getMySubscription()` -> `undefined is not
 *   a function` -> màn "Quản lý gói" và "Quản lý gia đình" CRASH khi
 *   `USE_MOCKS=false` (chế độ nối BE thật).
 *
 *   CÁCH SỬA ĐÚNG: thêm method vào `MockUserService` (giữ mô hình
 *   "real trả thật, mock là fallback" của Phase 0) — KHÔNG sửa
 *   `SafeService.js` (file immutable từ P0.5).
 */

import { MockUserService } from '../MockUserService';
import { IUserService } from '../../../interfaces/IUserService';
import { withFallback } from '../../../api/SafeService';

/** Các method A3 mà UI gọi trực tiếp qua `userService.*`. */
const A3_METHODS = [
  'getAvailablePackages',
  'getMySubscription',
  'subscribe',
  'renewSubscription',
  'cancelAutoRenewal',
  'getPaymentStatus',
  'isSubscribedTo',
  'findPendingPayment',
  'getPaymentHistory',
  'getFamilyInfo',
  'inviteFamilyMember',
  'acceptFamilyInvite',
  'rejectFamilyInvite',
  'removeFamilyMember',
  'dissolveFamilyGroup',
];

/** Thu tập tên property trên toàn bộ prototype chain (giống `collectNames`). */
const collectNames = (obj) => {
  const names = new Set();
  let current = obj;
  while (current && current !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(current)) {
      if (name === 'constructor') continue;
      names.add(name);
    }
    current = Object.getPrototypeOf(current);
  }
  return names;
};

describe('A3 proxy audit - method phải nằm trong prototype chain của mock', () => {
  const mockNames = collectNames(new MockUserService());

  it.each(A3_METHODS)('MockUserService expose %s (SafeService mới proxy được)', (method) => {
    expect(mockNames.has(method)).toBe(true);
  });

  it('IUserService khai báo contract cho các method A3 dùng chung', () => {
    const ifaceNames = collectNames(IUserService.prototype);
    expect(ifaceNames.has('getCurrentPlan')).toBe(true);
    expect(ifaceNames.has('getAvailablePackages')).toBe(true);
    expect(ifaceNames.has('getFamily')).toBe(true);
  });

  // ══════════════════════════════════════════════════════════════
  // TEST END-TO-END: proxy thật của SafeService phải gọi được method A3
  // ══════════════════════════════════════════════════════════════
  // Đây là test chứng minh bug đã được sửa THẬT, không chỉ "tên method có trong
  // prototype". Nếu ai đó xoá method khỏi mock -> test này fail.

  describe('withFallback proxy thật', () => {
    const makeProxy = () => {
      const mock = new MockUserService();
      const real = {
        getMySubscription: jest.fn().mockResolvedValue({
          id: 'sub-real',
          status: 'active',
          plan: { id: 3, name: 'family', displayName: 'Gia đình', price: 99000 },
        }),
        subscribe: jest.fn().mockResolvedValue({
          qrCode: 'REAL_QR',
          paymentRef: 'ref-real',
          amount: 99000,
          status: 'pending',
        }),
        getFamilyInfo: jest.fn().mockResolvedValue({ role: 'owner', members: [], owner: null }),
        // Không implement -> proxy phải fallback sang mock (5xx/network).
        getPaymentStatus: jest.fn().mockRejectedValue(new Error('network down')),
      };
      return { proxy: withFallback(real, mock, { enabled: true }), real, mock };
    };

    it('proxy expose đủ method A3 qua `userService.*`', () => {
      const { proxy } = makeProxy();
      for (const method of A3_METHODS) {
        expect(typeof proxy[method]).toBe('function');
      }
    });

    it('gọi REAL khi real implement (không phải mock)', async () => {
      const { proxy, real } = makeProxy();
      const sub = await proxy.getMySubscription();
      expect(real.getMySubscription).toHaveBeenCalled();
      expect(sub.plan.name).toBe('family');
    });

    it('subscribe trả QR thật qua proxy', async () => {
      const { proxy } = makeProxy();
      const checkout = await proxy.subscribe(3);
      expect(checkout.qrCode).toBe('REAL_QR');
      expect(checkout.paymentRef).toBe('ref-real');
    });

    it('lỗi 5xx/network -> fallback sang mock, không crash', async () => {
      const { proxy } = makeProxy();
      // `getPaymentStatus` của real ném lỗi network -> phải rơi về mock.
      const status = await proxy.getPaymentStatus('ref-real');
      expect(status).toHaveProperty('status');
    });

    it('getFamilyInfo qua proxy trả shape family', async () => {
      const { proxy } = makeProxy();
      const info = await proxy.getFamilyInfo();
      expect(info.role).toBe('owner');
      expect(Array.isArray(info.members)).toBe(true);
    });
  });
});
