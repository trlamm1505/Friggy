/**
 * B1 — Bug phát hiện khi user test trên Expo (mock mode) 23/10/2026.
 *
 * TRIỆU CHỨNG user báo:
 *   1. Thêm "thịt gà" -> không hiện ở màn "Nguyên liệu sẵn có"
 *   2. Card Home ghi "12 món" nhưng list chỉ có 4 món
 *   3. Không chỉnh được ngày hết hạn khi thêm
 *
 * NGUYÊN NHÂN GỐC:
 *   - `ManualAddIngredientScreen` không gửi `expiryDate` (BE tự tính) nhưng
 *     mock KHÔNG có BE để tính hộ -> `expiryDate = undefined`.
 *   - `new Date(undefined)` = Invalid Date -> `getDaysToExpiry` trả `NaN`
 *     -> `NaN >= 0` là FALSE -> item bị lọc khỏi mọi màn lọc theo hạn dùng.
 *   - `MockFridgeService.getSummary()` đọc file TĨNH `fridge-summary.json`
 *     (`availableCount: 12`) trong khi list thật chỉ có 8 item -> lệch.
 *
 * BÀI HỌC (như P0.7.1): test xanh KHÔNG đồng nghĩa runtime đúng.
 * Test này chốt lại 3 bug trên để không tái diễn.
 */

import { getDaysToExpiry, isItemAvailable, isItemExpired } from '../../utils/fridgeDates';
import { MockFridgeService } from '../../../data/services/mock/MockFridgeService';

describe('fridgeDates: getDaysToExpiry', () => {
  it('trả null khi không có hạn dùng (undefined / null / chuỗi rỗng)', () => {
    expect(getDaysToExpiry(undefined)).toBeNull();
    expect(getDaysToExpiry(null)).toBeNull();
    expect(getDaysToExpiry('')).toBeNull();
  });

  it('trả null khi ngày KHÔNG parse được (không phải NaN)', () => {
    // NaN là nguyên nhân gốc của bug "thịt gà biến mất".
    expect(getDaysToExpiry('không-phải-ngày')).toBeNull();
  });

  it('tính đúng số ngày còn lại', () => {
    const today = new Date();
    const plus3 = new Date(today);
    plus3.setDate(plus3.getDate() + 3);
    expect(getDaysToExpiry(plus3.toISOString())).toBe(3);
  });

  it('trả số âm khi đã quá hạn', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(getDaysToExpiry(past.toISOString())).toBe(-5);
  });
});

describe('fridgeDates: isItemAvailable / isItemExpired', () => {
  it('item KHÔNG có hạn dùng vẫn coi là CÒN hạn (không bị loại khỏi list)', () => {
    // Đây là fix chính: trước đây `days >= 0` với NaN -> false -> biến mất.
    expect(isItemAvailable({ name: 'Thịt gà', status: 'fresh' })).toBe(true);
    expect(isItemAvailable({ name: 'Thịt gà', status: 'fresh', expiryDate: undefined })).toBe(true);
  });

  it('item đã hết hạn thì KHÔNG available', () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    expect(isItemAvailable({ status: 'fresh', expiryDate: past.toISOString() })).toBe(false);
  });

  it('item hết hạn HÔM NAY vẫn available (khớp quyết định 23/10)', () => {
    const today = new Date();
    expect(isItemAvailable({ status: 'expiring', expiryDate: today.toISOString() })).toBe(true);
  });

  it('status=expired thì KHÔNG available', () => {
    expect(isItemAvailable({ status: 'expired' })).toBe(false);
  });

  it('isItemExpired đúng với item quá hạn / còn hạn / không hạn', () => {
    const past = new Date();
    past.setDate(past.getDate() - 2);
    const future = new Date();
    future.setDate(future.getDate() + 10);

    expect(isItemExpired({ expiryDate: past.toISOString() })).toBe(true);
    expect(isItemExpired({ expiryDate: future.toISOString() })).toBe(false);
    expect(isItemExpired({})).toBe(false);
  });
});

describe('MockFridgeService: addItem tự tính hạn dùng khi không có', () => {
  it('không gửi expiryDate -> service gán hạn dùng mặc định theo compartment', async () => {
    const svc = new MockFridgeService();
    const added = await svc.addItem({
      name: 'Thịt gà',
      quantity: 1,
      unit: 'kg',
      compartment: 'fridge',
    });

    expect(added.expiryDate).toBeTruthy();
    expect(Number.isNaN(new Date(added.expiryDate).getTime())).toBe(false);
    expect(added.status).not.toBe('expired');
  });

  it('gửi expiryDate -> giữ nguyên ngày user chọn', async () => {
    const svc = new MockFridgeService();
    const added = await svc.addItem({
      name: 'Sữa tươi',
      quantity: 1,
      unit: 'hộp',
      compartment: 'fridge',
      expiryDate: '2026-12-31',
    });

    expect(added.expiryDate).toBe('2026-12-31');
  });

  it('item vừa thêm KHÔNG bị loại khỏi màn "Nguyên liệu sẵn có"', async () => {
    const svc = new MockFridgeService();
    await svc.addItem({
      name: 'Thịt gà đặc biệt',
      quantity: 1,
      unit: 'kg',
      compartment: 'fridge',
    });

    const all = await svc.getItems();
    const added = all.find((i) => i.name === 'Thịt gà đặc biệt');

    expect(added).toBeDefined();
    expect(isItemAvailable(added)).toBe(true);
  });
});

describe('MockFridgeService: getSummary đếm THẬT (không đọc file tĩnh)', () => {
  it('expiredCount + availableCount khớp với danh sách thực tế', async () => {
    const svc = new MockFridgeService();
    const all = await svc.getItems();
    const summary = await svc.getSummary();

    // Trước đây `getSummary()` trả { expiredCount: 3, availableCount: 12 } từ
    // file tĩnh -> card Home hiện "12 món" nhưng list chỉ có 4 món.
    expect(summary.expiredCount + summary.availableCount).toBe(all.length);
  });

  it('số available KHÔNG cố định (không phải 12 hardcode)', async () => {
    const svc = new MockFridgeService();
    const summary = await svc.getSummary();
    expect(summary.availableCount).not.toBe(12);
  });
});
