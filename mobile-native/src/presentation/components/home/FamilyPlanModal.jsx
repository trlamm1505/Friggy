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
 *   - Poll 2 tầng, mỗi 3 giây (`family_plan_modal.dart:201`) — đã tách sang
 *     `PaymentQrModal` dùng chung (24/10) vì `PackageManagementScreen` cũng
 *     cần hiện QR cho gói non-family.
 *   - `expireAt` (15 phút): Flutter parse xong bỏ qua, poll vô hạn. RN DỪNG poll
 *     khi hết hạn và báo user (tránh poll 3s vô tận).
 *
 * ⚠️ 24/10 - BỎ ô "nhập token lời mời" khỏi modal này:
 *   Flutter `family_plan_modal.dart` KHÔNG có ô token (grep toàn file: 0 kết quả).
 *   Ô token thuộc về DIALOG RIÊNG (`family_management_screen.dart:349-433`).
 *   RN trước đó nhét ô token vào paywall -> lệch Flutter + trùng chức năng.
 *   => Tách ra `FamilyTokenDialog.jsx` (24/10), dùng ở `FamilyManagementScreen`.
 *
 * R2: mọi URL ảnh đi qua `appConfig.getImageUrl()` - riêng QR là data từ PayOS,
 *     không đi qua appConfig (đã là URL tuyệt đối hoặc data URI).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { X, Users, Check } from 'lucide-react-native';
import { CustomButton } from '../common/CustomButton';
import { PayOSPaymentSheet } from '../subscription/PayOSPaymentSheet';
import { useServices } from '../../../data/ServiceProvider';
import { showError } from '../../utils/helpers';

export const FamilyPlanModal = ({ visible, onClose, onSuccess }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { userService } = useServices();

  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState(null);
  // Tên hiển thị gói để dựng đúng `description` mà BE gửi PayOS.
  const [familyPlanDisplayName, setFamilyPlanDisplayName] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // KHÔNG có effect reset state ở đây.
  //
  // eslint react-hooks/set-state-in-effect cấm setState đồng bộ trong effect.
  // Cách sạch: component được REMOUNT bằng `key` mỗi khi đóng/mở
  // (<FamilyPlanModal key={planModalOpen ? 'open' : 'closed'} />) -> state tự về
  // mặc định, và cleanup effect bên dưới đã clear poll timer khi unmount.
  // => Không cần effect reset.

  /** Mua gói Family: subscribe -> hiện QR -> poll (trong PaymentQrModal). */
  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const packages = await userService.getAvailablePackages();
      // BE `SubscriptionPlanResponseDto.name` = 'free' | 'individual' | 'family'
      const familyPlan = packages.find((p) => p.name === 'family');
      if (!familyPlan) {
        showError(t('familyPlan.planNotFound'));
        return;
      }
      if (mountedRef.current) setFamilyPlanDisplayName(familyPlan.displayName ?? null);

      // Khôi phục QR đang chờ (nếu có) trước khi tạo giao dịch mới.
      // BE trả 409 khi đã có giao dịch pending -> Flutter làm đúng vậy
      // (`package_management_screen.dart:252-267`): tra cứu lại và mở QR cũ.
      const pending = await userService.findPendingPayment();
      if (pending?.qrCode) {
        if (!mountedRef.current) return;
        setCheckout(pending);
        return;
      }

      const result = await userService.subscribe(familyPlan.id);
      if (!mountedRef.current) return;
      setCheckout(result);
    } catch (e) {
      if (__DEV__) console.warn('[FamilyPlanModal] subscribe error:', e?.message);
      showError(e?.message || t('familyPlan.subscribeFailed'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userService, t]);

  return (
    <>
      <Modal
        visible={visible && !checkout}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
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
              <View style={[styles.iconWrap, { backgroundColor: AppColors.primary }]}>
                <Users color="#FFFFFF" size={20} strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1, marginLeft: sp(12) }}>
                <Text
                  style={[
                    styles.title,
                    { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(17) },
                  ]}
                >
                  {t('familyPlan.title')}
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    {
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      fontSize: sp(11),
                    },
                  ]}
                >
                  {t('familyPlan.subtitle')}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <X color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={22} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* ── Danh sách tính năng ── */}
              {[t('familyPlan.feature1'), t('familyPlan.feature2'), t('familyPlan.feature3')].map(
                (f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <View style={[styles.checkWrap, { backgroundColor: AppColors.primary }]}>
                      <Check color="#FFFFFF" size={12} strokeWidth={3} />
                    </View>
                    <Text
                      style={[
                        styles.featureText,
                        { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) },
                      ]}
                    >
                      {f}
                    </Text>
                  </View>
                )
              )}
            </ScrollView>

            {/* ── Nút hành động chính ── */}
            <View style={{ marginTop: sp(12) }}>
              <CustomButton
                title={t('familyPlan.upgrade')}
                onPress={handleSubscribe}
                loading={loading}
                icon={<Users color="#FFFFFF" size={18} />}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── QR thanh toán (bottom sheet PayOS dùng chung) ── */}
      <PayOSPaymentSheet
        key={checkout?.paymentRef ?? 'no-checkout'}
        visible={visible && !!checkout}
        checkout={checkout}
        targetPlanName="family"
        targetPlanDisplayName={familyPlanDisplayName}
        onClose={() => {
          setCheckout(null);
          onClose?.();
        }}
        onSuccess={onSuccess}
      />
    </>
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
});
