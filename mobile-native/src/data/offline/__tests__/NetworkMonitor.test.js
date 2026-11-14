/**
 * NetworkMonitor - phát hiện online/offline + event emitter.
 *
 * Port từ Flutter `Mobile/lib/sqlite/helpers/sync_helper.dart`.
 */

import { networkMonitor, onNetworkEvent } from '../NetworkMonitor';

/**
 * Mock `expo-network` được định nghĩa trong `jest.setup.js` (mặc định ONLINE).
 *
 * ⚠️ VÌ SAO KHÔNG DÙNG `import * as ExpoNetwork`:
 *   Mock của Jest chỉ có thêm 2 hàm test-only (`__setNetworkStateForTest`,
 *   `__resetNetworkStateForTest`) -> `import/namespace` của ESLint báo lỗi
 *   "không tồn tại trong namespace". `jest.requireMock` lấy đúng object mock
 *   đã mock mà không bị rule đó soi.
 */
const ExpoNetwork = jest.requireMock('expo-network');

describe('NetworkMonitor - trạng thái online', () => {
  beforeEach(async () => {
    ExpoNetwork.__resetNetworkStateForTest();
    networkMonitor.dispose();
    networkMonitor.__setOnlineForTest(true);
  });

  it('mặc định coi là online (không chặn app khi lỗi)', () => {
    expect(networkMonitor.isOnline).toBe(true);
  });

  it('init() đọc trạng thái từ expo-network', async () => {
    ExpoNetwork.__setNetworkStateForTest({ type: 'NONE', isConnected: false });
    const online = await networkMonitor.init();
    expect(online).toBe(false);
    expect(networkMonitor.isOnline).toBe(false);
  });

  it('coi là OFFLINE khi isConnected=false', async () => {
    ExpoNetwork.__setNetworkStateForTest({ type: 'NONE', isConnected: false });
    await networkMonitor.init();
    expect(networkMonitor.isOnline).toBe(false);
  });

  it('coi là OFFLINE khi isInternetReachable=false', async () => {
    ExpoNetwork.__setNetworkStateForTest({ isConnected: true, isInternetReachable: false });
    await networkMonitor.init();
    expect(networkMonitor.isOnline).toBe(false);
  });

  it('isInternetReachable=null (chưa xác định) -> coi là ONLINE', async () => {
    ExpoNetwork.__setNetworkStateForTest({ isConnected: true, isInternetReachable: null });
    await networkMonitor.init();
    expect(networkMonitor.isOnline).toBe(true);
  });

  it('checkConnection() cập nhật trạng thái theo mạng hiện tại', async () => {
    await networkMonitor.init();
    ExpoNetwork.__setNetworkStateForTest({ isConnected: false });
    const online = await networkMonitor.checkConnection();
    expect(online).toBe(false);
    expect(networkMonitor.isOnline).toBe(false);
  });
});

describe('NetworkMonitor - event emitter', () => {
  beforeEach(async () => {
    ExpoNetwork.__resetNetworkStateForTest();
    networkMonitor.dispose();
    networkMonitor.__setOnlineForTest(true);
    await networkMonitor.init();
  });

  it('phát event "offline" khi mất mạng', async () => {
    const handler = jest.fn();
    const unsubscribe = onNetworkEvent('offline', handler);

    ExpoNetwork.__setNetworkStateForTest({ isConnected: false });
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('phát event "online" khi có mạng trở lại', async () => {
    // Bắt đầu từ trạng thái offline.
    networkMonitor.__setOnlineForTest(false);

    const handler = jest.fn();
    const unsubscribe = onNetworkEvent('online', handler);

    ExpoNetwork.__setNetworkStateForTest({ isConnected: true, isInternetReachable: true });
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toEqual({ isOnline: true });
    unsubscribe();
  });

  it('KHÔNG phát event khi trạng thái không đổi', async () => {
    const handler = jest.fn();
    const unsubscribe = onNetworkEvent('change', handler);

    ExpoNetwork.__setNetworkStateForTest({ isConnected: true });
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('unsubscribe ngăn handler không còn được gọi', async () => {
    const handler = jest.fn();
    const unsubscribe = onNetworkEvent('offline', handler);
    unsubscribe();

    ExpoNetwork.__setNetworkStateForTest({ isConnected: false });
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).not.toHaveBeenCalled();
  });

  it('listener lỗi không làm hỏng listener khác', async () => {
    const bad = jest.fn(() => {
      throw new Error('boom');
    });
    const good = jest.fn();
    const un1 = onNetworkEvent('offline', bad);
    const un2 = onNetworkEvent('offline', good);

    ExpoNetwork.__setNetworkStateForTest({ isConnected: false });
    await new Promise((r) => setTimeout(r, 0));

    expect(good).toHaveBeenCalled();
    un1();
    un2();
  });
});
