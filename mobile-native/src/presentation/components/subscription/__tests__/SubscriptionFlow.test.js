/**
 * Test logic thuần của luồng gói dịch vụ (Sprint A3, 24/10).
 *
 * R1 (mục 9b.4 của plan): test cái KHÔNG nhìn thấy — mapping, format, logic.
 * Component UI không render được trong `jest-expo` (LinearGradient, navigation,
 * safe-area) nên ta chỉ test các hàm thuần đã export.
 *
 * Mục tiêu: chốt lại các quy tắc mà UI BẮT BUỘC tuân theo, để sau này ai
 * sửa UI không vô tình phá:
 *   1. Ngày BE trả `YYYY-MM-DD` -> hiển thị `DD/MM/YYYY`.
 *   2. Status enum của BE -> nhãn tiếng Việt (KHÔNG lộ raw enum).
 *   3. `aiUsagePerWeek = -1` -> "không giới hạn"; số -> "N lượt/tuần".
 *   4. Nội dung chuyển khoản khớp đúng `description` BE gửi PayOS.
 */

import { formatDate, statusLabel } from '../../../screens/subscription/PackageManagementScreen';
import { describeAiUsage, formatVnd } from '../SubscriptionPlansSheet';
import { buildTransferDescription } from '../PayOSPaymentSheet';

/** Giả lập `t()` của i18next: trả về key + interpolation. */
const t = (key, opts) => {
  if (opts && typeof opts.count === 'number') return `${key}:${opts.count}`;
  return key;
};

describe('PackageManagementScreen - formatDate', () => {
  it('YYYY-MM-DD -> DD/MM/YYYY', () => {
    expect(formatDate('2026-09-01')).toBe('01/09/2026');
  });

  it('ISO datetime -> lấy phần ngày', () => {
    expect(formatDate('2026-09-01T00:00:00.000Z')).toBe('01/09/2026');
  });

  it('null/undefined -> null (UI hiện "Không giới hạn")', () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate(undefined)).toBeNull();
    expect(formatDate('')).toBeNull();
  });

  it('chuỗi không phải ngày -> trả nguyên (không crash)', () => {
    expect(formatDate('abc')).toBe('abc');
  });
});

describe('PackageManagementScreen - statusLabel', () => {
  it('map đủ 4 status của BE sang key tiếng Việt', () => {
    expect(statusLabel('active', t)).toBe('subscription.statusActive');
    expect(statusLabel('pending', t)).toBe('subscription.statusPending');
    expect(statusLabel('cancelled', t)).toBe('subscription.statusCancelled');
    expect(statusLabel('expired', t)).toBe('subscription.statusExpired');
  });

  it('status lạ -> fallback expired (KHÔNG lộ raw enum cho user)', () => {
    expect(statusLabel('weird_status', t)).toBe('subscription.statusExpired');
    expect(statusLabel(undefined, t)).toBe('subscription.statusExpired');
  });
});

describe('SubscriptionPlansSheet - describeAiUsage', () => {
  it('-1 -> không giới hạn', () => {
    expect(describeAiUsage(-1, t)).toBe('subscription.aiUsageUnlimited');
  });

  it('null/undefined -> không giới hạn (plan không set quota)', () => {
    expect(describeAiUsage(null, t)).toBe('subscription.aiUsageUnlimited');
    expect(describeAiUsage(undefined, t)).toBe('subscription.aiUsageUnlimited');
  });

  it('số >= 0 -> giới hạn N lượt/tuần (dùng ĐÚNG số BE trả)', () => {
    expect(describeAiUsage(15, t)).toBe('subscription.aiUsagePerWeek:15');
    expect(describeAiUsage(35, t)).toBe('subscription.aiUsagePerWeek:35');
  });
});

describe('SubscriptionPlansSheet - formatVnd', () => {
  it('định dạng kiểu Việt Nam, KHÔNG làm tròn sai', () => {
    expect(formatVnd(79000)).toBe('79.000');
    expect(formatVnd(149000)).toBe('149.000');
    expect(formatVnd(0)).toBe('0');
  });

  it('giá trị rác -> 0 (không crash UI)', () => {
    expect(formatVnd(undefined)).toBe('0');
    expect(formatVnd(null)).toBe('0');
    expect(formatVnd('abc')).toBe('0');
  });
});

describe('PayOSPaymentSheet - buildTransferDescription', () => {
  it('khớp `description` BE gửi PayOS: "Friggy <tên gói>"', () => {
    // BE: `description: \`Friggy ${plan.displayName}\`` (subscriptions.service.ts:128)
    expect(buildTransferDescription('individual', 'Gói Cá Nhân')).toBe('Friggy Gói Cá Nhân');
    expect(buildTransferDescription('family', 'Gói Gia Đình')).toBe('Friggy Gói Gia Đình');
  });

  it('thiếu displayName -> dùng name', () => {
    expect(buildTransferDescription('family', null)).toBe('Friggy family');
  });

  it('thiếu cả hai -> vẫn trả chuỗi hợp lệ (không undefined)', () => {
    expect(buildTransferDescription(null, null)).toBe('Friggy');
  });
});
