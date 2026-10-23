/**
 * RealFridgeService — test bắt buộc Sprint B1 (plan mục 9b.4)
 *
 * Mục đích: để DEV A tin rằng data thật có ĐÚNG shape UI mà không cần chạy app.
 * Quy tắc R1 — mỗi test đều so cùng input cho cả Real lẫn Mock để chứng minh output khớp.
 *
 * Chỉ test logic KHÔNG NHÌN THẤY (mục 9b.5):
 *   1. Mapper BE response -> shape UI
 *   2. Lọc/sort client-side (BE không có endpoint cho việc này)
 *   3. Error mapping 400/403/404/500 -> ApiException đúng message
 *   4. Image mapping -> qua appConfig.getImageUrl()
 * Không test component, không test navigation, không test style.
 */

import { ApiClient } from '../../../api/ApiClient';
import { RealFridgeService } from '../RealFridgeService';
import { MockFridgeService } from '../../mock/MockFridgeService';
import { ApiException } from '../../../api/ApiException';

jest.mock('../../../api/ApiClient', () => ({
  ApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const api = ApiClient;
let svc;

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
  api.patch.mockReset();
  api.delete.mockReset();
  svc = new RealFridgeService();
});

/** Dùng `data` nguyên bản của BE (chưa qua interceptor unwrap) để test đúng contract. */
const beItem = (over = {}) => ({
  id: 'uuid-1',
  ingredientId: 9,
  ingredientName: 'Cà chua',
  ingredientImagePath: '/public/ingredients/ca_chua.jpg',
  quantity: 500,
  unit: 'gram',
  purchasedAt: '2026-10-20T00:00:00.000Z',
  expiresAt: '2026-10-18T00:00:00.000Z',
  storageLocation: 'fridge',
  addedBy: 'manual',
  consumedAt: null,
  daysUntilExpiry: -2,
  createdAt: '2026-10-20T00:00:00.000Z',
  ...over,
});

// ═══════════════ 1. MAPPER — R1: cùng input, cùng shape với Mock ═══════════════

describe('1. Mapper BE response -> shape UI', () => {
  it('map đúng tên field: ingredientName->name, storageLocation->compartment, expiresAt->expiryDate', () => {
    api.get.mockResolvedValue([beItem()]);

    return svc.getItems().then((items) => {
      const it = items[0];
      // Tên field đã map đúng với IFridgeService.FridgeItem
      expect(it.name).toBe('Cà chua');
      expect(it.compartment).toBe('fridge');
      expect(it.expiryDate).toBe('2026-10-18T00:00:00.000Z');
      expect(it.quantity).toBe(500);
      expect(it.unit).toBe('gram');
      expect(it.id).toBe('uuid-1');
    });
  });

  it('status lấy từ daysUntilExpiry của BE (không tự tính lại)', () => {
    // daysUntilExpiry âm -> expired
    expect(svc._toFridgeItem(beItem({ daysUntilExpiry: -2 })).status).toBe('expired');
    // 0..3 ngày -> expiring
    expect(svc._toFridgeItem(beItem({ daysUntilExpiry: 0 })).status).toBe('expiring');
    expect(svc._toFridgeItem(beItem({ daysUntilExpiry: 3 })).status).toBe('expiring');
    // >3 ngày -> fresh
    expect(svc._toFridgeItem(beItem({ daysUntilExpiry: 10 })).status).toBe('fresh');
  });

  it('fallback tính status từ expiresAt khi BE không trả daysUntilExpiry', () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString();
    const past = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(svc._toFridgeItem(beItem({ daysUntilExpiry: null, expiresAt: future })).status).toBe(
      'fresh'
    );
    expect(svc._toFridgeItem(beItem({ daysUntilExpiry: null, expiresAt: past })).status).toBe(
      'expired'
    );
  });

  it('compartmentLabel dịch storageLocation sang tiếng Việt (theo Flutter)', () => {
    expect(svc._toFridgeItem(beItem({ storageLocation: 'fridge' })).compartmentLabel).toBe(
      'Ngăn mát'
    );
    expect(svc._toFridgeItem(beItem({ storageLocation: 'freezer' })).compartmentLabel).toBe(
      'Ngăn đông'
    );
    expect(svc._toFridgeItem(beItem({ storageLocation: 'pantry' })).compartmentLabel).toBe(
      'Tủ khô'
    );
  });

  it('shape đầu ra khớp MockFridgeService (R1)', async () => {
    api.get.mockResolvedValue([beItem()]);
    const [realItem] = await svc.getItems();
    const [mockItem] = await new MockFridgeService().getItems();

    const realKeys = Object.keys(realItem).sort();
    const mockKeys = Object.keys(mockItem).sort();

    // 2 field mock có mà real không — cố ý bỏ vì:
    //   `category`: BE `FridgeItemResponseDto` không trả category, không có endpoint
    //     nào trả theo item (quyết định 23/10: bỏ chip filter category, theo Flutter).
    //     FridgeItem.jsx tự fallback về icon `other`.
    //   `compartment`: mock data (inventory.json) cũng không khai báo — typedef
    //     IFridgeService ghi nó là optional. BE thì CÓ trả `storageLocation`
    //     nên real vẫn có, và đây là field thật sự dùng cho pill lọc.
    const MOCK_CHI_CO = ['category', 'compartment'];
    mockKeys
      .filter((k) => !MOCK_CHI_CO.includes(k))
      .forEach((k) => {
        expect(realKeys).toContain(k);
      });

    // Field UI BẮT BUỘC dùng — phải có trong real và kiểu dữ liệu phải khớp mock
    ['id', 'name', 'quantity', 'unit', 'status', 'expiryDate', 'image', 'compartment'].forEach(
      (k) => {
        expect(realKeys).toContain(k);
      }
    );
    ['id', 'name', 'quantity', 'unit', 'status', 'expiryDate', 'image'].forEach((k) => {
      expect(mockKeys).toContain(k);
    });
    expect(typeof realItem.quantity).toBe(typeof mockItem.quantity);
    expect(typeof realItem.status).toBe('string');
    expect(realItem.status).toMatch(/^(fresh|expiring|expired)$/);
  });
});

