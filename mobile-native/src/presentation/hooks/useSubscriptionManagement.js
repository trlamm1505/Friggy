/**
 * useSubscriptionManagement - hook gom TOÀN BỘ logic quản lý gói dịch vụ.
 *
 * ⚠️ VÌ SAO TÁCH RA:
 *   Trước đây logic này nằm inline trong `PackageManagementScreen` (~200 dòng).
 *   Khi thêm màn "Gói của tôi" trong Profile, phải copy lại -> dễ lệch.
 *   => Gom vào hook, cả 2 màn chỉ render.
 *
 * NGUỒN SỰ THẬT (KHÔNG hardcode):
 *   - Danh sách gói : `GET  /subscriptions/plans`            -> getAvailablePackages()
 *   - Gói đang dùng: `GET  /subscriptions/me`                -> getMySubscription()
 *   - Mua / đổi gói: `POST /subscriptions/subscribe`          -> subscribe(planId)
 *   - Gia hạn      : `POST /subscriptions/renew`             -> renewSubscription()
 *   - Hủy gia hạn  : `DELETE /subscriptions/me/auto-renewal` -> cancelAutoRenewal()
 *   - Giao dịch đang chờ: `GET /payment-transactions/me` (+ detail) -> findPendingPayment(filters)
 *
 * ⚠️ FIX "QR SAI GÓI" (19/11):
 *   `findPendingPayment(filters)` BẮT BUỘC lọc theo gói đang mua — nếu không,
 *   khi user chọn gói 5.000đ mà còn giao dịch pending cũ của gói 149.000đ,
 *   app sẽ mở QR CŨ (sai số tiền) và KHÔNG gọi `POST /subscribe` cho gói mới.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

import { useServices } from '../../data/ServiceProvider';
import { useAsyncData } from './useServiceHooks';
import { showError, showSuccess } from '../utils/helpers';
import {
  detectSubscriptionMismatch,
  findPlanNameByDisplayName,
} from '../../data/utils/subscriptionRecovery';

/**
 * @param {object} opts
 * @param {(key:string, opts?:object)=>string} opts.t - hàm dịch i18n
 */
