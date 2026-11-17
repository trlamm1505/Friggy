/**
 * SafeService - tầng fallback: real -> cache local -> LỖI THẬT.
 *
 * ⚠️ Option C (B0): app KHÔNG BAO GIỜ trả dữ liệu mock cho user (mặc định).
 *   Các case "rơi xuống mock" cũ đã đảo thành "ném lỗi thật".
 *   Muốn bật mock -> `allowMockData: true` (chế độ demo).
 */

import { withFallback } from '../SafeService';

/**
 * Tạo lỗi network (không có statusCode) - mô phỏng mất mạng.
 */
const networkError = (message = 'Network request failed') => {
  const e = new Error(message);
  e.name = 'NetworkError';
  return e;
};

/**
 * Tạo lỗi HTTP có statusCode.
 */
const httpError = (statusCode, message = 'HTTP error') => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

describe('SafeService - fallback cơ bản (giữ hành vi cũ)', () => {
  it('gọi real khi real thành công', async () => {
    const real = { getItems: jest.fn().mockResolvedValue([{ id: 1 }]) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };

    const svc = withFallback(real, mock, { label: 'fridge' });
    await expect(svc.getItems()).resolves.toEqual([{ id: 1 }]);
    expect(mock.getItems).not.toHaveBeenCalled();
  });

  it('lỗi network + cache rỗng -> NÉM LỖI THẬT, KHÔNG trả mock (Option C)', async () => {
    const err = networkError();
    const real = { getItems: jest.fn().mockRejectedValue(err) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };

    const svc = withFallback(real, mock, { label: 'fridge' });
    await expect(svc.getItems()).rejects.toBe(err);
    expect(mock.getItems).not.toHaveBeenCalled();
  });

  it('allowMockData=true -> lỗi network vẫn trả mock (chế độ demo)', async () => {
    const real = { getItems: jest.fn().mockRejectedValue(networkError()) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };

    const svc = withFallback(real, mock, { label: 'fridge', allowMockData: true });
    await expect(svc.getItems()).resolves.toEqual([{ id: 'mock' }]);
  });

  it('KHÔNG fallback khi lỗi 4xx (trừ 408/429)', async () => {
    const real = { getItems: jest.fn().mockRejectedValue(httpError(422, 'Validation failed')) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };

    const svc = withFallback(real, mock, { label: 'fridge' });
    await expect(svc.getItems()).rejects.toThrow('Validation failed');
    expect(mock.getItems).not.toHaveBeenCalled();
  });
});

describe('SafeService - tầng cache local (P1 offline)', () => {
  it('dùng cache khi lỗi network', async () => {
    const real = { getItems: jest.fn().mockRejectedValue(networkError()) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };
    const cacheFallback = jest.fn().mockResolvedValue([{ id: 'cached' }]);

    const svc = withFallback(real, mock, { label: 'fridge', cacheFallback });
    await expect(svc.getItems()).resolves.toEqual([{ id: 'cached' }]);
    expect(mock.getItems).not.toHaveBeenCalled();
    expect(cacheFallback).toHaveBeenCalledWith('getItems', []);
  });

  it('cache rỗng (null) -> NÉM LỖI THẬT, KHÔNG rơi xuống mock (Option C)', async () => {
    const err = networkError();
    const real = { getItems: jest.fn().mockRejectedValue(err) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };
    const cacheFallback = jest.fn().mockResolvedValue(null);

    const svc = withFallback(real, mock, { label: 'fridge', cacheFallback });
    await expect(svc.getItems()).rejects.toBe(err);
    expect(mock.getItems).not.toHaveBeenCalled();
  });

  it('cache trả mảng rỗng -> NÉM LỖI THẬT (không hiện "0 món" giả)', async () => {
    const err = networkError();
    const real = { getItems: jest.fn().mockRejectedValue(err) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };
    const cacheFallback = jest.fn().mockResolvedValue([]);

    const svc = withFallback(real, mock, { label: 'fridge', cacheFallback });
    await expect(svc.getItems()).rejects.toBe(err);
    expect(mock.getItems).not.toHaveBeenCalled();
  });

  it('KHÔNG dùng cache khi lỗi 5xx (server lỗi, không phải mất mạng)', async () => {
    const err = httpError(500, 'Internal Server Error');
    const real = { getItems: jest.fn().mockRejectedValue(err) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };
    const cacheFallback = jest.fn().mockResolvedValue([{ id: 'cached' }]);

    const svc = withFallback(real, mock, { label: 'fridge', cacheFallback });
    // 5xx -> ném lỗi thật, KHÔNG dùng cache, KHÔNG dùng mock.
    await expect(svc.getItems()).rejects.toBe(err);
    expect(cacheFallback).not.toHaveBeenCalled();
    expect(mock.getItems).not.toHaveBeenCalled();
  });

  it('KHÔNG dùng cache khi lỗi 4xx', async () => {
    const real = { getItems: jest.fn().mockRejectedValue(httpError(403, 'Forbidden')) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };
    const cacheFallback = jest.fn().mockResolvedValue([{ id: 'cached' }]);

    const svc = withFallback(real, mock, { label: 'fridge', cacheFallback });
    await expect(svc.getItems()).rejects.toThrow('Forbidden');
    expect(cacheFallback).not.toHaveBeenCalled();
  });

  it('lỗi trong cacheFallback không làm hỏng -> vẫn ném lỗi gốc', async () => {
    const err = networkError();
    const real = { getItems: jest.fn().mockRejectedValue(err) };
    const mock = { getItems: jest.fn().mockResolvedValue([{ id: 'mock' }]) };
    const cacheFallback = jest.fn().mockRejectedValue(new Error('SQLite lỗi'));

    const svc = withFallback(real, mock, { label: 'fridge', cacheFallback });
    await expect(svc.getItems()).rejects.toBe(err);
    expect(mock.getItems).not.toHaveBeenCalled();
  });

  it('truyền đúng args cho cacheFallback', async () => {
    const real = {
      getRecipeById: jest.fn().mockRejectedValue(networkError()),
    };
    const mock = { getRecipeById: jest.fn().mockResolvedValue(null) };
    const cacheFallback = jest.fn().mockResolvedValue({ id: 'r1' });

    const svc = withFallback(real, mock, { label: 'recipe', cacheFallback });
    await expect(svc.getRecipeById('r1')).resolves.toEqual({ id: 'r1' });
    expect(cacheFallback).toHaveBeenCalledWith('getRecipeById', ['r1']);
  });
});
