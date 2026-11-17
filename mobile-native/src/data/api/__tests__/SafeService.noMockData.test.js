/**
 * SafeService - Option C: app KHÔNG BAO GIỜ trả dữ liệu giả cho user.
 *
 * ⚠️ BỐI CẢNH:
 *   Trước đây `withFallback` dùng 1 cờ `enabled` cho CẢ 2 mục đích:
 *     - bật/tắt proxy offline (cache + queue)
 *     - bật/tắt trả dữ liệu mock
 *   Khi `.env` đặt `EXPO_PUBLIC_SAFE_FALLBACK=false` -> `return realService`
 *   -> KHÔNG có proxy -> `cacheFallback`/`mutationHandler` chết -> toàn bộ tầng
 *   offline là code chết. Đồng thời test thấy "bật" còn app thật thì "tắt".
 *
 *   => B0 tách 2 cờ: `offlineEnabled` (tầng offline) + `allowMockData` (dữ liệu giả).
 */

import { withFallback } from '../SafeService';
import { ApiException } from '../ApiException';

const networkError = (message = 'Network request failed') => {
  const e = new Error(message);
  e.name = 'NetworkError';
  return e;
};

const httpError = (statusCode, message = 'HTTP error') => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

describe('Option C - allowMockData=false: KHÔNG BAO GIỜ trả dữ liệu giả', () => {
  it('đọc lỗi 5xx -> ném lỗi thật, KHÔNG gọi mock', async () => {
    const err = httpError(500, 'Internal Server Error');
    const real = { getItems: jest.fn().mockRejectedValue(err) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };

    const svc = withFallback(real, mock, { label: 'fridge', allowMockData: false });

    await expect(svc.getItems()).rejects.toBe(err);
    expect(mock.getItems).not.toHaveBeenCalled();
  });

  it('đọc lỗi network + cache rỗng -> ném lỗi thật, KHÔNG gọi mock', async () => {
    const err = networkError();
    const real = { getItems: jest.fn().mockRejectedValue(err) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };

    const svc = withFallback(real, mock, { label: 'fridge', allowMockData: false });

    await expect(svc.getItems()).rejects.toBe(err);
    expect(mock.getItems).not.toHaveBeenCalled();
  });

  it('đọc lỗi network + cache CÓ -> trả cache, KHÔNG gọi mock', async () => {
    const real = { getItems: jest.fn().mockRejectedValue(networkError()) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };
    const cacheFallback = jest.fn().mockResolvedValue([{ id: 'cached' }]);

    const svc = withFallback(real, mock, { label: 'fridge', cacheFallback, allowMockData: false });

    await expect(svc.getItems()).resolves.toEqual([{ id: 'cached' }]);
    expect(mock.getItems).not.toHaveBeenCalled();
  });

  it('allowMockData=true -> 5xx vẫn trả mock (chế độ demo)', async () => {
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };
    const real = { getItems: jest.fn().mockRejectedValue(httpError(500)) };

    const svc = withFallback(real, mock, { label: 'fridge', allowMockData: true });

    await expect(svc.getItems()).resolves.toEqual([{ id: 'mock' }]);
  });
});

describe('Option C - offlineEnabled=true VẪN dựng proxy (tầng offline không chết)', () => {
  it('cache vẫn được gọi khi offlineEnabled=true + allowMockData=false', async () => {
    const real = { getItems: jest.fn().mockRejectedValue(networkError()) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };
    const cacheFallback = jest.fn().mockResolvedValue([{ id: 'cached' }]);

    const svc = withFallback(real, mock, {
      label: 'fridge',
      offlineEnabled: true,
      allowMockData: false,
      cacheFallback,
    });

    await expect(svc.getItems()).resolves.toEqual([{ id: 'cached' }]);
    expect(cacheFallback).toHaveBeenCalledWith('getItems', []);
  });

  it('offlineEnabled=false VÀ allowMockData=false -> trả thẳng real (không proxy)', async () => {
    const real = { getItems: jest.fn().mockRejectedValue(httpError(500)) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };

    const svc = withFallback(real, mock, {
      label: 'fridge',
      offlineEnabled: false,
      allowMockData: false,
    });

    // Không có wrapper -> lỗi bay thẳng ra, không bị bọc lại.
    await expect(svc.getItems()).rejects.toThrow();
  });

  it('offlineEnabled=false NHƯNG allowMockData=true -> vẫn dựng proxy (để trả mock)', async () => {
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };
    const real = { getItems: jest.fn().mockRejectedValue(httpError(500)) };

    const svc = withFallback(real, mock, {
      label: 'fridge',
      offlineEnabled: false,
      allowMockData: true,
    });

    await expect(svc.getItems()).resolves.toEqual([{ id: 'mock' }]);
  });
});

describe('Option C - method chỉ có ở mock (real chưa implement)', () => {
  it('allowMockData=false -> ném lỗi "chưa được hỗ trợ", KHÔNG trả dữ liệu giả', () => {
    const mock = { getItems: jest.fn().mockResolvedValue([]), getExotic: jest.fn().mockResolvedValue(['x']) };
    const real = { getItems: jest.fn().mockResolvedValue([]) };

    const svc = withFallback(real, mock, { label: 'fridge', allowMockData: false });

    // Hàm ném ĐỒNG BỘ -> dùng toThrow.
    expect(() => svc.getExotic()).toThrow(/chưa được hỗ trợ/i);
    expect(mock.getExotic).not.toHaveBeenCalled();
  });

  it('allowMockData=true -> vẫn gọi mock (demo mode)', async () => {
    const mock = { getItems: jest.fn().mockResolvedValue([]), getExotic: jest.fn().mockResolvedValue(['x']) };
    const real = { getItems: jest.fn().mockResolvedValue([]) };

    const svc = withFallback(real, mock, { label: 'fridge', allowMockData: true });

    await expect(svc.getExotic()).resolves.toEqual(['x']);
  });
});

describe('Option C - lỗi đồng bộ (throw non-Promise)', () => {
  it('throw 5xx đồng bộ -> ném lỗi thật, KHÔNG gọi mock', () => {
    const err = httpError(500, 'Sync boom');
    const real = {
      getItems: () => {
        throw err;
      },
    };
    const mock = { getItems: jest.fn().mockResolvedValue(['mock']) };

    const svc = withFallback(real, mock, { label: 'fridge', allowMockData: false });

    expect(() => svc.getItems()).toThrow(err);
    expect(mock.getItems).not.toHaveBeenCalled();
  });

  it('throw 5xx đồng bộ + allowMockData=true -> trả mock', () => {
    const real = {
      getItems: () => {
        throw httpError(500);
      },
    };
    // Mock trả đồng bộ để assert được giá trị (không phải Promise).
    const mock = { getItems: jest.fn(() => ['mock']) };

    const svc = withFallback(real, mock, { label: 'fridge', allowMockData: true });

    expect(svc.getItems()).toEqual(['mock']);
  });
});

describe('Option C - contract proxy vẫn phải đủ method (mock làm contract)', () => {
  it('method chỉ có ở mock vẫn được expose trên proxy', () => {
    const mock = { getItems: jest.fn(), getExotic: jest.fn() };
    const real = { getItems: jest.fn() };

    const svc = withFallback(real, mock, { label: 'fridge', allowMockData: false });

    expect(typeof svc.getExotic).toBe('function');
  });
});
