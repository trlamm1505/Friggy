import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  Animated,
  Easing,
  Platform,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground } from '../../components/common/ScreenBackground';
import { HomeHeader } from '../../components/home/HomeHeader';
import { GreetingBanner } from '../../components/home/GreetingBanner';
import { FridgeSummaryCards } from '../../components/home/FridgeSummaryCards';
import { PremiumBanner } from '../../components/home/PremiumBanner';
import { FamilyPlanModal } from '../../components/home/FamilyPlanModal';
import { WeeklyStatisticsSection } from '../../components/home/WeeklyStatisticsSection';
import { CookingSuggestionsSection } from '../../components/home/CookingSuggestionsSection';
import { Routes } from '../../../shared/constants/routes';
import { showInfo } from '../../utils/helpers';
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
      // Giữ refresh indicator tối thiểu 500ms để UX tốt hơn
      setTimeout(() => setRefreshing(false), 500);
    }
  }, [refetchPlan, refetchSummary, refetchStats, refetchSuggestions, refetchNotifications]);

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
            />
          </View>

          <CookingSuggestionsSection
            onRecipeTap={(recipe) => navigation.navigate(Routes.RecipeDetail, { recipe })}
            onSwapTap={() => showInfo(t('home.filterTapped'))}
          />
        </ScrollView>
      </Animated.View>

      {/* Paywall Gói Gia Đình (QR PayOS + nhập token lời mời).
          ⚠️ SỬA BUG DEV B: modal được import + có state `planModalOpen` nhưng
          KHÔNG được render -> bấm "Gia đình" ở PremiumBanner không mở được
          paywall (setPlanModalOpen(true) không có gì để hiện). */}
      <FamilyPlanModal
        visible={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onSuccess={() => {
          setPlanModalOpen(false);
          refetchPlan();
        }}
      />
    </ScreenBackground>
  );
};
