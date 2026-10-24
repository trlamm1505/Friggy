/**
 * PackageManagementScreen - danh sách gói + nâng cấp.
 *
 * Sprint A3 (23/10): nối BE thật.
 *   - `GET /subscriptions/plans` (public) -> danh sách gói.
 *     BE `SubscriptionPlanResponseDto`: `id`(number), `name`, `displayName`,
 *     `priceVnd`, `billingCycle`, `features`, `aiUsagePerWeek`, `isActive`.
 *     Mapper `toPackage()` trong `RealSubscriptionService` đã đổi
 *     `priceVnd`->`price`, `billingCycle`->`period`.
 *   - `GET /subscriptions/me` -> gói hiện tại + `status`.
 *   - `POST /subscriptions/subscribe` -> QR PayOS (KHONG mo WebView, giống Flutter).
 *   - `GET /payment-transactions/me` -> lịch sử giao dịch, dùng khôi phục QR
 *     đang chờ (Flutter `_checkPendingPaymentTransaction()`).
 *
 * BỎ period switcher (monthly/yearly): BE KHÔNG có gói `yearly` - `billingCycle`
 * chỉ có `forever` | `monthly` (`subscriptions-response.dto.ts:10`). Flutter cũng
 * không có switcher, chỉ hiện "/tháng" hoặc "Mãi mãi" theo `billingCycle`.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { Check, Crown, Users, Sparkles } from 'lucide-react-native';
import { CustomButton } from '../../components/common/CustomButton';
import { showError, showInfo } from '../../utils/helpers';
import { useServices } from '../../../data/ServiceProvider';
import { useAsyncData } from '../../hooks/useServiceHooks';
import { FamilyPlanModal } from '../../components/home/FamilyPlanModal';

const formatVND = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

export const PackageManagementScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { userService } = useServices();

  const [subscribingPlanId, setSubscribingPlanId] = useState(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);

  // `useAsyncData` (hook có sẵn) thay cho `useEffect` + setState - eslint
  // `react-hooks/set-state-in-effect` cấm setState đồng bộ trong effect.
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

  const currentPlanName = currentSub?.plan?.name ?? 'free';

  /** Mua gói: gọi subscribe -> mở modal QR. */
  const handleSubscribe = useCallback(
    async (pkg) => {
      if (!pkg?.id) return;
      setSubscribingPlanId(pkg.id);
      try {
        const checkout = await userService.subscribe(pkg.id);
        // Gói family dùng FamilyPlanModal (có thêm ô nhập token lời mời).
        // Gói khác: hiện QR trực tiếp trong modal này.
        if (pkg.name === 'family') {
          setPlanModalOpen(true);
        } else {
          showInfo(
            checkout?.qrCode ? t('subscription.qrShown') : t('subscription.subscribeFailed')
          );
        }
      } catch (e) {
        showError(e?.message || t('subscription.subscribeFailed'));
      } finally {
        setSubscribingPlanId(null);
      }
    },
    [userService, t]
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text
          style={[
            styles.title,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(24) },
          ]}
        >
          {t('subscription.title')}
        </Text>

        {/* Current plan */}
        <View
          style={[
            styles.currentCard,
            {
              backgroundColor: isDark ? '#1E3A25' : AppColors.accentGreen,
              borderColor: AppColors.primary,
            },
          ]}
        >
          <View style={styles.currentHeader}>
            <Sparkles color={AppColors.primary} size={18} />
            <Text
              style={[
                styles.currentLabel,
                {
                  color: isDark ? AppColors.primaryLight : AppColors.forestAccent,
                  fontSize: sp(13),
                },
              ]}
            >
              {t('subscription.currentPlan')}
            </Text>
          </View>
          <Text
            style={[
              styles.currentPlan,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(18) },
            ]}
          >
            {currentSub?.plan?.displayName ?? t('subscription.free')}
          </Text>
          {currentSub?.endDate ? (
            <Text
              style={[
                styles.currentExpiry,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  fontSize: sp(11),
                },
              ]}
            >
              {t('subscription.validUntil', { date: currentSub.endDate })}
            </Text>
          ) : null}
        </View>

        {/* Package cards */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={AppColors.primary} />
          </View>
        ) : error ? (
          <View style={styles.loadingBox}>
            <Text style={{ color: isDark ? '#FFFFFF' : AppColors.textPrimary, marginBottom: 12 }}>
              {t('subscription.loadFailed')}
            </Text>
            <CustomButton
              title={t('home.retry')}
              onPress={() => {
                reloadPackages();
                reloadCurrent();
              }}
              width={160}
              height={46}
              borderRadius={23}
            />
          </View>
        ) : (
          packages.map((pkg) => {
            const isFamily = pkg.name === 'family';
            const isFree = pkg.price === 0;
            const isCurrent = pkg.name === currentPlanName && currentSub?.status === 'active';
            const Icon = isFamily ? Users : Crown;
            return (
              <View
                key={pkg.id}
                style={[
                  styles.pkgCard,
                  {
                    backgroundColor: isDark ? '#19271E' : '#FFFFFF',
                    borderColor: isFamily ? AppColors.primary : isDark ? '#2E4D36' : '#A5E69C',
                    borderWidth: isFamily ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.pkgHeader}>
                  <View
                    style={[
                      styles.pkgIcon,
                      { backgroundColor: isFamily ? AppColors.primary : '#F5B025' },
                    ]}
                  >
                    <Icon color="#FFFFFF" size={20} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={[
                        styles.pkgName,
                        { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(17) },
                      ]}
                    >
                      {pkg.displayName || pkg.name}
                    </Text>
                    <Text style={[styles.pkgPrice, { color: AppColors.primary, fontSize: sp(20) }]}>
                      {formatVND(pkg.price)}
                      <Text
                        style={[
                          styles.pkgUnit,
                          {
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                            fontSize: sp(13),
                          },
                        ]}
                      >
                        {pkg.period === 'monthly'
                          ? t('subscription.perMonth')
                          : t('subscription.forever')}
                      </Text>
                    </Text>
                  </View>
                  {isFamily ? (
                    <View style={styles.recommendBadge}>
                      <Text style={styles.recommendText}>{t('subscription.recommended')}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.featuresList}>
                  {pkg.features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Check color={AppColors.primary} size={16} />
                      <Text
                        style={[
                          styles.featureText,
                          { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) },
                        ]}
                      >
                        {f}
                      </Text>
                    </View>
                  ))}
                </View>
                <CustomButton
                  title={
                    isCurrent
                      ? t('subscription.currentPlan')
                      : isFree
                        ? t('subscription.defaultPlan')
                        : t('subscription.subscribeNow')
                  }
                  onPress={() => (isCurrent || isFree ? undefined : handleSubscribe(pkg))}
                  loading={subscribingPlanId === pkg.id}
                  disabled={isCurrent || isFree}
                  variant={isFamily ? 'primary' : 'outline'}
                />
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <FamilyPlanModal
        key={`family-plan-modal-${planModalOpen ? 'open' : 'closed'}`}
        visible={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onSuccess={() => {
          reloadPackages();
          reloadCurrent();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  currentCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  currentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentLabel: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: 6,
  },
  currentPlan: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginTop: 6,
  },
  currentExpiry: {
    fontFamily: FontFamily.regular,
    marginTop: 4,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  pkgCard: {
    padding: 16,
    borderRadius: 18,
    marginTop: 16,
  },
  pkgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pkgIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pkgName: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  pkgPrice: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginTop: 4,
  },
  pkgUnit: {
    fontFamily: FontFamily.regular,
  },
  recommendBadge: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recommendText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: 10,
  },
  featuresList: {
    marginTop: 12,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    fontFamily: FontFamily.regular,
    marginLeft: 8,
  },
});
