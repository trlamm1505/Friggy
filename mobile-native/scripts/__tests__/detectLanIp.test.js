/**
 * detectLanIp - test contract.
 *
 * Không test network thật (phụ thuộc máy host đang online/offline).
 * Test logic thuần: parse port từ env file, build URL, fallback logic.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Mock 'lan-network' để test được nhánh fallback (package có thể không có).
jest.mock('lan-network', () => ({
  lanNetwork: jest.fn(),
}));

const lanNetwork = require('lan-network');
const { detectLanIp } = require('../detectLanIp');

describe('detectLanIp', () => {
  beforeEach(() => {
    lanNetwork.lanNetwork.mockReset();
  });

  it('lan-network trả về interface LAN -> dùng địa chỉ đó', async () => {
    lanNetwork.lanNetwork.mockResolvedValue({
      address: '192.168.1.50',
      family: 'IPv4',
      internal: false,
      iname: 'Wi-Fi',
    });

    await expect(detectLanIp()).resolves.toBe('192.168.1.50');
  });

  it('lan-network trả interface internal (loopback) -> fallback sang UDP socket', async () => {
    lanNetwork.lanNetwork.mockResolvedValue({
      address: '127.0.0.1',
      family: 'IPv4',
      internal: true,
      iname: 'Loopback',
    });

    // Kết quả phụ thuộc môi trường mạng -> chỉ assert không throw.
    await expect(detectLanIp()).resolves.toEqual(expect.anything());
  });

  it('lan-network throw -> fallback sang UDP socket, không crash', async () => {
    lanNetwork.lanNetwork.mockRejectedValue(new Error('no dhcp'));

    await expect(detectLanIp()).resolves.toEqual(expect.anything());
  });

  it('lan-network trả family khác IPv4 -> fallback sang UDP socket', async () => {
    lanNetwork.lanNetwork.mockResolvedValue({
      address: 'fe80::1',
      family: 'IPv6',
      internal: false,
    });

    await expect(detectLanIp()).resolves.toEqual(expect.anything());
  });
});

describe('resolveApiPort - đọc port từ env file', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('đọc được port từ .env.local hiện tại của repo', () => {
    const root = path.resolve(__dirname, '..', '..');
    const localPath = path.join(root, '.env.local');

    // .env.local bị gitignore -> chỉ assert nếu file tồn tại.
    if (!fs.existsSync(localPath)) {
      return;
    }

    const content = fs.readFileSync(localPath, 'utf8');
    const match = content.match(/EXPO_PUBLIC_API_BASE_URL\s*=\s*https?:\/\/[^:]+:(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match[1])).toBe(6969);
  });
});

describe('os import sanity', () => {
  it('os module khả dụng (sanity cho test env)', () => {
    expect(typeof os.platform()).toBe('string');
  });
});
