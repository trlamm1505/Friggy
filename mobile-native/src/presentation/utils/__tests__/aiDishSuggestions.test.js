/**
 * Test cho `aiDishSuggestions` — tiện ích parse gợi ý món từ AI.
 *
 * VÌ SAO CẦN TEST NÀY:
 *   Nút "Đổi món bằng AI" trước đây KHÔNG BAO GIỜ hoạt động vì:
 *     1. AI trả dòng "1. Canh rau cải thịt băm - mô tả - 25.000đ"
 *        nhưng RN chỉ bỏ tiền tố "1." -> `search` nhận cả mô tả + giá
 *        -> không món nào trong catalog khớp -> luôn báo "không tìm thấy món".
 *     2. AI có thể trả 402 (hết credit) -> BE trả `event: 'error'`, RN phải
 *        báo lỗi thay vì hiển thị danh sách rỗng.
 *
 * Test chốt lại format parse + thứ tự ưu tiên khớp tên món.
 */

import {
  normalizeDishName,
  parseAiSuggestionLine,
  parseAiDishSuggestions,
  matchDishToRecipes,
} from '../aiDishSuggestions';

describe('aiDishSuggestions: normalizeDishName', () => {
  it('bỏ dấu tiếng Việt và lowercase', () => {
    expect(normalizeDishName('Canh Rau Cải Thịt Băm')).toBe('canh rau cai thit bam');
    expect(normalizeDishName('Cá Kho Tộ')).toBe('ca kho to');
  });

  it('chuyển đ -> d', () => {
    expect(normalizeDishName('Đậu Hũ')).toBe('dau hu');
  });

  it('bỏ ký tự phụ và gộp space', () => {
    expect(normalizeDishName('  Bánh mì  !  ')).toBe('banh mi');
  });

  it('trả chuỗi rỗng cho input rỗng', () => {
    expect(normalizeDishName('')).toBe('');
    expect(normalizeDishName(null)).toBe('');
  });
});

describe('aiDishSuggestions: parseAiSuggestionLine', () => {
  it('tách được tên món / mô tả / giá theo format chuẩn của AI', () => {
    const result = parseAiSuggestionLine(
      '1. Canh rau cải thịt băm - canh ngọt thanh, dùng cải thảo và thịt băm - 25.000đ'
    );

    expect(result.dishName).toBe('Canh rau cải thịt băm');
    expect(result.description).toContain('canh ngọt thanh');
    expect(result.price).toBe('25.000đ');
  });

  it('bỏ tiền tố "2)" và "3."', () => {
    expect(parseAiSuggestionLine('2) Trứng chiên').dishName).toBe('Trứng chiên');
    expect(parseAiSuggestionLine('3. Trứng chiên').dishName).toBe('Trứng chiên');
  });

  it('giữ nguyên tên món khi không có mô tả/giá', () => {
    const result = parseAiSuggestionLine('Trứng chiên');
    expect(result.dishName).toBe('Trứng chiên');
    expect(result.description).toBe('');
    expect(result.price).toBeNull();
  });

  it('nhận giá nhiều kiểu', () => {
    expect(parseAiSuggestionLine('Phở - 35.000đ').price).toBe('35.000đ');
    expect(parseAiSuggestionLine('Phở - 35.000 đồng').price).toBe('35.000 đồng');
    expect(parseAiSuggestionLine('Phở - 35k').price).toBe('35k');
  });

  it('không vỡ khi dòng rỗng', () => {
    const result = parseAiSuggestionLine('   ');
    expect(result.dishName).toBe('');
  });
});

describe('aiDishSuggestions: parseAiDishSuggestions', () => {
  it('parse được 3 gợi ý từ nội dung AI', () => {
    const suggestions = [
      '1. Canh rau cải thịt băm - canh ngọt - 25.000đ',
      '2. Trứng chiên cà chua - nhanh và dễ - 15.000đ',
      '3. Cá kho tộ - món nhà - 40.000đ',
    ].join('\n');

    const parsed = parseAiDishSuggestions(suggestions);

    expect(parsed).toHaveLength(3);
    expect(parsed.map((p) => p.dishName)).toEqual([
      'Canh rau cải thịt băm',
      'Trứng chiên cà chua',
      'Cá kho tộ',
    ]);
  });

  it('bỏ dòng tiêu đề và dòng trống', () => {
    const suggestions = [
      'Gợi ý cho bạn:',
      '',
      '1. Trứng chiên - ngon - 15.000đ',
    ].join('\n');

    const parsed = parseAiDishSuggestions(suggestions);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].dishName).toBe('Trứng chiên');
  });

  it('trả mảng rỗng khi AI không trả gì', () => {
    expect(parseAiDishSuggestions('')).toEqual([]);
    expect(parseAiDishSuggestions(null)).toEqual([]);
  });
});

describe('aiDishSuggestions: matchDishToRecipes', () => {
  const catalog = [
    { id: 'r1', name: 'Canh rau cải thịt băm' },
    { id: 'r2', name: 'Trứng chiên cà chua' },
    { id: 'r3', name: 'Cá kho tộ' },
    { id: 'r4', name: 'Phở bò' },
  ];

  it('khớp chính xác', () => {
    expect(matchDishToRecipes('Trứng chiên cà chua', catalog)?.id).toBe('r2');
  });

  it('khớp khi khác dấu / hoa thường', () => {
    expect(matchDishToRecipes('TRỨNG CHIÊN CÀ CHUA', catalog)?.id).toBe('r2');
  });

  it('khớp khi AI thêm bớt chữ ở cuối', () => {
    // "Canh rau cải thịt băm" -> "canh rau cai thit bam" nằm trong chuỗi dài hơn
    expect(matchDishToRecipes('Canh rau cải thịt băm với thịt bò', catalog)?.id).toBe('r1');
  });

  it('trả null khi không món nào liên quan', () => {
    expect(matchDishToRecipes('Món không tồn tại trong catalog', catalog)).toBeNull();
  });

  it('trả null khi catalog rỗng', () => {
    expect(matchDishToRecipes('Trứng chiên', [])).toBeNull();
  });

  it('hỗ trợ shape { title } (BE raw)', () => {
    const rawCatalog = [{ id: 'r9', title: 'Phở bò' }];
    expect(matchDishToRecipes('Phở bò', rawCatalog)?.id).toBe('r9');
  });
});
