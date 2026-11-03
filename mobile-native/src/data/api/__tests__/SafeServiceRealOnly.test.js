/**
 * SafeService.withFallback — method CHỈ có ở Real có bị expose không?
 *
 * ⚠️ BUG ĐÃ PHÁT HIỆN:
 *   `withFallback` build proxy từ `collectNames(mockService)` (SafeService.js:133).
 *   Vòng 2 (SafeService.js:177-186) chỉ expose property KHÔNG phải function
 *   của Real -> METHOD chỉ có ở Real KHÔNG được expose.
 *
 *   => `services.userService.getFamilyInfo` là `undefined` khi chạy thật
 *      -> `userService.getFamilyInfo()` ném TypeError
 *      -> FamilyManagementScreen luôn hiển thị lỗi tải dù BE hoàn toàn ổn.
 */

import { withFallback } from '../SafeService';

describe('withFallback — method chỉ có ở Real', () => {
  it('method chỉ có ở Real vẫn được expose qua proxy', () => {
    const real = {
      async getFamilyInfo() {
        return { groupId: 'g1', members: [] };
      },
    };
    const mock = {
      async getProfile() {
        return {};
      },
    };

    const proxy = withFallback(real, mock, { label: 'user' });

    // ⚠️ Phải expose method của Real, nếu không -> undefined is not a function.
    expect(typeof proxy.getFamilyInfo).toBe('function');
  });

  it('gọi được method chỉ có ở Real qua proxy', async () => {
    const real = {
      async getFamilyInfo() {
        return { groupId: 'g1', members: [] };
      },
    };
    const mock = {
      async getProfile() {
        return {};
      },
    };

    const proxy = withFallback(real, mock, { label: 'user' });

    await expect(proxy.getFamilyInfo()).resolves.toEqual({ groupId: 'g1', members: [] });
  });

  it('method chỉ có ở Real lỗi 5xx -> ném lên (không trả undefined)', async () => {
    const real = {
      async getFamilyInfo() {
        const e = new Error('Server exploded');
        e.statusCode = 500;
        throw e;
      },
    };
    const mock = {
      async getProfile() {
        return {};
      },
    };

    const proxy = withFallback(real, mock, { label: 'user' });

    // Mock không có getFamilyInfo -> phải ném lên (không phải undefined).
    await expect(proxy.getFamilyInfo()).rejects.toThrow('Server exploded');
  });
});
