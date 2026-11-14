/**
 * NetworkMonitor - theo dõi trạng thái mạng của thiết bị.
 *
 * Port từ Flutter: `Mobile/lib/sqlite/helpers/sync_helper.dart`
 * (dùng `connectivity_plus` + `onConnectivityChanged`).
 *
 * VÌ SAO CẦN:
 *   App cần biết "đang online hay offline" để:
 *     1. Quyết định gọi API trực tiếp hay ghi vào hàng đợi offline.
 *     2. Kích hoạt đồng bộ NGAY khi mạng vừa khôi phục.
 *   Không có tầng này, mọi lỗi network đều bị coi như lỗi chung -> app
 *   không bao giờ biết khi nào nên đồng bộ.
 *
 * ⚠️ VÌ SAO DÙNG `expo-network` CHỨ KHÔNG DÙNG `@react-native-community/netinfo`:
 *   Cả hai đều nằm trong `expo/bundledNativeModules.json` cho Expo SDK 57
 *   (`expo-network: ~57.0.2`, `@react-native-community/netinfo: 12.0.1`).
 *   `expo-network` là API của Expo, đi kèm Expo Go -> không cần rebuild
 *   native app khi thêm dependency (đúng yêu cầu "chỉ cần `npx expo start`").
 *
 * ⚠️ `expo-network` KHÔNG phải lúc nào cũng nói đúng có Internet:
 *   `isConnected = true` chỉ có nghĩa "đã gắn vào 1 mạng" (WiFi có mật khẩu
 *   sai, 4G yếu, captive portal...). `isInternetReachable` mới là "có Internet".
 *   => Ta coi là OFFLINE khi `isConnected === false`.
 *   Với `isInternetReachable === null` (trạng thái "chưa xác định") ta coi là
 *   ONLINE vì đang trong lúc hệ điều hành vừa bật radio, chưa kịp probe.
 *
 * R7: comment tiếng Việt.
 */

import * as ExpoNetwork from 'expo-network';

/**
 * Event emitter tối giản (giống `onApiEvent` trong `ApiClient.js`).
 * Dùng module-level store để component subscribe được mà không cần Context.
 */
const listeners = new Map();

/**
 * Đăng ký lắng nghe 1 event của NetworkMonitor.
 * @param {'online'|'offline'|'change'} event
 * @param {Function} handler
 * @returns {Function} hàm unsubscribe
 */
export const onNetworkEvent = (event, handler) => {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => {
    listeners.get(event)?.delete(handler);
  };
};

const emit = (event, payload) => {
  listeners.get(event)?.forEach((handler) => {
    try {
      handler(payload);
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(`[NetworkMonitor] listener lỗi cho "${event}":`, e);
      }
    }
  });
};

/**
 * Chuẩn hoá trạng thái mạng của expo-network thành boolean "online".
 *
 * @param {object|null|undefined} state
 * @returns {boolean}
 */
const isOnlineState = (state) => {
  if (!state) return true; // Không rõ -> giả định online (không chặn app)
  if (state.isConnected === false) return false;
  // `isInternetReachable === null` nghĩa là "chưa xác định" -> coi là online.
  if (state.isInternetReachable === false) return false;
  return true;
};

class NetworkMonitor {
  constructor() {
    this._isOnline = true;
    this._initialized = false;
    this._subscription = null;
    this._lastState = null;
  }

  /**
   * Trạng thái online hiện tại (đồng bộ, không cần await).
   * @returns {boolean}
   */
  get isOnline() {
    return this._isOnline;
  }

  /**
   * Bắt đầu theo dõi mạng. An toàn gọi nhiều lần (chỉ khởi tạo 1 lần).
   *
   * @returns {Promise<boolean>} trạng thái online sau khi đọc lần đầu
   */
  async init() {
    if (this._initialized) return this._isOnline;
    this._initialized = true;

    try {
      const state = await ExpoNetwork.getNetworkStateAsync();
      this._lastState = state;
      this._setOnline(isOnlineState(state));
    } catch (e) {
      // Không đọc được trạng thái mạng -> giả định online để app vẫn chạy.
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[NetworkMonitor] Không đọc được trạng thái mạng:', e);
      }
      this._setOnline(true);
    }

    try {
      this._subscription = ExpoNetwork.addNetworkStateListener((state) => {
        this._lastState = state;
        this._setOnline(isOnlineState(state));
      });
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[NetworkMonitor] Không lắng nghe được thay đổi mạng:', e);
      }
    }

    return this._isOnline;
  }

  /**
   * Đọc trạng thái mạng hiện tại (gọi API thật của expo-network).
   * Dùng khi cần quyết định "gọi API hay queue" tại thời điểm bấm nút.
   *
   * @returns {Promise<boolean>}
   */
  async checkConnection() {
    try {
      const state = await ExpoNetwork.getNetworkStateAsync();
      this._lastState = state;
      this._setOnline(isOnlineState(state));
    } catch (_e) {
      // Không đọc được -> giữ trạng thái hiện tại (không đổi).
    }
    return this._isOnline;
  }

  /**
   * Cập nhật trạng thái + phát event khi có chuyển tiếp.
   * @private
   */
  _setOnline(next) {
    const changed = next !== this._isOnline;
    this._isOnline = next;

    if (!changed) return;

    emit(next ? 'online' : 'offline', { isOnline: next });
    emit('change', { isOnline: next, state: this._lastState });
  }

  /**
   * Ngừng theo dõi (dùng khi logout hoặc trong test).
   */
  dispose() {
    try {
      this._subscription?.remove?.();
    } catch (_e) {
      // ignore
    }
    this._subscription = null;
    this._initialized = false;
  }

  /** Test-only: ép trạng thái online/offline. */
  __setOnlineForTest(next) {
    this._setOnline(Boolean(next));
  }
}

export const networkMonitor = new NetworkMonitor();
export default networkMonitor;
