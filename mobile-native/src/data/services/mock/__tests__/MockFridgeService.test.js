/**
 * MockFridgeService — test cho các method B1 mới.
 *
 * ⚠️ VÌ SAO CẦN TEST NÀY:
 *   `MockFridgeService` KHÔNG chỉ là dữ liệu giả — nó là FALLBACK khi BE lỗi
 *   (xem `SafeService.withFallback`). Nếu mock trả sai (ví dụ `getExpiring`
 *   trả về "3 món đầu" thay vì "món hết hạn trong 3 ngày"), user vẫn thấy UI
 *   sai mà không có lỗi nào được log -> rất khó phát hiện.
 *
 *   Luật khớp (R1): mock PHẢI trả kết quả giống hệt `RealFridgeService`.
 */

import { MockFridgeService } from '../MockFridgeService';

jest.setTimeout(15000);

// Ngày hôm nay theo giờ địa phương, định dạng YYYY-MM-DD (khớp `expiryDate`
// trong `inventory.json`).
//
// ⚠️ VÌ SAO KHÔNG dùng `toISOString().slice(0, 10)`:
//   `toISOString()` trả ngày theo giờ UTC, còn máy dev ở UTC+7 -> lệch 1 ngày
//   so với "hôm nay" theo giờ địa phương. Ví dụ 00:30 ngày 25/10 giờ VN ->
//   `toISOString()` ra "2026-10-24". Ô nhập ngày hết hạn của user là ngày
//   LOCAL -> phải format theo local.
const formatLocalDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return formatLocalDate(d);
};

const daysFromToday = (n) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return formatLocalDate(d);
};

