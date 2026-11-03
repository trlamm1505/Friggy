/**
 * SubscriptionPlansSheet - bottom sheet danh sách gói dịch vụ (SCREEN B).
 *
 * Sprint A3 (24/10) — theo ảnh tham chiếu 1 (`package_management_screen.dart`
 * của Flutter, `_showAllPlansModal()` `:105-249`).
 *
 * VÌ SAO TÁCH RIÊNG (thay vì nhét vào `PackageManagementScreen`):
 *   - Flutter tách hẳn: màn "Thông tin gói dịch vụ" + `showModalBottomSheet`
 *     cho danh sách gói. RN cần GIỮ NGUYÊN màn hình bên dưới khi mở sheet
 *     (yêu cầu "dismissing sheet không reset màn hình gốc").
 *   - Sheet này KHÔNG điều hướng đi nơi khác; nó trả `plan` về cho cha qua
 *     `onSelectPlan(plan)` để cha quyết định mở sheet thanh toán.
 *
 * NGUỒN SỰ THẬT (KHÔNG hardcode):
 *   - Danh sách gói: `GET /subscriptions/plans` -> `userService.getAvailablePackages()`
 *   - Gói đang dùng: `GET /subscriptions/me` -> `userService.getMySubscription()`
 *   - Giá: `pkg.price` (đã map từ BE `priceVnd`), TUYỆT ĐỐI không viết cứng
 *     5.000/10.000 như ảnh tham chiếu (ảnh chỉ là minh hoạ, BE seed hiện là
 *     79.000 / 149.000 — `be/prisma/seed.sql:60-62`).
 *   - Hạn mức AI: `pkg.aiUsagePerWeek` (-1 = không giới hạn).
 *     Ảnh tham chiếu có MÂU THUẪN (mô tả 17 lượt vs danh sách 15 lượt) →
 *     ta dùng DUY NHẤT con số BE trả về, không tự chọn.
 *
 * AN TOÀN:
 *   - Không cho mua lại gói đang active (BE cũng chặn 400).
 *   - `onSelectPlan` chỉ được gọi khi user bấm nút hợp lệ.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Award, Check, Crown, Users, Sparkles } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { CustomButton } from '../common/CustomButton';

/** Định dạng tiền VND kiểu Việt Nam: 79.000. */
export const formatVnd = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0);

/** Icon theo tên gói (BE dùng `free` | `individual` | `family`). */
const planIcon = (name) => {
  if (name === 'family') return Users;
  if (name === 'individual') return Crown;
  return Sparkles;
};

/**
 * Mô tả hạn mức AI từ `aiUsagePerWeek`.
 * -1 = không giới hạn; số >= 0 = giới hạn N lượt/tuần.
 */
export const describeAiUsage = (aiUsagePerWeek, t) => {
  if (aiUsagePerWeek === -1 || aiUsagePerWeek === null || aiUsagePerWeek === undefined) {
    return t('subscription.aiUsageUnlimited');
  }
  return t('subscription.aiUsagePerWeek', { count: aiUsagePerWeek });
};

