/**
 * Test `truncatePayosDescription` — chuỗi nội dung chuyển khoản gửi PayOS.
 *
 * ⚠️ VÌ SAO TEST NÀY QUAN TRỌNG:
 *   `description` là chuỗi user phải NHẬP ĐÚNG khi chuyển khoản. Nếu BE cắt
 *   cụt (`slice(0, 25)`) mà RN hiển thị chuỗi khác -> user nhập sai ->
 *   PayOS từ chối đối soát.
 *
 *   RN dựng lại chuỗi bằng `buildTransferDescription()` và áp dụng CÙNG quy
 *   tắc -> hai bên phải cho ra CÙNG kết quả. Test này chốt quy tắc đó.
 *
 * Đối chiếu RN: `mobile-native/src/presentation/components/subscription/
 * PayOSPaymentSheet.jsx` -> `truncateTransferDescription()`.
 */

import { truncatePayosDescription } from './payos.service';

const MAX = 25;

describe('truncatePayosDescription', () => {
  it('chuỗi ngắn -> giữ nguyên', () => {
    expect(truncatePayosDescription('Friggy Gói Cá Nhân')).toBe(
      'Friggy Gói Cá Nhân',
    );
  });

  it('chuỗi đúng 25 ký tự -> giữ nguyên', () => {
    const exact = 'a'.repeat(MAX);
    expect(truncatePayosDescription(exact)).toBe(exact);
  });

  it('chuỗi dài -> cắt ở RANH GIỚI TỪ (không cắt cụt)', () => {
    const result = truncatePayosDescription('Gia hạn Friggy Gói Gia Đình');
    expect(result.length).toBeLessThanOrEqual(MAX);
    expect(result).toBe('Gia hạn Friggy Gói Gia');
    // Chuỗi sau khi cắt phải là tiền tố của chuỗi gốc (cắt đúng ranh giới từ).
    expect('Gia hạn Friggy Gói Gia Đình'.startsWith(result)).toBe(true);
  });

  it('không có khoảng trắng -> cắt cụt (phương án duy nhất)', () => {
    const result = truncatePayosDescription('a'.repeat(40));
    expect(result.length).toBe(MAX);
  });

  it('chuỗi rỗng / null / undefined -> trả chuỗi rỗng', () => {
    expect(truncatePayosDescription('')).toBe('');
    expect(truncatePayosDescription(null)).toBe('');
    expect(truncatePayosDescription(undefined)).toBe('');
  });

  it('khoảng trắng thừa ở đầu/cuối -> trim trước khi đo', () => {
    expect(truncatePayosDescription('  Friggy Gói Cá Nhân  ')).toBe(
      'Friggy Gói Cá Nhân',
    );
  });

  it('khớp với RN `truncateTransferDescription` (mirror logic)', () => {
    // RN: mobile-native/src/presentation/components/subscription/PayOSPaymentSheet.jsx
    const rnTruncate = (text) => {
      const value = String(text ?? '').trim();
      if (value.length <= MAX) return value;
      const cut = value.slice(0, MAX);
      const lastSpace = cut.lastIndexOf(' ');
      return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
    };

    const samples = [
      'Friggy Gói Cá Nhân',
      'Gia hạn Friggy Gói Cá Nhân',
      'Gia hạn Friggy Gói Gia Đình',
      'Friggy Gói Gia Đình',
      'Friggy Gói Miễn Phí',
    ];

    for (const sample of samples) {
      expect(truncatePayosDescription(sample)).toBe(rnTruncate(sample));
    }
  });
});
