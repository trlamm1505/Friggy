/**
 * SafeService - chính sách lỗi GHI (Option B).
 *
 * ⚠️ NGUYÊN TẮC:
 *   Method GHI **KHÔNG BAO GIỜ** fallback sang mock:
 *     - Lỗi 5xx    -> ném lỗi thật (server đã xử lý, không queue, không giả).
 *     - Lỗi network -> có mutation handler? -> queue + `OfflineQueuedError`
 *                     không có handler?      -> `OfflineRequiresNetworkError`.
 */

import { withFallback } from '../SafeService';
import { ApiException } from '../ApiException';
import { OfflineQueuedError } from '../../offline/OfflineQueuedError';
import { OfflineRequiresNetworkError } from '../../offline/OfflineRequiresNetworkError';

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

describe('B1 - GHI lỗi 5xx -> ném lỗi thật, KHÔNG mock, KHÔNG queue', () => {
  it('addItem lỗi 500 -> ném lỗi, mock KHÔNG được gọi', async () => {
    const err = httpError(500, 'Server boom');
    const real = { addItem: jest.fn().mockRejectedValue(err) };
    const mock = { addItem: jest.fn().mockResolvedValue({ id: 'mock' }) };
    const mutationHandler = jest.fn();

    const svc = withFallback(real, mock, {
      label: 'fridge',
      serviceKey: 'fridgeService',
      allowMockData: false,
      mutationHandler,
    });

    await expect(svc.addItem({ name: 'Cà chua' })).rejects.toBe(err);
    expect(mock.addItem).not.toHaveBeenCalled();
    expect(mutationHandler).not.toHaveBeenCalled();
  });

  it('addItem lỗi 503 + allowMockData=true -> VẪN ném lỗi (ghi không được giả)', async () => {
    const err = httpError(503);
    const real = { addItem: jest.fn().mockRejectedValue(err) };
    const mock = { addItem: jest.fn().mockResolvedValue({ id: 'mock' }) };

    const svc = withFallback(real, mock, {
      label: 'fridge',
      serviceKey: 'fridgeService',
      allowMockData: true,
    });

    await expect(svc.addItem({ name: 'Cà chua' })).rejects.toBe(err);
    expect(mock.addItem).not.toHaveBeenCalled();
  });

  it('lỗi 4xx vẫn ném thẳng như trước', async () => {
    const err = httpError(422, 'Tên quá dài');
    const real = { addItem: jest.fn().mockRejectedValue(err) };
    const mock = { addItem: jest.fn().mockResolvedValue({ id: 'mock' }) };

    const svc = withFallback(real, mock, {
      label: 'fridge',
      serviceKey: 'fridgeService',
      allowMockData: false,
    });

    await expect(svc.addItem({})).rejects.toBe(err);
    expect(mock.addItem).not.toHaveBeenCalled();
  });
});

describe('B1 - GHI lỗi network CÓ mutation handler -> queue + OfflineQueuedError', () => {
  it('handler xử lý được -> ném OfflineQueuedError', async () => {
    const real = { addItem: jest.fn().mockRejectedValue(networkError()) };
    const mock = { addItem: jest.fn().mockResolvedValue({ id: 'mock' }) };
    const mutationHandler = jest.fn().mockResolvedValue(true);

    const svc = withFallback(real, mock, {
      label: 'fridge',
      serviceKey: 'fridgeService',
      allowMockData: false,
      mutationHandler,
    });

    await expect(svc.addItem({ name: 'Cà chua' })).rejects.toBeInstanceOf(OfflineQueuedError);
    expect(mutationHandler).toHaveBeenCalledWith('addItem', [{ name: 'Cà chua' }]);
    expect(mock.addItem).not.toHaveBeenCalled();
  });

  it('handler trả false -> ném OfflineRequiresNetworkError', async () => {
    const real = { addItem: jest.fn().mockRejectedValue(networkError()) };
    const mock = { addItem: jest.fn().mockResolvedValue({ id: 'mock' }) };
    const mutationHandler = jest.fn().mockResolvedValue(false);

    const svc = withFallback(real, mock, {
      label: 'fridge',
      serviceKey: 'fridgeService',
      allowMockData: false,
      mutationHandler,
    });

    await expect(svc.addItem({ name: 'Cà chua' })).rejects.toBeInstanceOf(OfflineRequiresNetworkError);
  });

  it('handler ném lỗi -> ném OfflineRequiresNetworkError (không sập)', async () => {
    const real = { addItem: jest.fn().mockRejectedValue(networkError()) };
    const mock = { addItem: jest.fn().mockResolvedValue({ id: 'mock' }) };
    const mutationHandler = jest.fn().mockRejectedValue(new Error('SQLite lỗi'));

    const svc = withFallback(real, mock, {
      label: 'fridge',
      serviceKey: 'fridgeService',
      allowMockData: false,
      mutationHandler,
    });

    await expect(svc.addItem({ name: 'Cà chua' })).rejects.toBeInstanceOf(OfflineRequiresNetworkError);
  });
});

