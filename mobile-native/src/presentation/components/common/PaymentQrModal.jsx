/**
 * PaymentQrModal - hiển thị QR thanh toán PayOS + poll trạng thái.
 *
 * Sprint A3 (24/10): TÁCH TỪ `FamilyPlanModal.jsx`.
 *
 * ⚠️ VÌ SAO PHẢI TÁCH:
 *   `FamilyPlanModal` chỉ phục vụ gói FAMILY (có thêm ô nhập token lời mời).
 *   Nhưng `PackageManagementScreen` cũng cần hiện QR cho gói KHÁC (individual):
 *   trước đó nó chỉ gọi `showInfo('Mã QR đã sẵn sàng')` -> user KHÔNG BAO GIỜ
 *   thấy mã QR, không thể thanh toán. Đó là luồng chết.
 *   => Tách phần "QR + poll" ra component dùng chung, `FamilyPlanModal` dùng lại.
 *
 * LOGIC POLL (giống Flutter `family_plan_modal.dart:201` + `package_management_screen.dart:321-360`):
 *   Tầng 1: `GET /payment-transactions/me/:paymentRef` -> `status === 'paid'`
 *   Tầng 2: `GET /subscriptions/me` -> `status === 'active'` VÀ `plan.name` KHỚP
 *   Poll mỗi 3 giây, DỪNG khi hết `expireAt` (BE cấp 15 phút).
 *
 * ⚠️ BẮT BUỘC check CẢ `status` VÀ `plan` ở tầng 2 — nếu chỉ check `status`
 *   thì user đang gói Individual bấm nâng cấp Family sẽ thấy "thành công" ngay
 *   khi CHƯA thanh toán (BUG Flutter `package_management_screen.dart:347`).
 *
 * ⚠️ VỀ ESLINT `react-hooks/set-state-in-effect`:
 *   Component này KHÔNG reset state trong effect. Thay vào đó component CHA
 *   render kèm `key={paymentRef}` -> mỗi giao dịch mới là 1 instance mới ->
 *   `expired`/`polling` tự về giá trị khởi tạo.
 *   `setPolling`/`setExpired` chỉ được gọi BÊN TRONG timer callback (async
 *   context) -> không vi phạm rule.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { X, AlertCircle } from 'lucide-react-native';
import { CustomButton } from '../common/CustomButton';
import { useServices } from '../../../data/ServiceProvider';
import { showSuccess } from '../../utils/helpers';

/** Chu kỳ poll thanh toán (giống Flutter `:321-360`). */
export const POLL_INTERVAL_MS = 3000;

/**
 * Chuỗi QR nào là URL ảnh hợp lệ để `<Image source={{ uri }}>` hiển thị được.
 *
 * PayOS trả 1 trong 3 dạng (Flutter `_buildQrCodeWidget` `:738-810`):
 *   1. `data:image/png;base64,...` -> data URI (dùng thẳng)
 *   2. `https://...`               -> URL ảnh (dùng thẳng)
 *   3. chuỗi raw (nội dung mã)   -> phải render thành ảnh qua API ngoài
 *
 * Dạng 3 Flutter dùng fallback `api.qrserver.com` rồi `quickchart.io`.
 * RN không cài thêm lib QR -> dùng `api.qrserver.com` (giống Flutter).
 *
 * ⚠️ THÊM 1 CASE SO VỚT BẢN ĐẦU: chuỗi chứa `base64,` nhưng KHÔNG có
 *   prefix `data:image` — Flutter vẫn decode base64 (`:747-767`).
 *   RN không có `Image.memory`, nhưng có thể tự thêm prefix `data:image/png;base64,`
 *   để `<Image>` render được — cùng kết quả nhìn thấy.
 */
