/**
 * B1 — test cho helper client-side của nhóm "fridge".
 *
 * VÌ SAO CẦN TEST NÀY:
 *   `sortFridgeItems` là nơi DUY NHẤT quyết định thứ tự list hiển thị
 *   (BE không có sort param — `ListFridgeQueryDto` chỉ nhận `storageLocation`
 *   + `expiringSoon`). Trước đó mỗi màn có 1 bản sort riêng:
 *   - `FridgeInventoryScreen` dùng sort của service,
 *   - `FridgeListScreen` có `sortItems` riêng dùng `new Date(a.expiryDate)`.
 *   Bản của list screen với `expiryDate = null` -> `Invalid Date` -> comparator
 *   trả `NaN` -> thứ tự NGẪU NHIÊN (item không hạn dùng lung tung giữa list).
 *   Bản dùng chung xử lý riêng case null -> luôn đứng cuối, ổn định.
 *
 * Test chốt lại các case biên để không tái diễn.
 */

import { UNITS, stepForUnit, sortFridgeItems, parseQuantity } from '../fridgeItems';

// Ngày tương đối để test không phụ thuộc ngày thật.
const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

describe('fridgeItems: UNITS', () => {
  it('có đúng 15 đơn vị, khớp Flutter production', () => {
    expect(UNITS).toHaveLength(15);
    expect(UNITS).toContain('kg');
    expect(UNITS).toContain('gram');
    expect(UNITS).toContain('pcs');
  });
});

describe('fridgeItems: stepForUnit', () => {
  it('đơn vị nhỏ (g/gram/ml) nhảy 50', () => {
    expect(stepForUnit('g')).toBe(50);
    expect(stepForUnit('gram')).toBe(50);
    expect(stepForUnit('ml')).toBe(50);
  });

  it('đơn vị đếm được nhảy 1', () => {
    expect(stepForUnit('kg')).toBe(1);
    expect(stepForUnit('quả')).toBe(1);
    expect(stepForUnit('hộp')).toBe(1);
  });

  it('đơn vị lạ / rỗng -> mặc định 1 (không nhảy 50 vô tình)', () => {
    expect(stepForUnit(undefined)).toBe(1);
    expect(stepForUnit('bó')).toBe(1);
  });
});

