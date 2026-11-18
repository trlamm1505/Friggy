/**
 * PushNotificationManager — test contract với BE.
 *
 * ⚠️ MỤC ĐÍCH:
 *   Đảm bảo app đăng ký / gỡ FCM token ĐÚNG contract của BE:
 *     - `POST /notifications/fcm-token`  -> body `{ token, platform, deviceName? }`
 *     - `DELETE /notifications/fcm-token` -> body `{ token }` (BẮT BUỘC)
 *   Và map deep-link `data.screen` (do BE cron job gửi) sang route hợp lệ.
 *
 * R7: comment tiếng Việt.
 */

const mockPost = jest.fn().mockResolvedValue({ message: 'ok' });
const mockDelete = jest.fn().mockResolvedValue({ message: 'ok' });
const mockGetDevicePushTokenAsync = jest.fn();
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockSetNotificationHandler = jest.fn();
const mockSetNotificationChannelAsync = jest.fn().mockResolvedValue(undefined);
const mockAddPushTokenListener = jest.fn(() => ({ remove: jest.fn() }));
const mockAddNotificationResponseReceivedListener = jest.fn(() => ({ remove: jest.fn() }));
const mockAddNotificationReceivedListener = jest.fn(() => ({ remove: jest.fn() }));
const mockGetLastNotificationResponseAsync = jest.fn().mockResolvedValue(null);

jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 30 },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: (...a) => mockSetNotificationHandler(...a),
  setNotificationChannelAsync: (...a) => mockSetNotificationChannelAsync(...a),
  getDevicePushTokenAsync: (...a) => mockGetDevicePushTokenAsync(...a),
  getPermissionsAsync: (...a) => mockGetPermissionsAsync(...a),
  requestPermissionsAsync: (...a) => mockRequestPermissionsAsync(...a),
  addPushTokenListener: (...a) => mockAddPushTokenListener(...a),
  addNotificationResponseReceivedListener: (...a) =>
    mockAddNotificationResponseReceivedListener(...a),
  addNotificationReceivedListener: (...a) => mockAddNotificationReceivedListener(...a),
  getLastNotificationResponseAsync: (...a) => mockGetLastNotificationResponseAsync(...a),
  AndroidImportance: { HIGH: 4 },
}));

/**
 * `isDevice` đổi được trong test (Expo Go -> false).
 *
 * ⚠️ `__esModule: true` là BẮT BUỘC:
 *   Babel `_interopRequireWildcard` với module KHÔNG có `__esModule` sẽ COPY
 *   property sang object MỚI -> `import * as Device` trong file cấu hình sẽ
 *   thấy object copy (isDevice luôn = true) -> test không đổi được.
 *   Có `__esModule: true` -> Babel trả về CHÍNH object này -> mutate được.
 */
const mockDevice = { __esModule: true, isDevice: true };

jest.mock('expo-device', () => mockDevice);

/**
 * `expo-constants` — dùng để phát hiện Expo Go.
 *
 * ⚠️ `executionEnvironment`:
 *   - 'client'      -> đang chạy trong EXPO GO (không có remote push)
 *   - 'standalone'  -> bản build standalone
 *   - 'storeClient' -> bản build từ store
 *   - 'bare'        -> bản build native
 */
const mockConstants = {
  __esModule: true,
  default: { executionEnvironment: 'standalone' },
};

jest.mock('expo-constants', () => mockConstants);

jest.mock('../../../api/ApiClient', () => ({
  ApiClient: {
    post: (...a) => mockPost(...a),
    delete: (...a) => mockDelete(...a),
  },
}));

jest.mock('../../../api/ServiceRegistry', () => ({
  registerService: jest.fn(),
}));

