/**
 * P0.7 - Verify Phase 0 bang HÀNH VI THẬT của module thật
 *
 * KHÁC BIỆT VỚI CÁC TEST KHÁC:
 *   Test cũ kiểm từng đơn vị logic với mock giả (vd: ApiClient với axios mock).
 *   File này kiểm TÍCH HỢP - dùng config thật, env thật, mock service thật,
 *   không mock module nào. Đây là bước gần nhất với hành vi lúc chạy mà
 *   vẫn nằm trong Jest.
 *
 * MỤC TIÊU (theo đúng checklist P0.7 trong plan):
 *   - USE_MOCKS=false + chưa có real -> tự fallback mock, app vẫn chạy
 *   - BE lỗi 5xx / mạng -> fallback mock, app không trắng màn hình
 *   - 4xx -> KHÔNG fallback (form hiện lỗi đúng)
 *   - data rỗng -> shape đúng để EmptyState render, không crash
 *   - getImageUrl (P0.1) đúng URL 2 host
 *
 * ⚠️ CÁI NÀY KHÔNG THAY THẾ VIỆC CHẠY APP THẬT.
 *    Mục "App chạy, UI hiện đủ" của P0.7 cần người bật Expo lên xem -
 *    xem P07_MANUAL_CHECKLIST.md cùng thư mục.
 */

import {
  appConfig,
  getImageUrl,
  getServerBaseUrl,
  getFileBaseUrl,
} from '../../shared/config/appConfig';
import {
  resolveServices,
  registerService,
  clearRegistry,
  isMockMode,
  getMode,
  overrideMode,
} from '../api/ServiceRegistry';
import { ApiException } from '../api/ApiException';
import { withFallback } from '../api/SafeService';
import { MockFridgeService } from '../services/mock/MockFridgeService';
import { MockRecipeService } from '../services/mock/MockRecipeService';
import { MockNotificationService } from '../services/mock/MockNotificationService';
import { MockUserService } from '../services/mock/MockUserService';

// ═══════════════════════════════════════════════════════════════════
// #1 - USE_MOCKS=false, chưa có real -> tự fallback mock (P0.7)
// ═══════════════════════════════════════════════════════════════════

describe('P0.7 #1: USE_MOCKS=false + chưa có real -> tự fallback mock', () => {
  beforeEach(() => {
    clearRegistry();
    overrideMode(null);
  });

  afterAll(() => {
    clearRegistry();
    overrideMode(null);
  });

  it('env đang USE_MOCKS=false (đúng .env hiện tại)', () => {
    expect(appConfig.USE_MOCKS).toBe(false);
  });

  it('không real nào đăng ký -> 100% mock, KHÔNG màn hình nào undefined', () => {
    const mocks = {
      authService: { name: 'mock-auth' },
      fridgeService: { name: 'mock-fridge' },
      recipeService: { name: 'mock-recipe' },
      notificationService: { name: 'mock-notif' },
      userService: { name: 'mock-user' },
    };

    const resolved = resolveServices(mocks);

    Object.entries(mocks).forEach(([key, mock]) => {
      expect(resolved[key]).toBeDefined();
      expect(resolved[key].name).toBe(mock.name);
    });
  });

  it('trả đúng 5 key, không thiếu không thừa', () => {
    const resolved = resolveServices({
      authService: {},
      fridgeService: {},
      recipeService: {},
      notificationService: {},
      userService: {},
    });
    expect(Object.keys(resolved).sort()).toEqual([
      'authService',
      'fridgeService',
      'notificationService',
      'recipeService',
      'userService',
    ]);
  });

  it('resolveServices({}) -> {} chứ không throw', () => {
    expect(() => resolveServices({})).not.toThrow();
    expect(resolveServices({})).toEqual({});
  });

  it('domain có real -> resolve trả về giá trị khác undefined', () => {
    registerService('fridgeService', { name: 'real-fridge' });
    const resolved = resolveServices({ fridgeService: { name: 'mock-fridge' } });
    expect(resolved.fridgeService).toBeDefined();
  });

  it('isMockMode() và getMode() trả boolean (P0.6e)', () => {
    expect(typeof isMockMode()).toBe('boolean');
    expect(typeof getMode()).toBe('boolean');
  });
});

