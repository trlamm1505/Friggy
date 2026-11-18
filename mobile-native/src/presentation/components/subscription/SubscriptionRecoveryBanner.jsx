/**
 * SubscriptionRecoveryBanner - cảnh báo "đã thanh toán nhưng gói chưa được ghi nhận".
 *
 * ⚠️ VÌ SAO CẦN (19/11 - user báo "đã thanh toán gói rồi, tắt app mở lại thì
 *    về gói Free mặc định"):
 *
 *   Chuỗi lỗi nằm ở BE:
 *     1. `POST /subscriptions/subscribe` set `status='pending'` nhưng KHÔNG đổi
 *        `planId` -> `GET /subscriptions/me` vẫn trả gói free.
 *     2. CHỈ webhook PayOS mới ghi `planId` + `status='active'`. Ở local, webhook
 *        không về (tunnel chết / BE tắt) -> sub kẹt `pending` -> 15 phút sau
 *        cron huỷ -> lần mở app sau gọi `assignFreePlan()` GHI ĐÈ `planId`
 *        về free -> mất dấu vết gói đã mua.
 *
 *   => App KHÔNG thể tự khôi phục (BE đã xoá thông tin), nhưng PHẢI báo rõ để
 *      user không nghĩ mình bị mất tiền, và cho họ mở lại QR đang dở.
 *
 * ⚠️ KHÔNG BỊA DỮ LIỆU: mọi thông tin hiển thị đến từ
 *   `GET /payment-transactions/me` + `GET /subscriptions/me`.
 *   Xem `src/data/utils/subscriptionRecovery.js`.
 *
 * R7: comment tiếng Việt.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeContext';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { CustomButton } from '../common/CustomButton';

/** Định dạng tiền VND kiểu Việt Nam: 79.000. */
const formatVnd = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0);

/**
 * Cảnh báo gói chưa được ghi nhận.
 *
 * @param {object} props
 * @param {object|null} props.notice - kết quả `detectSubscriptionMismatch()`
 * @param {boolean} [props.canResume] - có mở lại QR được không (giao dịch còn pending)
 * @param {() => void} [props.onResume] - callback mở lại QR đang dở
 * @param {() => void} [props.onRefresh] - callback tải lại gói hiện tại
 */
export const SubscriptionRecoveryBanner = ({
  notice,
  canResume = false,
  onResume,
  onRefresh,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  if (!notice) return null;

  const planLabel = notice.planDisplayName ?? t('subscription.currentPlan');
  const isPending = notice.kind === 'payment_pending';
  const isExpired = isPending && notice.daysAgo > 1;

  /** Nội dung cảnh báo theo từng tình huống. */
  const message = (() => {
    if (isPending) {
      return isExpired
        ? t('subscription.recoveryPendingExpired', { plan: planLabel })
        : t('subscription.recoveryPending', { plan: planLabel });
    }
    if (notice.kind === 'payment_not_applied') {
      return t('subscription.recoveryNotApplied', {
        plan: planLabel,
        ref: notice.paymentRef ?? '-',
      });
    }
    return t('subscription.recoveryReverted', {
      plan: planLabel,
      ref: notice.paymentRef ?? '-',
    });
  })();

  const bg = isDark ? '#3A2A16' : '#FFF4E0';
  const border = isDark ? '#7A5A22' : '#FFD08A';
  const textColor = isDark ? '#FFE0B2' : '#7A4B00';

  return (
    <View style={[styles.wrap, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.headerRow}>
        <AlertTriangle color={textColor} size={sp(18)} strokeWidth={2.2} />
        <Text style={[styles.title, { color: textColor, fontSize: sp(13) }]}>
          {t('subscription.recoveryTitle')}
        </Text>
      </View>

      <Text style={[styles.message, { color: textColor, fontSize: sp(12) }]}>{message}</Text>

      {notice.amount ? (
        <Text style={[styles.amount, { color: textColor, fontSize: sp(12) }]}>
          {t('subscription.recoveryAmount', { amount: formatVnd(notice.amount) })}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {canResume && onResume ? (
          <CustomButton
            title={t('subscription.recoveryResumeCta')}
            onPress={onResume}
            height={40}
            borderRadius={20}
            width={170}
            textStyle={{ fontSize: sp(12) }}
          />
        ) : null}
        {onRefresh ? (
          <CustomButton
            title={t('home.retry')}
            onPress={onRefresh}
            variant="outline"
            height={40}
            borderRadius={20}
            width={110}
            textStyle={{ fontSize: sp(12) }}
            style={{ borderColor: border, borderWidth: 1.2 }}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: sp(14),
    borderWidth: 1,
    padding: sp(12),
    marginTop: sp(12),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginLeft: sp(8),
  },
  message: {
    fontFamily: FontFamily.regular,
    lineHeight: sp(18),
    marginTop: sp(6),
  },
  amount: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginTop: sp(4),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp(10),
  },
});

export default SubscriptionRecoveryBanner;