describe('PushNotificationManager', () => {
  let PushNotificationManager;
  let resolveTargetRoute;
  let SCREEN_ROUTE_MAP;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDevice.isDevice = true;
    // Mặc định: app build thật (KHÔNG phải Expo Go).
    mockConstants.default.executionEnvironment = 'standalone';
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted', canAskAgain: true });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetDevicePushTokenAsync.mockResolvedValue({ data: 'fcm-token-abc' });

    const mod = require('../PushNotificationManager');
    PushNotificationManager = mod.PushNotificationManager;
    resolveTargetRoute = mod.resolveTargetRoute;
    SCREEN_ROUTE_MAP = mod.SCREEN_ROUTE_MAP;
  });

  // ────────────────────────────────────────────────────────────
  // Đăng ký FCM token
  // ────────────────────────────────────────────────────────────
  describe('registerDevice', () => {
    it('đăng ký token với BE đúng contract (token + platform + deviceName)', async () => {
      const manager = new PushNotificationManager();

      const res = await manager.registerDevice({ deviceName: 'android - 30' });

      expect(res.registered).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/notifications/fcm-token', {
        token: 'fcm-token-abc',
        platform: 'android',
        deviceName: 'android - 30',
      });
    });

    it('KHÔNG đăng ký khi user chưa cấp quyền thông báo', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'denied', canAskAgain: false });
      // User từ chối cả lúc app xin quyền lần đầu.
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const manager = new PushNotificationManager();
      const res = await manager.registerDevice();

      expect(res.registered).toBe(false);
      expect(res.reason).toBe('permission_denied');
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('KHÔNG đăng ký trên Expo Go / simulator (không có FCM token thật)', async () => {
      mockDevice.isDevice = false;

      const manager = new PushNotificationManager();
      const res = await manager.registerDevice();

      expect(res.registered).toBe(false);
      expect(res.reason).toBe('not_a_device');
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('KHÔNG đăng ký lại khi token đã đăng ký (tránh spam server)', async () => {
      const manager = new PushNotificationManager();

      await manager.registerDevice();
      mockPost.mockClear();

      const res = await manager.registerDevice();

      expect(res.reason).toBe('already_registered');
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────
  // Gỡ FCM token
  // ────────────────────────────────────────────────────────────
  describe('unregisterDevice', () => {
    it('gỡ token với BE kèm body { token } (BE bắt buộc có body)', async () => {
      const manager = new PushNotificationManager();
      await manager.registerDevice();

      const ok = await manager.unregisterDevice();

      expect(ok).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith('/notifications/fcm-token', {
        token: 'fcm-token-abc',
      });
    });

    it('KHÔNG gọi API khi chưa đăng ký token nào (tránh 400 do body rỗng)', async () => {
      const manager = new PushNotificationManager();

      const ok = await manager.unregisterDevice();

      expect(ok).toBe(true);
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────
  // Deep-link (data.screen của BE cron job)
  // ────────────────────────────────────────────────────────────
  describe('resolveTargetRoute', () => {
    it('map đúng 3 màn BE cron job trỏ tới', () => {
      // Nguồn: be/src/modules-api/notifications/notification-cron.service.ts
      expect(resolveTargetRoute({ screen: 'fridge' })).toBe(SCREEN_ROUTE_MAP.fridge);
      expect(resolveTargetRoute({ screen: 'meal_planning' })).toBe(SCREEN_ROUTE_MAP.meal_planning);
      expect(resolveTargetRoute({ screen: 'subscription' })).toBe(SCREEN_ROUTE_MAP.subscription);
    });

    it('trả null khi screen không có trong map (an toàn hơn navigate route ma)', () => {
      expect(resolveTargetRoute({ screen: 'khong_ton_tai' })).toBeNull();
      expect(resolveTargetRoute({})).toBeNull();
      expect(resolveTargetRoute(null)).toBeNull();
      expect(resolveTargetRoute('string')).toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────────
  // Expo Go (SDK 53+ đã gỡ bỏ remote push)
  // ────────────────────────────────────────────────────────────
  describe('Expo Go', () => {
    beforeEach(() => {
      mockConstants.default.executionEnvironment = 'client';
    });

    it('registerDevice trả reason "expo_go" và KHÔNG gọi API', async () => {
      const manager = new PushNotificationManager();
      const res = await manager.registerDevice();

      expect(res.registered).toBe(false);
      expect(res.reason).toBe('expo_go');
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('KHÔNG gọi getDevicePushTokenAsync (hàm này luôn throw trong Expo Go)', async () => {
      const manager = new PushNotificationManager();
      await manager.registerDevice();

      expect(mockGetDevicePushTokenAsync).not.toHaveBeenCalled();
    });

    it('KHÔNG xin quyền thông báo trong Expo Go (Expo Go tự quản lý)', async () => {
      const manager = new PushNotificationManager();
      await manager.requestPermission();

      expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('configure KHÔNG tạo Android channel (tránh NullPointerException)', async () => {
      const manager = new PushNotificationManager();
      await manager.configure();

      expect(mockSetNotificationChannelAsync).not.toHaveBeenCalled();
    });

    it('configure chỉ thử 1 lần (không spam warning mỗi lần gọi)', async () => {
      const manager = new PushNotificationManager();
      await manager.configure();
      await manager.configure();
      await manager.configure();

      expect(mockSetNotificationHandler).not.toHaveBeenCalled();
      expect(mockSetNotificationChannelAsync).not.toHaveBeenCalled();
    });

    it('subscribe KHÔNG đăng ký listener push (tránh throw SDK 53)', () => {
      const manager = new PushNotificationManager();
      const unsubscribe = manager.subscribe({});

      expect(typeof unsubscribe).toBe('function');
      expect(mockAddPushTokenListener).not.toHaveBeenCalled();
      expect(mockAddNotificationResponseReceivedListener).not.toHaveBeenCalled();
    });

    it('getInitialTapData trả null (không có remote push)', async () => {
      const manager = new PushNotificationManager();
      const data = await manager.getInitialTapData();

      expect(data).toBeNull();
      expect(mockGetLastNotificationResponseAsync).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────
  // Listener
  // ────────────────────────────────────────────────────────────
  describe('subscribe', () => {
    it('gọi onNavigate với route hợp lệ khi user bấm push', () => {
      const manager = new PushNotificationManager();
      const onNavigate = jest.fn();
      const onPress = jest.fn();

      manager.subscribe({ onNavigate, onPress });

      // Mô phỏng callback mà expo-notifications gọi khi user bấm push.
      const listener = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
      listener({
        notification: { request: { content: { data: { screen: 'fridge' } } } },
      });

      expect(onPress).toHaveBeenCalledWith({ screen: 'fridge' });
      expect(onNavigate).toHaveBeenCalledWith(SCREEN_ROUTE_MAP.fridge, { screen: 'fridge' });
    });

    it('KHÔNG gọi onNavigate khi screen không map được', () => {
      const manager = new PushNotificationManager();
      const onNavigate = jest.fn();

      manager.subscribe({ onNavigate });

      const listener = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
      listener({
        notification: { request: { content: { data: { screen: 'xxx' } } } },
      });

      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('đăng ký lại token với BE khi FCM token bị roll', async () => {
      const manager = new PushNotificationManager();
      manager.subscribe({});

      const listener = mockAddPushTokenListener.mock.calls[0][0];
      await listener({ data: 'new-token-xyz' });

      expect(mockPost).toHaveBeenCalledWith('/notifications/fcm-token', {
        token: 'new-token-xyz',
        platform: 'android',
      });
    });
  });

  // ────────────────────────────────────────────────────────────
  // Cold start (app mở bằng cách bấm push)
  // ────────────────────────────────────────────────────────────
  describe('cold start', () => {
    it('đọc getLastNotificationResponseAsync và điều hướng khi app mở bằng push', async () => {
      mockGetLastNotificationResponseAsync.mockResolvedValue({
        notification: { request: { content: { data: { screen: 'subscription' } } } },
      });

      const manager = new PushNotificationManager();
      const onNavigate = jest.fn();

      await manager._consumeInitialTap({ onNavigate });

      expect(onNavigate).toHaveBeenCalledWith(SCREEN_ROUTE_MAP.subscription, {
        screen: 'subscription',
      });
    });

    it('KHÔNG điều hướng gì khi app được mở bình thường (không có push)', async () => {
      mockGetLastNotificationResponseAsync.mockResolvedValue(null);

      const manager = new PushNotificationManager();
      const onNavigate = jest.fn();

      await manager._consumeInitialTap({ onNavigate });

      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────
  // Android channel
  // ────────────────────────────────────────────────────────────
  describe('configure', () => {
    it('tạo Android channel + set foreground handler', async () => {
      const manager = new PushNotificationManager();
      await manager.configure();

      expect(mockSetNotificationHandler).toHaveBeenCalled();
      expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({ importance: 4 })
      );
    });
  });
});
