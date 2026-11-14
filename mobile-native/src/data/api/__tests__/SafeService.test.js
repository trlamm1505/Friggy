/**
 * SafeService (P0.6b) - test quy tắc fallback.
 *
 * Đây là lớp quyết định câu hỏi quan trọng nhất của cả Phase 0:
 *   "Khi BE lỗi, user thấy dữ liệu thật (và biết mình đang lỗi)
 *    hay thấy dữ liệu giả mà tưởng mọi thứ ổn?"
 *
 * Câu trả lời đúng phụ thuộc loại lỗi:
 *   - 5xx / network  -> fallback mock (app vẫn dùng được, chấp nhận được)
 *   - 4xx            -> KHÔNG fallback (lỗi của user, giấu = nói dối)
 *   - data rỗng      -> KHÔNG fallback (trạng thái hợp lệ, P0.6c lo)
 */

import { withFallback, shouldFallback, extractStatus, isNetworkError } from '../SafeService';
import { ApiException } from '../ApiException';

// ═══════════════ extractStatus ═══════════════

describe('extractStatus - đọc status từ nhiều shape lỗi', () => {
  it('ApiException dùng statusCode', () => {
    const e = new ApiException('Server boom', { statusCode: 500 });
    expect(extractStatus(e)).toBe(500);
  });

  it('AxiosError dùng response.status', () => {
    const e = { response: { status: 403, data: {} } };
    expect(extractStatus(e)).toBe(403);
  });

  it('service tự throw { status }', () => {
    expect(extractStatus({ status: 502 })).toBe(502);
  });

  it('không có status -> null', () => {
    expect(extractStatus(new Error('boom'))).toBeNull();
    expect(extractStatus(null)).toBeNull();
    expect(extractStatus(undefined)).toBeNull();
  });

  it('statusCode ưu tiên hơn response.status nếu cả hai có', () => {
    // ApiClient chuẩn hoá về ApiException, nhưng nếu lọt thì phải nhất quán
    const e = { statusCode: 404, response: { status: 500 } };
    expect(extractStatus(e)).toBe(404);
  });
});

// ═══════════════ isNetworkError ═══════════════

