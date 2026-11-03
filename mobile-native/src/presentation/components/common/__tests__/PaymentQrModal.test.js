/**
 * Test cho `PaymentQrModal` — logic QR + poll (Sprint A3, 24/10).
 *
 * R1 (mục 9b.4 của plan): test cái KHÔNG nhìn thấy (mapping, URL, logic).
 * Component UI không render được trong `jest-expo` (LinearGradient, navigation)
 * nên ta chỉ test phần logic thuần: `toQrUri`.
 *
 * Đối chiếu Flutter `_buildQrCodeWidget` (`package_management_screen.dart:738-810`).
 */

import { toQrUri, POLL_INTERVAL_MS } from '../PaymentQrModal';

describe('PaymentQrModal - toQrUri', () => {
  it('null/undefined/rỗng -> null (không render ảnh hỏng)', () => {
    expect(toQrUri(null)).toBeNull();
    expect(toQrUri(undefined)).toBeNull();
    expect(toQrUri('')).toBeNull();
    expect(toQrUri('   ')).toBeNull();
  });

  it('data URI base64 -> giữ nguyên', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
    expect(toQrUri(dataUri)).toBe(dataUri);
  });

  it('base64 CÓ marker `base64,` nhưng thiếu prefix -> thêm prefix (khớp Flutter :747-767)', () => {
    const raw = 'base64,iVBORw0KGgoAAAANSUhEUg==';
    expect(toQrUri(raw)).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==');
    expect(toQrUri(`data:image/jpeg;base64,${'iVBOR'}`)).toBe(`data:image/jpeg;base64,iVBOR`);
  });

  it('base64 THUẦN (không marker `base64,`) -> coi như chuỗi raw (khớp Flutter)', () => {
    // Flutter: `cleanStr.contains('base64,')` -> không có marker thì rơi vào
    // nhánh URL ảnh. RN phải GIỐNG HẾT để không lệch hành vi.
    const raw = 'iVBORw0KGgoAAAANSUhEUg==';
    const result = toQrUri(raw);
    expect(result).toContain('api.qrserver.com');
  });

  it('URL http(s) -> giữ nguyên (không bọc lại)', () => {
    expect(toQrUri('https://file.friggy.io.vn/qr.png')).toBe('https://file.friggy.io.vn/qr.png');
    expect(toQrUri('http://example.com/qr.png')).toBe('http://example.com/qr.png');
  });

  it('chuỗi raw -> bọc qua api.qrserver.com (giống fallback Flutter)', () => {
    const raw = 'NỘI DUNG MÃ QR THÔ';
    const result = toQrUri(raw);
    expect(result).toContain('https://api.qrserver.com/v1/create-qr-code/');
    // payload phải được URL-encode
    expect(result).toContain(encodeURIComponent(raw));
    expect(result).not.toContain(raw);
  });

  it('chuỗi raw có ký tự đặc biệt -> encode đúng (không phá URL)', () => {
    const raw = 'MÃ QR & đặc biệt #1?a=b&c=d';
    const result = toQrUri(raw);
    // `encodeURIComponent` encode UTF-8 từng byte -> %C3%83 cho 'Ã'
    expect(result).toContain('data=M%C3%83');
    expect(result).toContain('%26'); // &
    expect(result).toContain('%23'); // #
  });

  it('trim khoảng trắng thừa (khớp Flutter `cleanStr.trim()`)', () => {
    expect(toQrUri('  https://a.com/q.png  ')).toBe('https://a.com/q.png');
  });

  it('POLL_INTERVAL_MS = 3000 (khớp Flutter 3 giây)', () => {
    expect(POLL_INTERVAL_MS).toBe(3000);
  });
});