// ═══════════════════════════════════════════════════════════════════
// #2 - BE tắt / lỗi 5xx -> vẫn hiện mock data, không trắng màn hình (P0.7)
// ═══════════════════════════════════════════════════════════════════

describe('P0.7 #2: BE lỗi 5xx / mạng -> fallback mock', () => {
  const realChet = (msg) => ({
    getItems: async () => {
      throw new ApiException(msg, { statusCode: 500 });
    },
  });

  it('5xx -> trả dữ liệu mock thay vì ném lỗi', async () => {
    const mock = { getItems: async () => [{ id: '1', name: 'Cà chua' }] };
    const svc = withFallback(realChet('Server unreachable'), mock, {
      label: 'fridge',
      enabled: true,
    });

    const items = await svc.getItems();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Cà chua');
  });

  it('network error -> cũng fallback mock', async () => {
    const real = {
      getItems: async () => {
        throw new ApiException('Network request failed', { isNetworkError: true });
      },
    };
    const mock = { getItems: async () => [{ id: '1', name: 'Cà chua' }] };
    const svc = withFallback(real, mock, { label: 'fridge', enabled: true });

    await expect(svc.getItems()).resolves.toHaveLength(1);
  });

  it('4xx -> KHÔNG fallback, UI form phải hiện lỗi (P0.6b)', async () => {
    const real = {
      login: async () => {
        throw new ApiException('Sai mật khẩu', { statusCode: 401 });
      },
    };
    const mock = { login: async () => ({ token: 'mock-token' }) };
    const svc = withFallback(real, mock, { label: 'auth', enabled: true });

    // Nếu fallback, user nhập sai mật khẩu sẽ bị đăng nhập thành công
    await expect(svc.login()).rejects.toThrow();
  });

  it('MỌI method của service đều được bọc fallback, không sót method nào', async () => {
    const real = {
      getItems: async () => {
        throw new ApiException('x', { statusCode: 503 });
      },
      getSummary: async () => {
        throw new ApiException('x', { statusCode: 503 });
      },
      removeItem: async () => {
        throw new ApiException('x', { statusCode: 503 });
      },
    };
    const mock = {
      getItems: async () => ['a'],
      getSummary: async () => ({ ok: true }),
      removeItem: async () => ({ ok: true }),
    };
    const svc = withFallback(real, mock, { label: 'fridge', enabled: true });

    await expect(svc.getItems()).resolves.toEqual(['a']);
    await expect(svc.getSummary()).resolves.toEqual({ ok: true });
    await expect(svc.removeItem()).resolves.toEqual({ ok: true });
  });

  it('SAFE_FALLBACK tắt -> lỗi 5xx ném thẳng (đủ để chẩn đoán)', () => {
    const mock = { getItems: async () => ['a'] };
    const svc = withFallback(realChet('x'), mock, { label: 'fridge', enabled: false });

    return expect(svc.getItems()).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════
// #3 - data rỗng -> shape đúng để EmptyState render (P0.6c)
// ═══════════════════════════════════════════════════════════════════

describe('P0.7 #3: data rỗng -> EmptyState an toàn, không crash', () => {
  it('list luôn là mảng -> .length không bao giờ lỗi', async () => {
    expect(Array.isArray(await new MockFridgeService().getItems())).toBe(true);
    expect(Array.isArray(await new MockRecipeService().getRecipes())).toBe(true);
    expect(Array.isArray(await new MockNotificationService().getNotifications())).toBe(true);
  });

  it('summary luôn có 2 field number', async () => {
    const summary = await new MockFridgeService().getSummary();
    expect(summary).toBeDefined();
    expect(typeof summary.expiredCount).toBe('number');
    expect(typeof summary.availableCount).toBe('number');
  });

  it('profile luôn có name', async () => {
    const profile = await new MockUserService().getProfile();
    expect(profile).toBeDefined();
    expect(profile.name).toBeDefined();
  });

  it('recipe id không tồn tại -> null/undefined chứ không throw', async () => {
    const result = await new MockRecipeService().getRecipeById('khong-ton-tai-123');
    expect(result === null || result === undefined).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// #4 - getImageUrl: URL 2 host (P0.1 BẮT BUỘC)
// ═══════════════════════════════════════════════════════════════════

describe('P0.7 #4: getImageUrl tạo đúng URL 2 host', () => {
  it('đường dẫn tương đối -> dựng URL host file', () => {
    const url = getImageUrl('/uploads/abc.jpg');
    expect(url).toContain('file.friggy.io.vn');
    expect(url).not.toContain('/api/v1');
    expect(url).toContain('abc.jpg');
  });

  it('URL đã là host file -> giữ nguyên', () => {
    const input = 'https://file.friggy.io.vn/uploads/x.png';
    expect(getImageUrl(input)).toBe(input);
  });

  it('URL tuyệt đối domain khác -> giữ nguyên', () => {
    const input = 'https://cdn.example.com/pic.jpg';
    expect(getImageUrl(input)).toBe(input);
  });

  it('chuỗi rỗng -> null (không render <Image> với URL rỗng)', () => {
    expect(getImageUrl('')).toBeNull();
    expect(getImageUrl('   ')).toBeNull();
  });

  it('null/undefined -> null, không throw (caller có thể truyền sai)', () => {
    expect(() => getImageUrl(null)).not.toThrow();
    expect(getImageUrl(null)).toBeNull();
    expect(getImageUrl(undefined)).toBeNull();
  });

  it('chuỗi "null"/"undefined" từ BE -> null (BE hay trả chuỗi này)', () => {
    expect(getImageUrl('null')).toBeNull();
    expect(getImageUrl('undefined')).toBeNull();
  });

  it('kiểu dữ liệu sai (số, object) -> null, không throw', () => {
    expect(getImageUrl(123)).toBeNull();
    expect(getImageUrl({})).toBeNull();
  });

  it('getServerBaseUrl bỏ đúng hậu tố /api/v1', () => {
    expect(getServerBaseUrl()).toBe('https://api.friggy.io.vn');
    expect(getServerBaseUrl()).not.toContain('/api/v1');
  });

  it('getFileBaseUrl trả host file, KHÁC host API (2 host BE dùng)', () => {
    expect(getFileBaseUrl()).toBe('https://file.friggy.io.vn');
    expect(getFileBaseUrl()).not.toBe(getServerBaseUrl());
  });

  it('URL chứa api.friggy.io.vn -> tự đổi sang file.friggy.io.vn', () => {
    // Đây là case BE hay trả: đường dẫn ảnh nằm trong response của API
    const url = getImageUrl('https://api.friggy.io.vn/uploads/abc.jpg');
    expect(url).toBe('https://file.friggy.io.vn/uploads/abc.jpg');
  });
});

// ═══════════════════════════════════════════════════════════════════
// #5 - ApiClient: cấu hình đúng, không lỗi lúc import (P0.3)
// ═══════════════════════════════════════════════════════════════════

describe('P0.7 #5: cấu hình nền tảng đúng', () => {
  it('TIMEOUT_MS = 30000 theo plan', () => {
    expect(appConfig.TIMEOUT_MS).toBe(30000);
  });

  it('baseURL lấy từ config, là URL hợp lệ', () => {
    expect(appConfig.API_BASE_URL).toBeTruthy();
    expect(appConfig.API_BASE_URL).toMatch(/^https?:\/\//);
  });

  it('SAFE_FALLBACK bật mặc định (P0.6b)', () => {
    expect(appConfig.SAFE_FALLBACK).toBe(true);
  });

  it('module ApiClient import được, không throw', () => {
    expect(() => require('../api/ApiClient')).not.toThrow();
  });
});
