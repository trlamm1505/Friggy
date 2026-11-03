/**
 * PackageManagementScreen - màn "Thông tin gói dịch vụ" (SCREEN A).
 *
 * Sprint A3 (24/10) — theo ảnh tham chiếu 3 + Flutter
 * `Mobile/lib/screens/package_management_screen.dart` (`:974-1490`).
 *
 * NGUỒN SỰ THẬT (KHÔNG hardcode):
 *   - Gói hiện tại : `GET /subscriptions/me`   -> `userService.getMySubscription()`
 *   - Danh sách gói: `GET /subscriptions/plans` -> `userService.getAvailablePackages()`
 *   - Thanh toán   : `POST /subscriptions/subscribe` -> `userService.subscribe(planId)`
 *   - Gia hạn      : `POST /subscriptions/renew`    -> `userService.renewSubscription()`
 *   - Hủy gia hạn  : `DELETE /subscriptions/me/auto-renewal`
 *
 * ⚠️ GIÁ & HẠN MỨC AI: lấy từ API (`pkg.price`, `pkg.aiUsagePerWeek`).
 *   Ảnh tham chiếu ghi 5.000/10.000 VNĐ và 15/17 lượt AI — nhưng BE seed
 *   (`be/prisma/seed.sql:60-62`) là 79.000/149.000 và 15 lượt. Ta KHÔNG bịa
 *   giá trị trong UI, cũng KHÔNG tự chọn giữa 15 và 17 -> dùng đúng số BE trả.
 *
 * ⚠️ MAP TRẠNG THÁI: BE dùng `active | pending | cancelled | expired`.
 *   UI KHÔNG hiển thị raw enum -> map sang nhãn tiếng Việt (xem `statusLabel`).
 *
 * LUỒNG (theo yêu cầu 5. End-to-end):
 *   A (màn này) --"Xem tất cả các gói dịch vụ"--> B (SubscriptionPlansSheet)
 *   B --"Nâng cấp gói"--> tạo/khôi phục giao dịch --> C (PayOSPaymentSheet)
 *   C --"Tôi đã thanh toán"--> xác minh --> refresh A
 *
 * Bảo toàn state màn hình A khi đóng sheet: sheet là `Modal` con, không
 * điều hướng đi nơi khác -> `useAsyncData` không bị remount.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  Star,
  CalendarCheck,
  CalendarX2,
  ShieldCheck,
  Compass,
  Crown,
  Check,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { CustomButton } from '../../components/common/CustomButton';
import { ScreenBackground } from '../../components/common/ScreenBackground';
import { SubscriptionPlansSheet } from '../../components/subscription/SubscriptionPlansSheet';
import { PayOSPaymentSheet } from '../../components/subscription/PayOSPaymentSheet';
import { showError, showSuccess } from '../../utils/helpers';
import { useServices } from '../../../data/ServiceProvider';
import { useAsyncData } from '../../hooks/useServiceHooks';

import packageMascot from '../../../../assets/images/package.png';

/** Định dạng tiền VND kiểu Việt Nam (79.000). */
const formatVnd = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0);

/**
 * Định dạng ngày `YYYY-MM-DD` -> `DD/MM/YYYY`.
 * BE trả `startDate`/`endDate` dạng chuỗi ngày (`subscriptions.service.ts:429`).
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length !== 3) return String(dateStr);
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

/** Map status của BE -> nhãn tiếng Việt. */
export const statusLabel = (status, t) => {
  switch (status) {
    case 'active':
      return t('subscription.statusActive');
    case 'pending':
      return t('subscription.statusPending');
    case 'cancelled':
      return t('subscription.statusCancelled');
    case 'expired':
      return t('subscription.statusExpired');
    default:
      return t('subscription.statusExpired');
  }
};

