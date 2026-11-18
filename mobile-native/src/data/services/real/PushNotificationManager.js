/**
 * PushNotificationManager — quản lý push notification (FCM) end-to-end.
 *
 * ⚠️ VÌ SAO CẦN FILE NÀY:
 *   BE đã có đủ endpoint push (`POST/DELETE /notifications/fcm-token`) và
 *   `FcmService` gửi push qua Firebase Admin SDK. Nhưng RN KHÔNG có code
 *   nào đăng ký FCM token về BE -> BE không biết token của user nào ->
 *   `fcmService.sendToUser(userId, ...)` luôn tìm thấy 0 device -> KHÔNG BAO
 *   GIỜ có push nào tới máy.
 *
 *   Đây là mắt xích bị thiếu. File này làm đúng 4 việc:
 *     1. Xin quyền người dùng (POST_NOTIFICATIONS).
 *     2. Lấy FCM device token (`getDevicePushTokenAsync` -> token thật FCM,
 *        KHÔNG phải Expo token, vì BE dùng Firebase Admin SDK).
 *     3. Đăng ký / gỡ token về BE (`registerFcmToken` / `removeFcmToken`).
 *     4. Nhận push khi app đang mở + điều hướng khi user bấm vào push.
 *
 * ⚠️ VÌ SAO KHÔNG BỊA TOKEN:
 *   `getDevicePushTokenAsync()` là nguồn DUY NHẤT của token thật. Nếu tự
 *   chế ra token giả -> BE lưu rác -> khi user đăng nhập trên máy khác,
 *   user có thể nhận push của máy cũ (rò rỉ dữ liệu giữa 2 tài khoản).
 *   Vì vậy mọi lỗi ở đây đều dẫn tới "KHÔNG đăng ký", tuyệt đối không bịa.
 *
 * ⚠️ BE `RegisterFcmTokenDto`:
 *   `token` (@IsString @IsNotEmpty) + `platform` (@IsIn ['android','ios','web'])
 *   + `deviceName` (@IsOptional). Thiếu `platform` -> 400.
 *
 * ⚠️ BE `RemoveFcmTokenDto`:
 *   BẮT BUỘC có body `{ token }` -> thiếu body -> 400 (ValidationPipe).
 *
 * R7: comment tiếng Việt.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { ApiClient } from '../../api/ApiClient';
import { registerService } from '../../api/ServiceRegistry';
import { SCREEN_ROUTE_MAP, resolveTargetRoute } from '../../../shared/constants/pushRoutes';

/**
 * App có đang chạy trong Expo Go không?
 *
 * ⚠️ VÌ SAO CẦN (Expo SDK 53+):
 *   Expo Go đã GỠ BỎ hoàn toàn remote push notification. Mọi lệnh gọi
 *   `getDevicePushTokenAsync()` / `setNotificationChannelAsync()` /
 *   `addPushTokenListener()` trong Expo Go đều THẤT BẠI với lỗi kiểu:
 *     "Android Push notifications (remote notifications) functionality
 *      provided by expo-notifications was removed from Expo Go with the
 *      release of SDK 53. Use a development build instead of Expo Go."
 *
 *   Nếu không phát hiện Expo Go, mỗi lần app mở sẽ:
 *     - xin quyền thông báo (vô ích),
 *     - thử lấy token (thất bại),
 *     - in ra hàng loạt warning đỏ -> gây nhiễu log và làm user tưởng app lỗi.
 *
 *   => Phát hiện Expo Go -> BỎ QUA toàn bộ luồng push, chỉ log 1 dòng giải thích.
 *
 * ⚠️ CÁCH PHÁT HIỆN:
 *   `Constants.executionEnvironment`:
 *     - 'storeClient'  -> app build từ EAS Store (KHÔNG phải Expo Go)
 *     - 'bare'         -> app build native
 *     - 'standalone'   -> app build standalone (không Expo Go)
 *     - 'client'       -> ĐANG CHẠY TRONG EXPO GO  <-- trường hợp của ta
 *
 * ⚠️ `expo-constants` là dependency NGẦM của `expo` (không khai báo trong
 *   `package.json`) -> import trực tiếp có thể vỡ nếu Expo đổi. Vì vậy ta
 *   import trong `try/catch` và có fallback: nếu không import được -> coi như
 *   KHÔNG phải Expo Go (giữ hành vi cũ, an toàn).
 */
