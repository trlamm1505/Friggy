/**
 * appInit - test contract P0.6 (chi seed khi USE_MOCKS=true).
 *
 * Tach khoi App.jsx de App.jsx khong can render, va de test duoc logic
 * khong can react-native preset (khong co san trong RN 0.86).
 */

// appConfig doc o thoi diem import -> de test cac nhanh, ta dung
// jest.doMock truoc moi test thay vi spy.
// Ten bien phai bat dau bang "mock" de jest factory hoisted cho phep.
const mockSeedAll = jest.fn();
const mockResolveServices = jest.fn();
const mockAppConfigValue = { USE_MOCKS: true };

jest.mock('../storage/seedData', () => ({
  __esModule: true,
  seedAll: (...args) => mockSeedAll(...args),
}));

jest.mock('../api/ServiceRegistry', () => {
  const actual = jest.requireActual('../api/ServiceRegistry');
  return {
    __esModule: true,
    ...actual,
    resolveServices: (...args) => mockResolveServices(...args),
  };
});

jest.mock('../../shared/config/appConfig', () => ({
  __esModule: true,
  appConfig: mockAppConfigValue,
  USE_MOCKS: true,
  API_BASE_URL: 'http://localhost:3000/api',
  TIMEOUT_MS: 30000,
  STORAGE_KEYS: { ACCESS_TOKEN: 'access_token' },
  getEnv: () => ({}),
  isDev: () => true,
}));

let initAppShell;

beforeAll(() => {
  // require dong (sau khi mock da hoisted) dam bao nhan dung mock.
  // KHONG dung await import() - jest khong ho tro dynamic ESM (can flag VM).
  initAppShell = require('../appInit').initAppShell;
});

beforeEach(() => {
  mockSeedAll.mockReset();
  mockResolveServices.mockReset();
  mockAppConfigValue.USE_MOCKS = true;
});

// ═══════════════ contract P0.6: chi seed khi USE_MOCKS=true ═══════════════

describe('P0.6 - chi seed khi USE_MOCKS=true', () => {
  it('USE_MOCKS=true -> seedAll() duoc goi, tra ve true', async () => {
    mockAppConfigValue.USE_MOCKS = true;
    mockSeedAll.mockResolvedValue(undefined);

    const hooks = { onSeedStart: jest.fn(), onSeedEnd: jest.fn() };
    const ok = await initAppShell(hooks);

    expect(ok).toBe(true);
    expect(hooks.onSeedStart).toHaveBeenCalledTimes(1);
    expect(mockSeedAll).toHaveBeenCalledTimes(1);
    expect(hooks.onSeedEnd).toHaveBeenCalledTimes(1);
    expect(mockResolveServices).toHaveBeenCalledWith({});
  });

  it('USE_MOCKS=false -> seedAll KHONG duoc goi, tra ve true', async () => {
    mockAppConfigValue.USE_MOCKS = false;

    const hooks = { onSeedStart: jest.fn(), onSeedEnd: jest.fn() };
    const ok = await initAppShell(hooks);

    expect(ok).toBe(true);
    expect(hooks.onSeedStart).not.toHaveBeenCalled();
    expect(mockSeedAll).not.toHaveBeenCalled();
    expect(hooks.onSeedEnd).not.toHaveBeenCalled();
    // resolveServices van chay - dam bao registry doc xong truoc khi render
    expect(mockResolveServices).toHaveBeenCalledWith({});
  });

  it('USE_MOCKS=undefined -> KHONG seed (mac dinh an toan)', async () => {
    mockAppConfigValue.USE_MOCKS = undefined;

    const ok = await initAppShell();

    expect(ok).toBe(true);
    expect(mockSeedAll).not.toHaveBeenCalled();
    expect(mockResolveServices).toHaveBeenCalled();
  });

  it('USE_MOCKS="true" (string) -> KHONG seed (chi boolean true moi match)', async () => {
    mockAppConfigValue.USE_MOCKS = 'true';

    const ok = await initAppShell();

    expect(ok).toBe(true);
    // === 'true' la truthy nhung khong phai === true.
    // contract: chi chay seed khi appConfig.USE_MOCKS === true (boolean chat).
    expect(mockSeedAll).not.toHaveBeenCalled();
  });
});

// ═══════════════ xu ly loi ═══════════════

describe('xu ly loi', () => {
  it('seedAll throw -> tra ve false, nhung khong throw ra caller', async () => {
    mockAppConfigValue.USE_MOCKS = true;
    mockSeedAll.mockRejectedValue(new Error('SQLite blow up'));

    const ok = await initAppShell();

    expect(ok).toBe(false);
    // resolveServices KHONG chay vi seed throw truoc do
    expect(mockResolveServices).not.toHaveBeenCalled();
  });

  it('resolveServices throw -> tra ve false', async () => {
    mockAppConfigValue.USE_MOCKS = true;
    mockResolveServices.mockImplementation(() => {
      throw new Error('registry broken');
    });

    const ok = await initAppShell();

    expect(ok).toBe(false);
  });

  it('seedAll rejected sau khi goi -> khong crash UI lan dau', async () => {
    mockAppConfigValue.USE_MOCKS = true;
    let rejectOnce;
    mockSeedAll.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectOnce = () => reject(new Error('first seed fails'));
        })
    );

    const promise = initAppShell();

    // Reject sau khi promise bat dau
    setImmediate(rejectOnce);

    const ok = await promise;
    expect(ok).toBe(false);
  });
});

// ═══════════════ resolveServices luon chay (khong phu thuoc USE_MOCKS) ═══════════════

describe('resolveServices luon chay trong ca 2 nhanh', () => {
  it('ca USE_MOCKS=true va =false deu goi resolveServices', async () => {
    mockAppConfigValue.USE_MOCKS = true;
    mockSeedAll.mockResolvedValue(undefined);
    await initAppShell();
    const countWithSeed = mockResolveServices.mock.calls.length;

    mockAppConfigValue.USE_MOCKS = false;
    mockResolveServices.mockClear();
    await initAppShell();

    expect(mockResolveServices).toHaveBeenCalledTimes(countWithSeed);
  });

  it('resolveServices luon nhan {} lam tham so', async () => {
    mockAppConfigValue.USE_MOCKS = false;
    await initAppShell();

    expect(mockResolveServices).toHaveBeenCalledWith({});
  });
});
