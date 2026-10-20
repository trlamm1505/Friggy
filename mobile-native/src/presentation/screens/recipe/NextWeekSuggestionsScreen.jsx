/**
 * NextWeekSuggestionsScreen
 *
 * Redesigned (Sprint 9):
 * - Calendar layout 7 ngày
 * - DayPlanCard component cho mỗi ngày
 * - Today highlight (border primary + TODAY badge)
 * - Replace button (refresh icon)
 * - Empty state khi ngày chưa có món
 * - Tap để xem detail
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { DayPlanCard } from '../../components/recipe/DayPlanCard';
import { Sparkles, Info } from 'lucide-react-native';
import recipesMock from '../../../shared/mocks/recipes.json';
import { Routes } from '../../../shared/constants/routes';
import { showSuccess } from '../../utils/helpers';

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const NextWeekSuggestionsScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();

  // Tính ngày trong tuần
  const today = useMemo(() => new Date(), []);
  const todayIndex = today.getDay(); // 0 = CN, 1 = T2...

  const [plans, setPlans] = useState(() => {
    // Khởi tạo 7 ngày: tuần này + 1 tuần tới
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const recipe = recipesMock.recipes[i % recipesMock.recipes.length];
      return {
        date,
        dayOfWeek: date.getDay(),
        dayNumber: date.getDate(),
        recipe: i < 3 ? null : recipe, // 3 ngày đầu chưa có plan (test empty state)
      };
    });
  });

  const replaceDay = useCallback(
    (idx) => {
      setPlans((prev) => {
        const next = [...prev];
        const newRecipe = recipesMock.recipes[Math.floor(Math.random() * recipesMock.recipes.length)];
        next[idx] = { ...next[idx], recipe: newRecipe };
        return next;
      });
      showSuccess('Đã thay thế món');
    },
    [],
  );

  const addToDay = useCallback((idx) => {
    setPlans((prev) => {
      const next = [...prev];
      const newRecipe = recipesMock.recipes[Math.floor(Math.random() * recipesMock.recipes.length)];
      next[idx] = { ...next[idx], recipe: newRecipe };
      return next;
    });
    showSuccess('Đã thêm món');
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <View style={[styles.iconBadge, { backgroundColor: isDark ? '#19271E' : '#E8F5E9' }]}>
            <Sparkles color={isDark ? AppColors.primaryLight : AppColors.primary} size={20} />
          </View>
          <View style={{ flex: 1, marginLeft: sp(12) }}>
            <Text style={[styles.title, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(22) }]}>
              {t('home.weekPlanTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(13) }]}>
              {t('home.weekPlanSubtitle')}
            </Text>
          </View>
        </View>

        {/* Info banner */}
        <View
          style={[
            styles.infoBanner,
            {
              backgroundColor: isDark ? '#1B3324' : '#E8F5E9',
              borderColor: isDark ? '#2E4D36' : '#A5E69C',
            },
          ]}
        >
          <Info color={isDark ? AppColors.primaryLight : AppColors.primary} size={16} />
          <Text style={[styles.infoText, { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(12) }]}>
            Bạn có thể thay thế món bất kỳ ngày nào. AI sẽ cập nhật danh sách mua sắm tự động.
          </Text>
        </View>

        {/* Day cards */}
        {plans.map((plan, i) => {
          const dayLabel = DAY_LABELS[plan.dayOfWeek];
          return (
            <DayPlanCard
              key={i}
              recipe={plan.recipe}
              dayLabel={dayLabel}
              dayNumber={plan.dayNumber}
              isToday={i === 0}
              isTomorrow={i === 1}
              onPress={() => plan.recipe && navigation.navigate(Routes.RecipeDetail, { recipe: plan.recipe })}
              onReplace={() => replaceDay(i)}
              onAdd={() => addToDay(i)}
            />
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  headerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    marginLeft: 8,
    lineHeight: 18,
  },
});
