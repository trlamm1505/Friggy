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
import { Award } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { PlanCard } from './PlanCard';

// ⚠️ Re-export để giữ tương thích import cũ (`SubscriptionFlow.test.js`).
export { formatVnd, describeAiUsage } from './PlanCard';

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

  // ⚠️ Logic nút thao tác đã gom vào `PlanCard` (dùng chung với màn
  //   "Gói của tôi") để tránh nhân bản logic ở 2 nơi.

  const sheetBg = isDark ? AppColors.darkSurface : '#FFFFFF';
  const titleColor = isDark ? '#FFFFFF' : AppColors.headerTextLight;
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
              {packages.map((pkg) => (
                <PlanCard
                  key={pkg.id ?? pkg.name}
                  pkg={pkg}
                  isActive={isActivePlan(pkg)}
                  autoRenew={autoRenew}
                  subscribingPlanId={subscribingPlanId}
                  onSelectPlan={onSelectPlan}
                  onRenew={onRenew}
                  onCancelAutoRenew={onCancelAutoRenew}
                />
              ))}
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
});
