/**
 * pushRoutes — map màn hình đích cho push notification.
 *
 * ⚠️ VÌ SAO TÁCH FILE RIÊNG:
 *   `PushNotificationManager.js` import `expo-notifications` + `expo-device`
 *   (native module). Nếu `NotificationsScreen.jsx` import map từ đó -> cả màn
 *   danh sách bị kéo theo native module -> khó test, và có thể vỡ ở môi
 *   trường không có Expo runtime.
 *
 *   File này là nguồn sự thật DUY NHẤT cho map route, dùng chung cho:
 *     - `PushNotificationManager` (deep-link khi bấm push)
 *     - `NotificationsScreen` (deep-link khi bấm thông báo trong danh sách)
 *
 * ⚠️ NGUỒN CỦA `data.screen`:
 *   BE cron job gửi `data: { type, screen }` trong payload FCM
 *   (xem `be/src/modules-api/notifications/notification-cron.service.ts`):
 *     - `expiry_warning`         -> screen: 'fridge'
 *     - `weekly_plan_remind`     -> screen: 'meal_planning'
 *     - `subscription_reminder`  -> screen: 'subscription'
 */

import { Routes } from './routes';

/**
 * Map `screen` (payload BE) -> route trong app.
 *
 * ⚠️ Route KHÔNG tồn tại -> trả `null` (an toàn hơn `navigate()` tới route
 *   ma -> app crash).
 */
export const SCREEN_ROUTE_MAP = {
  fridge: Routes.FridgeInventory,
  meal_planning: Routes.RecipeSuggestions,
  subscription: Routes.PackageManagement,
};

/**
 * Đọc route đích từ payload push.
 *
 * @param {object} data - `data` của notification (BE gửi string)
 * @returns {string|null} route hợp lệ hoặc null
 */
export const resolveTargetRoute = (data) => {
  if (!data || typeof data !== 'object') return null;
  const screen = data.screen ?? data.targetScreen;
  if (!screen) return null;
  return SCREEN_ROUTE_MAP[screen] ?? null;
};

export default SCREEN_ROUTE_MAP;
