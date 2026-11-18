/**
 * subscriptionStatus - test map trạng thái gói BE -> nhãn tiếng Việt.
 *
 * R7: comment tiếng Việt.
 */

import { statusLabel } from '../subscriptionStatus';

const t = (key) => key;

describe('statusLabel', () => {
  it('map đủ 4 status của BE sang key tiếng Việt', () => {
    expect(statusLabel('active', t)).toBe('subscription.statusActive');
    expect(statusLabel('pending', t)).toBe('subscription.statusPending');
    expect(statusLabel('cancelled', t)).toBe('subscription.statusCancelled');
    expect(statusLabel('expired', t)).toBe('subscription.statusExpired');
  });

  it('status lạ -> fallback expired (KHÔNG lộ raw enum cho user)', () => {
    expect(statusLabel('weird_status', t)).toBe('subscription.statusExpired');
    expect(statusLabel(undefined, t)).toBe('subscription.statusExpired');
    expect(statusLabel(null, t)).toBe('subscription.statusExpired');
  });
});
