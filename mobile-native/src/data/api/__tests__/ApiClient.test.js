/**
 * ApiClient - test cho 8 BẮT BUỘC (P0.3) + các test bổ sung sau merge 21/10
 *
 * Cách chạy: import ApiClient -> hàm này tự gọi axios.create() 2 lần
 * (mainClient + rawClient). Ta chạy interceptor bằng tay thay vì mock network.
 */

import axios from '../__testUtils__/axiosMock';
import { onApiEvent } from '../ApiClient';
import { TokenStorage } from '../../storage/TokenStorage';
import { ApiException } from '../ApiException';

jest.mock('axios', () => require('../__testUtils__/axiosMock'));

const BASE = 'https://api.friggy.io.vn/api/v1';
const SESSION_MSG = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!';

// ApiClient gọi axios.create() 2 lần lúc import: [0]=main, [1]=raw
const mainClient = axios.__instances[0];
const rawClient = axios.__instances[1];

let expiredCount = 0;
onApiEvent('session-expired', () => {
  expiredCount += 1;
});

beforeEach(() => {
  mainClient.request.mockReset();
  rawClient.request.mockReset();
  mainClient.defaults.headers.common = {};
  TokenStorage.clearAll();
  expiredCount = 0;
});

/** Chạy qua response interceptor, nhánh thành công */
const runOk = (data, status = 200) =>
  mainClient.__interceptors.response.fulfilled({ data, status });

/** Chạy qua response interceptor, nhánh lỗi */
const runErr = (status, data, config = {}) =>
  mainClient.__interceptors.response.rejected({ response: { status, data }, config });

/** Chạy qua request interceptor */
const runReq = (config) => mainClient.__interceptors.request.fulfilled(config);

// ═══════════════ BẮT BUỘC 1: unwrap 3 nhánh ═══════════════

describe('BẮT BUỘC 1 - response unwrap 3 nhánh', () => {
  it('nhánh 1: có data khác null -> trả thẳng data', () => {
    expect(runOk({ data: { id: 1, name: 'Cà chua' } })).toEqual({ id: 1, name: 'Cà chua' });
  });

  it('nhánh 2: success true + data null -> trả null (trạng thái hợp lệ)', () => {
    expect(runOk({ success: true, data: null })).toBeNull();
  });

  it('nhánh 2b: success true + data có giá trị -> trả data', () => {
    expect(runOk({ success: true, data: { ok: 1 } })).toEqual({ ok: 1 });
  });

  it('nhánh 3: success false -> reject, dù HTTP 200', async () => {
    await expect(runOk({ success: false, message: 'Không đủ quyền' })).rejects.toThrow(
      'Không đủ quyền'
    );
  });

  it('nhánh 3b: success false không message -> fallback "Thao tác thất bại"', async () => {
    await expect(runOk({ success: false })).rejects.toThrow('Thao tác thất bại');
  });

  it('không có wrapper nào khớp -> trả nguyên body', () => {
    expect(runOk({ id: 7 })).toEqual({ id: 7 });
  });
});

// ═══════════════ BẮT BUỘC 2: lỗi mạng vs lỗi server ═══════════════