const isExpoGo = () => {
  try {
    return Constants?.executionEnvironment === 'client';
  } catch (_e) {
    // Không import được expo-constants -> không chắc -> giả định là app thật.
    return false;
  }
};

/**
 * Lý do push KHÔNG dùng được (để hiển thị cho dev + bỏ qua im lặng).
 *
 * ⚠️ Trả `null` nếu push dùng được.
 *
 * @returns {string|null} mã lý do
 */
export const getPushUnavailableReason = () => {
  if (isExpoGo()) return 'expo_go';
  if (Device.isDevice !== true) return 'not_a_device';
  return null;
};

/**
 * Platform gửi lên BE.
 *
 * ⚠️ BE chỉ chấp nhận `android | ios | web`. RN chạy trên Expo Go (web)
 *   cũng được map thành 'web' cho đúng contract.
 */
const resolvePlatform = () => {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  return 'web';
};

/**
 * Map `data.screen` của BE (payload FCM) -> route trong app.
 *
 * ⚠️ NGUỒN: `be/src/modules-api/notifications/notification-cron.service.ts`
 *   - `expiry_warning`      -> `screen: 'fridge'`
 *   - `weekly_remind`       -> `screen: 'meal_planning'`
 *   - `subscription_reminder`-> `screen: 'subscription'`
 *
 *   Route nào KHÔNG tồn tại trong `Routes` -> trả `null` (không điều hướng,
 *   an toàn hơn là `navigate()` tới route ma -> app crash).
 *
 * ⚠️ Map nằm ở `shared/constants/pushRoutes.js` (dùng chung với
 *   `NotificationsScreen`) để màn danh sách không bị kéo theo native module.
 */
export { SCREEN_ROUTE_MAP, resolveTargetRoute };

/**
 * Handler cho push khi app ĐANG MỞ (foreground).
 *
 * ⚠️ `shouldShowBanner` phải true -> nếu false, push tới khi app mở sẽ bị
 *   bỏ qua hoàn toàn (user không thấy gì). `shouldSetBadge` true -> badge
 *   hệ thống (icon app) cập nhật theo số chưa đọc.
 */
const foregroundHandler = {
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
};

export class PushNotificationManager {
  constructor() {
    this.client = ApiClient;

    /**
     * Token FCM đã đăng ký với BE (giữ trong RAM + MMKV).
     *
     * ⚠️ Cần nhớ token để:
     *   1. Gỡ khi logout (`removeFcmToken` BẮT BUỘC có body `{ token }`).
     *   2. Không đăng ký lại vô ích mỗi lần app mở.
     */
    this._token = null;

    /** Listener đã đăng ký -> gỡ khi logout / unmount. */
    this._subscriptions = [];

    /** Đã gọi `configure()` chưa (tránh set handler nhiều lần). */
    this._configured = false;

    /**
     * Payload của lần BẤM push gần nhất, đã lưu nhưng CHƯA xử lý được.
     *
     * ⚠️ VÌ SAO CẦN (cold start):
     *   Khi app KHÔNG chạy và user bấm push -> hệ điều hành mở app và
     *   `getLastNotificationResponseAsync()` trả về response đó. Nhưng lúc
     *   đó navigation CHƯA sẵn sàng -> không thể `navigate()` ngay.
     *   Ta lưu lại payload, và khi listener được đăng ký (navigation đã
     *   sẵn sàng) -> xử lý nốt. Nếu không làm vậy, bấm push khi app đã tắt
     *   -> app mở nhưng KHÔNG điều hướng tới màn tương ứng -> user bối rối.
     */
    this._pendingTapData = null;
  }

