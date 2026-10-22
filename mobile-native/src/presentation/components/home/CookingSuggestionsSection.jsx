/**
 * CookingSuggestionsSection
 *
 * Redesign (flat card, không gradient/shadow — đồng bộ GreetingBanner +
 * PremiumBanner + WeeklyStatisticsSection):
 * - Bọc ngoài là 1 card lớn có header "Các bữa ăn trong ngày hôm nay"
 * - Bên trong: danh sách dọc, mỗi món 1 card ngang
 *   • Hàng 1: tag bữa (sáng/trưa/tối) + trạng thái liên quan đến nấu
 *   • Hàng 2: tên món (lớn) + chú thích nhỏ (số người, thời gian nấu)
 *   • Hàng 3: 2 button "Xem công thức" + "Đổi món bằng AI"
 * - Ảnh để trống (null) — layout đã sẵn sàng, chờ thay ảnh
 */

import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { Users, Clock, Sparkles, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRecipeSuggestions } from '../../hooks/useServiceHooks';
import { Skeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';

// Ảnh minh hoạ từng món — để trống trước khi có asset.
const MEAL_ART = null;

// Map index của suggestion -> bữa ăn (data mock có 4 món tương ứng
// sáng / trưa / tối / phụ). Khi nối API thật, lấy `mealType` từ response.
const MEAL_SLOTS = [
  { key: 'mealBreakfast', accent: AppColors.accentOrange },
  { key: 'mealLunch', accent: AppColors.primary },
  { key: 'mealDinner', accent: AppColors.forestAccent },
  { key: 'mealSnack', accent: AppColors.textSecondary },
];

export const CookingSuggestionsSection = ({ onRecipeTap, onSwapTap }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { data: suggestions, loading, error, refetch } = useRecipeSuggestions();

  const surfaceColor = isDark ? '#19271E' : '#FFFFFF';
  const borderColor = isDark ? '#2E4D36' : '#A5E69C';
  const textPrimary = isDark ? '#FFFFFF' : AppColors.textPrimary;

  const header = (
    <View style={styles.headerRow}>
      <View style={[styles.headerIcon, { backgroundColor: isDark ? '#233629' : AppColors.accentGreen }]}>
        <Sparkles color={isDark ? AppColors.primaryLight : AppColors.forestAccent} size={16} />
      </View>
      <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>
        {t('home.mealsToday')}
      </Text>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.surface, { backgroundColor: surfaceColor, borderColor }]}>
          {header}
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.mealCard, { backgroundColor: surfaceColor, borderColor, marginTop: sp(10) }]}
            >
              <Skeleton width={sp(70)} height={sp(18)} borderRadius={sp(9)} />
              <View style={styles.mealMainRow}>
                <Skeleton width={sp(64)} height={sp(64)} borderRadius={sp(12)} />
                <View style={styles.mealInfo}>
                  <Skeleton width="85%" height={sp(14)} />
                  <Skeleton width="60%" height={sp(10)} style={{ marginTop: sp(6) }} />
                </View>
              </View>
              <View style={styles.mealBtnRow}>
                <Skeleton width="48%" height={sp(34)} borderRadius={sp(17)} />
                <Skeleton width="48%" height={sp(34)} borderRadius={sp(17)} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.surface, { backgroundColor: surfaceColor, borderColor }]}>
          {header}
          <ErrorState onRetry={refetch} />
        </View>
      </View>
    );
  }

  // Empty state
  if (!suggestions || suggestions.length === 0) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.surface, { backgroundColor: surfaceColor, borderColor }]}>
          {header}
          <EmptyState emoji="🍳" title={t('home.noData')} hint={t('home.tipMoreRecipes')} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.surface, { backgroundColor: surfaceColor, borderColor }]}>
        {header}

        {suggestions.map((recipe, i) => (
          <MealCard
            key={recipe.id}
            isDark={isDark}
            t={t}
            recipe={recipe}
            index={i}
            slot={MEAL_SLOTS[i % MEAL_SLOTS.length]}
            onRecipeTap={onRecipeTap}
            onSwapTap={onSwapTap}
          />
        ))}
      </View>
    </View>
  );
};