export const SubscriptionPlansSheet = ({
  visible,
  onClose,
  packages = [],
  currentPlanName = 'free',
  currentStatus = 'active',
  autoRenew = false,
  loading = false,
  subscribingPlanId = null,
  onSelectPlan,
  onRenew,
  onCancelAutoRenew,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  /**
   * Gói đang active: cùng tên VÀ status là `active`.
   * `pending`/`cancelled`/`expired` KHÔNG phải gói đang dùng → vẫn cho nâng cấp.
   */
  const isActivePlan = useCallback(
    (pkg) => pkg?.name === currentPlanName && currentStatus === 'active',
    [currentPlanName, currentStatus]
  );

  /** Nút của 1 gói, theo đúng logic Flutter `:180-222`. */
  const renderAction = (pkg) => {
    const active = isActivePlan(pkg);
    const isFree = Number(pkg.price) === 0;

    // Gói đang dùng + có phí:
    //   autoRenew bật  -> nút HỦY gia hạn (đỏ, như Flutter `:188-194`)
    //   autoRenew tắt -> nút GIA HẠN (+1 tháng)
    if (active && !isFree) {
      if (autoRenew) {
        return (
          <CustomButton
            title={t('subscription.cancelAutoRenewShort')}
            onPress={() => onCancelAutoRenew?.(pkg)}
            height={46}
            borderRadius={23}
            variant="outline"
            textStyle={{ color: isDark ? '#FF8A80' : AppColors.error }}
            style={{
              borderColor: isDark ? '#FF8A80' : AppColors.error,
              borderWidth: 1.4,
            }}
          />
        );
      }
      return (
        <CustomButton
          title={t('subscription.renewOneMonth')}
          onPress={() => onRenew?.(pkg)}
          loading={subscribingPlanId === 'renew'}
          icon={<Crown color="#FFFFFF" size={16} />}
          height={46}
          borderRadius={23}
        />
      );
    }

    if (active) {
      // Gói free đang dùng -> nút "gói mặc định hiện tại", disabled.
      return (
        <CustomButton
          title={t('subscription.currentDefaultPlan')}
          onPress={undefined}
          disabled
          height={46}
          borderRadius={23}
          variant="outline"
          textStyle={{ color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary }}
        />
      );
    }

    if (isFree) {
      // Gói free khác gói đang dùng (hiếm) -> không cho mua (BE chặn 400).
      return (
        <CustomButton
          title={t('subscription.defaultPlanShort')}
          onPress={undefined}
          disabled
          height={46}
          borderRadius={23}
          variant="outline"
          textStyle={{ color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary }}
        />
      );
    }

    return (
      <CustomButton
        title={t('subscription.upgradePlan')}
        onPress={() => onSelectPlan?.(pkg)}
        loading={subscribingPlanId === pkg.id}
        icon={<Crown color="#FFFFFF" size={16} />}
        height={46}
        borderRadius={23}
      />
    );
  };

  const sheetBg = isDark ? AppColors.darkSurface : '#FFFFFF';
  const cardBg = isDark ? AppColors.darkCardBg : '#FFFFFF';
  const cardBorder = isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder;
  const titleColor = isDark ? '#FFFFFF' : AppColors.headerTextLight;
  const textColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const subTextColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Nhấn ra ngoài để đóng. */}
        <Pressable style={styles.backdropPressable} onPress={onClose} accessibilityLabel="close" />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              // Padding bottom = safe-area để nút cuối không bị che bởi
              // thanh điều hướng Android.
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

          {/* Header */}
          <View style={styles.header}>
            <Award color={isDark ? '#FFFFFF' : AppColors.headerTextLight} size={sp(26)} strokeWidth={2.2} />
            <Text style={[styles.headerTitle, { color: titleColor, fontSize: sp(21) }]}>
              {t('subscription.plansSheetTitle')}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={AppColors.primary} />
            </View>
          ) : packages.length === 0 ? (
            <View style={styles.loadingBox}>
              <Text style={{ color: subTextColor, fontSize: sp(14) }}>
                {t('subscription.noPlans')}
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              // Bỏ `nestedScrollEnabled` để tránh xung đột cuộn lồng nhau.
            >
              {packages.map((pkg) => {
                const active = isActivePlan(pkg);
                const isFree = Number(pkg.price) === 0;
                const Icon = planIcon(pkg.name);
                const isFamily = pkg.name === 'family';

                return (
                  <View
                    key={pkg.id ?? pkg.name}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: active
                          ? isDark
                            ? '#1E3A25'
                            : '#EAF5E1'
                          : cardBg,
                        borderColor: active ? AppColors.primary : cardBorder,
                        borderWidth: active ? 1.6 : 1,
                      },
                    ]}
                  >
                    {/* Header card */}
                    <View style={styles.cardHeader}>
                      <View
                        style={[
                          styles.cardIcon,
                          {
                            backgroundColor: isFamily
                              ? AppColors.primary
                              : isFree
                                ? AppColors.primaryLight
                                : AppColors.accentOrange,
                          },
                        ]}
                      >
                        <Icon color="#FFFFFF" size={sp(20)} />
                      </View>

                      <View style={styles.cardHeadText}>
                        <Text style={[styles.cardTitle, { color: textColor, fontSize: sp(17) }]}>
                          {pkg.displayName || pkg.name}
                        </Text>
                        <View style={styles.priceRow}>
                          <Text style={[styles.price, { color: AppColors.primary, fontSize: sp(18) }]}>
                            {formatVnd(pkg.price)} VNĐ
                          </Text>
                          <Text style={[styles.period, { color: subTextColor, fontSize: sp(12) }]}>
                            {pkg.period === 'monthly'
                              ? t('subscription.perMonth')
                              : t('subscription.forever')}
                          </Text>
                        </View>
                        <Text style={[styles.aiUsage, { color: subTextColor, fontSize: sp(12) }]}>
                          {describeAiUsage(pkg.aiUsagePerWeek, t)}
                        </Text>
                      </View>

                      {active ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{t('subscription.currentlyActive')}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Features */}
                    {Array.isArray(pkg.features) && pkg.features.length > 0 ? (
                      <View style={styles.features}>
                        {pkg.features.map((f, i) => (
                          <View key={`${pkg.name}-${i}`} style={styles.featureRow}>
                            <Check color={AppColors.primary} size={sp(15)} strokeWidth={3} />
                            <Text
                              style={[styles.featureText, { color: textColor, fontSize: sp(13) }]}
                            >
                              {f}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {/* Action */}
                    <View style={styles.actionWrap}>{renderAction(pkg)}</View>
                  </View>
                );
              })}
            </ScrollView>
          )}
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
    maxHeight: '85%',
    borderTopLeftRadius: sp(28),
    borderTopRightRadius: sp(28),
    paddingHorizontal: sp(20),
    paddingTop: sp(10),
  },
  handleWrap: {
    alignItems: 'center',
    paddingBottom: sp(6),
  },
  handle: {
    width: sp(40),
    height: sp(5),
    borderRadius: sp(3),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp(14),
  },
  headerTitle: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginLeft: sp(10),
    flex: 1,
  },
  scrollContent: {
    paddingBottom: sp(8),
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: sp(40),
  },
  planCard: {
    borderRadius: sp(18),
    padding: sp(16),
    marginBottom: sp(14),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardIcon: {
    width: sp(42),
    height: sp(42),
    borderRadius: sp(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadText: {
    flex: 1,
    marginLeft: sp(12),
  },
  cardTitle: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: sp(2),
  },
  price: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  period: {
    fontFamily: FontFamily.regular,
    marginLeft: sp(4),
  },
  aiUsage: {
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  badge: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: sp(8),
    paddingVertical: sp(3),
    borderRadius: sp(8),
    marginLeft: sp(8),
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: sp(10),
  },
  features: {
    marginTop: sp(12),
    marginBottom: sp(14),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp(6),
  },
  featureText: {
    fontFamily: FontFamily.regular,
    marginLeft: sp(8),
    flex: 1,
  },
  actionWrap: {
    width: '100%',
  },
});