describe('BẮT BUỘC 2 - phân loại lỗi mạng vs lỗi server', () => {
  it('lỗi mạng (không response) -> isNetworkError true, statusCode null', async () => {
    expect.assertions(3);
    try {
      await mainClient.__interceptors.response.rejected({
        code: 'ECONNREFUSED',
        message: 'Network Error',
        config: {},
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ApiException);
      expect(e.isNetworkError).toBe(true);
      expect(e.statusCode).toBeNull();
    }
  });

  it('lỗi server -> isNetworkError false + lấy message từ BE', async () => {
    expect.assertions(3);
    try {
      await runErr(500, { message: 'Lỗi database' });
    } catch (e) {
      expect(e.isNetworkError).toBe(false);
      expect(e.statusCode).toBe(500);
      expect(e.message).toBe('Lỗi database');
    }
  });

  it('BE trả message dạng array -> join lại', async () => {
    expect.assertions(1);
    try {
      await runErr(422, { message: ['email sai', 'password ngắn'] });
    } catch (e) {
      expect(e.message).toBe('email sai\npassword ngắn');
    }
  });

  it('BE không trả message -> fallback theo statusCode', async () => {
    // 401 bị tách riêng: không có refresh token thì đi qua flow session-expired (mục dưới)
    const cases = [
      [403, 'Bạn không có quyền truy cập thực hiện thao tác này'],
      [404, 'Không tìm thấy dữ liệu yêu cầu (404)'],
      [500, 'Lỗi máy chủ nội bộ (500)'],
    ];
    for (const [status, expected] of cases) {
      try {
        await runErr(status, {});
        throw new Error('phải reject');
      } catch (e) {
        expect(e.message).toBe(expected);
      }
    }
  });

  it('401 khi không có refresh token -> message session-expired', async () => {
    await expect(runErr(401, {}, { url: '/fridge/items', headers: {} })).rejects.toThrow(
      SESSION_MSG
    );
  });
});

// ═══════════════ BẮT BUỘC 3: skipAuth ═══════════════

describe('BẮT BUỘC 3 - skipAuth cho endpoint public', () => {
  it('có token + skipAuth -> KHÔNG gắn Authorization', () => {
    TokenStorage.setAccessToken('secret');
    const cfg = runReq({ url: '/auth/email/login', skipAuth: true });
    expect(cfg.headers?.Authorization).toBeUndefined();
  });

  it('có token + không skipAuth -> gắn Bearer', () => {
    TokenStorage.setAccessToken('secret');
    const cfg = runReq({ url: '/fridge/items' });
    expect(cfg.headers.Authorization).toBe('Bearer secret');
  });

  it('chưa login -> không gửi "Bearer null"', () => {
    const cfg = runReq({ url: '/auth/email/register', skipAuth: true });
    expect(cfg.headers?.Authorization).toBeUndefined();
  });
});

// ═══════════════ BẮT BUỘC 4: single-flight ═══════════════

describe('BẮT BUỘC 4 - refresh single-flight', () => {
  it('5 request 401 đồng thời -> gọi /auth/refresh ĐÚNG 1 LẦN', async () => {
    TokenStorage.setAccessToken('old');
    TokenStorage.setRefreshToken('good-refresh');

    rawClient.request.mockResolvedValue({ data: { data: { accessToken: 'new' } } });
    mainClient.request.mockResolvedValue({ ok: true });

    const cfg = () => ({ url: '/fridge/items', _retry: false, headers: {} });

    await Promise.allSettled([
      runErr(401, { message: 'Unauthorized' }, cfg()),
      runErr(401, { message: 'Unauthorized' }, cfg()),
      runErr(401, { message: 'Unauthorized' }, cfg()),
      runErr(401, { message: 'Unauthorized' }, cfg()),
      runErr(401, { message: 'Unauthorized' }, cfg()),
    ]);

    const refreshCalls = rawClient.request.mock.calls.filter((c) =>
      String(c[0].url).includes('/auth/refresh')
    );
    expect(refreshCalls).toHaveLength(1);
  });
});

// ═══════════════ BẮT BUỘC 5: retry giữ config gốc ═══════════════

describe('BẮT BUỘC 5 - retry giữ nguyên config gốc', () => {
  it('replay giữ method, url, data, params, headers', async () => {
    TokenStorage.setAccessToken('old');
    TokenStorage.setRefreshToken('good-refresh');

    const replayed = {};
    mainClient.request.mockImplementation((r) => {
      Object.assign(replayed, r);
      return Promise.resolve({ id: 5 });
    });
    rawClient.request.mockResolvedValue({ data: { data: { accessToken: 'new' } } });

    await runErr(
      401,
      { message: 'Unauthorized' },
      {
        method: 'patch',
        url: '/fridge/items/5',
        data: { name: 'Cà chua mới' },
        params: { fields: 'name,expiryDate' },
        headers: { 'X-Custom': 'keep-me' },
      }
    );

    expect(replayed.method).toBe('patch');
    expect(replayed.url).toBe('/fridge/items/5');
    expect(replayed.data).toEqual({ name: 'Cà chua mới' });
    expect(replayed.params).toEqual({ fields: 'name,expiryDate' });
    expect(replayed.headers['X-Custom']).toBe('keep-me');
    expect(replayed.headers.Authorization).toBe('Bearer new');
  });
});

// ═══════════════ BẮT BUỘC 6: 401 tại endpoint AUTH ═══════════════

describe('BẮT BUỘC 6 - 401 tại endpoint AUTH không refresh', () => {
  const authEndpoints = [
    '/auth/email/login',
    '/auth/email/register',
    '/auth/email/verify-otp',
    '/auth/email/forgot-password',
    '/auth/email/reset-password',
    '/auth/google',
  ];

  it.each(authEndpoints)('%s -> reject, không refresh, không logout', async (url) => {
    TokenStorage.setAccessToken('old');
    TokenStorage.setRefreshToken('good-refresh');
    const before = expiredCount;

    await expect(runErr(401, { message: 'Sai mật khẩu' }, { url, headers: {} })).rejects.toThrow(
      'Sai mật khẩu'
    );

    expect(rawClient.request).not.toHaveBeenCalled();
    expect(expiredCount).toBe(before);
    // token còn nguyên - KHÔNG đăng xuất oan
    expect(TokenStorage.getAccessToken()).toBe('old');
  });

  it('verify-otp 401 -> lỗi về cho form hiển thị', async () => {
    await expect(
      runErr(
        401,
        { message: 'Mã OTP không đúng' },
        {
          url: '/auth/email/verify-otp',
          headers: {},
        }
      )
    ).rejects.toThrow('Mã OTP không đúng');
  });

  it('skipAuthRefresh=true trên config -> cũng không refresh', async () => {
    TokenStorage.setAccessToken('old');
    TokenStorage.setRefreshToken('good-refresh');

    await expect(
      runErr(401, { message: 'Sai' }, { url: '/bat-ky', skipAuthRefresh: true, headers: {} })
    ).rejects.toThrow('Sai');

    expect(rawClient.request).not.toHaveBeenCalled();
  });
});

// ═══════════════ 401 tại /auth/refresh ═══════════════

describe('401 tại /auth/refresh -> hết phiên chắc chắn', () => {
  it('clear token + emit session-expired', async () => {
    TokenStorage.setAccessToken('old');
    TokenStorage.setRefreshToken('bad-refresh');
    const before = expiredCount;

    rawClient.request.mockRejectedValue({
      response: { status: 401, data: { message: 'Refresh token hết hạn' } },
    });

    await expect(
      runErr(401, { message: 'hết hạn' }, { url: '/auth/refresh', headers: {} })
    ).rejects.toThrow(SESSION_MSG);

    expect(TokenStorage.getAccessToken()).toBeNull();
    expect(TokenStorage.getRefreshToken()).toBeNull();
    expect(expiredCount).toBe(before + 1);
  });

  it('refresh fail (network) -> clear token + emit session-expired', async () => {
    TokenStorage.setAccessToken('old');
    TokenStorage.setRefreshToken('good-refresh');
    const before = expiredCount;

    rawClient.request.mockRejectedValue({ message: 'Network down' });

    await expect(
      runErr(401, { message: 'hết hạn' }, { url: '/fridge/items', headers: {} })
    ).rejects.toThrow(SESSION_MSG);

    expect(TokenStorage.getAccessToken()).toBeNull();
    expect(expiredCount).toBe(before + 1);
  });
});

// ═══════════════ BẮT BUỘC 7/8: TTL động ═══════════════

describe('BẮT BUỘC 7/8 - không hardcode TTL', () => {
  it('đọc expiresAt từ BE khi có', async () => {
    const expiresAt = Date.now() + 5 * 60 * 1000;
    TokenStorage.setAccessToken('old');
    TokenStorage.setRefreshToken('r');
    mainClient.request.mockResolvedValue({});
    rawClient.request.mockResolvedValue({ data: { data: { accessToken: 'new', expiresAt } } });

    await runErr(401, {}, { url: '/fridge/items', headers: {} });

    expect(TokenStorage.getAccessExpiresAt()).toBe(expiresAt);
  });

  it('đọc expiresIn (giây) từ BE khi không có expiresAt', async () => {
    TokenStorage.setAccessToken('old');
    TokenStorage.setRefreshToken('r');
    mainClient.request.mockResolvedValue({});

    const before = Date.now();
    rawClient.request.mockResolvedValue({
      data: { data: { accessToken: 'new', expiresIn: 1800 } },
    });

    await runErr(401, {}, { url: '/fridge/items', headers: {} });

    const stored = TokenStorage.getAccessExpiresAt();
    expect(stored).toBeGreaterThanOrEqual(before + 1800 * 1000);
    expect(stored).toBeLessThanOrEqual(Date.now() + 1800 * 1000);
  });

  it('BE đổi TTL -> app theo, không dùng hằng số cứng', async () => {
    TokenStorage.setAccessToken('old');
    TokenStorage.setRefreshToken('r');
    mainClient.request.mockResolvedValue({});

    rawClient.request.mockResolvedValue({
      data: { data: { accessToken: 'n1', expiresIn: 600 } },
    });
    await runErr(401, {}, { url: '/fridge/items', headers: {} });
    expect(TokenStorage.isAccessTokenExpired()).toBe(false);

    // BE đổi xuống 10s (< buffer 60s) -> coi như hết hạn
    rawClient.request.mockResolvedValue({
      data: { data: { accessToken: 'n2', expiresIn: 10 } },
    });
    await runErr(401, {}, { url: '/fridge/items', headers: {} });
    expect(TokenStorage.isAccessTokenExpired()).toBe(true);
  });

  it('refresh token đã hết hạn -> không gọi API refresh', async () => {
    TokenStorage.setAccessToken('old');
    TokenStorage.setRefreshToken('expired');
    TokenStorage.setTokenExpiry({ refreshExpiresAt: Date.now() - 1000 });
    const before = expiredCount;

    await expect(runErr(401, {}, { url: '/fridge/items', headers: {} })).rejects.toThrow(
      SESSION_MSG
    );

    expect(rawClient.request).not.toHaveBeenCalled();
    expect(expiredCount).toBe(before + 1);
  });

  it('không có refresh token -> hết phiên, không gọi API', async () => {
    TokenStorage.setAccessToken('old');
    const before = expiredCount;

    await expect(runErr(401, {}, { url: '/fridge/items', headers: {} })).rejects.toThrow(
      SESSION_MSG
    );

    expect(rawClient.request).not.toHaveBeenCalled();
    expect(expiredCount).toBe(before + 1);
  });
});

// ═══════════════ cấu hình instance ═══════════════

describe('cấu hình axios instance', () => {
  it('baseURL từ appConfig, timeout 30s', () => {
    expect(axios.create.mock.calls[0][0].baseURL).toBe(BASE);
    expect(axios.create.mock.calls[0][0].timeout).toBe(30000);
  });
});

// ═══════════════ decode JWT exp (đường chính vì BE không trả expiresAt) ═══════════════

describe('extractExpiry - decode JWT payload.exp', () => {
  /** Tạo 1 JWT giả với payload.exp = expUnixSeconds */
  const makeJwt = (expUnixSeconds) => {
    const enc = (obj) =>
      btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${enc({ alg: 'HS256' })}.${enc({ exp: expUnixSeconds })}.sig`;
  };

  it('BE không trả expiresAt/expiresIn -> lấy exp từ JWT', async () => {
    const expSec = Math.floor(Date.now() / 1000) + 1800; // +30 phút
    TokenStorage.setAccessToken('old');
    TokenStorage.setRefreshToken('r');
    mainClient.request.mockResolvedValue({});

    // BE thực tế chỉ trả accessToken (xem RefreshResponseDto)
    rawClient.request.mockResolvedValue({ data: { data: { accessToken: makeJwt(expSec) } } });

    await runErr(401, {}, { url: '/fridge/items', headers: {} });

    expect(TokenStorage.getAccessExpiresAt()).toBe(expSec * 1000);
    expect(TokenStorage.isAccessTokenExpired()).toBe(false);
  });

  it('JWT đã hết hạn -> isAccessTokenExpired true', async () => {
    const expSec = Math.floor(Date.now() / 1000) - 3600; // -1 giờ
    TokenStorage.setAccessToken('old');
    TokenStorage.setRefreshToken('r');
    mainClient.request.mockResolvedValue({});

    rawClient.request.mockResolvedValue({ data: { data: { accessToken: makeJwt(expSec) } } });

    await runErr(401, {}, { url: '/fridge/items', headers: {} });

    expect(TokenStorage.isAccessTokenExpired()).toBe(true);
  });

  it('token không phải JWT -> không crash, dùng fallback TTL', async () => {
    TokenStorage.setAccessToken('old');
    TokenStorage.setRefreshToken('r');
    mainClient.request.mockResolvedValue({});

    rawClient.request.mockResolvedValue({ data: { data: { accessToken: 'opaque-token' } } });

    await expect(runErr(401, {}, { url: '/fridge/items', headers: {} })).resolves.toBeDefined();

    // fallback 900s -> vẫn còn hạn, app không vỡ
    expect(TokenStorage.getAccessExpiresAt()).toBeGreaterThan(Date.now());
    expect(TokenStorage.isAccessTokenExpired()).toBe(false);
  });

  it('BE trả expiresAt -> ưu tiên hơn JWT exp', async () => {
    const expFromBe = Date.now() + 10 * 60 * 1000;
    const jwtExpSec = Math.floor(Date.now() / 1000) + 9999; // xa hơn nhiều
    TokenStorage.setAccessToken('old');
    TokenStorage.setRefreshToken('r');
    mainClient.request.mockResolvedValue({});

    rawClient.request.mockResolvedValue({
      data: { data: { accessToken: makeJwt(jwtExpSec), expiresAt: expFromBe } },
    });

    await runErr(401, {}, { url: '/fridge/items', headers: {} });

    expect(TokenStorage.getAccessExpiresAt()).toBe(expFromBe);
  });
});