const MealCard = ({ isDark, t, recipe, slot, index, onRecipeTap, onSwapTap }) => {
  const accent = slot?.accent || AppColors.primary;
  const borderColor = isDark ? '#2E4D36' : '#A5E69C';
  const surfaceColor = isDark ? '#19271E' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const textSecondary = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;
  const tint = isDark ? '#233629' : AppColors.accentGreen;
  const fg = isDark ? AppColors.primaryLight : AppColors.forestAccent;

  return (
    <View style={[styles.mealCard, { backgroundColor: surfaceColor, borderColor }]}>
      {/* Hàng 1: tag bữa + trạng thái nấu */}
      <View style={styles.mealTopRow}>
        <View style={[styles.mealTag, { backgroundColor: tint, borderColor: accent }]}>
          <Text style={[styles.mealTagText, { color: fg }]}>
            {slot ? t(slot.key) : t('meal.mealType')}
          </Text>
        </View>
        {recipe.cooked ? (
          <View style={[styles.statusChip, { backgroundColor: isDark ? '#1E3A25' : '#E8F5E9' }]}>
            <Text style={[styles.statusText, { color: AppColors.primary }]}>
              {t('home.alreadyCooked')}
            </Text>
          </View>
        ) : (
          <View style={[styles.statusChip, { backgroundColor: isDark ? '#3A2A1E' : '#FFF3E0' }]}>
            <Text style={[styles.statusText, { color: AppColors.accentOrange }]}>
              {t('home.toCook')}
            </Text>
          </View>
        )}
      </View>

      {/* Hàng 2: ảnh + tên món + chú thích */}
      <View style={styles.mealMainRow}>
        <View style={styles.mealArtWrap}>
          {MEAL_ART ? (
            <Image source={MEAL_ART} style={styles.mealArt} resizeMode="cover" />
          ) : (
            <View style={[styles.mealArtPlaceholder, { borderColor }]} />
          )}
        </View>
        <View style={styles.mealInfo}>
          <Text style={[styles.mealName, { color: textPrimary }]} numberOfLines={2}>
            {recipe.name}
          </Text>
          <View style={styles.mealMetaRow}>
            <Users color={textSecondary} size={12} />
            <Text style={[styles.mealMetaText, { color: textSecondary }]}>
              {recipe.servings || 2} {t('home.people')}
            </Text>
            <Clock color={textSecondary} size={12} style={styles.mealMetaIcon} />
            <Text style={[styles.mealMetaText, { color: textSecondary }]}>
              {recipe.cookTime} {t('home.minutes')}
            </Text>
          </View>
        </View>
      </View>

      {/* Hàng 3: 2 button */}
      <View style={styles.mealBtnRow}>
        <Pressable
          onPress={() => onRecipeTap && onRecipeTap(recipe, index)}
          style={({ pressed }) => [
            styles.mealBtn,
            {
              backgroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[styles.mealBtnText, { color: isDark ? '#0E1611' : '#FFFFFF' }]}>
            {t('home.viewRecipe')}
          </Text>
          <ChevronRight color={isDark ? '#0E1611' : '#FFFFFF'} size={14} strokeWidth={2.5} />
        </Pressable>

        <Pressable
          onPress={() => onSwapTap && onSwapTap(recipe, index)}
          style={({ pressed }) => [
            styles.mealBtn,
            styles.mealBtnGhost,
            { borderColor, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Sparkles color={fg} size={13} strokeWidth={2.5} />
          <Text style={[styles.mealBtnGhostText, { color: fg }]} numberOfLines={1}>
            {t('home.swapWithAI')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: sp(20),
    marginHorizontal: sp(20),
  },
  // Card lớn bọc ngoài: nền + viền tĩnh, KHÔNG shadow.
  surface: {
    borderRadius: sp(20),
    borderWidth: sp(1.5),
    padding: sp(14),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp(12),
  },
  headerIcon: {
    width: sp(30),
    height: sp(30),
    borderRadius: sp(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sp(8),
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: sp(15),
  },
  mealCard: {
    borderRadius: sp(16),
    borderWidth: 1,
    padding: sp(12),
    marginTop: sp(10),
  },
  // Hàng 1: tag bữa + trạng thái nấu
  mealTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp(10),
  },
  mealTag: {
    paddingHorizontal: sp(8),
    paddingVertical: sp(3),
    borderRadius: sp(9),
    borderWidth: 1,
  },
  mealTagText: {
    fontSize: sp(10),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  statusChip: {
    paddingHorizontal: sp(8),
    paddingVertical: sp(3),
    borderRadius: sp(9),
  },
  statusText: {
    fontSize: sp(10),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  // Hàng 2: ảnh + thông tin
  mealMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealArtWrap: {
    width: sp(64),
    height: sp(64),
    borderRadius: sp(12),
    overflow: 'hidden',
  },
  mealArt: {
    width: '100%',
    height: '100%',
  },
  mealArtPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: sp(12),
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.35,
  },
  mealInfo: {
    flex: 1,
    marginLeft: sp(12),
  },
  mealName: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: sp(15),
    lineHeight: sp(20),
  },
  mealMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp(5),
  },
  mealMetaIcon: {
    marginLeft: sp(10),
  },
  mealMetaText: {
    fontSize: sp(11),
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginLeft: sp(4),
  },
  // Hàng 3: 2 button
  mealBtnRow: {
    flexDirection: 'row',
    gap: sp(8),
    marginTop: sp(12),
  },
  mealBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(4),
    height: sp(34),
    borderRadius: sp(17),
  },
  mealBtnPrimary: {},
  mealBtnGhost: {
    borderWidth: 1,
  },
  mealBtnText: {
    fontSize: sp(12),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  mealBtnGhostText: {
    fontSize: sp(12),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
});