export const toQrUri = (qr) => {
  if (!qr) return null;
  const clean = typeof qr === 'string' ? qr.trim() : qr;
  if (!clean) return null;

  if (clean.startsWith('data:image')) return clean;

  // Base64 thuần (không có prefix) -> thêm prefix để RN render được.
  if (clean.includes('base64,')) {
    const payload = clean.split('base64,').pop();
    if (payload) return `data:image/png;base64,${payload}`;
  }

  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;

  // Dạng raw -> encode thành ảnh QR (giống fallback đầu tiên của Flutter).
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(
    clean
  )}`;
};

export const PaymentQrModal = ({
  visible,
  checkout,
  targetPlanName,
  onClose,
  onSuccess,
  title,
  subtitle,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { userService } = useServices();

  // Khởi tạo `polling = true` vì modal này chỉ tồn tại khi đang chờ thanh toán.
  // Component cha render kèm `key={paymentRef}` -> mỗi giao dịch mới là
  // instance mới -> state tự về mặc định (không cần effect reset).
  const [polling, setPolling] = useState(true);
  const [expired, setExpired] = useState(false);

  const pollTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setPolling(false);
  }, []);

  /**
   * Poll thanh toán - 2 tầng.
   *
   * Dùng `tickRef` để tự tham chiếu (đệ quy) mà không cần `useCallback` tự
   * phụ thuộc chính nó (eslint `react-hooks/immutability` chặn kiểu đó).
   * `tickRef.current` được gán 1 lần khi mount, sau đó mỗi lần tick gọi
   * qua ref -> luôn trỏ tới hàm mới nhất.
   *
   * @param {string} paymentRef - ref từ response của `POST /subscriptions/subscribe`.
   * @param {string} planName - tên gói đang mua (vd 'family' | 'individual').
   * @param {string|null} expireAt - thời điểm hết hạn link thanh toán (BE cấp 15 phút).
   */
  const tickRef = useRef(null);

  tickRef.current = async (paymentRef, planName, expireAt) => {
    if (!mountedRef.current) return;
    try {
      // Tầng 1: giao dịch đã paid chưa?
      const tx = await userService.getPaymentStatus(paymentRef);
      if (tx?.status === 'paid') {
        // Tầng 2: xác nhận gói đã kích hoạt (và ĐÚNG gói đã mua).
        const ok = await userService.isSubscribedTo(planName);
        if (ok) {
          stopPolling();
          showSuccess(t('subscription.paymentSuccess'));
          onClose?.();
          onSuccess?.();
          return;
        }
      }
    } catch (e) {
      // Lỗi mạng -> thử lại lần sau, KHÔNG dừng poll ngay.
      if (__DEV__) console.warn('[PaymentQrModal] poll error:', e?.message);
    }

    // Đã hết hạn chưa? (BE cấp 15 phút)
    if (expireAt && new Date(expireAt).getTime() < Date.now()) {
      stopPolling();
      setExpired(true);
      return;
    }

    pollTimerRef.current = setTimeout(
      () => tickRef.current?.(paymentRef, planName, expireAt),
      POLL_INTERVAL_MS
    );
  };

  // Bắt đầu poll.
  //
  // Effect này KHÔNG setState đồng bộ: chỉ lên lịch timer đầu tiên. Mọi
  // `setPolling`/`setExpired` nằm BÊN TRONG `tick` (timer callback = async
  // context) -> hợp lệ với eslint `react-hooks/set-state-in-effect`.
  useEffect(() => {
    if (!visible || !checkout?.paymentRef || !targetPlanName) return;
    const { paymentRef, expireAt } = checkout;
    pollTimerRef.current = setTimeout(
      () => tickRef.current?.(paymentRef, targetPlanName, expireAt),
      POLL_INTERVAL_MS
    );
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, checkout?.paymentRef, targetPlanName]);

  const qrUri = toQrUri(checkout?.qrCode);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#142018' : '#FFFFFF',
              borderColor: isDark ? '#2E4D36' : '#E0E8E1',
            },
          ]}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.title,
                  { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(17) },
                ]}
              >
                {title ?? t('subscription.qrTitle')}
              </Text>
              {subtitle ? (
                <Text
                  style={[
                    styles.subtitle,
                    {
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      fontSize: sp(11),
                    },
                  ]}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <X color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={22} />
            </Pressable>
          </View>

          <View style={[styles.qrBox, { backgroundColor: isDark ? '#1E3A25' : '#F4F7F4' }]}>
            {expired ? (
              <View style={styles.expiredBox}>
                <AlertCircle color="#B71C1C" size={28} />
                <Text
                  style={[
                    styles.expiredText,
                    { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) },
                  ]}
                >
                  {t('subscription.paymentExpired')}
                </Text>
                <CustomButton
                  title={t('subscription.tryAgain')}
                  onPress={onClose}
                  height={44}
                  borderRadius={22}
                />
              </View>
            ) : qrUri ? (
              <>
                <Image source={{ uri: qrUri }} style={styles.qrImage} resizeMode="contain" />
                <Text
                  style={[
                    styles.qrHint,
                    { color: isDark ? '#D0D7D1' : AppColors.textSecondary, fontSize: sp(11) },
                  ]}
                >
                  {t('subscription.scanQr')}
                </Text>
                {checkout?.amount ? (
                  <Text style={[styles.amount, { color: AppColors.primary, fontSize: sp(15) }]}>
                    {new Intl.NumberFormat('vi-VN').format(checkout.amount)} đ
                  </Text>
                ) : null}
                {polling ? (
                  <View style={styles.pollingRow}>
                    <ActivityIndicator size="small" color={AppColors.primary} />
                    <Text
                      style={[
                        styles.pollingText,
                        {
                          color: isDark ? '#D0D7D1' : AppColors.textSecondary,
                          fontSize: sp(11),
                        },
                      ]}
                    >
                      {t('subscription.waitingPayment')}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.expiredBox}>
                <AlertCircle color="#B71C1C" size={28} />
                <Text
                  style={[
                    styles.expiredText,
                    { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) },
                  ]}
                >
                  {t('subscription.qrUnavailable')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: sp(20),
  },
  sheet: {
    borderRadius: sp(24),
    borderWidth: 1,
    padding: sp(20),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp(16),
  },
  title: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  qrBox: {
    alignItems: 'center',
    padding: sp(16),
    borderRadius: sp(16),
  },
  qrImage: {
    width: sp(200),
    height: sp(200),
    borderRadius: sp(8),
    backgroundColor: '#FFFFFF',
  },
  qrHint: {
    fontFamily: FontFamily.regular,
    marginTop: sp(10),
    textAlign: 'center',
  },
  amount: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginTop: sp(4),
  },
  pollingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp(10),
  },
  pollingText: {
    fontFamily: FontFamily.regular,
    marginLeft: sp(8),
  },
  expiredBox: {
    alignItems: 'center',
    paddingVertical: sp(16),
  },
  expiredText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginVertical: sp(10),
    textAlign: 'center',
  },
});