export const PackageManagementScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { userService } = useServices();
  
  const [subscribingPlanId, setSubscribingPlanId] = useState(null);
  const [plansSheetOpen, setPlansSheetOpen] = useState(false);

  // QR thanh toán (gói individual/family + gia hạn).
  const [qrCheckout, setQrCheckout] = useState(null);
  const [qrPlanName, setQrPlanName] = useState(null);
  const [qrPlanDisplayName, setQrPlanDisplayName] = useState(null);

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

  const currentPlan = currentSub?.plan ?? null;
  const currentPlanName = currentPlan?.name ?? 'free';
  const currentPlanDisplayName = currentPlan?.displayName ?? null;
  const currentStatus = currentSub?.status ?? 'expired';
  const isPaidPlan = Number(currentPlan?.price) > 0;

  /** Làm mới cả gói lẫn subscription (dùng sau khi thanh toán / hủy gia hạn). */
  const refreshAll = useCallback(() => {
    reloadPackages();
    reloadCurrent();
  }, [reloadPackages, reloadCurrent]);

  /**
   * Mua gói: gọi subscribe -> mở sheet QR.
   *
   * Khôi phục QR đang chờ TRƯỚC khi tạo giao dịch mới: BE trả 409 khi đã có
   * giao dịch pending -> Flutter làm đúng vậy (`package_management_screen.dart:252-267`).
   */
  const handleSubscribe = useCallback(
    async (pkg) => {
      if (!pkg?.id) return;
      setSubscribingPlanId(pkg.id);
      try {
        const pending = await userService.findPendingPayment();
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
          const pending = await userService.findPendingPayment();
          if (pending?.qrCode) {
            setQrCheckout(pending);
            setQrPlanName(pkg.name);
            setQrPlanDisplayName(pkg.displayName);
            return;
          }
        } catch {
          // không có pending -> báo lỗi gốc
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
   */
  const handleRenew = useCallback(async () => {
    setSubscribingPlanId('renew');
    try {
      const pending = await userService.findPendingPayment();
      if (pending?.qrCode) {
        setQrCheckout(pending);
        setQrPlanName(currentPlanName);
        setQrPlanDisplayName(currentPlanDisplayName);
        return;
      }

      const checkout = await userService.renewSubscription();
      setQrCheckout(checkout);
      setQrPlanName(currentPlanName);
      setQrPlanDisplayName(currentPlanDisplayName);
    } catch (e) {
      try {
        const pending = await userService.findPendingPayment();
        if (pending?.qrCode) {
          setQrCheckout(pending);
          setQrPlanName(currentPlanName);
          setQrPlanDisplayName(currentPlanDisplayName);
          return;
        }
      } catch {
        // không có pending -> báo lỗi gốc
      }
      showError(e?.message || t('subscription.renewFailed'));
    } finally {
      setSubscribingPlanId(null);
    }
  }, [userService, currentPlanName, currentPlanDisplayName, t]);

  /**
   * Hủy gia hạn tự động (owner của gói trả tiền).
   *
   * Flutter `_confirmCancelAutoRenewal()` `:673-731` — có hộp thoại xác nhận
   * trước khi gọi API (hành động không thể hoàn tác).
   */
  const handleCancelAutoRenew = useCallback(() => {
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
  }, [userService, t, reloadCurrent]);

  const textColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const subTextColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;
  const cardBg = isDark ? AppColors.darkCardBg : '#FFFFFF';
  const cardBorder = isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder;

  const startDate = formatDate(currentSub?.startDate);
  const endDate = formatDate(currentSub?.endDate);

  return (
    <ScreenBackground>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, sp(8)) + sp(8) }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: isDark ? AppColors.darkCardBg : '#FFFFFF',
              borderColor: cardBorder,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <ChevronLeft color={isDark ? '#FFFFFF' : AppColors.headerTextLight} size={sp(22)} strokeWidth={2.4} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : AppColors.headerTextLight, fontSize: sp(23) }]}>
          {t('subscription.infoTitle')}
        </Text>
      </View>

      {loading && !currentSub ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      ) : error && !currentSub ? (
        <View style={styles.centerBox}>
          <Text style={{ color: textColor, marginBottom: sp(12), textAlign: 'center' }}>
            {t('subscription.loadFailed')}
          </Text>
          <CustomButton
            title={t('home.retry')}
            onPress={refreshAll}
            width={160}
            height={46}
            borderRadius={23}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Math.max(insets.bottom, sp(20)) + sp(24) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 1. Banner gói hiện tại ── */}
          <View style={styles.bannerWrap}>
            <LinearGradient
              colors={
                isDark
                  ? [AppColors.premiumBannerDarkTop, AppColors.premiumBannerDarkMid, '#3B724A']
                  : ['#7CB342', '#8BC34A', '#C0CA33']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.banner}
            >
              <View style={styles.bannerContent}>
                <View style={styles.badgeRow}>
                  <View style={styles.badgeIcon}>
                    <Star color="#FFFFFF" size={sp(13)} fill="#FFFFFF" strokeWidth={0} />
                  </View>
                  <Text style={styles.badgeText}>{t('subscription.premiumBadge')}</Text>
                </View>

                <Text style={styles.bannerTitle}>
                  {currentPlan?.displayName || t('subscription.free')}
                </Text>
                <Text style={styles.bannerSub}>
                  {isPaidPlan
                    ? t('subscription.expiresOn', { date: endDate || t('subscription.noLimit') })
                    : t('subscription.freeForever')}
                </Text>
              </View>

              {/* Mascot chồng lên góc phải, KHÔNG che nội dung chữ. */}
              <Image
                source={packageMascot}
                style={styles.mascot}
                resizeMode="contain"
                pointerEvents="none"
              />
            </LinearGradient>
          </View>

          {/* ── 2. Card thông tin gói ── */}
          <View
            style={[
              styles.detailsCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
          >
            <View style={styles.timelineRow}>
              <View style={styles.timelineItem}>
                <CalendarCheck
                  color={isDark ? AppColors.primaryLight : AppColors.primary}
                  size={sp(20)}
                />
                <Text style={[styles.timelineLabel, { color: subTextColor, fontSize: sp(12) }]}>
                  {t('subscription.startDateLabel')}
                </Text>
                <Text style={[styles.timelineValue, { color: textColor, fontSize: sp(14) }]}>
                  {startDate || '-'}
                </Text>
              </View>

              <View
                style={[
                  styles.timelineDivider,
                  { backgroundColor: isDark ? AppColors.darkCardBorder : '#C8E6C9' },
                ]}
              />

              <View style={styles.timelineItem}>
                <CalendarX2
                  color={isDark ? AppColors.primaryLight : AppColors.primary}
                  size={sp(20)}
                />
                <Text style={[styles.timelineLabel, { color: subTextColor, fontSize: sp(12) }]}>
                  {t('subscription.endDateLabel')}
                </Text>
                <Text style={[styles.timelineValue, { color: textColor, fontSize: sp(14) }]}>
                  {endDate || t('subscription.noLimit')}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: isDark ? AppColors.darkCardBorder : '#E8F5E9' },
              ]}
            />

            <View style={styles.statusRow}>
              <View style={styles.statusLeft}>
                <ShieldCheck
                  color={isDark ? AppColors.primaryLight : AppColors.primary}
                  size={sp(18)}
                />
                <Text style={[styles.statusLabel, { color: subTextColor, fontSize: sp(13) }]}>
                  {t('subscription.statusLabel')}
                </Text>
                <Text style={[styles.statusValue, { color: AppColors.primary, fontSize: sp(13) }]}>
                  {statusLabel(currentStatus, t)}
                </Text>
              </View>
              <Text style={[styles.price, { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(14) }]}>
                {formatVnd(currentPlan?.price)} VNĐ
              </Text>
            </View>

            {/* Nút gia hạn / hủy gia hạn (chỉ với gói trả phí). */}
            {isPaidPlan ? (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: isDark ? AppColors.darkCardBorder : '#E8F5E9' },
                  ]}
                />
                <View style={styles.actionRow}>
                  <View style={styles.actionItem}>
                    <CustomButton
                      title={t('subscription.renewPlan')}
                      onPress={handleRenew}
                      loading={subscribingPlanId === 'renew'}
                      icon={<Crown color="#FFFFFF" size={sp(15)} />}
                      height={42}
                      borderRadius={21}
                      textStyle={{ fontSize: sp(13) }}
                    />
                  </View>
                  {currentSub?.autoRenew ? (
                    <View style={styles.actionItem}>
                      <CustomButton
                        title={t('subscription.cancelAutoRenew')}
                        onPress={handleCancelAutoRenew}
                        variant="outline"
                        height={42}
                        borderRadius={21}
                        textStyle={{ fontSize: sp(12), color: isDark ? '#FF8A80' : AppColors.error }}
                        style={{
                          borderColor: isDark ? '#FF8A80' : AppColors.error,
                          borderWidth: 1.4,
                        }}
                      />
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>

          {/* ── 3. Đặc quyền ── */}
          <Text style={[styles.benefitsTitle, { color: textColor, fontSize: sp(18) }]}>
            {t('subscription.benefitsTitle')}
          </Text>

          {Array.isArray(currentPlan?.features) && currentPlan.features.length > 0 ? (
            currentPlan.features.map((feat, i) => (
              <View
                key={`${currentPlanName}-${i}`}
                style={[
                  styles.benefitCard,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
              >
                <View
                  style={[
                    styles.benefitIcon,
                    { backgroundColor: isDark ? AppColors.darkIconBg : '#E8F5E9' },
                  ]}
                >
                  <Check color={AppColors.primary} size={sp(18)} strokeWidth={3} />
                </View>
                <Text style={[styles.benefitText, { color: textColor, fontSize: sp(14) }]}>
                  {feat}
                </Text>
              </View>
            ))
          ) : (
            <View
              style={[
                styles.benefitCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              <View
                style={[
                  styles.benefitIcon,
                  { backgroundColor: isDark ? AppColors.darkIconBg : '#E8F5E9' },
                ]}
              >
                <Check color={AppColors.primary} size={sp(18)} strokeWidth={3} />
              </View>
              <Text style={[styles.benefitText, { color: textColor, fontSize: sp(14) }]}>
                {t('subscription.benefitsTitle')}
              </Text>
            </View>
          )}

          {/* ── 4. Nút xem tất cả gói ── */}
          <View style={styles.viewAllWrap}>
            <CustomButton
              title={t('subscription.viewAllPlans')}
              onPress={() => setPlansSheetOpen(true)}
              icon={<Compass color="#FFFFFF" size={sp(20)} />}
              height={52}
              borderRadius={26}
              style={styles.viewAllBtn}
            />
          </View>
        </ScrollView>
      )}

      {/* ── SCREEN B: danh sách gói ── */}
      <SubscriptionPlansSheet
        visible={plansSheetOpen}
        onClose={() => setPlansSheetOpen(false)}
        packages={packages || []}
        currentPlanName={currentPlanName}
        currentStatus={currentStatus}
        autoRenew={currentSub?.autoRenew === true}
        loading={loading}
        subscribingPlanId={subscribingPlanId}
        onSelectPlan={(pkg) => {
          setPlansSheetOpen(false);
          handleSubscribe(pkg);
        }}
        onRenew={() => {
          setPlansSheetOpen(false);
          handleRenew();
        }}
        onCancelAutoRenew={() => {
          setPlansSheetOpen(false);
          handleCancelAutoRenew();
        }}
      />

      {/* ── SCREEN C: QR PayOS ── */}
      <PayOSPaymentSheet
        key={qrCheckout?.paymentRef ?? 'no-checkout'}
        visible={!!qrCheckout}
        checkout={qrCheckout}
        targetPlanName={qrPlanName}
        targetPlanDisplayName={qrPlanDisplayName}
        onClose={() => setQrCheckout(null)}
        onSuccess={refreshAll}
      />
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(20),
    paddingBottom: sp(10),
  },
  backBtn: {
    width: sp(40),
    height: sp(40),
    borderRadius: sp(20),
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginLeft: sp(14),
    flex: 1,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp(24),
  },
  scroll: {
    paddingHorizontal: sp(20),
    paddingTop: sp(6),
  },

  // ── Banner ──
  bannerWrap: {
    marginTop: sp(4),
  },
  banner: {
    borderRadius: sp(26),
    paddingLeft: sp(20),
    paddingRight: sp(112),
    paddingVertical: sp(20),
    overflow: 'hidden',
    minHeight: sp(120),
    justifyContent: 'center',
  },
  bannerContent: {
    zIndex: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    width: sp(22),
    height: sp(22),
    borderRadius: sp(11),
    backgroundColor: '#FFB74D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    fontSize: sp(12),
    letterSpacing: sp(0.6),
    marginLeft: sp(6),
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    fontSize: sp(22),
    marginTop: sp(8),
  },
  bannerSub: {
    color: 'rgba(255,255,255,0.95)',
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    fontSize: sp(13),
    marginTop: sp(4),
  },
  mascot: {
    position: 'absolute',
    right: -sp(6),
    top: -sp(10),
    bottom: -sp(10),
    width: sp(130),
  },

  // ── Card thông tin ──
  detailsCard: {
    borderRadius: sp(22),
    borderWidth: 1.2,
    padding: sp(18),
    marginTop: sp(20),
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  timelineDivider: {
    width: 1,
    height: sp(38),
    marginHorizontal: sp(10),
  },
  timelineLabel: {
    fontFamily: FontFamily.regular,
    marginTop: sp(6),
  },
  timelineValue: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginTop: sp(2),
  },
  divider: {
    height: 1,
    marginVertical: sp(14),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusLabel: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginLeft: sp(6),
  },
  statusValue: {
    fontFamily: FontFamily.extrabold,
    fontWeight: FontWeights.extrabold,
    marginLeft: sp(4),
  },
  price: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginLeft: sp(8),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionItem: {
    flex: 1,
    marginRight: sp(8),
  },

  // ── Đặc quyền ──
  benefitsTitle: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginTop: sp(24),
    marginBottom: sp(12),
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: sp(16),
    borderWidth: 1,
    paddingHorizontal: sp(16),
    paddingVertical: sp(12),
    marginBottom: sp(10),
  },
  benefitIcon: {
    width: sp(32),
    height: sp(32),
    borderRadius: sp(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginLeft: sp(12),
    flex: 1,
  },

  // ── Nút xem tất cả ──
  viewAllWrap: {
    marginTop: sp(18),
  },
  viewAllBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
});
