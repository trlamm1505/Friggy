/**
 * PaymentHistoryScreen
 *
 * Màn "Lịch sử thanh toán" — nằm trong Profile (Tài khoản → Lịch sử thanh toán).
 *
 * NGUỒN SỰ THẬT:
 *   BE  - `be/src/modules-api/payment-transactions/payment-transactions.controller.ts`
 *         `GET /payment-transactions/me?page=&limit=` -> `PaymentTransactionListResponseDto`
 *         `{ data: PaymentTransactionDto[], total, page, limit }`
 *   Service RN - `userService.getPaymentHistory(page, limit)` -> `{ items, total, page, limit }`
 *
 * ⚠️ Bản LIST của BE **KHÔNG có field `qrCode`** (chỉ `PaymentTransactionDetailDto`
 *   mới có) -> màn này KHÔNG hiển thị lại QR cũ (link PayOS đã hết hạn sau 15').
 *
 * ⚠️ Màn này CHỈ ĐỌC. Không có nút thanh toán lại (không có endpoint BE hỗ trợ
 *   "trả lại 1 giao dịch cũ") -> user muốn mua lại thì đi qua màn Quản lý gói.
 *
 * Thiết kế theo pattern `ScanHistoryScreen`: app bar tự vẽ + pull-to-refresh,
 * Skeleton khi tải, ErrorState + retry khi lỗi, EmptyState khi chưa có giao dịch,
 * load-more (phân trang) khi cuộn xuống đáy.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/common/Skeleton';
import { useServices } from '../../../data/ServiceProvider';

const PAGE_SIZE = 20;

/** Màu + icon theo trạng thái giao dịch (BE: pending | paid | failed | cancelled | expired). */
const STATUS_META = {
  paid: { key: 'paid', color: '#2E7D32', bg: '#E8F5E9', icon: CheckCircle2 },
  pending: { key: 'pending', color: '#F57C00', bg: '#FFF3E0', icon: Clock },
  expired: { key: 'expired', color: '#757575', bg: '#EEEEEE', icon: AlertCircle },
  failed: { key: 'failed', color: '#C62828', bg: '#FFEBEE', icon: XCircle },
  cancelled: { key: 'cancelled', color: '#757575', bg: '#EEEEEE', icon: XCircle },
};

/**
 * Map trạng thái -> key i18n.
 *
 * ⚠️ BE có thể trả trạng thái KHÔNG có trong danh sách (vd 'failed' chưa từng
 *   xảy ra, hoặc BE thêm status mới) -> `renderItem` phải fallback về key có
 *   thật, KHÔNG dựng chuỗi `paymentHistory.status.${status}` (sẽ ra key rỗng
 *   và hiện chuỗi rác cho user).
 */
const STATUS_I18N_KEY = {
  paid: 'paymentHistory.status.paid',
  pending: 'paymentHistory.status.pending',
  expired: 'paymentHistory.status.expired',
  failed: 'paymentHistory.status.failed',
  cancelled: 'paymentHistory.status.cancelled',
};

/** Nhãn tiếng Việt cho `type` của BE ('subscribe' | 'renew'). */
const TYPE_LABEL = {
  subscribe: 'paymentHistory.typeSubscribe',
  renew: 'paymentHistory.typeRenew',
};

/** Định dạng tiền VND kiểu Việt Nam (79.000). */
const formatVnd = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0);

