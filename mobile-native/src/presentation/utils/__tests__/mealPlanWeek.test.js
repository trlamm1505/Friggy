/**
 * mealPlanWeek - test cho helper tính ngày Thứ 2 + ngân sách.
 *
 * ⚠️ Rất quan trọng: `weekStartDate` gửi lên BE PHẢI là Thứ 2, nếu lệch 1 ngày
 * thì cả thực đơn 7 ngày lệch (AI Service suy ra ngày từ
 * `weekStart + (dayOfWeek - 1)` — `meal-plan.tools.ts:133-134`).
 */

import {
  getMondayOfWeek,
  getWeekStartDateString,
  getDayShortLabel,
  normalizeBudget,
  DEFAULT_WEEKLY_BUDGET,
} from '../mealPlanWeek';

/** Tạo Date tại 12:00 giờ local để tránh lệch múi giờ khi test. */
const localDate = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0);

describe('getMondayOfWeek', () => {
  it('Thứ 2 -> giữ nguyên', () => {
    // 2026-11-09 là Thứ 2
    const monday = getMondayOfWeek(localDate(2026, 11, 9));
    expect(monday.getFullYear()).toBe(2026);
    expect(monday.getMonth()).toBe(10);
    expect(monday.getDate()).toBe(9);
  });

  it('Chủ Nhật -> lùi 6 ngày về Thứ 2', () => {
    // 2026-11-15 là Chủ Nhật -> Thứ 2 là 2026-11-09
    const monday = getMondayOfWeek(localDate(2026, 11, 15));
    expect(monday.getDate()).toBe(9);
    expect(monday.getMonth()).toBe(10);
  });

  it('Thứ 7 -> lùi 5 ngày', () => {
    // 2026-11-14 là Thứ 7 -> Thứ 2 là 2026-11-09
    const monday = getMondayOfWeek(localDate(2026, 11, 14));
    expect(monday.getDate()).toBe(9);
  });

  it('luôn trả về 00:00:00', () => {
    const monday = getMondayOfWeek(localDate(2026, 11, 11));
    expect(monday.getHours()).toBe(0);
    expect(monday.getMinutes()).toBe(0);
    expect(monday.getSeconds()).toBe(0);
  });
});

describe('getWeekStartDateString', () => {
  it('định dạng YYYY-MM-DD', () => {
    expect(getWeekStartDateString(localDate(2026, 11, 9))).toBe('2026-11-09');
  });

  it('Chủ Nhật vẫn ra đúng Thứ 2', () => {
    expect(getWeekStartDateString(localDate(2026, 11, 15))).toBe('2026-11-09');
  });

  it('KHÔNG dùng toISOString (tránh lệch ngày do UTC)', () => {
    // 00:00 local ở UTC+7 = 17:00 hôm trước theo UTC -> toISOString sai.
    const result = getWeekStartDateString(localDate(2026, 11, 9));
    expect(result).toBe('2026-11-09');
    expect(result).not.toBe('2026-11-08');
  });

  it('tháng có 2 chữ số được zero-pad', () => {
    expect(getWeekStartDateString(localDate(2026, 1, 5))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getDayShortLabel', () => {
  it('quy ước BE: 1=T2 ... 7=CN', () => {
    expect(getDayShortLabel(1)).toBe('T2');
    expect(getDayShortLabel(2)).toBe('T3');
    expect(getDayShortLabel(7)).toBe('CN');
  });

  it('giá trị ngoài khoảng -> chuỗi rỗng', () => {
    expect(getDayShortLabel(0)).toBe('');
    expect(getDayShortLabel(8)).toBe('');
  });
});

describe('normalizeBudget', () => {
  it('giữ số nguyên', () => {
    expect(normalizeBudget(500000)).toBe(500000);
  });

  it('làm tròn số thực (BE yêu cầu @IsInt)', () => {
    expect(normalizeBudget(500000.6)).toBe(500001);
  });

  it('số âm / NaN -> 0', () => {
    expect(normalizeBudget(-1)).toBe(0);
    expect(normalizeBudget('abc')).toBe(0);
    expect(normalizeBudget(undefined)).toBe(0);
  });

  it('chuỗi số -> số', () => {
    expect(normalizeBudget('700000')).toBe(700000);
  });
});

describe('DEFAULT_WEEKLY_BUDGET', () => {
  it('khớp giá trị Flutter dùng (500000 VND)', () => {
    expect(DEFAULT_WEEKLY_BUDGET).toBe(500000);
  });
});