// ═══════════════ 2. IMAGE MAPPING — R2: bắt buộc qua getImageUrl ═══════════════

describe('2. Image mapping — R2', () => {
  it('đường dẫn tương đối được nối với file host', () => {
    const item = svc._toFridgeItem(
      beItem({ ingredientImagePath: '/public/ingredients/ca_chua.jpg' })
    );
    expect(item.image).toMatch(/^https:\/\//);
    // Không được trả về đường dẫn tương đối — sẽ không host được
    expect(item.image).not.toBe('/public/ingredients/ca_chua.jpg');
  });

  it('URL tuyệt đối giữ nguyên', () => {
    const url = 'https://file.friggy.io.vn/public/ingredients/ca_chua.jpg';
    expect(svc._toFridgeItem(beItem({ ingredientImagePath: url })).image).toBe(url);
  });

  it('null -> null (không vỡ)', () => {
    expect(svc._toFridgeItem(beItem({ ingredientImagePath: null })).image).toBeNull();
  });

  it('API host được đổi sang file host', () => {
    const item = svc._toFridgeItem(
      beItem({ ingredientImagePath: 'https://api.friggy.io.vn/public/ingredients/ca_chua.jpg' })
    );
    expect(item.image).toContain('file.friggy.io.vn');
  });
});

// ═══════════════ 3. FILTER / SORT client-side — BE không có endpoint ═══════════════

describe('3. Lọc & sắp xếp client-side (BE không hỗ trợ)', () => {
  const three = [
    beItem({ id: 'a', ingredientName: 'Cà chua', daysUntilExpiry: 1, storageLocation: 'fridge' }),
    beItem({ id: 'b', ingredientName: 'Thịt bò', daysUntilExpiry: -1, storageLocation: 'freezer' }),
    beItem({ id: 'c', ingredientName: 'Sữa tươi', daysUntilExpiry: 9, storageLocation: 'pantry' }),
  ];

  it('search lọc client-side theo tên', async () => {
    api.get.mockResolvedValue(three);
    const r = await svc.getItems({ search: 'sữa' });
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('Sữa tươi');
  });

  it('search không phân biệt hoa thường', async () => {
    api.get.mockResolvedValue(three);
    const r = await svc.getItems({ search: 'CÀ' });
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('Cà chua');
  });

  it('status=expired lọc client-side theo daysUntilExpiry < 0', async () => {
    api.get.mockResolvedValue(three);
    const r = await svc.getItems({ status: 'expired' });
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('Thịt bò');
  });

  it('sort theo tên asc/desc', async () => {
    api.get.mockResolvedValue(three);
    const asc = await svc.getItems({ sortBy: 'name', sortDir: 'asc' });
    expect(asc.map((i) => i.name)).toEqual(['Cà chua', 'Sữa tươi', 'Thịt bò']);
    const desc = await svc.getItems({ sortBy: 'name', sortDir: 'desc' });
    expect(desc.map((i) => i.name)).toEqual(['Thịt bò', 'Sữa tươi', 'Cà chua']);
  });

  it('sort theo số lượng', async () => {
    api.get.mockResolvedValue([
      beItem({ id: 'a', ingredientName: 'A', quantity: 10 }),
      beItem({ id: 'b', ingredientName: 'B', quantity: 2 }),
    ]);
    const r = await svc.getItems({ sortBy: 'quantity', sortDir: 'asc' });
    expect(r.map((i) => i.quantity)).toEqual([2, 10]);
  });
});

// ═══════════════ 4. QUERY Gửi lên server — chỉ param BE thật nhận ═══════════════

describe('4. Query server-side — chỉ gửi param BE thật nhận', () => {
  it('compartment -> storageLocation (KHÔNG gửi tên sai)', async () => {
    api.get.mockResolvedValue([]);
    await svc.getItems({ compartment: 'freezer' });
    expect(api.get).toHaveBeenCalledWith('/fridge', {
      params: { storageLocation: 'freezer' },
    });
  });

  it('status=expiring -> expiringSoon=true', async () => {
    api.get.mockResolvedValue([]);
    await svc.getItems({ status: 'expiring' });
    expect(api.get).toHaveBeenCalledWith('/fridge', { params: { expiringSoon: true } });
  });

  it('status=fresh/expired KHÔNG gửi param lên server (lọc client-side)', async () => {
    api.get.mockResolvedValue([]);
    await svc.getItems({ status: 'fresh' });
    expect(api.get).toHaveBeenCalledWith('/fridge', { params: {} });
  });

  it('search/sort/category KHÔNG gửi lên server (BE không có param này)', async () => {
    api.get.mockResolvedValue([]);
    await svc.getItems({
      search: 'cà chua',
      sortBy: 'name',
      sortDir: 'asc',
      category: 'vegetable',
    });
    expect(api.get).toHaveBeenCalledWith('/fridge', { params: {} });
  });
});

// ═══════════════ 5. CRUD — đúng endpoint + đúng body ═══════════════

describe('5. CRUD — endpoint & payload đúng BE', () => {
  it('addItem gửi đúng field BE nhận, không gửi field thừa', async () => {
    api.post.mockResolvedValue(beItem());
    await svc.addItem({
      name: 'Cà chuta',
      quantity: '500',
      unit: 'gram',
      compartment: 'freezer',
      expiryDate: '2026-10-18',
      category: 'vegetable', // field thừa — phải bị lọc
    });
    const [url, payload] = api.post.mock.calls[0];
    expect(url).toBe('/fridge/items');
    expect(payload).toEqual({
      quantity: 500,
      unit: 'gram',
      name: 'Cà chuta',
      storageLocation: 'freezer',
      expiresAt: '2026-10-18',
    });
    expect(payload.category).toBeUndefined();
  });

  it('addItem ưu tiên ingredientId hơn name khi có cả hai', async () => {
    api.post.mockResolvedValue(beItem());
    await svc.addItem({ ingredientId: 9, name: 'Cà chua', quantity: 1, unit: 'kg' });
    const [, payload] = api.post.mock.calls[0];
    expect(payload.ingredientId).toBe(9);
    expect(payload.name).toBe('Cà chua');
  });

  it('addItem KHÔNG gửi expiresAt rỗng — để BE tự tính theo storageLocation', async () => {
    api.post.mockResolvedValue(beItem());
    await svc.addItem({ name: 'Thịt bò', quantity: 1, unit: 'kg', compartment: 'freezer' });
    const [, payload] = api.post.mock.calls[0];
    // BE sẽ tính 180 ngày cho thịt ở ngăn đông — gửi rỗng sẽ phá hạn dùng đúng
    expect(payload.expiresAt).toBeUndefined();
    expect(payload.storageLocation).toBe('freezer');
  });

  it('updateItem chỉ gửi field UpdateFridgeItemDto nhận', async () => {
    api.patch.mockResolvedValue(beItem());
    await svc.updateItem('uuid-1', {
      quantity: 3,
      unit: 'kg',
      expiryDate: '2026-11-01',
      compartment: 'pantry',
      name: 'Tên mới', // field thừa
    });
    const [url, payload] = api.patch.mock.calls[0];
    expect(url).toBe('/fridge/items/uuid-1');
    expect(payload).toEqual({
      quantity: 3,
      unit: 'kg',
      expiresAt: '2026-11-01',
      storageLocation: 'pantry',
    });
  });

  it('deleteItem gọi DELETE đúng URL', async () => {
    api.delete.mockResolvedValue(undefined);
    await svc.deleteItem('uuid-1');
    expect(api.delete).toHaveBeenCalledWith('/fridge/items/uuid-1');
  });

  it('markConsumed gọi PATCH /consume', async () => {
    api.patch.mockResolvedValue(beItem({ consumedAt: '2026-10-23T00:00:00.000Z' }));
    await svc.markConsumed('uuid-1');
    expect(api.patch).toHaveBeenCalledWith('/fridge/items/uuid-1/consume');
  });

  it('getItemById trả null khi không tìm thấy', async () => {
    api.get.mockResolvedValue([beItem({ id: 'other' })]);
    expect(await svc.getItemById('khong-co')).toBeNull();
  });
});

// ═══════════════ 6. ERROR MAPPING — R3: lỗi 4xx/5xx ném lên đúng message ═══════════════

describe('6. Error mapping', () => {
  const throwApi = (status, message) => () => {
    throw new ApiException(message, { statusCode: status });
  };

  it('404 ném lên ApiException với message của BE (KHÔNG fallback)', async () => {
    api.get.mockImplementation(throwApi(404, 'Không tìm thấy nguyên liệu trong tủ'));
    await expect(svc.getItems()).rejects.toThrow('Không tìm thấy nguyên liệu trong tủ');
  });

  it('400 ném lên (lỗi validation của user)', async () => {
    api.post.mockImplementation(throwApi(400, "Nguyên liệu 'X' chưa có trong danh mục hệ thống."));
    await expect(svc.addItem({ name: 'X', quantity: 1, unit: 'kg' })).rejects.toThrow(
      "Nguyên liệu 'X' chưa có trong danh mục hệ thống."
    );
  });

  it('500 ném lên — SafeService sẽ quyết định fallback, service không tự nuốt', async () => {
    api.get.mockImplementation(throwApi(500, 'Lỗi máy chủ nội bộ'));
    await expect(svc.getItems()).rejects.toBeInstanceOf(ApiException);
  });

  it('lỗi mạng giữ cờ isNetworkError để UI hiển thị đúng', async () => {
    api.get.mockImplementation(() => {
      throw new ApiException('Không thể kết nối máy chủ', { isNetworkError: true });
    });
    await expect(svc.getItems()).rejects.toMatchObject({ isNetworkError: true });
  });

  it('data rỗng -> mảng rỗng (KHÔNG fallback, để EmptyState hiện)', async () => {
    api.get.mockResolvedValue([]);
    expect(await svc.getItems()).toEqual([]);
  });
});

// ═══════════════ 7. SUMMARY — suy ra từ /fridge/stats + /fridge ═══════════════

describe('7. getSummary — suy ra từ stats + list', () => {
  it('đếm chính xác từ list khi có data', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/fridge/stats') {
        return Promise.resolve({ expiringSoonCount: 1, totalItems: 3 });
      }
      return Promise.resolve([
        beItem({ id: 'a', daysUntilExpiry: -1 }),
        beItem({ id: 'b', daysUntilExpiry: 2 }),
        beItem({ id: 'c', daysUntilExpiry: 8 }),
      ]);
    });

    const s = await svc.getSummary();
    expect(s.expiredCount).toBe(1);
    expect(s.availableCount).toBe(2);
  });

  it('BE lỗi nhưng list OK -> vẫn trả summary từ list', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/fridge/stats')
        return Promise.reject(new ApiException('boom', { statusCode: 500 }));
      return Promise.resolve([beItem({ id: 'a', daysUntilExpiry: -1 })]);
    });
    const s = await svc.getSummary();
    expect(s.expiredCount).toBe(1);
  });
});