export const useSubscriptionManagement = ({ t }) => {
  const { userService } = useServices();

  /** id gói đang xử lý thanh toán (null | pkg.id | 'renew'). */
  const [subscribingPlanId, setSubscribingPlanId] = useState(null);

  /** Checkout PayOS đang hiển thị QR. */
  const [qrCheckout, setQrCheckout] = useState(null);
  const [qrPlanName, setQrPlanName] = useState(null);
  const [qrPlanDisplayName, setQrPlanDisplayName] = useState(null);
  /** Gia hạn hay mua mới -> nội dung chuyển khoản khác nhau. */
  const [qrIsRenew, setQrIsRenew] = useState(false);

  const {
    data: packages,
    loading,
    error,
    refetch: reloadPackages,
  } = useAsyncData((s) => s.userService.getAvailablePackages(), [], []);

  const { data: currentSub, refetch: reloadCurrent } = useAsyncData(
    (s) => s.userService.getMySubscription(),
    null,
    []
  );

  /**
   * ⚠️ 19/11 — LỊCH SỬ THANH TOÁN (dùng để phát hiện "đã trả tiền nhưng gói
   * bị mất").
   *
   * LÝ DO:
   *   BE đã ghi đè `user_subscriptions.planId = free` khi webhook PayOS không
   *   về (xem `subscriptionRecovery.js` để đọc chuỗi lỗi đầy đủ). Client
   *   KHÔNG THỂ tự khôi phục gói, nhưng PHẢI biết để:
   *     - Không hiện "Gói Miễn Phí" như thể user chưa từng mua.
   *     - Hướng dẫn user mở lại QR đang dở / liên hệ hỗ trợ.
   *
   * ⚠️ Gọi trong `try/catch` + kiểm tra method tồn tại -> không được làm hỏng
   *   màn hình khi service chưa có method này (mock cũ / test).
   */
  const { data: paymentHistory } = useAsyncData(
    async (s) => {
      const svc = s?.userService;
      if (typeof svc?.getPaymentHistory !== 'function') return null;
      try {
        return await svc.getPaymentHistory(1, 20);
      } catch (_e) {
        return null;
      }
    },
    null,
    []
  );

  const currentPlan = currentSub?.plan ?? null;
  const currentPlanName = currentPlan?.name ?? 'free';
  const currentPlanDisplayName = currentPlan?.displayName ?? null;
  const currentStatus = currentSub?.status ?? 'expired';
  const isPaidPlan = Number(currentPlan?.price) > 0;

  /**
   * ⚠️ 19/11 — Cảnh báo "đã thanh toán nhưng gói hiện không ở trạng thái active".
   *
   * `null` = mọi thứ khớp (không hiện cảnh báo).
   */
  const recoveryNotice = detectSubscriptionMismatch({ currentSub, paymentHistory });

  /**
   * ⚠️ FIX "GIA HẠN BÁO KHÔNG CÓ GÓI ĐANG HOẠT ĐỘNG" (19/11)
   *
   * BE `POST /subscriptions/renew` (`subscriptions.service.ts:319-323`) chỉ
   * tìm `userSubscription` có `status = 'active'`:
   *
   *   const sub = await this.prisma.userSubscription.findFirst({
   *     where: { userId, status: 'active', deletedAt: null },
   *   });
   *   if (!sub) throw new NotFoundException('Không có gói đang hoạt động');
   *
   * Nhưng:
   *   - `POST /subscriptions/subscribe` set sub thành `status: 'pending'`.
   *   - CHỈ `POST /subscriptions/webhook` (PayOS gọi về) mới set lại `active`.
   *   - Ở local, PayOS không gọi được `localhost` -> sub KẸT `pending` mãi.
   *   - `renew()` cũng set `status: 'pending'` -> bấm gia hạn lần 1 xong là
   *     lần 2 chắc chắn 404.
   *
   * => FE KHÔNG được gọi `renew` khi `status !== 'active'`.
   */
  const isSubscriptionActive = currentStatus === 'active';

  /**
   * Hiện khối "gia hạn tự động" khi gói là gói TRẢ PHÍ (bất kể status).
   *
   * ⚠️ Vì sao vẫn hiện khi status !== 'active'?
   *   Nếu user đã bấm gia hạn 1 lần (BE set sub thành `pending`) mà webhook
   *   PayOS chưa về, giao dịch vẫn `pending` -> user CẦN mở lại QR cũ để
   *   hoàn tất. Ẩn nút = chặn user không thoát khỏi trạng thái kẹt.
   *   => `handleRenew()` tự tra cứu pending TRƯỚC, chỉ gọi API khi hợp lệ.
   */
  const canRenew = isPaidPlan;

  /**
   * Nút "HỦY gia hạn tự động" chỉ hợp lệ khi sub `active`.
   * BE `DELETE /subscriptions/me/auto-renewal` (`subscriptions.service.ts:287-289`)
   * cũng lọc `status: 'active'` -> gọi khi status khác là 404.
   */
  const canCancelAutoRenew = isSubscriptionActive && isPaidPlan;

  /** Làm mới cả gói lẫn subscription (dùng sau khi thanh toán / hủy gia hạn). */
  const refreshAll = useCallback(() => {
    reloadPackages();
    reloadCurrent();
  }, [reloadPackages, reloadCurrent]);

  /**
   * Mua / đổi gói -> gọi subscribe -> mở sheet QR.
   *
   * ⚠️ FIX "QR SAI GÓI" (19/11):
   *   Trước đây: tra cứu pending và nếu có thì mở QR CŨ — bất kể gói nào.
   *   => user chọn gói 5.000đ nhưng QR hiện là 149.000đ (giao dịch cũ).
   *   Nay: chỉ khôi phục QR cũ khi giao dịch pending ĐÚNG gói đang chọn
   *   (cùng displayName + amount + type). Sai gói -> tạo giao dịch MỚI.
   *
   * Khôi phục QR đang chờ TRƯỚC khi tạo giao dịch mới: BE trả 409 khi đã có
   * giao dịch pending -> Flutter làm đúng vậy
   * (`package_management_screen.dart:252-267`).
   */
  const handleSubscribe = useCallback(
    async (pkg) => {
      if (!pkg?.id) return;
      setSubscribingPlanId(pkg.id);
      // Mua MỚI -> nội dung chuyển khoản "Friggy <gói>".
      setQrIsRenew(false);

      /** Filter để chỉ khôi phục QR cũ khi đúng gói đang mua. */
      const pendingFilters = {
        planDisplayName: pkg.displayName ?? null,
        planName: pkg.name ?? null,
        amount: Number(pkg.price) || null,
        type: 'subscribe',
      };

      try {
        const pending = await userService.findPendingPayment(pendingFilters);
        if (pending?.qrCode) {
          setQrCheckout(pending);
          setQrPlanName(pkg.name);
          setQrPlanDisplayName(pkg.displayName);
          return;
        }

        const checkout = await userService.subscribe(pkg.id);
        setQrCheckout(checkout);
        setQrPlanName(pkg.name);
        setQrPlanDisplayName(pkg.displayName);
      } catch (e) {
        // BE trả 409 khi đã có giao dịch pending -> tra cứu lại và mở QR cũ.
        try {
          const pending = await userService.findPendingPayment(pendingFilters);
          if (pending?.qrCode) {
            setQrCheckout(pending);
            setQrPlanName(pkg.name);
            setQrPlanDisplayName(pkg.displayName);
            return;
          }
        } catch {
          // không có pending -> báo lỗi gốc
        }
        // 409 = còn giao dịch pending của GÓI KHÁC (đã quá 15 phút? hoặc chưa
        // hết hạn). Báo rõ để user biết vì sao không tạo được giao dịch mới.
        if (e?.statusCode === 409) {
          showError(t('subscription.pendingOtherPlan'));
          return;
        }
        showError(e?.message || t('subscription.subscribeFailed'));
      } finally {
        setSubscribingPlanId(null);
      }
    },
    [userService, t]
  );

  /**
   * Gia hạn gói hiện tại -> QR mới.
   *
   * Flutter `_handleRenew()` `:618-670`: tra cứu pending TRƯỚC, rồi gọi
   * `POST /subscriptions/renew`, và khi lỗi thì tra cứu pending LẠI.
   *
   * ⚠️ FIX "QR SAI GÓI" (19/11): chỉ khôi phục QR cũ khi đúng gói hiện tại
   *   (cùng displayName + amount + type 'renew').
   */
  const handleRenew = useCallback(async () => {
    setSubscribingPlanId('renew');
    // GIA HẠN -> nội dung chuyển khoản "Gia hạn Friggy <gói>"
    // (khớp `description` BE gửi PayOS cho `POST /subscriptions/renew`).
    setQrIsRenew(true);

    /** Filter để chỉ khôi phục QR cũ khi đúng gói hiện tại. */
    const pendingFilters = {
      planDisplayName: currentPlanDisplayName ?? null,
      planName: currentPlanName ?? null,
      amount: Number(currentPlan?.price) || null,
      type: 'renew',
    };

    try {
      // ⚠️ TRA CỨU PENDING TRƯỚC (luôn, kể cả khi sub KHÔNG active).
      //   Đây là ĐƯỜNG THOÁT DUY NHẤT cho user khi giao dịch renew trước đó
      //   còn dang dở: mở lại QR cũ để hoàn tất thanh toán.
      const pending = await userService.findPendingPayment(pendingFilters);
      if (pending?.qrCode) {
        setQrCheckout(pending);
        setQrPlanName(currentPlanName);
        setQrPlanDisplayName(currentPlanDisplayName);
        return;
      }

      // ⚠️ KHÔNG có giao dịch pending + sub KHÔNG `active` -> BE chắc chắn
      //   trả 404 "Không có gói đang hoạt động". Báo rõ thay vì gọi API.
      if (!isSubscriptionActive) {
        showError(t('subscription.renewNotActive'));
        return;
      }

      const checkout = await userService.renewSubscription();
      setQrCheckout(checkout);
      setQrPlanName(currentPlanName);
      setQrPlanDisplayName(currentPlanDisplayName);
      } catch (e) {
        try {
          const pending = await userService.findPendingPayment(pendingFilters);
          if (pending?.qrCode) {
            setQrCheckout(pending);
            setQrPlanName(currentPlanName);
            setQrPlanDisplayName(currentPlanDisplayName);
            return;
          }
        } catch {
          // không có pending -> báo lỗi gốc
        }
        // 409 = còn giao dịch pending của gói khác -> báo rõ.
        if (e?.statusCode === 409) {
          showError(t('subscription.pendingOtherPlan'));
          return;
        }
        // ⚠️ 404 = BE không tìm thấy sub `status='active'` -> gói KHÔNG active.
        //   Thay vì trả raw message của BE, báo rõ cho user biết cần làm gì.
        if (e?.statusCode === 404) {
          showError(t('subscription.renewNotActive'));
          return;
        }
        showError(e?.message || t('subscription.renewFailed'));
      } finally {
      setSubscribingPlanId(null);
    }
  }, [userService, currentPlanName, currentPlanDisplayName, currentPlan, isSubscriptionActive, t]);

  /**
   * Hủy gia hạn tự động (owner của gói trả tiền).
   *
   * Flutter `_confirmCancelAutoRenewal()` `:673-731` — có hộp thoại xác nhận
   * trước khi gọi API (hành động không thể hoàn tác).
   */
  const handleCancelAutoRenew = useCallback(() => {
    // ⚠️ BE `DELETE /subscriptions/me/auto-renewal` cũng chỉ nhận sub
    //   `status='active'` -> gọi khi status khác là 404.
    if (!isSubscriptionActive) {
      showError(t('subscription.renewNotActive'));
      return;
    }

    Alert.alert(t('subscription.cancelAutoRenewTitle'), t('subscription.cancelAutoRenewConfirm'), [
      { text: t('subscription.keepAutoRenew'), style: 'cancel' },
      {
        text: t('subscription.confirmCancelAutoRenew'),
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await userService.cancelAutoRenewal();
            showSuccess(res?.message || t('subscription.cancelAutoRenewDone'));
            reloadCurrent();
          } catch (e) {
            showError(e?.message || t('subscription.loadFailed'));
          }
        },
      },
    ]);
  }, [userService, t, reloadCurrent, isSubscriptionActive]);

  /** Đóng sheet QR thanh toán. */
  const closeQr = useCallback(() => {
    setQrCheckout(null);
  }, []);

  /**
   * ⚠️ 19/11 — MỞ LẠI GIAO DỊCH ĐANG DỞ (đường thoát cho user).
   *
   * Dùng khi `recoveryNotice` báo:
   *   - `payment_pending`       -> giao dịch `pending` (chưa quét QR / quét hụt).
   *   - `payment_not_applied`   -> đã trả tiền nhưng BE chưa kích hoạt gói.
   *   - `reverted_to_free`      -> đã trả tiền nhưng gói bị ghi đè về free.
   *
   * ⚠️ Vì sao cần:
   *   BE đã xoá `planId` gói đã mua (xem `subscriptionRecovery.js`), nên
   *   KHÔNG có endpoint nào để "kích hoạt lại". Đường duy nhất còn lại là
   *   mở lại QR để user thanh toán/hoàn tất giao dịch.
   *
   * ⚠️ Lọc theo đúng gói + đúng số tiền + đúng loại (subscribe/renew) —
   *   giống hệt logic "khôi phục QR cũ" -> tránh mở nhầm QR của gói khác.
   *
   * @returns {Promise<boolean>} true = đã mở được QR.
   */
  const handleResumePendingPayment = useCallback(async () => {
    if (!recoveryNotice) return false;

    const planName =
      recoveryNotice.planName ??
      findPlanNameByDisplayName(packages, recoveryNotice.planDisplayName);

    const pendingFilters = {
      planDisplayName: recoveryNotice.planDisplayName ?? null,
      planName: planName ?? null,
      amount: recoveryNotice.amount ?? null,
      type: recoveryNotice.type ?? null,
    };

    try {
      const pending = await userService.findPendingPayment(pendingFilters);
      if (pending?.qrCode) {
        setQrCheckout(pending);
        setQrPlanName(planName);
        setQrPlanDisplayName(recoveryNotice.planDisplayName);
        setQrIsRenew(recoveryNotice.type === 'renew');
        return true;
      }
    } catch (_e) {
      // Bỏ qua -> báo chung bên dưới.
    }

    showError(t('subscription.resumePaymentNotFound'));
    return false;
  }, [recoveryNotice, packages, userService, t]);

  /**
   * Gói đang bị "kẹt" cần người dùng hành động?
   * - `payment_pending`     -> mở lại QR (còn trong 15 phút).
   * - `reverted_to_free`    -> đã trả tiền, gói bị mất -> cần hỗ trợ.
   * - `payment_not_applied` -> đã trả tiền, BE chưa kích hoạt -> cần hỗ trợ.
   */
  const canResumePayment = recoveryNotice?.kind === 'payment_pending';

  return {
    // data
    packages: packages || [],
    currentSub,
    currentPlan,
    currentPlanName,
    currentPlanDisplayName,
    currentStatus,
    isPaidPlan,
    isSubscriptionActive,
    canRenew,
    canCancelAutoRenew,
    loading,
    error,
    // ⚠️ 19/11 — cảnh báo "đã thanh toán nhưng gói bị mất" (null = không có).
    recoveryNotice,
    canResumePayment,
    // state
    subscribingPlanId,
    qrCheckout,
    qrPlanName,
    qrPlanDisplayName,
    qrIsRenew,
    // actions
    refreshAll,
    handleSubscribe,
    handleRenew,
    handleCancelAutoRenew,
    handleResumePendingPayment,
    closeQr,
  };
};