  /**
   * Đọc response của lần bấm push gần nhất (cold start).
   *
   * ⚠️ Chỉ có ý nghĩa khi app được mở BẰNG cách bấm push. Nếu user mở app
   *   bình thường -> `getLastNotificationResponseAsync()` trả `null`.
   *
   * @returns {Promise<object|null>} `data` của notification
   */
  async getInitialTapData() {
    // Expo Go: không có remote push -> không có cold-start tap nào.
    if (isExpoGo()) return null;

    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      const data = response?.notification?.request?.content?.data ?? null;
      return data && Object.keys(data).length > 0 ? data : null;
    } catch (_e) {
      return null;
    }
  }

  /**
   * Cấu hình handler foreground + tạo Android channel.
   *
   * ⚠️ Android 8+ BẮT BUỘC có channel, nếu không push sẽ không hiện dù token
   *   đúng. `sound: 'default'` -> chuông mặc định.
   *
   * ⚠️ VỀ CỜ `_configured` (bug đã gặp):
   *   Trước đây cờ chỉ được set SAU `setNotificationChannelAsync`. Khi hàm
   *   này throw (Expo Go -> `NotificationsChannelsProvider` là null), cờ KHÔNG
   *   được set -> mỗi lần `configure()` lại thử lại và in lại warning ->
   *   log bị spam mỗi lần app mở / mỗi lần vào màn hình.
   *   => Set cờ TRONG `finally` -> `configure()` chỉ thử đúng 1 lần.
   *
   * @returns {Promise<void>}
   */
  async configure() {
    if (this._configured) return;

    try {
      // Expo Go: KHÔNG có remote push (SDK 53+ gỡ bỏ) -> bỏ qua toàn bộ,
      // tránh warning đỏ lặp lại và tránh xin quyền vô ích.
      if (isExpoGo()) {
        this._configured = true;
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log(
            '[PushManager] Đang chạy trong Expo Go -> remote push không khả dụng ' +
              '(Expo SDK 53+ đã gỡ bỏ). Dùng development build để nhận push.'
          );
        }
        return;
      }

      Notifications.setNotificationHandler(foregroundHandler);

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Thông báo Friggy',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2E7D32',
          sound: 'default',
        });
      }
    } catch (e) {
      // Handler lỗi -> app vẫn chạy, chỉ mất hiển thị foreground push.
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[PushManager] configure lỗi:', e?.message);
      }
    } finally {
      // Luôn set cờ -> không thử lại (tránh spam warning).
      this._configured = true;
    }
  }

  /**
   * Xin quyền hiển thị push.
   *
   * ⚠️ `Device.isDevice === false` (Expo Go / simulator) -> KHÔNG có push thật.
   *   Vẫn trả về kết quả để UI hiển thị cho user biết, nhưng phần đăng ký
   *   token sẽ bỏ qua (xem `registerDevice`).
   *
   * ⚠️ Expo Go: KHÔNG xin quyền. Expo Go tự quản lý quyền của nó và việc
   *   xin quyền ở đây chỉ gây nhiễu (user thấy dialog không liên quan).
   *
   * @returns {Promise<{granted: boolean, status: string, canAskAgain: boolean, isDevice: boolean}>}
   */
  async requestPermission() {
    const isDevice = Device.isDevice === true;

    if (isExpoGo()) {
      return { granted: false, status: 'expo_go', canAskAgain: false, isDevice };
    }

    try {
      const current = await Notifications.getPermissionsAsync();
      let status = current.status;

      if (status !== 'granted') {
        const asked = await Notifications.requestPermissionsAsync();
        status = asked.status;
      }

      return {
        granted: status === 'granted',
        status,
        canAskAgain: current.canAskAgain !== false,
        isDevice,
      };
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[PushManager] requestPermission lỗi:', e?.message);
      }
      return { granted: false, status: 'unknown', canAskAgain: true, isDevice };
    }
  }

  /**
   * Lấy FCM device token (token thật của Firebase, KHÔNG phải Expo token).
   *
   * ⚠️ BE dùng `firebase-admin` -> cần FCM registration token (dạng
   *   `xxx:APA91b...`), KHÔNG dùng `getExpoPushTokenAsync()` (token Expo
   *   `ExponentPushToken[...]`) vì BE không gửi qua Expo push service.
   *
   * ⚠️ Expo Go: KHÔNG gọi `getDevicePushTokenAsync()` -> hàm này LUÔN throw
   *   với thông báo dài dòng về SDK 53. Bỏ qua -> trả `null` luôn.
   *
   * @returns {Promise<string|null>} token hoặc null nếu không lấy được
   */
  async getDeviceToken() {
    if (isExpoGo()) return null;

    try {
      const token = await Notifications.getDevicePushTokenAsync();
      const data = token?.data;

      // Web trả object `{ endpoint, keys }` -> không dùng được với FCM.
      if (typeof data !== 'string' || data.length === 0) return null;

      return data;
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[PushManager] getDeviceToken lỗi:', e?.message);
      }
      return null;
    }
  }

  /**
   * Đăng ký thiết bị với BE để nhận push.
   *
   * @param {object} [options]
   * @param {string} [options.deviceName] - tên thiết bị hiển thị cho admin
   * @param {boolean} [options.requestPermission] - có xin quyền không (default true)
   * @returns {Promise<{registered: boolean, token: string|null, reason?: string}>}
   */
  async registerDevice(options = {}) {
    const { deviceName, requestPermission = true } = options;

    // ── Expo Go: KHÔNG có remote push (SDK 53+ gỡ bỏ) ──────────────
    // Dừng NGAY trước khi gọi bất kỳ API push nào (xin quyền, lấy token)
    // -> không sinh warning đỏ, không tốn quyền hệ thống vô ích.
    if (isExpoGo()) {
      return { registered: false, token: null, reason: 'expo_go' };
    }

    await this.configure();

    if (requestPermission) {
      const perm = await this.requestPermission();
      if (!perm.granted) {
        return { registered: false, token: null, reason: 'permission_denied' };
      }
      // Không phải máy thật (simulator) -> không có FCM token -> dừng.
      if (!perm.isDevice) {
        return { registered: false, token: null, reason: 'not_a_device' };
      }
    }

    const token = await this.getDeviceToken();
    if (!token) {
      return { registered: false, token: null, reason: 'no_token' };
    }

    // Đã đăng ký token này rồi -> khỏi gọi API lại (tránh spam server).
    if (this._token === token) {
      return { registered: true, token, reason: 'already_registered' };
    }

    try {
      await this.client.post('/notifications/fcm-token', {
        token,
        platform: resolvePlatform(),
        deviceName: deviceName ?? undefined,
      });

      this._token = token;
      return { registered: true, token };
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[PushManager] đăng ký FCM token lỗi:', e?.message);
      }
      return { registered: false, token, reason: 'api_error' };
    }
  }

  /**
   * Gỡ token khỏi BE (gọi khi logout).
   *
   * ⚠️ BE `DELETE /notifications/fcm-token` BẮT BUỘC body `{ token }`.
   *   Thiếu body -> HTTP 400. Vì vậy nếu không có token nào trong RAM thì
   *   coi như đã gỡ xong -> KHÔNG gọi API (tránh 400 vô ích).
   *
   * @returns {Promise<boolean>} true nếu đã gỡ (hoặc không cần gỡ)
   */
  async unregisterDevice() {
    const token = this._token;
    this._token = null;

    if (!token) return true;

    try {
      await this.client.delete('/notifications/fcm-token', { token });
      return true;
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[PushManager] gỡ FCM token lỗi:', e?.message);
      }
      return false;
    }
  }

  /**
   * Đăng ký listener:
   *   - `addPushTokenListener`: token FCM có thể bị roll -> đăng ký lại BE.
   *   - `addNotificationResponseReceivedListener`: user bấm vào push.
   *
   * @param {object} handlers
   * @param {(data:object)=>void} [handlers.onPress] - user bấm push
   * @param {(route:string|null, data:object)=>void} [handlers.onNavigate] - điều hướng
   * @returns {() => void} hàm gỡ listener
   */
  subscribe({ onPress, onNavigate } = {}) {
    this._unsubscribeAll();

    // ── Expo Go: không có remote push ──────────────────────────────
    // `addPushTokenListener` sẽ throw với thông báo dài dòng về SDK 53.
    // Bỏ qua -> không warning, app vẫn chạy bình thường.
    if (isExpoGo()) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[PushManager] Expo Go -> bỏ qua listener push (cần development build).');
      }
      return () => {};
    }

    try {
      // Token bị roll (hiếm) -> đăng ký lại BE ngay.
      const tokenSub = Notifications.addPushTokenListener(async (next) => {
        const data = next?.data;
        if (typeof data !== 'string' || !data) return;

        try {
          await this.client.post('/notifications/fcm-token', {
            token: data,
            platform: resolvePlatform(),
          });
          this._token = data;
        } catch (_e) {
          // Token roll mà đăng ký lại lỗi -> lần sau app mở sẽ thử lại.
        }
      });

      // User bấm vào push -> điều hướng theo `data.screen` của BE.
      const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response?.notification?.request?.content?.data ?? {};
        const route = resolveTargetRoute(data);

        if (typeof onPress === 'function') {
          try {
            onPress(data);
          } catch (_e) {
            // ignore - listener của user không được làm hỏng app
          }
        }

        if (route && typeof onNavigate === 'function') {
          try {
            onNavigate(route, data);
          } catch (_e) {
            // ignore
          }
        }
      });

      this._subscriptions = [tokenSub, responseSub].filter(Boolean);

      // ── Xử lý nốt lần bấm push COLD START ──────────────────────
      // App được mở bằng cách bấm push khi app đã tắng -> response đó nằm
      // trong `getLastNotificationResponseAsync()`, KHÔNG nằm trong listener
      // (listener chỉ bắt push TỚI KHI app đã chạy).
      //
      // Ta đọc BẤT ĐỒNG BỘ rồi flush -> không race với `subscribe`.
      this._consumeInitialTap({ onPress, onNavigate });
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[PushManager] subscribe lỗi:', e?.message);
      }
    }

    return () => this._unsubscribeAll();
  }

  /**
   * Đọc + xử lý lần bấm push cold-start (app được mở bằng cách bấm push).
   *
   * @param {object} handlers - xem `subscribe`
   */
  async _consumeInitialTap({ onPress, onNavigate } = {}) {
    // Đã có payload chờ sẵn (đọc trước đó) -> xử lý luôn.
    if (this._pendingTapData) {
      this._flushPendingTap({ onPress, onNavigate });
      return;
    }

    try {
      const data = await this.getInitialTapData();
      if (!data) return;
      this._pendingTapData = data;
    } catch (_e) {
      return;
    }

    // Điều hướng cần navigation sẵn sàng. Nếu chưa sẵn sàng thì giữ payload
    // lại -> lần subscribe sau sẽ xử lý (tránh mất deep-link).
    this._flushPendingTap({ onPress, onNavigate });
  }

  /**
   * Xử lý lần bấm push cold-start đã lưu (nếu có).
   *
   * @param {object} handlers - xem `subscribe`
   */
  _flushPendingTap({ onPress, onNavigate } = {}) {
    const data = this._pendingTapData;
    if (!data) return;

    // Xoá TRƯỚC khi xử lý -> tránh xử lý 2 lần nếu subscribe chạy lại.
    this._pendingTapData = null;

    const route = resolveTargetRoute(data);

    if (typeof onPress === 'function') {
      try {
        onPress(data);
      } catch (_e) {
        // ignore
      }
    }

    if (route && typeof onNavigate === 'function') {
      try {
        onNavigate(route, data);
      } catch (_e) {
        // ignore
      }
    }
  }

  /** Gỡ toàn bộ listener. */
  _unsubscribeAll() {
    this._subscriptions.forEach((sub) => {
      try {
        sub?.remove?.();
      } catch (_e) {
        // ignore
      }
    });
    this._subscriptions = [];
  }

  /**
   * Đăng ký listener nhận push khi app ĐANG MỞ (foreground).
   *
   * @param {(notification:object)=>void} handler
   * @returns {() => void} hàm gỡ listener
   */
  subscribeForeground(handler) {
    try {
      const sub = Notifications.addNotificationReceivedListener((notification) => {
        if (typeof handler === 'function') {
          try {
            handler(notification);
          } catch (_e) {
            // ignore
          }
        }
      });
      return () => {
        try {
          sub?.remove?.();
        } catch (_e) {
          // ignore
        }
      };
    } catch (_e) {
      return () => {};
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// R6: side-effect đăng ký — KHÔNG sửa file dùng chung.
// ══════════════════════════════════════════════════════════════════
registerService('pushNotificationManager', new PushNotificationManager());

export { resolvePlatform };
