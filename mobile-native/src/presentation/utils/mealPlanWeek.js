/**
 * mealPlanWeek - helper cho luồng "tạo meal plan theo tuần".
 *
 * ⚠️ QUY ƯỚC NGÀY CỦA BE:
 *   `weekStartDate` của `POST /meal-planning/plans/generate` PHẢI là Thứ 2
 *   (BE `GenerateMealPlanDto.weekStartDate` — "@IsDateString()", mô tả:
 *   "Ngày bắt đầu tuần (phải là ngày Thứ 2)").
 *
 *   AI Service lưu `weeklyPlan.weekStartDate = new Date(weekStartDate)` và
 *   suy ra ngày từng bữa bằng `weekStart + (dayOfWeek - 1)` ngày
 *   (xem `ai-service/src/ai-core/tools/meal-plan.tools.ts:133-134`).
 *   => Nếu truyền sai ngày (vd Thứ 3) thì cả tuần lệch 1 ngày.
 *
 *   Flutter dùng ĐÚNG công thức này:
 *     `final monday = now.subtract(Duration(days: now.weekday - 1));`
 *   (`Mobile/lib/screens/next_week_suggestions_screen.dart:479`)
 *   `DateTime.weekday` của Dart: 1=T2 ... 7=CN.
 *
 *   `Date.getDay()` của JS: 0=CN ... 6=T7 -> phải quy đổi (đã xử lý bên dưới).
 */

/**
 * Ngày Thứ 2 của tuần chứa `date` (mặc định = hôm nay).
 *
 * @param {Date} [date]
 * @returns {Date} 00:00:00 local của ngày Thứ 2
 */
export const getMondayOfWeek = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  // `getDay()`: 0=CN, 1=T2, ..., 6=T7.
  // Quy đổi sang "số ngày lùi về Thứ 2": T2 -> 0, ..., T7 -> 5, CN -> 6.
  const jsDay = d.getDay();
  const diffToMonday = jsDay === 0 ? 6 : jsDay - 1;

  d.setDate(d.getDate() - diffToMonday);
  return d;
};

/**
 * `YYYY-MM-DD` của ngày Thứ 2 của tuần chứa `date`.
 *
 * ⚠️ Format local (không dùng `toISOString()`) vì `toISOString()` ép sang UTC
 * -> ở múi giờ UTC+7, 00:00 ngày T2 sẽ thành `17:00` hôm trước và ra sai
 * ngày (thành Chủ nhật).
 *
 * @param {Date} [date]
 * @returns {string} 'YYYY-MM-DD'
 */
export const getWeekStartDateString = (date = new Date()) => {
  const monday = getMondayOfWeek(date);
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Nhãn ngày Thứ 2 theo quy ước BE (1=T2 ... 7=CN) -> chữ viết tắt.
 *
 * @param {number} dayOfWeek - 1..7
 * @returns {string}
 */
export const getDayShortLabel = (dayOfWeek) => {
  const labels = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  return labels[dayOfWeek] ?? '';
};

/**
 * Ngân sách mặc định cho 1 tuần (VND).
 *
 * Flutter hardcode `budget: 500000` (`next_week_suggestions_screen.dart:484`)
 * -> giữ nguyên để hành vi 2 app giống nhau.
 */
export const DEFAULT_WEEKLY_BUDGET = 500000;

/**
 * Chuẩn hoá ngân sách về số nguyên >= 0.
 *
 * ⚠️ BE `GenerateMealPlanDto.budget` là `@IsInt() @Min(0)` -> gửi số thực
 * (vd 500000.5) sẽ bị reject 400.
 *
 * @param {number|string|undefined|null} value
 * @returns {number}
 */
export const normalizeBudget = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num);
};