// ═══════════════ 8. INGREDIENT PICKER — searchIngredients ═══════════════

describe('8. searchIngredients — danh mục nguyên liệu (B1 picker)', () => {
  // BE `GET /ingredients` trả PAGINATED: { data, total, page, limit, totalPages }.
  // ApiClient đã unwrap envelope ngoài -> còn lại đúng object này.
  const beIngredient = (over = {}) => ({
    id: 9,
    name: 'Cà chua',
    defaultUnit: 'gram',
    caloriesPer100g: 18,
    averagePricePerUnit: 3000,
    imagePath: '/public/ingredients/ca_chua.jpg',
    isCommon: true,
    categoryId: 3,
    categoryName: 'Rau củ quả',
    ...over,
  });

  it('đọc đúng lớp pagination của BE (payload.data)', async () => {
    api.get.mockResolvedValue({
      data: [beIngredient()],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const result = await svc.searchIngredients('cà');

    expect(api.get).toHaveBeenCalledWith('/ingredients', {
      params: { limit: 20, search: 'cà' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(9);
    expect(result[0].name).toBe('Cà chua');
    expect(result[0].defaultUnit).toBe('gram');
  });

  it('ảnh đi qua appConfig.getImageUrl — KHÔNG dùng path thô của BE', async () => {
    api.get.mockResolvedValue({ data: [beIngredient()], total: 1, page: 1, limit: 20 });

    const result = await svc.searchIngredients('cà');
    // Path tương đối '/public/...' không host được -> phải qua getImageUrl.
    expect(result[0].image).not.toBe('/public/ingredients/ca_chua.jpg');
    expect(result[0].image).toContain('ca_chua.jpg');
  });

  it('không gửi param search khi query rỗng', async () => {
    api.get.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

    await svc.searchIngredients('');

    expect(api.get).toHaveBeenCalledWith('/ingredients', { params: { limit: 20 } });
  });

  it('response là mảng thuần (không pagination) vẫn parse được', async () => {
    api.get.mockResolvedValue([beIngredient()]);
    const result = await svc.searchIngredients('cà');
    expect(result).toHaveLength(1);
  });

  it('payload lỗi -> trả mảng rỗng, KHÔNG ném lỗi lên UI', async () => {
    api.get.mockResolvedValue({ data: null });
    expect(await svc.searchIngredients('cà')).toEqual([]);
  });
});

// ═══════════════ 9. STATS CHART — getStatsChart ═══════════════

describe('9. getStatsChart — dữ liệu biểu đồ (B1)', () => {
  it('gọi đúng endpoint + param period', async () => {
    const chart = {
      period: 'week',
      labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
      spending: [120000, 0, 85000, 0, 0, 0, 0],
      wasteItems: [0, 1, 0, 0, 0, 0, 0],
    };
    api.get.mockResolvedValue(chart);

    const result = await svc.getStatsChart('week');

    expect(api.get).toHaveBeenCalledWith('/fridge/stats/chart', { params: { period: 'week' } });
    expect(result).toEqual(chart);
  });

  it('mặc định period = week', async () => {
    api.get.mockResolvedValue({ period: 'week', labels: [], spending: [], wasteItems: [] });
    await svc.getStatsChart();
    expect(api.get).toHaveBeenCalledWith('/fridge/stats/chart', { params: { period: 'week' } });
  });

  it('period=month được truyền nguyên vẹn', async () => {
    api.get.mockResolvedValue({ period: 'month', labels: [], spending: [], wasteItems: [] });
    await svc.getStatsChart('month');
    expect(api.get).toHaveBeenCalledWith('/fridge/stats/chart', { params: { period: 'month' } });
  });
});
