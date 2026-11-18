/**
 * subscriptionRecovery - test phát hiện "đã thanh toán nhưng gói bị mất".
 *
 * ⚠️ BỐI CẢNH (19/11):
 *   BE `GET /subscriptions/me` -> `subscriptions.service.ts:56-76`:
 *     - Tìm sub `status='active'` -> trả.
 *     - Tìm sub `status='pending'` -> trả (nhưng `plan` resolve theo `planId`
 *       cũ = gói free, vì `subscribe()` KHÔNG đổi `planId`).
 *     - Không có -> `assignFreePlan()` GHI ĐÈ `planId = freePlan.id`.
 *
 *   Kết hợp với cron 15 phút (`payment-transactions.service.ts:112-124`) set
 *   `status='cancelled'` -> lần mở app sau sẽ bị đẩy về free VĨNH VIỄN.
 *
 *   => Client phải dựa vào `GET /payment-transactions/me` để phát hiện và
 *      cảnh báo user (không tự khôi phục được vì BE đã xoá thông tin).
 */

import {
  detectSubscriptionMismatch,
  extractTransactions,
  findPlanNameByDisplayName,
  isFreePlanName,
  isPaidPlanTransaction,
  daysSince,
  PLAN_TTL_DAYS,
} from '../subscriptionRecovery';

/** Gói free đang active (sau khi BE ghi đè). */
const FREE_SUB = {
  id: 'sub-1',
  status: 'active',
  startDate: '2026-11-01',
  endDate: null,
  autoRenew: true,
  plan: { id: 1, name: 'free', displayName: 'Gói Miễn Phí', price: 0 },
};

/** Gói trả phí đang active. */
const PAID_SUB = {
  id: 'sub-1',
  status: 'active',
  startDate: '2026-11-01',
  endDate: '2026-12-01',
  autoRenew: true,
  plan: { id: 2, name: 'individual', displayName: 'Gói Cá Nhân', price: 79000 },
};

const daysAgoIso = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

const tx = (over = {}) => ({
  id: 'tx-1',
  paymentRef: 'FRIGGY-123',
  type: 'subscribe',
  planName: 'Gói Cá Nhân',
  amount: 79000,
  status: 'paid',
  paidAt: daysAgoIso(2),
  createdAt: daysAgoIso(2),
  ...over,
});

describe('subscriptionRecovery - helpers', () => {
  it('isFreePlanName nhận diện đúng gói free', () => {
    expect(isFreePlanName('free')).toBe(true);
    expect(isFreePlanName('FREE')).toBe(true);
    expect(isFreePlanName('individual')).toBe(false);
    expect(isFreePlanName(null)).toBe(true);
  });

  it('isPaidPlanTransaction chỉ nhận giao dịch có tiền', () => {
    expect(isPaidPlanTransaction(tx())).toBe(true);
    expect(isPaidPlanTransaction(tx({ amount: 0 }))).toBe(false);
    expect(isPaidPlanTransaction(tx({ amount: null }))).toBe(false);
  });

  it('extractTransactions nhận cả shape {items} và mảng thô', () => {
    expect(extractTransactions({ items: [tx()] })).toHaveLength(1);
    expect(extractTransactions([tx()])).toHaveLength(1);
    expect(extractTransactions(null)).toEqual([]);
    expect(extractTransactions({})).toEqual([]);
  });

  it('daysSince trả Infinity khi không parse được', () => {
    expect(daysSince(null)).toBe(Infinity);
    expect(daysSince('abc')).toBe(Infinity);
    expect(daysSince(daysAgoIso(3))).toBeCloseTo(3, 1);
  });

  it('findPlanNameByDisplayName tra slug gói từ displayName', () => {
    const packages = [
      { name: 'free', displayName: 'Gói Miễn Phí' },
      { name: 'individual', displayName: 'Gói Cá Nhân' },
      { name: 'family', displayName: 'Gói Gia Đình' },
    ];
    expect(findPlanNameByDisplayName(packages, 'Gói Cá Nhân')).toBe('individual');
    expect(findPlanNameByDisplayName(packages, 'gói cá nhân')).toBe('individual');
    expect(findPlanNameByDisplayName(packages, 'Không có')).toBeNull();
    expect(findPlanNameByDisplayName(packages, null)).toBeNull();
  });
});

describe('detectSubscriptionMismatch - không có mismatch thì trả null', () => {
  it('gói active trả phí + giao dịch paid -> null', () => {
    const notice = detectSubscriptionMismatch({
      currentSub: PAID_SUB,
      paymentHistory: { items: [tx()] },
    });
    expect(notice).toBeNull();
  });

  it('gói free + không có giao dịch nào -> null', () => {
    expect(
      detectSubscriptionMismatch({ currentSub: FREE_SUB, paymentHistory: { items: [] } })
    ).toBeNull();
  });

  it('gói free + giao dịch paid đã QUÁ hạn gói -> null (về free là hợp lệ)', () => {
    const old = tx({ paidAt: daysAgoIso(PLAN_TTL_DAYS + 10) });
    const notice = detectSubscriptionMismatch({
      currentSub: FREE_SUB,
      paymentHistory: { items: [old] },
    });
    expect(notice).toBeNull();
  });

  it('gói free + giao dịch amount = 0 (gói free) -> null', () => {
    const notice = detectSubscriptionMismatch({
      currentSub: FREE_SUB,
      paymentHistory: { items: [tx({ amount: 0, planName: 'Gói Miễn Phí' })] },
    });
    expect(notice).toBeNull();
  });
});

describe('detectSubscriptionMismatch - giao dịch đang chờ', () => {
  it('gói free + giao dịch pending của gói trả phí -> payment_pending', () => {
    const notice = detectSubscriptionMismatch({
      currentSub: FREE_SUB,
      paymentHistory: {
        items: [tx({ status: 'pending', paidAt: null, type: 'subscribe' })],
      },
    });
    expect(notice).not.toBeNull();
    expect(notice.kind).toBe('payment_pending');
    expect(notice.planDisplayName).toBe('Gói Cá Nhân');
    expect(notice.amount).toBe(79000);
    expect(notice.paymentRef).toBe('FRIGGY-123');
  });
});

describe('detectSubscriptionMismatch - đã thanh toán nhưng gói bị mất', () => {
  it('gói free (bị ghi đè) + giao dịch paid còn hạn -> reverted_to_free', () => {
    const notice = detectSubscriptionMismatch({
      currentSub: FREE_SUB,
      paymentHistory: { items: [tx()] },
    });
    expect(notice).not.toBeNull();
    expect(notice.kind).toBe('reverted_to_free');
    expect(notice.planDisplayName).toBe('Gói Cá Nhân');
    expect(notice.paymentRef).toBe('FRIGGY-123');
  });

  it('sub pending + giao dịch paid -> payment_not_applied', () => {
    const pendingSub = { ...PAID_SUB, status: 'pending' };
    const notice = detectSubscriptionMismatch({
      currentSub: pendingSub,
      paymentHistory: { items: [tx()] },
    });
    expect(notice).not.toBeNull();
    expect(notice.kind).toBe('payment_not_applied');
  });

  it('gói active nhưng là gói KHÁC (đã đổi gói) -> không cảnh báo', () => {
    const familySub = {
      ...PAID_SUB,
      plan: { id: 3, name: 'family', displayName: 'Gói Gia Đình', price: 149000 },
    };
    const notice = detectSubscriptionMismatch({
      currentSub: familySub,
      paymentHistory: { items: [tx()] },
    });
    expect(notice).toBeNull();
  });
});
