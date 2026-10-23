/**
 * RealSubscriptionService - nối gói dịch vụ với BE.
 *
 * Sprint A3. Nguồn sự thật:
 *   BE      - `be/src/modules-api/subscriptions/subscriptions.controller.ts`
 *             + `dto/subscriptions-response.dto.ts`
 *   Flutter - `Mobile/lib/data/services/api_service.dart:613-689` (đã chạy production)
 *
 * Đối chiếu 23/10: API layer BE và Flutter KHỚP 100%. Sai lệch chỉ ở shape:
 *   BE `SubscriptionPlanResponseDto`: `id`(number), `name`, `displayName`,
 *                                     `priceVnd`, `billingCycle`, `features`,
 *                                     `aiUsagePerWeek`, `isActive`
 *   Mock RN (`packages.json`):        `id`(string slug!), `name`, `price`,
 *                                     `currency`, `period`, `features`
 *   => BẮT BUỘC có mapper `toPackage()` (R1 - mục 9b.1).
 *
 * VÌ SAO 1 FILE RIÊNG NHƯNG VẪN ĐĂNG KÝ KEY `userService`:
 *   `ServiceProvider.jsx` là file IMMUTABLE (P0.5) với 5 key cố định.
 *   `resolveServices()` chỉ duyệt key có trong mock -> domain mới sẽ không bao
 *   giờ được trả về qua `useServices()`.
 *   => File này được `RealUserService` compose lại (xem `RealUserService.js`).
 *   Cách này giữ nguyên fallback 5xx/network của `withFallback` (mock đã có sẵn
 *   trong `MockUserService`) và KHÔNG đụng file immutable.
 *
 * R2: mọi URL ảnh đi qua `appConfig.getImageUrl()`.
 * R5: chỉ đọc token qua ApiClient, KHÔNG import `useAuthStore`.
 */

import { ApiClient } from '../../api/ApiClient';

/**
 * Mapper `SubscriptionPlanResponseDto` -> shape gói mà UI hiện tại dùng.
 *
 * Mock (`packages.json`) dùng `id` là SLUG ("premium-monthly") trong khi BE dùng
 * ID SỐ (`plan.id = 3`). `POST /subscriptions/subscribe` cần `planId: number`
 * (`@IsInt() @IsPositive()`) -> phải giữ `id` số, không ép về slug.
 */
export const toPackage = (plan) => ({
  id: plan?.id ?? null,
  name: plan?.name ?? 'free',
  displayName: plan?.displayName ?? 'Gói Miễn Phí',
  price: typeof plan?.priceVnd === 'number' ? plan.priceVnd : 0,
  currency: 'VND',
  period: plan?.billingCycle ?? 'forever',
  features: Array.isArray(plan?.features) ? plan.features : [],
  aiUsagePerWeek: typeof plan?.aiUsagePerWeek === 'number' ? plan.aiUsagePerWeek : 0,
  isActive: plan?.isActive !== false,
});

/**
 * Mapper `UserSubscriptionResponseDto` -> shape subscription phẳng.
 *
 * `plan` là object LỒNG (không null) - BE luôn trả kể cả gói free.
 * `status` có 4 giá trị thực tế: `active` | `pending` | `cancelled` | `expired`.
 */
export const toSubscription = (res) => {
  const plan = res?.plan ?? {};
  return {
    id: res?.id ?? null,
    status: res?.status ?? 'expired',
    startDate: res?.startDate ?? null,
    endDate: res?.endDate ?? null,
    // BE map `s.paymentRef ?? null` và `subscribe()` KHÔNG set cột này ->
    // LUÔN null. Không dựa vào nó để poll thanh toán.
    paymentRef: res?.paymentRef ?? null,
    autoRenew: res?.autoRenew === true,
    cancelledAt: res?.cancelledAt ?? null,
    plan: toPackage(plan),
  };
};

/**
 * Mapper `SubscribeResponseDto` -> shape thanh toán.
 *
 * BE trả `qrCode` (base64 PNG hoặc URL). Flutter map sang `qrCodeUrl` với fallback
 * 2 tầng (`user_models.dart:313-320`) - giữ nguyên fallback cho tương thích.
 */
