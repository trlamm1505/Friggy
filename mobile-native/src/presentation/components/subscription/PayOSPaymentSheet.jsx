/**
 * PayOSPaymentSheet - bottom sheet thanh toán PayOS (SCREEN C).
 *
 * Sprint A3 (24/10) — theo ảnh tham chiếu 2 (`package_management_screen.dart`
 * của Flutter, `_showQrPaymentModal()` `:309-615`).
 *
 * ⚠️ QUAN HỆ VỚI `PaymentQrModal`:
 *   `PaymentQrModal` (giữ nguyên) là modal QR dùng cho paywall Gói Gia Đình
 *   (`FamilyPlanModal`). Sheet này là biến thể BOTTOM SHEET dùng cho màn
 *   "Thông tin gói dịch vụ" — khác layout (kéo handle, bo góc trên, nút
 *   "Tôi đã thanh toán") theo ảnh tham chiếu.
 *
 * LOGIC POLL (giống Flutter `:321-360`):
 *   Tầng 1: `GET /payment-transactions/me/:paymentRef` -> `status === 'paid'`
 *   Tầng 2: `GET /subscriptions/me` -> `status === 'active'` VÀ `plan.name` KHỚP
 *   Poll mỗi 3 giây, DỪNG khi hết `expireAt` (BE cấp 15 phút).
 *
 * ⚠️ BẮT BUỘC check CẢ `status` VÀ `plan` ở tầng 2 — nếu chỉ check `status`
 *   thì user đang gói Individual bấm nâng cấp Family sẽ thấy "thành công" ngay
 *   khi CHƯA thanh toán (BUG Flutter `package_management_screen.dart:347`).
 *
 * ⚠️ KHÔNG BAO GIỜ bịa dữ liệu thanh toán:
 *   - QR lấy nguyên từ `checkout.qrCode` (BE trả base64 từ PayOS).
 *   - Số tiền lấy từ `checkout.amount` (BE `SubscribeResponseDto.amount`).
 *   - Mã tham chiếu lấy từ `checkout.paymentRef` (BE `FRIGGY-<orderCode>`).
 *   - Nội dung chuyển khoản: BE dùng `description = "Friggy <tên gói>"` khi
 *     tạo payment link PayOS (`subscriptions.service.ts:128`) — hiển thị đúng
 *     giá trị này, KHÔNG tự chế.
 *
 * ⚠️ VỀ ESLINT `react-hooks/set-state-in-effect`:
 *   Component này KHÔNG reset state trong effect. Component CHA render kèm
 *   `key={paymentRef}` -> mỗi giao dịch mới là 1 instance mới -> state tự về
 *   mặc định. `setPolling`/`setExpired` chỉ được gọi BÊN TRONG timer callback.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { QrCode, RefreshCcw, AlertCircle } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { CustomButton } from '../common/CustomButton';
import { useServices } from '../../../data/ServiceProvider';
import { showSuccess, showError } from '../../utils/helpers';

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

/**
 * Nội dung chuyển khoản.
 *
 * BE tạo payment link với `description = "Friggy <displayName gói>"`
 * (`be/src/modules-api/subscriptions/subscriptions.service.ts:128`). Ta dựng
 * lại từ tên gói để khớp đúng chuỗi BE gửi cho PayOS — KHÔNG bịa số tiền.
 *
 * @param {string} planName - tên gói (vd 'individual')
 * @param {string} planDisplayName - tên hiển thị (vd 'Gói Cá Nhân')
 * @returns {string}
 */
export const buildTransferDescription = (planName, planDisplayName) => {
  const label = planDisplayName || planName || '';
  return label ? `Friggy ${label}` : 'Friggy';
};