describe('fridgeItems: sortFridgeItems — hạn dùng', () => {
  const items = [
    { id: 'a', name: 'Sữa tươi', expiryDate: daysFromNow(5) },
    { id: 'b', name: 'Thịt gà', expiryDate: daysFromNow(1) },
    { id: 'c', name: 'Cà chua', expiryDate: daysFromNow(3) },
  ];

  it('expiry_asc: sắp hạn nhất lên đầu', () => {
    expect(sortFridgeItems(items, 'expiry_asc').map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('expiry_desc: hạn xa nhất lên đầu', () => {
    expect(sortFridgeItems(items, 'expiry_desc').map((i) => i.id)).toEqual(['a', 'c', 'b']);
  });

  it('item KHÔNG có hạn dùng luôn đứng CUỐI (không phụ thuộc chiều sort)', () => {
    const withNull = [
      { id: 'no-expiry', name: 'Gia vị' },
      { id: 'soon', name: 'Rau', expiryDate: daysFromNow(2) },
      { id: 'later', name: 'Gạo', expiryDate: daysFromNow(20) },
    ];

    expect(sortFridgeItems(withNull, 'expiry_asc').map((i) => i.id)).toEqual([
      'soon',
      'later',
      'no-expiry',
    ]);
    expect(sortFridgeItems(withNull, 'expiry_desc').map((i) => i.id)).toEqual([
      'later',
      'soon',
      'no-expiry',
    ]);
  });

  it('ngày KHÔNG parse được cũng coi như không hạn dùng -> đứng cuối, không NaN', () => {
    const broken = [
      { id: 'broken', name: 'Sai định dạng', expiryDate: 'không-phải-ngày' },
      { id: 'ok', name: 'Hợp lệ', expiryDate: daysFromNow(2) },
    ];
    const sorted = sortFridgeItems(broken, 'expiry_asc');
    expect(sorted.map((i) => i.id)).toEqual(['ok', 'broken']);
  });

  it('KHÔNG mutate mảng input', () => {
    const input = [...items];
    const before = input.map((i) => i.id);
    sortFridgeItems(input, 'expiry_asc');
    expect(input.map((i) => i.id)).toEqual(before);
  });
});

describe('fridgeItems: sortFridgeItems — tên / số lượng', () => {
  const items = [
    { id: 'b', name: 'Bơ', quantity: 2 },
    { id: 'a', name: 'Áp', quantity: 5 },
    { id: 'c', name: 'Cà chua', quantity: 1 },
  ];

  it('name_asc / name_desc sort theo tên', () => {
    expect(sortFridgeItems(items, 'name_asc').map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(sortFridgeItems(items, 'name_desc').map((i) => i.id)).toEqual(['c', 'b', 'a']);
  });

  it('quantity_asc / quantity_desc sort theo số lượng', () => {
    expect(sortFridgeItems(items, 'quantity_asc').map((i) => i.id)).toEqual(['c', 'b', 'a']);
    expect(sortFridgeItems(items, 'quantity_desc').map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('item thiếu số lượng -> coi như 0 (không NaN)', () => {
    const mixed = [
      { id: 'x', name: 'X' },
      { id: 'y', name: 'Y', quantity: 3 },
    ];
    expect(sortFridgeItems(mixed, 'quantity_asc').map((i) => i.id)).toEqual(['x', 'y']);
  });
});

describe('fridgeItems: sortFridgeItems — urgent_first', () => {
  it('đã quá hạn lên đầu, sau đó theo số ngày còn lại tăng dần', () => {
    const items = [
      { id: 'ok5', name: 'A', expiryDate: daysFromNow(5) },
      { id: 'expired', name: 'B', expiryDate: daysFromNow(-2) },
      { id: 'soon', name: 'C', expiryDate: daysFromNow(1) },
    ];
    expect(sortFridgeItems(items, 'urgent_first').map((i) => i.id)).toEqual([
      'expired',
      'soon',
      'ok5',
    ]);
  });

  it('item không hạn dùng đứng cuối, KHÔNG coi là "gấp nhất"', () => {
    const items = [
      { id: 'no-expiry', name: 'Gia vị' },
      { id: 'soon', name: 'Rau', expiryDate: daysFromNow(1) },
    ];
    expect(sortFridgeItems(items, 'urgent_first').map((i) => i.id)).toEqual(['soon', 'no-expiry']);
  });
});

describe('fridgeItems: sortFridgeItems — key lạ', () => {
  it('key không hỗ trợ -> trả về list mới, giữ nguyên thứ tự', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const result = sortFridgeItems(items, 'khong-co-that');
    expect(result.map((i) => i.id)).toEqual(['a', 'b']);
    expect(result).not.toBe(items);
  });

  it('input rỗng / undefined -> không lỗi', () => {
    expect(sortFridgeItems([], 'expiry_asc')).toEqual([]);
    expect(sortFridgeItems(undefined, 'expiry_asc')).toEqual([]);
  });
});

describe('fridgeItems: parseQuantity', () => {
  it('parse được số nguyên / số thập phân', () => {
    expect(parseQuantity('5')).toBe(5);
    expect(parseQuantity('0')).toBe(0);
    expect(parseQuantity('1.5')).toBe(1.5);
    expect(parseQuantity(7)).toBe(7);
  });

  it('chấp nhận dấu phẩy thập phân kiểu VN ("1,5" -> 1.5)', () => {
    expect(parseQuantity('1,5')).toBe(1.5);
  });

  it('bỏ khoảng trắng thừa', () => {
    expect(parseQuantity('  12  ')).toBe(12);
  });

  it('rỗng / null / undefined -> null (KHÔNG phải 0)', () => {
    // Quan trọng: 0 nghĩa là "xoá hết lượng", null nghĩa là "sai định dạng".
    expect(parseQuantity('')).toBeNull();
    expect(parseQuantity('   ')).toBeNull();
    expect(parseQuantity(null)).toBeNull();
    expect(parseQuantity(undefined)).toBeNull();
  });

  it('sai định dạng -> null', () => {
    expect(parseQuantity('abc')).toBeNull();
    expect(parseQuantity('1.2.3')).toBeNull();
    expect(parseQuantity('kg')).toBeNull();
  });

  it('số âm -> trả về số âm (UI tự chặn, không tự ý đổi thành 0)', () => {
    expect(parseQuantity('-3')).toBe(-3);
  });
});