export const toCheckout = (res) => ({
  checkoutUrl: res?.checkoutUrl ?? null,
  qrCode: res?.qrCode ?? res?.qrCodeUrl ?? null,
  paymentRef: res?.paymentRef ?? '',
  amount: typeof res?.amount === 'number' ? res.amount : 0,
  expireAt: res?.expireAt ?? res?.expiredAt ?? null,
  status: res?.status ?? 'pending',
});

/**
 * Service gói dịch vụ (plans + subscription + thanh toán).
 *
 * KHÔNG tự đăng ký — `RealUserService` compose instance này rồi đăng ký key
 * `userService`. Xem comment đầu file để hiểu lý do.
 */
export class RealSubscriptionService {
  /**
   * GET /subscriptions/plans - PUBLIC (`@Public()` trong BE).
   *
   * `skipAuth: true` -> KHÔNG gắn Bearer. Lý do (Flutter đang làm SAI):
   * Flutter `api_service.dart:613-617` gọi endpoint này KHÔNG set skipAuth ->
   * gửi token thừa, và nếu token hết hạn thì interceptor refresh fail ->
   * **kick user ra khỏi app** chỉ vì gọi 1 endpoint vô hại.
   */
  async getPackages() {
    const res = await ApiClient.get('/subscriptions/plans', { skipAuth: true });
    const list = Array.isArray(res) ? res : (res?.data ?? []);
    return list.map(toPackage);
  }

  /** GET /subscriptions/me - gói hiện tại của user. */
  async getMySubscription() {
    const res = await ApiClient.get('/subscriptions/me');
    return toSubscription(res);
  }

  /**
   * POST /subscriptions/subscribe - đăng ký gói, nhận QR PayOS.
   *
   * @param {number} planId - ID SỐ của plan (BE `@IsInt() @IsPositive()`).
   */
  async subscribe(planId) {
    const res = await ApiClient.post('/subscriptions/subscribe', { planId });
    return toCheckout(res);
  }

  /** POST /subscriptions/renew - gia hạn gói hiện tại. */
  async renew() {
    const res = await ApiClient.post('/subscriptions/renew');
    return toCheckout(res);
  }

  /** DELETE /subscriptions/me/auto-renewal - hủy gia hạn tự động. */
  async cancelAutoRenewal() {
    const res = await ApiClient.delete('/subscriptions/me/auto-renewal');
    return {
      message: res?.message ?? 'Đã hủy gia hạn tự động',
      endDate: res?.endDate ?? null,
    };
  }

  /**
   * GET /payment-transactions/me/:paymentRef - trạng thái giao dịch.
   *
   * BẮT BUỘC cho poll thanh toán: `paymentRef` trong `/subscriptions/me` LUÔN
   * null (BE `subscriptions.service.ts:429`) -> phải lấy từ response của
   * `POST /subscriptions/subscribe`.
   */
  async getPaymentStatus(paymentRef) {
    const res = await ApiClient.get(`/payment-transactions/me/${paymentRef}`);
    return {
      status: res?.status ?? 'pending',
      amount: typeof res?.amount === 'number' ? res.amount : 0,
      paidAt: res?.paidAt ?? null,
    };
  }

  /**
   * Kiểm tra user đã lên đúng gói vừa mua chưa.
   *
   * CHỐNG BUG FLUTTER (`package_management_screen.dart:347`): Flutter poll chỉ
   * check `status === 'active'` mà KHÔNG check plan có khớp. User đang gói
   * Individual (`active`) bấm nâng cấp Family -> poll thấy `active` ngay ->
   * báo "Kích hoạt thành công" khi CHƯA thanh toán.
   * => Phải check CẢ `status` VÀ `plan.name`.
   *
   * @param {string} targetPlanName - tên gói đang mua (vd 'family').
   */
  async isSubscribedTo(targetPlanName) {
    const sub = await this.getMySubscription();
    return sub.status === 'active' && sub.plan.name === targetPlanName;
  }
}
