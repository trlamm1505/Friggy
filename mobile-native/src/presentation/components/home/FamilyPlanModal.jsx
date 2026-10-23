/**
 * FamilyPlanModal - paywall nâng cấp lên Gói Gia Đình + QR PayOS.
 *
 * Sprint A3. Tham chiếu Flutter: `Mobile/lib/widgets/family_plan_modal.dart` (761 dòng).
 *
 * Đối chiếu 23/10 với BE + Flutter:
 *   - BE `POST /subscriptions/subscribe` trả `SubscribeResponseDto`:
 *     `{ checkoutUrl, qrCode, paymentRef, amount, expireAt, status }`
 *   - Flutter hiện **ảnh QR**, BỎ QUA `checkoutUrl` (không có `url_launcher`/
 *     `webview` trong `pubspec.yaml`) => RN làm y hệt: hien QR, KHONG mo browser.
 *   - Flutter poll 2 tầng, mỗi 3 giây (`family_plan_modal.dart:201`):
 *       1. `GET /payment-transactions/me/:paymentRef` -> `status === 'paid'`
 *       2. `GET /subscriptions/me` -> `status === 'active'` + plan KHỚP
 *     => RN kiểm CẢ 2 (chống bug Flutter `package_management_screen.dart:347`
 *        chỉ check `status` nên báo thành công sớm khi user đang ở gói khác).
 *   - `expireAt` (15 phút): Flutter parse xong bỏ qua, poll vô hạn. RN DỪNG poll
 *     khi hết hạn và báo user (tránh poll 3s vô tận).
 *
 * R2: mọi URL ảnh đi qua `appConfig.getImageUrl()` - riêng QR là data từ PayOS,
 *     không đi qua appConfig (đã là URL tuyệt đối hoặc data URI).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { X, Users, Check, CreditCard, AlertCircle } from 'lucide-react-native';
import { CustomButton } from '../common/CustomButton';
import { useServices } from '../../../data/ServiceProvider';
import { showSuccess, showError, showInfo } from '../../utils/helpers';

/** Chu kỳ poll thanh toán (giống Flutter `:321-360`). */
const POLL_INTERVAL_MS = 3000;

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
 */
