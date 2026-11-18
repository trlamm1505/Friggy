/**
 * PlanCard — card hiển thị 1 gói dịch vụ (dùng chung cho sheet + màn "Gói của tôi").
 *
 * ⚠️ VÌ SAO TÁCH RIÊNG:
 *   `SubscriptionPlansSheet` (bottom sheet) và `MyPackagesScreen` (màn trong
 *   Profile) đều cần hiển thị danh sách gói + nút thao tác GIỐNG HỆT NHAU.
 *   Trước đây logic nằm inline trong sheet -> nhân bản 2 lần dễ lệch.
 *   => Gom vào `PlanCard`, cả 2 nơi chỉ truyền callback.
 *
 * NGUỒN SỰ THẬT (KHÔNG hardcode):
 *   - Danh sách gói: `GET /subscriptions/plans` -> `userService.getAvailablePackages()`
 *   - Gói đang dùng: `GET /subscriptions/me` -> `userService.getMySubscription()`
 *   - Giá: `pkg.price` (đã map từ BE `priceVnd`).
 *   - Hạn mức AI: `pkg.aiUsagePerWeek` (-1 = không giới hạn).
 *
 * AN TOÀN:
 *   - Không cho mua lại gói đang active (BE cũng chặn 400).
 *   - Gói free -> nút disabled (BE không cho "mua" gói miễn phí).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, Crown, Users, Sparkles } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { CustomButton } from '../common/CustomButton';

/** Định dạng tiền VND kiểu Việt Nam: 79.000. */
export const formatVnd = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0);

/** Icon theo tên gói (BE dùng `free` | `individual` | `family`). */
export const planIcon = (name) => {
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

/**
 * Card 1 gói + nút thao tác tương ứng.
 *
 * @param {object} props
 * @param {object} props.pkg - gói (shape đã map qua `toPackage`)
 * @param {boolean} props.isActive - gói này đang là gói user dùng (status active)
 * @param {boolean} props.autoRenew - gói hiện tại đang bật gia hạn tự động
 * @param {number|string|null} props.subscribingPlanId - gói đang xử lý thanh toán
 * @param {(pkg:object)=>void} props.onSelectPlan - chọn gói khác (nâng cấp / đổi gói)
 * @param {(pkg:object)=>void} props.onRenew - gia hạn gói hiện tại
 * @param {(pkg:object)=>void} props.onCancelAutoRenew - hủy gia hạn tự động
 */
export const PlanCard = ({
  pkg,
  isActive = false,
  autoRenew = false,
  subscribingPlanId = null,
  onSelectPlan,
  onRenew,
  onCancelAutoRenew,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const isFree = Number(pkg?.price) === 0;
  const isFamily = pkg?.name === 'family';

  const textColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const subTextColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;
  const cardBg = isDark ? AppColors.darkCardBg : '#FFFFFF';
  const cardBorder = isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder;

  /** Nút của 1 gói, theo đúng logic Flutter `package_management_screen.dart:180-222`. */
  const renderAction = () => {
    // Gói đang dùng + có phí:
    //   autoRenew bật  -> nút HỦY gia hạn (đỏ)
    //   autoRenew tắt -> nút GIA HẠN (+1 tháng)
    if (isActive && !isFree) {
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

    if (isActive) {
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
        title={t('subscription.chooseThisPlan')}
        onPress={() => onSelectPlan?.(pkg)}
        loading={subscribingPlanId === pkg?.id}
        icon={<Crown color="#FFFFFF" size={16} />}
        height={46}
        borderRadius={23}
      />
    );
  };

  return (
    <View
      style={[
        styles.planCard,
        {
          backgroundColor: isActive ? (isDark ? '#1E3A25' : '#EAF5E1') : cardBg,
          borderColor: isActive ? AppColors.primary : cardBorder,
          borderWidth: isActive ? 1.6 : 1,
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
          {isFamily ? (
            <Users color="#FFFFFF" size={sp(20)} />
          ) : pkg?.name === 'individual' ? (
            <Crown color="#FFFFFF" size={sp(20)} />
          ) : (
            <Sparkles color="#FFFFFF" size={sp(20)} />
          )}
        </View>

        <View style={styles.cardHeadText}>
          <Text style={[styles.cardTitle, { color: textColor, fontSize: sp(17) }]}>
            {pkg?.displayName || pkg?.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: AppColors.primary, fontSize: sp(18) }]}>
              {formatVnd(pkg?.price)} VNĐ
            </Text>
            <Text style={[styles.period, { color: subTextColor, fontSize: sp(12) }]}>
              {pkg?.period === 'monthly' ? t('subscription.perMonth') : t('subscription.forever')}
            </Text>
          </View>
          <Text style={[styles.aiUsage, { color: subTextColor, fontSize: sp(12) }]}>
            {describeAiUsage(pkg?.aiUsagePerWeek, t)}
          </Text>
        </View>

        {isActive ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('subscription.currentlyActive')}</Text>
          </View>
        ) : null}
      </View>

      {/* Features */}
      {Array.isArray(pkg?.features) && pkg.features.length > 0 ? (
        <View style={styles.features}>
          {pkg.features.map((f, i) => (
            <View key={`${pkg?.name}-${i}`} style={styles.featureRow}>
              <Check color={AppColors.primary} size={sp(15)} strokeWidth={3} />
              <Text style={[styles.featureText, { color: textColor, fontSize: sp(13) }]}>{f}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Action */}
      <View style={styles.actionWrap}>{renderAction()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
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
