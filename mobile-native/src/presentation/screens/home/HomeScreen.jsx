import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Easing, Platform, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors, AppGradients } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeHeader } from '../../components/home/HomeHeader';
import { GreetingBanner } from '../../components/home/GreetingBanner';
import { FridgeSummaryCards } from '../../components/home/FridgeSummaryCards';
import { PremiumBanner } from '../../components/home/PremiumBanner';
import { WeeklyStatisticsSection } from '../../components/home/WeeklyStatisticsSection';
import { CookingSuggestionsSection } from '../../components/home/CookingSuggestionsSection';
import { Routes } from '../../../shared/constants/routes';
import { showInfo } from '../../utils/helpers';
import { useCurrentPlan, useFridgeSummary, useWeeklyStats, useRecipeSuggestions, useNotifications } from '../../hooks/useServiceHooks';
import { useServices } from '../../../data/ServiceProvider';

export const HomeScreen = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const services = useServices();

  // Data từ service layer
  const { data: plan, refetch: refetchPlan } = useCurrentPlan();
  const { refetch: refetchSummary } = useFridgeSummary();
  const { refetch: refetchStats } = useWeeklyStats();
  const { refetch: refetchSuggestions } = useRecipeSuggestions();
  const { refetch: refetchNotifications } = useNotifications();

  const [searchValue, setSearchValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const isFamilyPlan = plan?.name?.toLowerCase().includes('family') ||
    plan?.displayName?.toLowerCase().includes('gia đình');

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
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={AppGradients.getBackground(isDark).colors}
        locations={AppGradients.getBackground(isDark).locations}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
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
          contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
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
          <View style={{ marginTop: sp(8) }}>
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
                  showInfo('Mở modal đăng ký gói Family');
                }
              }}
            />
          </View>

          <View style={{ marginTop: sp(18) }}>
            <WeeklyStatisticsSection
              onDetailTap={() => navigation.navigate(Routes.IngredientStatistics)}
              onMealSuggestionsTap={() => navigation.navigate(Routes.NextWeekSuggestions)}
              onShoppingReminderTap={() => navigation.navigate(Routes.ShoppingReminder)}
            />
          </View>

          <CookingSuggestionsSection
            onRecipeTap={(recipe) => navigation.navigate(Routes.RecipeDetail, { recipe })}
            onUpgradeTap={() => showInfo(t('home.upgradeTapped'))}
          />
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