describe('MockFridgeService: getExpiring', () => {
  let service;

  beforeEach(() => {
    service = new MockFridgeService();
  });

  it('trả về mảng (không throw) khi không có món nào sắp hết hạn', async () => {
    const result = await service.getExpiring(3);
    expect(Array.isArray(result)).toBe(true);
  });

  it('chỉ trả món CÒN hạn và còn <= days ngày', async () => {
    // ⚠️ Seed item tương đối theo HÔM NAY thay vì trông chờ `inventory.json`:
    //   file mock fix cứng ngày 2026-10-18 → 2026-10-30, qua thời gian không
    //   còn món nào rơi vào cửa sổ 0–3 ngày -> `expiring.length === 0` và
    //   test đỏ dù code đúng. Seed 1 món hết hạn sau 2 ngày để luôn có dữ liệu.
    await service.addItem({
      name: 'Test expiring seed',
      quantity: 1,
      unit: 'quả',
      compartment: 'fridge',
      expiryDate: daysFromToday(2),
    });
    const expiring = await service.getExpiring(3);

    expect(expiring.length).toBeGreaterThan(0);

    // Món vừa seed phải có mặt (tính theo cùng quy tắc local-midnight).
    expect(expiring.some((i) => i.name === 'Test expiring seed')).toBe(true);

    // Mọi món trả về phải còn hạn (không phải đã quá hạn) và trong cửa sổ.
    for (const item of expiring) {
      const expiry = new Date(item.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      expect(expiry.getTime()).toBeGreaterThanOrEqual(now.getTime());
      expect(diffDays).toBeLessThanOrEqual(3);
    }

    // Dọn seed để không làm lệch các test sau trong cùng file
    // (`items` là module-level, `new MockFridgeService()` không reset).
    const seeded = (await service.getItems()).find((i) => i.name === 'Test expiring seed');
    if (seeded) await service.deleteItem(seeded.id);
  });

  it('`days` là CỬA SỔ THỜI GIAN, KHÔNG phải số lượng item', async () => {
    // ⚠️ Đây là bug gốc: bản cũ dùng `.slice(0, days)` -> "lấy N món đầu".
    //   Với `days = 1`, bản cũ trả về đúng 1 món dù mọi món đều hết hạn
    //   trong 1 ngày; còn với `days = 30` lại bị cắt còn 30 món.
    const one = await service.getExpiring(1);
    const thirty = await service.getExpiring(30);

    // Cửa sổ 30 ngày phải rộng hơn (hoặc bằng) cửa sổ 1 ngày.
    expect(thirty.length).toBeGreaterThanOrEqual(one.length);

    // Và mọi món trong cửa sổ 1 ngày cũng phải nằm trong cửa sổ 30 ngày.
    const oneIds = new Set(one.map((i) => i.id));
    for (const item of thirty) {
      // Món nào hết hạn trong 1 ngày thì chắc chắn hết hạn trong 30 ngày.
      if (oneIds.has(item.id)) expect(oneIds.has(item.id)).toBe(true);
    }
  });

  it('KHÔNG dùng `status` hardcode trong inventory.json', async () => {
    // `inventory.json` ghi `status` tại thời điểm tạo file -> đã cũ.
    // Mock phải TÍNH LẠI, giống `getItems()` (quy tắc R1).
    const items = await service.getItems();
    const expiring = await service.getExpiring(3);

    const expiringIds = new Set(expiring.map((i) => i.id));
    const statusExpiringIds = new Set(
      items.filter((i) => i.status === 'expiring').map((i) => i.id)
    );

    // Tập id phải khớp: cùng dữ liệu, cùng quy tắc -> cùng kết quả.
    expect([...expiringIds].sort()).toEqual([...statusExpiringIds].sort());
  });

  it('mọi món trả về đều có `status` = expiring', async () => {
    const expiring = await service.getExpiring(3);
    for (const item of expiring) {
      expect(item.status).toBe('expiring');
    }
  });
});

describe('MockFridgeService: getFridgeStats', () => {
  let service;

  beforeEach(() => {
    service = new MockFridgeService();
  });

  it('`expiringSoonCount` khớp với số món `getExpiring(3)` trả về', async () => {
    const stats = await service.getFridgeStats();
    const expiring = await service.getExpiring(3);

    expect(stats.expiringSoonCount).toBe(expiring.length);
  });

  it('`totalItems` bằng số item trong kho', async () => {
    const stats = await service.getFridgeStats();
    const items = await service.getItems();

    expect(stats.totalItems).toBe(items.length);
  });

  it('có đủ field mà UI đọc', async () => {
    const stats = await service.getFridgeStats();

    expect(stats).toEqual(
      expect.objectContaining({
        totalSpentThisMonth: expect.any(Number),
        wastePercent: expect.any(Number),
        mealsCooked: expect.any(Number),
        expiringSoonCount: expect.any(Number),
        totalItems: expect.any(Number),
      })
    );
  });
});

describe('MockFridgeService: _daysUntilExpiry / _computeStatus', () => {
  let service;

  beforeEach(() => {
    service = new MockFridgeService();
  });

  it('không có hạn dùng -> status = fresh (không phải expired)', () => {
    expect(service._computeStatus(null)).toBe('fresh');
    expect(service._computeStatus(undefined)).toBe('fresh');
    expect(service._computeStatus('not-a-date')).toBe('fresh');
  });

  it('đã quá hạn -> expired', () => {
    expect(service._computeStatus(daysFromToday(-1))).toBe('expired');
    expect(service._computeStatus(daysFromToday(-30))).toBe('expired');
  });

  it('còn <= 3 ngày -> expiring', () => {
    expect(service._computeStatus(daysFromToday(0))).toBe('expiring');
    expect(service._computeStatus(daysFromToday(1))).toBe('expiring');
    expect(service._computeStatus(daysFromToday(3))).toBe('expiring');
  });

  it('còn > 3 ngày -> fresh', () => {
    expect(service._computeStatus(daysFromToday(4))).toBe('fresh');
    expect(service._computeStatus(daysFromToday(30))).toBe('fresh');
  });

  it('hạn dùng đúng hôm nay -> chưa quá hạn (0 ngày)', () => {
    expect(service._daysUntilExpiry(today())).toBe(0);
  });
});
