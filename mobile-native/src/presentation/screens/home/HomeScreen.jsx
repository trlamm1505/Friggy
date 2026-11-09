import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, Animated, Easing, Platform, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showInfo } from '../../utils/helpers';
import { ScreenBackground } from '../../components/common/ScreenBackground';
import { HomeHeader } from '../../components/home/HomeHeader';
import { GreetingBanner } from '../../components/home/GreetingBanner';
import { FridgeSummaryCards } from '../../components/home/FridgeSummaryCards';
import { PremiumBanner } from '../../components/home/PremiumBanner';
import { FamilyPlanModal } from '../../components/home/FamilyPlanModal';
import { WeeklyStatisticsSection } from '../../components/home/WeeklyStatisticsSection';
import { CookingSuggestionsSection } from '../../components/home/CookingSuggestionsSection';
import { ShoppingListShortcut } from '../../components/home/ShoppingListShortcut';
import { Routes } from '../../../shared/constants/routes';
import {
  useCurrentPlan,
  useFridgeSummary,
  useWeeklyStats,
  useRecipeSuggestions,
  useNotifications,
} from '../../hooks/useServiceHooks';

export const HomeScreen = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Data từ service layer
  const { data: plan, refetch: refetchPlan } = useCurrentPlan();
  const { refetch: refetchSummary } = useFridgeSummary();
  const { refetch: refetchStats } = useWeeklyStats();
  const { refetch: refetchSuggestions } = useRecipeSuggestions();
  const { refetch: refetchNotifications } = useNotifications();

  const [searchValue, setSearchValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);

  /**
   * ⚠️ `useAsyncData` tạo state RIÊNG cho MỖI nơi gọi hook -> `refetch()` ở
   * HomeScreen KHÔNG update được component con (WeeklyStatisticsSection,
   * CookingSuggestionsSection, FridgeSummaryCards đều gọi hook riêng).
   *
   * => Dùng `refreshKey` (counter) làm tín hiệu: component con tự refetch
   *    khi `refreshKey` đổi. Nhờ vậy pull-to-refresh ở Home thực sự làm mới
   *    mọi số liệu hiển thị trên Home.
   */
  const [refreshKey, setRefreshKey] = useState(0);

  // Gói Family ĐANG HOẠT ĐỘNG = plan tên 'family' + status 'active'.
  //
  // SỬA BUG SO VỚT FLUTTER (23/10): Flutter `home_screen.dart:152-162` chỉ check
  // `plan.name` mà BỎ QUA `status` -> user bấm mua Gói Family chưa thanh toán
  // (BE trả `status: 'pending'`) vẫn thấy banner "Gia đình đang hoạt động".
  // => RN kiểm CẢ 2.
  const isFamilyPlan =
    plan?.status === 'active' &&
    (plan?.name?.toLowerCase().includes('family') ||
      plan?.displayName?.toLowerCase().includes('gia đình'));

  // Pull-to-refresh: gọi tất cả các refetch cùng lúc
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        refetchPlan(),
        refetchSummary(),
        refetchStats(),
        refetchSuggestions(),
        refetchNotifications(),
      ]);
    } catch (e) {
      if (__DEV__) console.warn('[Home] Refresh error:', e);
    } finally {
      // Báo tín hiệu cho các component con tự refetch hook của chúng.
      setRefreshKey((k) => k + 1);
      // Giữ refresh indicator tối thiểu 500ms để UX tốt hơn
      setTimeout(() => setRefreshing(false), 500);
    }
  }, [refetchPlan, refetchSummary, refetchStats, refetchSuggestions, refetchNotifications]);

  /**
   * Được gọi sau khi user bấm "Bắt đầu nấu" ngay tại Home.
   *
   * ⚠️ Bắt buộc báo qua `refreshKey` (counter) vì `useAsyncData` tạo state
   * RIÊNG cho mỗi nơi gọi hook -> `refetchStats()` của HomeScreen KHÔNG
   * update được `WeeklyStatisticsSection` / `FridgeSummaryCards`.
   */
  const handleCooked = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Tự refresh khi quay lại Home (sau khi tick "Bắt đầu nấu" ở màn công thức
  // hoặc màn thực đơn tuần) -> thống kê "Bữa đã nấu" + tủ lạnh cập nhật ngay.
  // Bỏ qua lần focus đầu tiên vì hook đã tự fetch khi mount.
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return undefined;
      }
      refetchStats();
      refetchSuggestions();
      refetchSummary();
      return undefined;
    }, [refetchStats, refetchSuggestions, refetchSummary])
  );

  // Animation values
  const animController = useRef(new Animated.Value(0)).current;
  const headerFade = animController.interpolate({
    inputRange: [0, 0.5],
    outputRange: [0, 1],
  });
  const headerSlide = animController.interpolate({
    inputRange: [0, 0.5],
    outputRange: [-15, 0],
  });
  const bodyFade = animController.interpolate({
    inputRange: [0.15, 0.75],
    outputRange: [0, 1],
  });
  const bodySlide = animController.interpolate({
    inputRange: [0.15, 0.75],
    outputRange: [8, 0],
  });

  useEffect(() => {
    Animated.timing(animController, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    // animController là ref.current (stable) -> thêm vào deps là an toàn.
  }, [animController]);

  return (
    <ScreenBackground>
      {/* P0.8: gradient + nền phẳng theo theme do ScreenBackground lo, nên
          header/bottom nav trong suốt và gradient liền mạch, không lộ
          màu trắng mặc định của NavigationContainer ở dark mode. */}
      <Animated.View style={{ opacity: headerFade, transform: [{ translateY: headerSlide }] }}>
        <HomeHeader
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onNotificationTap={() => navigation.navigate(Routes.Notifications)}
          onFilterTap={() => showInfo(t('home.filterTapped'))}
        />
      </Animated.View>

      <Animated.View style={{ flex: 1, opacity: bodyFade, transform: [{ translateY: bodySlide }] }}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: sp(100) + insets.bottom }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[AppColors.primary]}
              tintColor={isDark ? AppColors.primaryLight : AppColors.primary}
              progressBackgroundColor={isDark ? AppColors.darkCardBg : '#FFFFFF'}
            />
          }
        >
          <View style={{ marginTop: sp(18) }}>
            <GreetingBanner />
          </View>

          <View style={{ marginTop: sp(16) }}>
            <FridgeSummaryCards
              onExpiringTap={() => navigation.navigate(Routes.AllExpiredItems)}
              onAvailableTap={() => navigation.navigate(Routes.AllAvailableItems)}
              refreshKey={refreshKey}
            />
          </View>

          {/* Nút tắt "Danh sách mua" — điểm truy cập duy nhất từ Home để
              user mở được giỏ sau khi bấm "+ Thêm vào DS" ở màn công thức. */}
          <View style={{ marginTop: sp(16) }}>
            <ShoppingListShortcut
              onPress={() => navigation.navigate(Routes.ShoppingReminder)}
            />
          </View>

          <View style={{ marginTop: sp(18) }}>
            <PremiumBanner
              isFamilyPlan={isFamilyPlan}
              onTryNowTap={() => {
                if (isFamilyPlan) {
                  navigation.navigate(Routes.PackageManagement);
                } else {
                  // Mở paywall Gói Gia đình (QR PayOS + nhập token lời mời).
                  setPlanModalOpen(true);
                }
              }}
            />
          </View>

          <View style={{ marginTop: sp(20) }}>
            <WeeklyStatisticsSection
              onDetailTap={() => navigation.navigate(Routes.IngredientStatistics)}
              refreshKey={refreshKey}
            />
          </View>

          <CookingSuggestionsSection
            refreshKey={refreshKey}
            onRecipeTap={(recipe) =>
              navigation.navigate(Routes.RecipeDetail, {
                recipe,
                // ⚠️ `recipe.id` là id của MEAL SLOT (bản ghi meal plan), KHÔNG
                // phải id công thức. Màn chi tiết dùng `recipeId` để fetch
                // công thức -> phải truyền `recipe.recipeId` cho đúng.
                recipeId: recipe.recipeId ?? recipe.id,
                // Truyền `slotId` để màn chi tiết có thể tick "Bắt đầu nấu"
                // (BE cần slot id mới trừ nguyên liệu + đánh dấu đã nấu).
                slotId: recipe.id,
                cooked: recipe.cooked,
              })
            }
            onSwapTap={() => showInfo(t('home.swapNotReady'))}
            // Nấu xong -> báo Home để refresh thống kê "Bữa đã nấu" + tủ lạnh
            // ngay tại chỗ (component con có state hook riêng, không tự update).
            onCooked={handleCooked}
          />
        </ScrollView>
      </Animated.View>

      {/* Paywall Gói Gia đình (QR PayOS + nhập token lời mời) - Sprint A3.
          PHẢI render ở đây thì `setPlanModalOpen(true)` mới mở được modal;
          nếu chỉ set state mà không render <FamilyPlanModal> thì bấm "Dùng thử
          ngay" không có gì xảy ra. */}
      <FamilyPlanModal
        key={`family-plan-modal-${planModalOpen ? 'open' : 'closed'}`}
        visible={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onSuccess={refetchPlan}
      />
    </ScreenBackground>
  );
};
