/**
 * usePushNotifications — hook nối push notification vào vòng đời app.
 *
 * ⚠️ VÌ SAO CẦN:
 *   BE đã có `FcmService` (Firebase Admin SDK) + `POST /notifications/fcm-token`.
 *   Nhưng nếu RN không đăng ký FCM token thì BE không biết token của user
 *   nào -> `sendToUser(userId, ...)` luôn tìm thấy 0 device -> KHÔNG BAO GIỜ
 *   có push nào tới máy. Đó là mắt xích bị thiếu giữa BE và app.
 *
 * ⚠️ THỜI ĐIỂM GỌI:
 *   Chỉ gọi khi user ĐÃ đăng nhập (`isAuthenticated`). Đăng ký token khi
 *   chưa đăng nhập -> BE trả 401 -> token không được lưu -> phí quyền
 *   không gian không cần thiết.
 *
 * ⚠️ `pushNotifications` (cài đặt của user trên BE):
 *   User tắt "Thông báo đẩy" trong Cài đặt -> app KHÔNG được đăng ký
 *   FCM token (đúng ý user). Bật lại -> đăng ký.
 *
 * ⚠️ `expiryAlert` / `shoppingReminder`:
 *   BE lưu 2 cờ này nhưng cron job hiện CHƯA đọc (xem
 *   `notification-cron.service.ts` — không có check `userPreference.expiryAlert`).
 *   Vì vậy app CHỈ gửi cờ lên BE, KHÔNG tự quyết định có gửi hay không
 *   (nếu app tự lọc thì BE vẫn gửi -> user vẫn nhận -> sai).
 *   TODO(ghi chú cho dev): khi BE thêm check vào cron, app sẽ tự động
 *   đúng vì cờ đã lưu đúng tên field.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

import { getRegisteredService } from '../../data/api/ServiceRegistry';
import { useServices } from '../../data/ServiceProvider';
import { useAuthStore } from '../../shared/stores/useAuthStore';

/**
 * Hook đăng ký push.
 *
 * @param {object} [options]
 * @param {(route: string, data: object) => void} [options.onNavigate]
 *        - callback khi user bấm vào push (điều hướng tới route BE chỉ định)
 * @param {(notification: object) => void} [options.onReceive]
 *        - callback khi push tới khi app đang mở (foreground)
 * @returns {{register: Function, unregister: Function}}
 */
export const usePushNotifications = (options = {}) => {
  const { onNavigate, onReceive } = options;

  const services = useServices();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Callback đổi identity mỗi render -> giữ trong ref để effect không chạy lại.
  const onNavigateRef = useRef(onNavigate);
  const onReceiveRef = useRef(onReceive);
  onNavigateRef.current = onNavigate;
  onReceiveRef.current = onReceive;

  /**
   * Lấy instance `PushNotificationManager`.
   *
   * ⚠️ Manager đăng ký qua side-effect ở `PushNotificationManager.js`
   *   (`registerService('pushNotificationManager', ...)`). Import file đó ở
   *   `App.jsx` (entry point) để nó luôn được nạp.
   */
  const getManager = useCallback(() => getRegisteredService('pushNotificationManager'), []);

  // ─────────────────────────────────────────────────────────
  // Đăng ký FCM token khi user đăng nhập + bật "thông báo đẩy"
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let cancelled = false;

    (async () => {
      const manager = getManager();
      if (!manager) return;

      await manager.configure();

      // Đọc cài đặt: user tắt "thông báo đẩy" -> KHÔNG đăng ký token.
      let pushEnabled = true;
      try {
        const settings = await services.userService.getNotificationSettings();
        if (settings && typeof settings.pushNotifications === 'boolean') {
          pushEnabled = settings.pushNotifications;
        }
      } catch (_e) {
        // Offline / lỗi -> mặc định BẬT (hành vi an toàn cho push).
        pushEnabled = true;
      }

      if (cancelled) return;

      if (!pushEnabled) {
        // User đã tắt -> gỡ token đã đăng ký trước đó (nếu có) cho sạch.
        try {
          await manager.unregisterDevice();
        } catch (_e) {
          // ignore
        }
        return;
      }

      try {
        await manager.registerDevice({
          deviceName: `${Platform.OS} - ${Platform.Version ?? 'device'}`,
        });
      } catch (_e) {
        // Không đăng ký được (Expo Go / thiếu google-services.json) ->
        // app vẫn chạy bình thường, chỉ không có push.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, services, getManager]);

  // ─────────────────────────────────────────────────────────
  // Listener: token roll + user bấm push + push khi app đang mở
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const manager = getManager();
    if (!manager) return undefined;

    // ── COLD START ───────────────────────────────────────────────
    // App được mở BẰNG cách bấm push (app đã tắng) -> response nằm trong
    // `getLastNotificationResponseAsync()`, KHÔNG nằm trong listener.
    // `manager.subscribe()` tự đọc + xử lý nốt (xem `PushNotificationManager`).
    const unsubscribePush = manager.subscribe({
      onNavigate: (route, data) => {
        if (typeof onNavigateRef.current === 'function') {
          onNavigateRef.current(route, data);
        }
      },
    });

    const unsubscribeForeground = manager.subscribeForeground((notification) => {
      if (typeof onReceiveRef.current === 'function') {
        onReceiveRef.current(notification);
      }
    });

    return () => {
      unsubscribePush?.();
      unsubscribeForeground?.();
    };
  }, [isAuthenticated, getManager]);

  /**
   * Đăng ký lại thiết bị (dùng khi user BẬT "thông báo đẩy" trong Cài đặt).
   */
  const register = useCallback(async () => {
    const manager = getManager();
    if (!manager) return { registered: false, token: null, reason: 'no_manager' };
    return manager.registerDevice({
      deviceName: `${Platform.OS} - ${Platform.Version ?? 'device'}`,
    });
  }, [getManager]);

  /**
   * Gỡ thiết bị (dùng khi user TẮT "thông báo đẩy" trong Cài đặt).
   */
  const unregister = useCallback(async () => {
    const manager = getManager();
    if (!manager) return false;
    return manager.unregisterDevice();
  }, [getManager]);

  return { register, unregister };
};

export default usePushNotifications;