const toQrUri = (qr) => {
  if (!qr) return null;
  if (qr.startsWith('data:image')) return qr;
  if (qr.startsWith('http://') || qr.startsWith('https://')) return qr;
  // Dạng raw -> encode thành ảnh QR (giống fallback đầu tiên của Flutter).
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(
    qr
  )}`;
};

export const FamilyPlanModal = ({ visible, onClose, onSuccess }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { userService } = useServices();

  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [polling, setPolling] = useState(false);
  const [expired, setExpired] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

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

  // Reset state khi đóng modal.
  useEffect(() => {
    if (!visible) {
      stopPolling();
      setCheckout(null);
      setExpired(false);
      setTokenInput('');
    }
  }, [visible, stopPolling]);

  /**
   * Poll thanh toán - 2 tầng, giống Flutter nhưng CHẶT HƠN (check plan khớp).
   *
   * @param {string} paymentRef - ref từ response của `POST /subscriptions/subscribe`.
   * @param {string} targetPlanName - tên gói đang mua (vd 'family').
   * @param {string|null} expireAt - thời điểm hết hạn link thanh toán (BE cấp 15 phút).
   */
  const startPolling = useCallback(
    (paymentRef, targetPlanName, expireAt) => {
      setPolling(true);

      const tick = async () => {
        if (!mountedRef.current) return;
        try {
          // Tầng 1: giao dịch đã paid chưa?
          const tx = await userService.getPaymentStatus(paymentRef);
          if (tx?.status === 'paid') {
            // Tầng 2: xác nhận gói đã kích hoạt (và ĐÚNG gói đã mua).
            const ok = await userService.isSubscribedTo(targetPlanName);
            if (ok) {
              stopPolling();
              showSuccess(t('familyPlan.activated'));
              onClose?.();
              onSuccess?.();
              return;
            }
          }
        } catch (e) {
          // Lỗi mạng -> thử lại lần sau, KHÔNG dừng poll ngay.
          if (__DEV__) console.warn('[FamilyPlanModal] poll error:', e?.message);
        }

        // Đã hết hạn chưa? (BE cấp 15 phút)
        if (expireAt && new Date(expireAt).getTime() < Date.now()) {
          stopPolling();
          setExpired(true);
          return;
        }

        pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
      };

      pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
    },
    [userService, t, stopPolling, onClose, onSuccess]
  );

  /** Mua gói Family: subscribe -> hiện QR -> bắt đầu poll. */
  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    setExpired(false);
    try {
      const packages = await userService.getAvailablePackages();
      // BE `SubscriptionPlanResponseDto.name` = 'free' | 'individual' | 'family'
      const familyPlan = packages.find((p) => p.name === 'family');
      if (!familyPlan) {
        showError(t('familyPlan.planNotFound'));
        return;
      }

      const result = await userService.subscribe(familyPlan.id);
      if (!mountedRef.current) return;
      setCheckout(result);
      startPolling(result.paymentRef, familyPlan.name, result.expireAt);
    } catch (e) {
      if (__DEV__) console.warn('[FamilyPlanModal] subscribe error:', e?.message);
      showError(e?.message || t('familyPlan.subscribeFailed'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userService, t, startPolling]);

  /** Nhập token từ email mời -> `POST /family/accept`. */
  const handleAcceptInvite = useCallback(async () => {
    const token = tokenInput.trim();
    if (!token) {
      showInfo(t('familyPlan.enterToken'));
      return;
    }
    try {
      const res = await userService.acceptFamilyInvite(token);
      showSuccess(res?.message || t('familyPlan.acceptSuccess'));
      setTokenInput('');
      onClose?.();
      onSuccess?.();
    } catch (e) {
      showError(e?.message || t('familyPlan.acceptFailed'));
    }
  }, [userService, tokenInput, t, onClose, onSuccess]);

  const qrUri = toQrUri(checkout?.qrCode);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: isDark ? '#142018' : '#FFFFFF', borderColor: isDark ? '#2E4D36' : '#E0E8E1' },
          ]}
        >
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: AppColors.primary }]}>
              <Users color="#FFFFFF" size={20} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1, marginLeft: sp(12) }}>
              <Text style={[styles.title, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(17) }]}>
                {t('familyPlan.title')}
              </Text>
              <Text style={[styles.subtitle, { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(11) }]}>
                {t('familyPlan.subtitle')}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <X color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={22} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* ── Trạng thái thanh toán ── */}
            {checkout ? (
              <View style={[styles.qrBox, { backgroundColor: isDark ? '#1E3A25' : '#F4F7F4' }]}>
                {expired ? (
                  <View style={styles.expiredBox}>
                    <AlertCircle color="#B71C1C" size={28} />
                    <Text style={[styles.expiredText, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) }]}>
                      {t('familyPlan.expired')}
                    </Text>
                    <CustomButton
                      title={t('familyPlan.tryAgain')}
                      onPress={handleSubscribe}
                      loading={loading}
                      height={44}
                      borderRadius={22}
                    />
                  </View>
                ) : qrUri ? (
                  <>
                    <Image source={{ uri: qrUri }} style={styles.qrImage} resizeMode="contain" />
                    <Text style={[styles.qrHint, { color: isDark ? '#D0D7D1' : AppColors.textSecondary, fontSize: sp(11) }]}>
                      {t('familyPlan.scanQr')}
                    </Text>
                    {checkout.amount ? (
                      <Text style={[styles.amount, { color: AppColors.primary, fontSize: sp(15) }]}>
                        {new Intl.NumberFormat('vi-VN').format(checkout.amount)} đ
                      </Text>
                    ) : null}
                    {polling ? (
                      <View style={styles.pollingRow}>
                        <ActivityIndicator size="small" color={AppColors.primary} />
                        <Text style={[styles.pollingText, { color: isDark ? '#D0D7D1' : AppColors.textSecondary, fontSize: sp(11) }]}>
                          {t('familyPlan.waitingPayment')}
                        </Text>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <View style={styles.expiredBox}>
                    <AlertCircle color="#B71C1C" size={28} />
                    <Text style={[styles.expiredText, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) }]}>
                      {t('familyPlan.qrUnavailable')}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <>
                {/* ── Danh sách tính năng ── */}
                {[t('familyPlan.feature1'), t('familyPlan.feature2'), t('familyPlan.feature3')].map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <View style={[styles.checkWrap, { backgroundColor: AppColors.primary }]}>
                      <Check color="#FFFFFF" size={12} strokeWidth={3} />
                    </View>
                    <Text style={[styles.featureText, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) }]}>
                      {f}
                    </Text>
                  </View>
                ))}

                {/* ── Nhập token lời mời ── */}
                <View style={[styles.tokenBox, { backgroundColor: isDark ? '#1E3A25' : '#F4F7F4' }]}>
                  <Text style={[styles.tokenLabel, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) }]}>
                    {t('familyPlan.haveInviteToken')}
                  </Text>
                  <TextInput
                    value={tokenInput}
                    onChangeText={setTokenInput}
                    placeholder={t('familyPlan.tokenPlaceholder')}
                    placeholderTextColor={isDark ? '#6B7C71' : '#9AA79E'}
                    style={[
                      styles.tokenInput,
                      {
                        backgroundColor: isDark ? '#142018' : '#FFFFFF',
                        borderColor: isDark ? '#2E4D36' : '#E0E8E1',
                        color: isDark ? '#FFFFFF' : AppColors.textPrimary,
                        fontSize: sp(13),
                      },
                    ]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <CustomButton
                    title={t('familyPlan.acceptInvite')}
                    onPress={handleAcceptInvite}
                    variant="outline"
                    height={44}
                    borderRadius={22}
                    icon={<CreditCard color={AppColors.primary} size={16} />}
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* ── Nút hành động chính ── */}
          {!checkout ? (
            <View style={{ marginTop: sp(12) }}>
              <CustomButton
                title={t('familyPlan.upgrade')}
                onPress={handleSubscribe}
                loading={loading}
                icon={<Users color="#FFFFFF" size={18} />}
              />
            </View>
          ) : null}
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
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp(16),
  },
  iconWrap: {
    width: sp(40),
    height: sp(40),
    borderRadius: sp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp(10),
  },
  checkWrap: {
    width: sp(20),
    height: sp(20),
    borderRadius: sp(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontFamily: FontFamily.regular,
    marginLeft: sp(10),
    flex: 1,
  },
  tokenBox: {
    marginTop: sp(12),
    padding: sp(14),
    borderRadius: sp(14),
  },
  tokenLabel: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginBottom: sp(8),
  },
  tokenInput: {
    borderWidth: 1,
    borderRadius: sp(10),
    paddingHorizontal: sp(12),
    paddingVertical: sp(10),
    marginBottom: sp(10),
    fontFamily: FontFamily.regular,
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