describe('B1 - GHI lỗi network KHÔNG có handler -> OfflineRequiresNetworkError', () => {
  it('subscribe (nhóm tài chính) -> ném lỗi "cần kết nối mạng"', async () => {
    const err = networkError();
    const real = { subscribe: jest.fn().mockRejectedValue(err) };
    const mock = { subscribe: jest.fn().mockResolvedValue({ ok: true }) };

    const svc = withFallback(real, mock, {
      label: 'user',
      serviceKey: 'userService',
      allowMockData: false,
    });

    await expect(svc.subscribe('plan-1')).rejects.toBeInstanceOf(OfflineRequiresNetworkError);
    expect(mock.subscribe).not.toHaveBeenCalled();
  });

  it('lỗi mang đủ thông tin để UI hiển thị', async () => {
    const real = { subscribe: jest.fn().mockRejectedValue(networkError()) };
    const mock = { subscribe: jest.fn().mockResolvedValue({ ok: true }) };

    const svc = withFallback(real, mock, {
      label: 'user',
      serviceKey: 'userService',
      allowMockData: false,
    });

    try {
      await svc.subscribe('plan-1');
      throw new Error('phải throw');
    } catch (e) {
      expect(e.isOfflineRequiresNetwork).toBe(true);
      expect(e.methodName).toBe('subscribe');
      expect(e.serviceKey).toBe('userService');
    }
  });

  it('KHÔNG đọc cache cho method ghi (tránh trả về giá trị gây hiểu nhầm)', async () => {
    const real = { subscribe: jest.fn().mockRejectedValue(networkError()) };
    const mock = { subscribe: jest.fn().mockResolvedValue({ ok: true }) };
    const cacheFallback = jest.fn().mockResolvedValue({ ok: true });

    const svc = withFallback(real, mock, {
      label: 'user',
      serviceKey: 'userService',
      allowMockData: false,
      cacheFallback,
    });

    await expect(svc.subscribe('plan-1')).rejects.toBeInstanceOf(OfflineRequiresNetworkError);
    expect(cacheFallback).not.toHaveBeenCalled();
  });
});

describe('B1 - phân biệt ĐỌC / GHI theo serviceKey', () => {
  it('method ĐỌC lỗi network + không cache -> ném lỗi gốc (KHÔNG phải OfflineRequiresNetworkError)', async () => {
    const err = networkError();
    const real = { getItems: jest.fn().mockRejectedValue(err) };
    const mock = { getItems: jest.fn().mockResolvedValue(['mock']) };

    const svc = withFallback(real, mock, {
      label: 'fridge',
      serviceKey: 'fridgeService',
      allowMockData: false,
    });

    await expect(svc.getItems()).rejects.toBe(err);
  });

  it('method ghi của fridgeService -> queue được', async () => {
    const real = { updateItem: jest.fn().mockRejectedValue(networkError()) };
    const mock = { updateItem: jest.fn().mockResolvedValue({ ok: true }) };
    const mutationHandler = jest.fn().mockResolvedValue(true);

    const svc = withFallback(real, mock, {
      label: 'fridge',
      serviceKey: 'fridgeService',
      allowMockData: false,
      mutationHandler,
    });

    await expect(svc.updateItem('id-1', { quantity: 2 })).rejects.toBeInstanceOf(OfflineQueuedError);
  });

  it('serviceKey khác -> coi như ĐỌC (mặc định an toàn)', async () => {
    const err = networkError();
    const real = { someUnknown: jest.fn().mockRejectedValue(err) };
    const mock = { someUnknown: jest.fn().mockResolvedValue(['mock']) };

    const svc = withFallback(real, mock, {
      label: 'xyz',
      serviceKey: 'unknownService',
      allowMockData: false,
    });

    await expect(svc.someUnknown()).rejects.toBe(err);
  });
});