export const PayOSPaymentSheet = ({
  visible,
  checkout,
  targetPlanName,
  targetPlanDisplayName,
  onClose,
  onSuccess,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { userService } = useServices();

  const [polling, setPolling] = useState(true);
  const [expired, setExpired] = useState(false);
  const [checking, setChecking] = useState(false);

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
   * Kiểm tra trạng thái thanh toán - 2 tầng.
   *
   * Dùng `tickRef` để tự tham chiếu (đệ quy) mà không cần `useCallback` tự
   * phụ thuộc chính nó (eslint `react-hooks/immutability` chặn kiểu đó).
   *
   * @param {string} paymentRef - ref từ response của `POST /subscriptions/subscribe`.
   * @param {string} planName - tên gói đang mua (vd 'family' | 'individual').
   * @param {string|null} expireAt - thời điểm hết hạn link thanh toán.
   * @returns {Promise<boolean>} true = đã thanh toán thành công.
   */
  const tickRef = useRef(null);

  tickRef.current = async (paymentRef, planName, expireAt) => {
    if (!mountedRef.current) return false;
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
          return true;
        }
      }
    } catch (e) {
      // Lỗi mạng -> thử lại lần sau, KHÔNG dừng poll ngay.
      if (__DEV__) console.warn('[PayOSPaymentSheet] poll error:', e?.message);
    }

    // Đã hết hạn chưa? (BE cấp 15 phút)
    if (expireAt && new Date(expireAt).getTime() < Date.now()) {
      stopPolling();
      setExpired(true);
      return false;
    }

    pollTimerRef.current = setTimeout(
      () => tickRef.current?.(paymentRef, planName, expireAt),
      POLL_INTERVAL_MS
    );
    return false;
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
  const paymentRef = checkout?.paymentRef ?? null;

  /**
   * Nút "Tôi đã thanh toán (Kiểm tra ngay)".
   *
   * Gọi API kiểm tra NGAY (không chờ poll 3 giây) — giống Flutter
   * `:504-570`. Chặn submit trùng bằng state `checking`.
   */
  const handleCheckNow = useCallback(async () => {
    if (checking) return;
    if (!paymentRef || !targetPlanName) {
      showError(t('subscription.paymentCheckFailed'));
      return;
    }

    setChecking(true);
    try {
      const tx = await userService.getPaymentStatus(paymentRef);
      const paid = tx?.status === 'paid';

      if (paid) {
        const ok = await userService.isSubscribedTo(targetPlanName);
        if (ok) {
          stopPolling();
          showSuccess(t('subscription.paymentSuccess'));
          onClose?.();
          onSuccess?.();
          return;
        }
        // Đã trả tiền nhưng gói chưa kích hoạt -> báo pending, giữ sheet mở.
        showError(t('subscription.paymentPending'));
        return;
      }

      // Chưa thanh toán -> giữ sheet mở, báo rõ cho user.
      showError(t('subscription.paymentPending'));
    } catch (e) {
      if (__DEV__) console.warn('[PayOSPaymentSheet] check error:', e?.message);
      showError(e?.message || t('subscription.paymentCheckFailed'));
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  }, [checking, paymentRef, targetPlanName, userService, t, stopPolling, onClose, onSuccess]);

  const sheetBg = isDark ? AppColors.darkSurface : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const subTextColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;
  const cardBg = isDark ? AppColors.darkIconBg : '#F1F8E9';
  const cardBorder = isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder;

  const transferDescription = buildTransferDescription(targetPlanName, targetPlanDisplayName);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={onClose} accessibilityLabel="close" />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              paddingBottom: Math.max(insets.bottom, sp(16)),
            },
          ]}
        >
          {/* Grip handle */}
          <View style={styles.handleWrap}>
            <View
              style={[
                styles.handle,
                { backgroundColor: isDark ? AppColors.darkCardBorder : '#E2E8E4' },
              ]}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <QrCode color={AppColors.primary} size={sp(28)} strokeWidth={2.2} />
              <Text style={[styles.title, { color: textColor, fontSize: sp(21) }]}>
                {t('subscription.payosSheetTitle')}
              </Text>
            </View>

            <Text style={[styles.subtitle, { color: subTextColor, fontSize: sp(13) }]}>
              {t('subscription.payosSheetSubtitle')}
            </Text>

            {/* QR code */}
            <View style={styles.qrCard}>
              {expired ? (
                <View style={styles.stateBox}>
                  <AlertCircle color={AppColors.error} size={sp(28)} />
                  <Text style={[styles.stateText, { color: textColor, fontSize: sp(13) }]}>
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
                <Image
                  source={{ uri: qrUri }}
                  style={styles.qrImage}
                  resizeMode="contain"
                  accessibilityLabel={t('subscription.payosSheetTitle')}
                />
              ) : (
                <View style={styles.stateBox}>
                  <ActivityIndicator color={AppColors.primary} />
                  <Text style={[styles.stateText, { color: subTextColor, fontSize: sp(13) }]}>
                    {t('subscription.qrUnavailable')}
                  </Text>
                </View>
              )}
            </View>

            {/* Payment summary */}
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: subTextColor, fontSize: sp(13) }]}>
                  {t('subscription.amountLabel')}
                </Text>
                <Text style={[styles.summaryValue, { color: AppColors.primary, fontSize: sp(17) }]}>
                  {new Intl.NumberFormat('vi-VN').format(checkout?.amount || 0)} VNĐ
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: subTextColor, fontSize: sp(13) }]}>
                  {t('subscription.paymentRefLabel')}
                </Text>
                <Text
                  style={[styles.summaryValueSmall, { color: textColor, fontSize: sp(13) }]}
                  numberOfLines={2}
                >
                  {checkout?.paymentRef || '-'}
                </Text>
              </View>

              {/* Nội dung chuyển khoản — khớp `description` BE gửi cho PayOS. */}
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: subTextColor, fontSize: sp(13) }]}>
                  {t('subscription.transferContentLabel')}
                </Text>
                <Text
                  style={[styles.summaryValueSmall, { color: textColor, fontSize: sp(13) }]}
                  numberOfLines={2}
                >
                  {transferDescription}
                </Text>
              </View>
            </View>

            {polling ? (
              <View style={styles.pollingRow}>
                <ActivityIndicator size="small" color={AppColors.primary} />
                <Text style={[styles.pollingText, { color: subTextColor, fontSize: sp(11) }]}>
                  {t('subscription.waitingPayment')}
                </Text>
              </View>
            ) : null}

            {/* Nút kiểm tra thanh toán */}
            <CustomButton
              title={t('subscription.checkPaidNow')}
              onPress={handleCheckNow}
              loading={checking}
              icon={<RefreshCcw color="#FFFFFF" size={18} />}
              height={52}
              borderRadius={26}
              style={styles.checkButton}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: sp(28),
    borderTopRightRadius: sp(28),
    paddingHorizontal: sp(22),
    paddingTop: sp(10),
  },
  handleWrap: {
    alignItems: 'center',
    paddingBottom: sp(14),
  },
  handle: {
    width: sp(40),
    height: sp(5),
    borderRadius: sp(3),
  },
  scrollContent: {
    paddingBottom: sp(8),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginLeft: sp(8),
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    marginTop: sp(10),
    marginBottom: sp(16),
  },
  qrCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: sp(20),
    paddingVertical: sp(18),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  qrImage: {
    width: sp(220),
    height: sp(220),
  },
  stateBox: {
    alignItems: 'center',
    paddingVertical: sp(24),
  },
  stateText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginVertical: sp(10),
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: sp(16),
    borderWidth: 1,
    padding: sp(14),
    marginTop: sp(16),
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp(5),
  },
  summaryLabel: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    flexShrink: 0,
    marginRight: sp(10),
  },
  summaryValue: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    flexShrink: 1,
    textAlign: 'right',
  },
  summaryValueSmall: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    flex: 1,
    textAlign: 'right',
  },
  pollingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: sp(12),
  },
  pollingText: {
    fontFamily: FontFamily.regular,
    marginLeft: sp(8),
  },
  checkButton: {
    marginTop: sp(18),
  },
});