describe('isNetworkError', () => {
  it('ApiException có cờ isNetworkError=true', () => {
    const e = new ApiException('Mất mạng', { isNetworkError: true });
    expect(isNetworkError(e)).toBe(true);
  });

  it('lỗi không có response + message giống network', () => {
    expect(isNetworkError(new Error('Network Error'))).toBe(true);
    expect(isNetworkError(new Error('timeout of 30000ms exceeded'))).toBe(true);
    expect(isNetworkError(new Error('connect ECONNREFUSED'))).toBe(true);
    expect(isNetworkError(new Error('getaddrinfo ENOTFOUND'))).toBe(true);
  });

  it('lỗi có response -> không phải network', () => {
    expect(isNetworkError({ response: { status: 500 } })).toBe(false);
  });

  it('lỗi thường không liên quan network', () => {
    expect(isNetworkError(new Error('Có gì đó sai'))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});

// ═══════════════ shouldFallback - quy tắc cốt lõi ═══════════════

describe('shouldFallback - quyết định fallback hay ném lên', () => {
  it('5xx -> FALLBACK (lỗi server, app vẫn dùng được)', () => {
    expect(shouldFallback(new ApiException('x', { statusCode: 500 }))).toBe(true);
    expect(shouldFallback(new ApiException('x', { statusCode: 502 }))).toBe(true);
    expect(shouldFallback(new ApiException('x', { statusCode: 503 }))).toBe(true);
    expect(shouldFallback({ status: 599 })).toBe(true);
  });

  it('network/offline -> FALLBACK', () => {
    expect(shouldFallback(new ApiException('offline', { isNetworkError: true }))).toBe(true);
    expect(shouldFallback(new Error('Network Error'))).toBe(true);
  });

  it('401 -> KHÔNG fallback (ApiClient đã xử lý refresh/session)', () => {
    expect(shouldFallback(new ApiException('Unauthorized', { statusCode: 401 }))).toBe(false);
    expect(shouldFallback({ response: { status: 401 } })).toBe(false);
  });

  it('403 -> KHÔNG fallback (không có quyền, user phải biết)', () => {
    expect(shouldFallback(new ApiException('Forbidden', { statusCode: 403 }))).toBe(false);
  });

  it('404 -> KHÔNG fallback', () => {
    expect(shouldFallback(new ApiException('Not found', { statusCode: 404 }))).toBe(false);
  });

  it('422 -> KHÔNG fallback (lỗi validation, form phải hiện)', () => {
    expect(shouldFallback(new ApiException('Validation', { statusCode: 422 }))).toBe(false);
  });

  it('400 -> KHÔNG fallback (lỗi input của user)', () => {
    expect(shouldFallback(new ApiException('Bad request', { statusCode: 400 }))).toBe(false);
  });

  it('408 timeout -> KHÔNG fallback (user cần biết request chưa xong)', () => {
    // Plan nêu rõ: 408/429 là lỗi tạm thời, KHÔNG fallback
    expect(shouldFallback(new ApiException('Timeout', { statusCode: 408 }))).toBe(false);
  });

  it('429 rate limit -> KHÔNG fallback', () => {
    expect(shouldFallback(new ApiException('Too many requests', { statusCode: 429 }))).toBe(false);
  });

  it('mọi 4xx đều KHÔNG fallback - test dạng bảng để không sót', () => {
    const statuses = [
      400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418,
      421, 422, 423, 424, 425, 426, 428, 429, 431, 451,
    ];
    statuses.forEach((s) => {
      expect(shouldFallback(new ApiException('x', { statusCode: s }))).toBe(false);
    });
  });

  it('lỗi không rõ status, không phải network -> KHÔNG fallback (an toàn)', () => {
    // Không biết chắc thì KHÔNG giấu lỗi - ném lên cho UI xử lý
    expect(shouldFallback(new Error('Có gì đó sai'))).toBe(false);
  });
});

// ═══════════════ withFallback - hành vi thực tế ═══════════════

const mkMock = () => ({
  getItems: jest.fn().mockResolvedValue(['mock-item-1', 'mock-item-2']),
  createItem: jest.fn().mockResolvedValue({ id: 'mock-new' }),
  deleteItem: jest.fn().mockResolvedValue(undefined),
  getStats: jest.fn().mockResolvedValue({ total: 99 }),
});

const mkReal = (overrides = {}) => ({
  getItems: jest.fn().mockResolvedValue(['real-item-1']),
  createItem: jest.fn().mockResolvedValue({ id: 'real-new' }),
  deleteItem: jest.fn().mockResolvedValue(undefined),
  getStats: jest.fn().mockResolvedValue({ total: 1 }),
  ...overrides,
});

describe('withFallback - đường thành công', () => {
  it('real trả dữ liệu -> giữ nguyên dữ liệu thật, KHÔNG gọi mock', async () => {
    const mock = mkMock();
    const real = mkReal();
    const safe = withFallback(real, mock, { label: 'fridge' });

    const result = await safe.getItems();

    expect(result).toEqual(['real-item-1']);
    expect(mock.getItems).not.toHaveBeenCalled();
  });

  it('truyền đúng args xuống real', async () => {
    const mock = mkMock();
    const real = mkReal();
    const safe = withFallback(real, mock);

    await safe.getItems({ status: 'expired' });

    expect(real.getItems).toHaveBeenCalledWith({ status: 'expired' });
  });

  it('data rỗng từ real -> trả nguyên mảng rỗng, KHÔNG fallback (P0.6c lo)', async () => {
    const mock = mkMock();
    const real = mkReal({ getItems: jest.fn().mockResolvedValue([]) });
    const safe = withFallback(real, mock);

    const result = await safe.getItems();

    // QUY TẮC 1: data rỗng là trạng thái hợp lệ
    expect(result).toEqual([]);
    expect(mock.getItems).not.toHaveBeenCalled();
  });
});

describe('withFallback - đường lỗi 5xx / network', () => {
  it('real trả 500 -> trả dữ liệu mock', async () => {
    const mock = mkMock();
    const real = mkReal({
      getItems: jest
        .fn()
        .mockRejectedValue(new ApiException('Server on fire', { statusCode: 500 })),
    });
    const safe = withFallback(real, mock);

    const result = await safe.getItems();

    expect(result).toEqual(['mock-item-1', 'mock-item-2']);
    expect(mock.getItems).toHaveBeenCalledTimes(1);
  });

  it('real lỗi network -> trả dữ liệu mock', async () => {
    const mock = mkMock();
    const real = mkReal({
      getItems: jest.fn().mockRejectedValue(new ApiException('Mất mạng', { isNetworkError: true })),
    });
    const safe = withFallback(real, mock);

    const result = await safe.getItems();

    expect(result).toEqual(['mock-item-1', 'mock-item-2']);
  });

  it('fallback truyền lại đúng args cho mock', async () => {
    const mock = mkMock();
    const real = mkReal({
      getItems: jest.fn().mockRejectedValue(new ApiException('x', { statusCode: 503 })),
    });
    const safe = withFallback(real, mock);

    await safe.getItems({ compartment: 'freezer' });

    expect(mock.getItems).toHaveBeenCalledWith({ compartment: 'freezer' });
  });

  it('lỗi 5xx ở method bất kỳ -> cũng fallback (không chỉ getItems)', async () => {
    const mock = mkMock();
    const real = mkReal({
      createItem: jest.fn().mockRejectedValue(new ApiException('x', { statusCode: 500 })),
      deleteItem: jest.fn().mockRejectedValue(new ApiException('x', { statusCode: 500 })),
    });
    const safe = withFallback(real, mock);

    await expect(safe.createItem({ name: 'Cà chua' })).resolves.toEqual({ id: 'mock-new' });
    await expect(safe.deleteItem('id-1')).resolves.toBeUndefined();
  });
});

describe('withFallback - đường lỗi 4xx (KHÔNG fallback)', () => {
  it('401 -> ném lên nguyên vẹn, KHÔNG gọi mock', async () => {
    const mock = mkMock();
    const err = new ApiException('Unauthorized', { statusCode: 401 });
    const real = mkReal({ getItems: jest.fn().mockRejectedValue(err) });
    const safe = withFallback(real, mock);

    await expect(safe.getItems()).rejects.toBe(err);
    expect(mock.getItems).not.toHaveBeenCalled();
  });

  it('403 -> ném lên, user biết mình không có quyền', async () => {
    const mock = mkMock();
    const err = new ApiException('Forbidden', { statusCode: 403 });
    const real = mkReal({ getItems: jest.fn().mockRejectedValue(err) });
    const safe = withFallback(real, mock);

    await expect(safe.getItems()).rejects.toBe(err);
    expect(mock.getItems).not.toHaveBeenCalled();
  });

  it('422 validation -> ném lên cho form hiển thị', async () => {
    const mock = mkMock();
    const err = new ApiException('Tên quá dài', { statusCode: 422, data: { field: 'name' } });
    const real = mkReal({ createItem: jest.fn().mockRejectedValue(err) });
    const safe = withFallback(real, mock);

    await expect(safe.createItem({ name: 'x'.repeat(300) })).rejects.toBe(err);
    expect(mock.createItem).not.toHaveBeenCalled();
  });

  it('giữ nguyên error object - UI cần đọc .data, .statusCode', async () => {
    const mock = mkMock();
    const err = new ApiException('Invalid', { statusCode: 422, data: { field: 'email' } });
    const real = mkReal({ createItem: jest.fn().mockRejectedValue(err) });
    const safe = withFallback(real, mock);

    try {
      await safe.createItem({});
      throw new Error('phải throw');
    } catch (e) {
      expect(e).toBe(err);
      expect(e.statusCode).toBe(422);
      expect(e.data).toEqual({ field: 'email' });
    }
  });
});

describe('withFallback - cấu hình', () => {
  it('enabled=false -> trả thẳng real, KHÔNG bọc (debug lỗi thật)', async () => {
    const mock = mkMock();
    const real = mkReal({
      getItems: jest.fn().mockRejectedValue(new ApiException('x', { statusCode: 500 })),
    });
    const safe = withFallback(real, mock, { enabled: false });

    // Không có wrapper -> lỗi bay thẳng ra UI, không bị giấu
    await expect(safe.getItems()).rejects.toThrow('x');
    expect(mock.getItems).not.toHaveBeenCalled();
  });

  it('không có mock -> trả thẳng real', () => {
    const real = mkReal();
    expect(withFallback(real, null)).toBe(real);
  });

  it('không có real -> trả thẳng mock', () => {
    const mock = mkMock();
    expect(withFallback(null, mock)).toBe(mock);
  });

  it('real chưa implement method -> gọi mock thẳng, không trả undefined', async () => {
    const mock = mkMock();
    const real = { getItems: jest.fn().mockResolvedValue(['real']) }; // thiếu createItem
    const safe = withFallback(real, mock);

    await expect(safe.createItem({ name: 'X' })).resolves.toEqual({ id: 'mock-new' });
  });

  it('property của real được expose (ServiceDebugCard cần đọc)', () => {
    const mock = mkMock();
    const real = { ...mkReal(), isConnected: true, baseUrl: 'https://api' };
    const safe = withFallback(real, mock);

    expect(safe.isConnected).toBe(true);
    expect(safe.baseUrl).toBe('https://api');
  });

  it('property chỉ có ở mock -> lấy từ mock', () => {
    const mock = { ...mkMock(), version: '1.0-mock' };
    const real = mkReal();
    const safe = withFallback(real, mock);

    expect(safe.version).toBe('1.0-mock');
  });

  it('property trùng tên -> ưu tiên giá trị của real (real mới là thật)', () => {
    const mock = { ...mkMock(), mode: 'mock' };
    const real = { ...mkReal(), mode: 'real' };
    const safe = withFallback(real, mock);

    expect(safe.mode).toBe('real');
  });

  it('method của Object KHÔNG bị copy sang proxy', () => {
    const mock = mkMock();
    const real = mkReal();
    const safe = withFallback(real, mock);

    expect(typeof safe.toString).toBe('function');
    // nhưng Object.keys chỉ liệt kê interface thật
    expect(Object.keys(safe).sort()).toEqual(['createItem', 'deleteItem', 'getItems', 'getStats']);
  });
});

describe('withFallback - method discovery qua prototype chain', () => {
  it('tìm được method kế thừa từ interface (Mock extends I*Service)', async () => {
    class IFridgeService {
      async getItems() {
        throw new Error('chưa implement');
      }
    }
    class MockFridge extends IFridgeService {
      async getItems() {
        return ['from-mock'];
      }

      async getExpired() {
        return ['tomato'];
      }
    }

    class RealFridge {
      async getItems() {
        throw new ApiException('x', { statusCode: 500 });
      }
    }

    const mock = new MockFridge();
    const real = new RealFridge();
    const safe = withFallback(real, mock, { label: 'fridge' });

    // getItems có ở cả real và mock -> fallback về mock
    await expect(safe.getItems()).resolves.toEqual(['from-mock']);
    // getExpired chỉ có ở mock (real chưa implement) -> gọi mock thẳng
    await expect(safe.getExpired()).resolves.toEqual(['tomato']);
  });

  it('không chọn nhầm method của Object (toString, hasOwnProperty)', () => {
    const mock = mkMock();
    const real = mkReal();
    const safe = withFallback(real, mock);

    // Proxy phải bám theo interface của mock, không kéo theo method của Object.
    // Dùng Object.keys (own property) chứ không dùng `in` - vì mọi object đều
    // có toString từ Object.prototype, `in` sẽ luôn true với bất kỳ object nào.
    expect(Object.keys(safe).sort()).toEqual(['createItem', 'deleteItem', 'getItems', 'getStats']);
  });
});