/** Định dạng ngày giờ ngắn gọn. */
const formatDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const PaymentHistoryScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { userService } = useServices();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load 1 trang. `append=true` -> nối vào cuối danh sách (load-more).
   */
  const load = useCallback(
    async (nextPage = 1, append = false) => {
      if (!append) setError(null);
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const res = await userService.getPaymentHistory(nextPage, PAGE_SIZE);
        const rows = Array.isArray(res?.items) ? res.items : [];
        setTotal(typeof res?.total === 'number' ? res.total : rows.length);
        setPage(nextPage);
        setItems((prev) => (append ? [...prev, ...rows] : rows));
      } catch (e) {
        if (!append) setError(e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [userService]
  );

  // Load lại mỗi khi màn vào focus (user vừa thanh toán xong ở màn gói).
  useFocusEffect(
    useCallback(() => {
      load(1);
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(1);
  }, [load]);

  const hasMore = items.length < total;

  const onEndReached = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    load(page + 1, true);
  }, [loading, loadingMore, hasMore, page, load]);

  const renderItem = ({ item }) => {
    const meta = STATUS_META[item?.status] ?? STATUS_META.expired;
    const Icon = meta.icon;
    const typeKey = TYPE_LABEL[item?.type] ?? 'paymentHistory.typeSubscribe';

    return (
      <View
        style={[
          styles.row,
          {
            backgroundColor: isDark ? '#19271E' : '#F4F7F4',
            borderColor: isDark ? '#2E4D36' : 'transparent',
          },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: `${meta.color}1A` }]}>
          <Icon color={meta.color} size={22} strokeWidth={2.2} />
        </View>

        <View style={{ flex: 1, marginLeft: sp(12) }}>
          <Text
            style={[
              styles.rowTitle,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(14) },
            ]}
            numberOfLines={1}
          >
            {item?.planName || t('subscription.free')}
          </Text>

          <Text
            style={[
              styles.rowSub,
              {
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(12),
              },
            ]}
            numberOfLines={1}
          >
            {t(typeKey)} · {formatDateTime(item?.createdAt)}
          </Text>

          {item?.paymentRef ? (
            <Text
              style={[
                styles.rowRef,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  fontSize: sp(11),
                },
              ]}
              numberOfLines={1}
            >
              {t('subscription.paymentRefLabel')} {item.paymentRef}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightCol}>
          <Text style={[styles.amount, { color: meta.color, fontSize: sp(14) }]}>
            {formatVnd(item?.amount)} ₫
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${meta.color}1A` }]}>
            <Text style={[styles.statusText, { color: meta.color, fontSize: sp(11) }]}>
              {t(STATUS_I18N_KEY[meta.key] ?? 'paymentHistory.status.expired')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.list}>
          {[0, 1, 2, 3, 4].map((k) => (
            <Skeleton
              key={k}
              height={sp(84)}
              borderRadius={sp(12)}
              style={{ marginBottom: sp(10) }}
            />
          ))}
        </View>
      );
    }

    if (error) {
      return <ErrorState message={error?.message} onRetry={() => load(1)} />;
    }

    if (!items || items.length === 0) {
      return (
        <EmptyState
          emoji="🧾"
          title={t('paymentHistory.emptyTitle')}
          hint={t('paymentHistory.emptyHint')}
        />
      );
    }

    return (
      <FlatList
        data={items}
        testID="payment-history-list"
        keyExtractor={(it, index) => String(it?.id ?? index)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[AppColors.primary]}
          />
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {loadingMore ? (
              <Skeleton height={sp(64)} borderRadius={sp(12)} />
            ) : hasMore ? (
              <Pressable
                testID="payment-history-load-more"
                onPress={onEndReached}
                style={({ pressed }) => [
                  styles.loadMoreBtn,
                  {
                    backgroundColor: isDark ? '#233629' : AppColors.accentGreen,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.loadMoreText,
                    {
                      color: isDark ? AppColors.primaryLight : AppColors.primaryDark,
                      fontSize: sp(13),
                    },
                  ]}
                >
                  {t('paymentHistory.loadMore')}
                </Text>
              </Pressable>
            ) : items.length > 0 ? (
              <Text
                style={[
                  styles.endText,
                  {
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    fontSize: sp(12),
                  },
                ]}
              >
                {t('paymentHistory.endOfList')}
              </Text>
            ) : null}
          </View>
        }
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.backButton}>
          <ChevronLeft color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={28} />
        </Pressable>
        <CreditCard color={isDark ? AppColors.primaryLight : AppColors.primary} size={20} />
        <Text
          style={[
            styles.headerTitle,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(18) },
          ]}
        >
          {t('paymentHistory.title')}
        </Text>
      </View>

      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(12),
    paddingVertical: sp(12),
    gap: sp(6),
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  list: {
    padding: sp(16),
    paddingBottom: sp(32),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp(12),
    borderRadius: sp(12),
    borderWidth: 1,
    marginBottom: sp(10),
  },
  iconBox: {
    width: sp(44),
    height: sp(44),
    borderRadius: sp(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  rowSub: {
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  rowRef: {
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  rightCol: {
    alignItems: 'flex-end',
    marginLeft: sp(8),
  },
  amount: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  statusBadge: {
    paddingHorizontal: sp(10),
    paddingVertical: sp(5),
    borderRadius: sp(10),
    marginTop: sp(6),
  },
  statusText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  footer: {
    paddingVertical: sp(12),
    alignItems: 'center',
  },
  loadMoreBtn: {
    paddingHorizontal: sp(20),
    paddingVertical: sp(10),
    borderRadius: sp(20),
  },
  loadMoreText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  endText: {
    fontFamily: FontFamily.regular,
  },
});
