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

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
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
import { SubscriptionRecoveryBanner } from '../../components/subscription/SubscriptionRecoveryBanner';
import { useSubscriptionManagement } from '../../hooks/useSubscriptionManagement';
import { statusLabel } from '../../utils/subscriptionStatus';

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

/**
 * Map status của BE -> nhãn tiếng Việt.
 *
 * ⚠️ 19/11 — logic đã tách ra `src/presentation/utils/subscriptionStatus.js`
 *   để dùng chung với màn "Gói của tôi" (`MyPackagesScreen`) mà không phải
 *   import chéo giữa 2 màn hình.
 *
 * ⚠️ Re-export để giữ tương thích import cũ (`SubscriptionFlow.test.js`).
 */
export { statusLabel } from '../../utils/subscriptionStatus';

export const PackageManagementScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [plansSheetOpen, setPlansSheetOpen] = useState(false);

  const {
    packages,
    currentSub,
    currentPlan,
    currentPlanName,
    currentStatus,
    isPaidPlan,
    isSubscriptionActive,
    canRenew,
    canCancelAutoRenew,
    loading,
    error,
    subscribingPlanId,
    qrCheckout,
    qrPlanName,
    qrPlanDisplayName,
    qrIsRenew,
    recoveryNotice,
    canResumePayment,
    refreshAll,
    handleSubscribe,
    handleRenew,
    handleCancelAutoRenew,
    handleResumePendingPayment,
    closeQr,
  } = useSubscriptionManagement({ t });

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
          <ChevronLeft
            color={isDark ? '#FFFFFF' : AppColors.headerTextLight}
            size={sp(22)}
            strokeWidth={2.4}
          />
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            { color: isDark ? '#FFFFFF' : AppColors.headerTextLight, fontSize: sp(23) },
          ]}
        >
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
          <View style={[styles.detailsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
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
              <Text
                style={[
                  styles.price,
                  { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(14) },
                ]}
              >
                {formatVnd(currentPlan?.price)} VNĐ
              </Text>
            </View>

            {/* ⚠️ Gói trả phí nhưng KHÔNG `active` -> BE `POST /subscriptions/renew`
                sẽ trả 404 "Không có gói đang hoạt động".
                Báo rõ để user biết (vẫn giữ nút gia hạn để mở lại QR cũ
                đang chờ nếu có). */}
            {isPaidPlan && !isSubscriptionActive ? (
              <Text style={[styles.noticeText, { color: subTextColor, fontSize: sp(12) }]}>
                {t('subscription.renewNotActive')}
              </Text>
            ) : null}

            {/* ⚠️ 19/11 — "Đã thanh toán nhưng gói chưa được ghi nhận".
                BE ghi đè `planId` về free khi webhook PayOS không về -> nếu không
                cảnh báo, user tưởng mất tiền. Xem `subscriptionRecovery.js`. */}
            <SubscriptionRecoveryBanner
              notice={recoveryNotice}
              canResume={canResumePayment}
              onResume={handleResumePendingPayment}
              onRefresh={refreshAll}
            />

            {/* Nút gia hạn / hủy gia hạn (chỉ với gói trả phí).
                ⚠️ BE `POST /subscriptions/renew` chỉ nhận sub `status='active'`
                -> `handleRenew()` tự tra cứu pending TRƯỚC, chỉ gọi API khi
                hợp lệ (nếu không -> báo rõ, không gọi). */}
            {canRenew ? (
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
                  {currentSub?.autoRenew && canCancelAutoRenew ? (
                    <View style={styles.actionItem}>
                      <CustomButton
                        title={t('subscription.cancelAutoRenew')}
                        onPress={handleCancelAutoRenew}
                        variant="outline"
                        height={42}
                        borderRadius={21}
                        textStyle={{
                          fontSize: sp(12),
                          color: isDark ? '#FF8A80' : AppColors.error,
                        }}
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
                style={[styles.benefitCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
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
              style={[styles.benefitCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
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
        isRenew={qrIsRenew}
        onClose={closeQr}
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
  noticeText: {
    fontFamily: FontFamily.regular,
    lineHeight: sp(17),
    marginTop: sp(10),
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
