/**
 * PushNotificationBridge — cầu nối push notification với navigation.
 *
 * ⚠️ VÌ SAO CẦN FILE RIÊNG:
 *   `usePushNotifications()` cần 2 thứ từ React tree:
 *     1. `useServices()`  -> phải nằm TRONG `<ServiceProvider>`.
 *     2. `navigation`     -> phải nằm TRONG `<NavigationContainer>`.
 *
 *   Ở `App.jsx`, `<NavigationContainer>` nằm TRONG `<AppProviders>` (đã có
 *   ServiceProvider) -> nên chỉ cần 1 component render BÊN TRONG
 *   `<NavigationContainer>` là dùng được cả 2.
 *
 * ⚠️ VÌ SAO KHÔNG DÙNG `useNavigation()` Ở ĐÂY:
 *   `useNavigation()` chỉ hoạt động BÊN TRONG một Navigator (Screen).
 *   Component này nằm trực tiếp dưới `<NavigationContainer>` -> không có
 *   navigator cha -> `useNavigation()` ném "Couldn't find a navigation object".
 *   => Dùng `navigationRef` (navigation container ref) thay thế — luôn hoạt
 *      động bất kể vị trí trong tree.
 *
 * ⚠️ DEEPLINK TỪ BE:
 *   BE gửi `data.screen` trong payload FCM (xem
 *   `be/src/modules-api/notifications/notification-cron.service.ts`):
 *     - 'fridge'         -> màn Tủ lạnh
 *     - 'meal_planning'  -> màn Gợi ý công thức / thực đơn
 *     - 'subscription'   -> màn Gói đăng ký
 *   Map sang route hợp lệ ở `PushNotificationManager.SCREEN_ROUTE_MAP`.
 *   Route KHÔNG tồn tại -> bỏ qua (an toàn hơn là `navigate()` tới route ma).
 */

import { useCallback, useRef } from 'react';

import { usePushNotifications } from '../../hooks/usePushNotifications';

/**
 * Bridge cho navigation push.
 *
 * @param {object} props
 * @param {object} props.navigationRef - ref của `NavigationContainer`
 * @param {(count:number)=>void} [props.onUnreadChanged] - báo số chưa đọc mới
 */
export const PushNotificationBridge = ({ navigationRef, onUnreadChanged }) => {
  const onUnreadChangedRef = useRef(onUnreadChanged);
  onUnreadChangedRef.current = onUnreadChanged;

  const handleNavigate = useCallback(
    (route) => {
      if (!route) return;

      // Navigation chưa sẵn sàng (app vừa mở, user bấm push rất sớm) ->
      // `navigate` sẽ ném lỗi. Bỏ qua an toàn.
      try {
        if (navigationRef?.isReady?.()) {
          navigationRef.navigate(route);
        }
      } catch (_e) {
        // ignore - navigation chưa sẵn sàng
      }
    },
    [navigationRef]
  );

  const handleReceive = useCallback(() => {
    // Push tới khi app đang mở -> badge hệ thống đã được expo-notifications
    // cập nhật (`shouldSetBadge: true`). Số badge trong app được đọc từ
    // `GET /notifications/unread-count` -> gọi callback để UI tự refresh.
    if (typeof onUnreadChangedRef.current === 'function') {
      onUnreadChangedRef.current();
    }
  }, []);

  // Đăng ký FCM token + listener push.
  usePushNotifications({
    onNavigate: handleNavigate,
    onReceive: handleReceive,
  });

  return null;
};

export default PushNotificationBridge;
