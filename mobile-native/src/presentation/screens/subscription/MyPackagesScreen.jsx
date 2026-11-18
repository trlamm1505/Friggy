/**
 * MyPackagesScreen - màn "Gói của tôi" (mở từ Profile).
 *
 * MỤC ĐÍCH (yêu cầu user 19/11):
 *   Từ Profile, thêm 1 thanh "Gói của tôi" -> mở màn này.
 *   Màn này hiển thị TOÀN BỘ các gói đang có (inline, không cần mở bottom
 *   sheet) + thông tin gói hiện tại, để user:
 *     - GIA HẠN gói hiện tại (nếu đang trả phí & đã tắt gia hạn tự động)
 *     - CHỌN GÓI KHÁC (nâng cấp / đổi gói)
 *     - HỦY gia hạn tự động
 *
 * ⚠️ KHÔNG hardcode giá / hạn mức AI:
 *   - Danh sách gói: `GET /subscriptions/plans`  -> `userService.getAvailablePackages()`
 *   - Gói hiện tại : `GET /subscriptions/me`    -> `userService.getMySubscription()`
 *   - Giá: `pkg.price`, hạn mức: `pkg.aiUsagePerWeek` (BE seed 79.000/149.000).
 *
 * ⚠️ THANH TOÁN: dùng chung `PayOSPaymentSheet` (QR PayOS + poll 2 tầng),
 *   đúng như `PackageManagementScreen` — không tự viết lại logic QR.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Crown, Sparkles, Users, Package } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { CustomButton } from '../../components/common/CustomButton';
import { ScreenBackground } from '../../components/common/ScreenBackground';
import { PlanCard } from '../../components/subscription/PlanCard';
import { PayOSPaymentSheet } from '../../components/subscription/PayOSPaymentSheet';
import { SubscriptionRecoveryBanner } from '../../components/subscription/SubscriptionRecoveryBanner';
import { useSubscriptionManagement } from '../../hooks/useSubscriptionManagement';
import { statusLabel } from '../../utils/subscriptionStatus';

export const MyPackagesScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

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

  /** Gói đang active: cùng tên VÀ status là `active`. */
  const isActivePlan = (pkg) => pkg?.name === currentPlanName && currentStatus === 'active';

  const CurrentIcon =
    currentPlan?.name === 'family' ? Users : currentPlan?.name === 'individual' ? Crown : Sparkles;

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
            { color: isDark ? '#FFFFFF' : AppColors.headerTextLight, fontSize: sp(22) },
          ]}
        >
          {t('profile.myPackage')}
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
          <CustomButton title={t('home.retry')} onPress={refreshAll} width={160} height={46} borderRadius={23} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Math.max(insets.bottom, sp(20)) + sp(24) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 1. Gói hiện tại ── */}
          <View style={[styles.currentCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.currentHeader}>
              <View
                style={[
                  styles.currentIcon,
                  { backgroundColor: isDark ? AppColors.darkIconBg : AppColors.accentGreen },
                ]}
              >
                <CurrentIcon
                  color={isDark ? AppColors.primaryLight : AppColors.primary}
                  size={sp(22)}
                  strokeWidth={2.2}
                />
              </View>
              <View style={styles.currentInfo}>
                <Text style={[styles.currentLabel, { color: subTextColor, fontSize: sp(12) }]}>
                  {t('subscription.currentPlan')}
                </Text>
                <Text style={[styles.currentName, { color: textColor, fontSize: sp(18) }]}>
                  {currentPlan?.displayName || t('subscription.free')}
                </Text>
                <Text style={[styles.currentPrice, { color: AppColors.primary, fontSize: sp(14) }]}>
                  {Number(currentPlan?.price) === 0
                    ? t('subscription.free')
                    : `${new Intl.NumberFormat('vi-VN').format(Number(currentPlan?.price) || 0)} VNĐ ${
                        currentPlan?.period === 'monthly' ? t('subscription.perMonth') : ''
                      }`}
                </Text>

                {/* ⚠️ 19/11 — DÒNG TRẠNG THÁI (khớp màn "Thông tin gói dịch vụ").
                    Không có dòng này, user ở gói `pending` (đã bấm mua nhưng
                    chưa thanh toán xong) chỉ thấy tên + giá -> tưởng đã mua xong,
                    hoặc tưởng mất tiền khi gói bị ghi đè về Free. */}
                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: subTextColor, fontSize: sp(12) }]}>
                    {t('subscription.statusLabel')}
                  </Text>
                  <Text style={[styles.statusValue, { color: AppColors.primary, fontSize: sp(12) }]}>
                    {statusLabel(currentStatus, t)}
                  </Text>
                </View>
              </View>
            </View>

            {/* ⚠️ 19/11 — "Đã thanh toán nhưng gói chưa được ghi nhận".
                BE ghi đè `planId` về free khi webhook PayOS không về -> nếu không
                cảnh báo, user tưởng mất tiền. Xem `subscriptionRecovery.js`. */}
            <SubscriptionRecoveryBanner
              notice={recoveryNotice}
              canResume={canResumePayment}
              onResume={handleResumePendingPayment}
              onRefresh={refreshAll}
            />

            {/* Gia hạn tự động */}
            {canRenew ? (
              <View style={styles.autoRenewRow}>
                <Text style={[styles.autoRenewText, { color: subTextColor, fontSize: sp(12) }]}>
                  {currentSub?.autoRenew
                    ? t('subscription.autoRenewOn')
                    : t('subscription.autoRenewOff')}
                </Text>
                {currentSub?.autoRenew ? (
                  canCancelAutoRenew ? (
                    <CustomButton
                      title={t('subscription.cancelAutoRenewShort')}
                      onPress={handleCancelAutoRenew}
                      variant="outline"
                      height={40}
                      borderRadius={20}
                      textStyle={{
                        fontSize: sp(12),
                        color: isDark ? '#FF8A80' : AppColors.error,
                      }}
                      style={{
                        borderColor: isDark ? '#FF8A80' : AppColors.error,
                        borderWidth: 1.4,
                      }}
                    />
                  ) : null
                ) : (
                  <CustomButton
                    title={t('subscription.renewOneMonth')}
                    onPress={handleRenew}
                    loading={subscribingPlanId === 'renew'}
                    icon={<Crown color="#FFFFFF" size={sp(14)} />}
                    height={40}
                    borderRadius={20}
                    textStyle={{ fontSize: sp(12) }}
                    width={170}
                  />
                )}
              </View>
            ) : null}

            {/* ⚠️ Gói KHÔNG `active` -> BE `POST /subscriptions/renew` sẽ 404.
                Vẫn hiện nút gia hạn (để mở lại QR cũ đang chờ nếu có), nhưng
                kèm nhắc nhở để user biết vì sao gia hạn mới chưa tạo được. */}
            {isPaidPlan && !isSubscriptionActive ? (
              <View style={[styles.noticeBox, { borderColor: cardBorder }]}>
                <Text style={[styles.noticeText, { color: subTextColor, fontSize: sp(12) }]}>
                  {t('subscription.renewNotActive')}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── 2. Danh sách toàn bộ gói (INLINE) ── */}
          <View style={styles.sectionHeader}>
            <Package
              color={isDark ? AppColors.primaryLight : AppColors.primary}
              size={sp(19)}
              strokeWidth={2.2}
            />
            <Text style={[styles.sectionTitle, { color: textColor, fontSize: sp(17) }]}>
              {t('subscription.allPlansTitle')}
            </Text>
          </View>
          <Text style={[styles.sectionSub, { color: subTextColor, fontSize: sp(12) }]}>
            {t('subscription.allPlansSubtitle')}
          </Text>

          {packages.length === 0 ? (
            <Text style={[styles.emptyText, { color: subTextColor, fontSize: sp(14) }]}>
              {t('subscription.noPlans')}
            </Text>
          ) : (
            packages.map((pkg) => (
              <PlanCard
                key={pkg.id ?? pkg.name}
                pkg={pkg}
                isActive={isActivePlan(pkg)}
                autoRenew={currentSub?.autoRenew === true}
                subscribingPlanId={subscribingPlanId}
                onSelectPlan={handleSubscribe}
                onRenew={handleRenew}
                onCancelAutoRenew={handleCancelAutoRenew}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* ── QR PayOS ── */}
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

  // ── Gói hiện tại ──
  currentCard: {
    borderRadius: sp(20),
    borderWidth: 1.2,
    padding: sp(16),
    marginTop: sp(4),
  },
  currentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentIcon: {
    width: sp(46),
    height: sp(46),
    borderRadius: sp(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentInfo: {
    flex: 1,
    marginLeft: sp(12),
  },
  currentLabel: {
    fontFamily: FontFamily.regular,
  },
  currentName: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginTop: sp(2),
  },
  currentPrice: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginTop: sp(2),
  },
  // ── Dòng trạng thái (19/11) ──
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp(6),
  },
  statusLabel: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
  },
  statusValue: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginLeft: sp(4),
  },
  autoRenewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: sp(14),
    paddingTop: sp(12),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.lightCardBorder,
  },
  autoRenewText: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    flex: 1,
    marginRight: sp(10),
  },
  noticeBox: {
    borderWidth: 1,
    borderRadius: sp(12),
    padding: sp(10),
    marginTop: sp(12),
  },
  noticeText: {
    fontFamily: FontFamily.regular,
    lineHeight: sp(17),
  },

  // ── Section gói ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp(24),
  },
  sectionTitle: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginLeft: sp(8),
    flex: 1,
  },
  sectionSub: {
    fontFamily: FontFamily.regular,
    marginTop: sp(4),
    marginBottom: sp(14),
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    paddingVertical: sp(30),
  },
});
