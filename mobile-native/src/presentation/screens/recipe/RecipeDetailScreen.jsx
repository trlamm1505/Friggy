/**
 * RecipeDetailScreen
 *
 * Redesigned (Sprint 9):
 * - Segmented tabs: Nguyên liệu / Cách nấu / Mẹo / Dinh dưỡng
 * - Servings adjuster (Stepper component)
 * - Nutrition facts section
 * - Tips & variants
 * - Action bar: Favorite + Cook Now + Share
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft,
  Clock,
  Users,
  ChefHat,
  Heart,
  Share2,
  Star,
  Flame,
  Beef,
  Wheat,
  Droplet,
} from 'lucide-react-native';
import { CustomButton } from '../../components/common/CustomButton';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { Stepper } from '../../components/common/Stepper';
import { ListSection } from '../../components/common/ListSection';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/common/Skeleton';
import { useRecipeById, useFridgeItems } from '../../hooks/useServiceHooks';
import { showSuccess } from '../../utils/helpers';

const FALLBACK_RECIPE = {
  id: 'r1',
  name: 'Trứng xào cà chua',
  image: 'recipe_tomato_egg',
  cookTime: 15,
  difficulty: 'easy',
  servings: 2,
  rating: 4.7,
  reviews: 128,
  ingredients: [
    { name: 'Cà chua', amount: 2, unit: 'quả' },
    { name: 'Trứng gà', amount: 3, unit: 'quả' },
    { name: 'Hành lá', amount: 2, unit: 'cọng' },
    { name: 'Gia vị', amount: 1, unit: 'thìa' },
  ],
  steps: [
    'Rửa sạch cà chua, cắt múi.',
    'Đánh trứng với chút muối.',
    'Phi thơm hành, xào trứng chín tới.',
    'Cho cà chua vào xào chung, nêm nếm vừa ăn.',
  ],
  nutrition: {
    calories: 220,
    protein: 14,
    carbs: 12,
    fat: 13,
  },
  tips: [
    'Chọn cà chua chín đỏ sẽ ngọt hơn.',
    'Không xào trứng quá lâu, trứng sẽ bị khô.',
    'Có thể thêm chút đường để cà chua bớt chua.',
  ],
  variants: [
    { name: 'Trứng bác cà chua', description: 'Phiên bản miền Bắc, có nước dùng' },
    { name: 'Cà chua nhồi thịt', description: 'Cà chua nhồi thịt băm hấp' },
  ],
};

const TABS = [
  { key: 'ingredients', label: 'Nguyên liệu' },
  { key: 'steps', label: 'Cách nấu' },
  { key: 'nutrition', label: 'Dinh dưỡng' },
  { key: 'tips', label: 'Mẹo' },
];

export const RecipeDetailScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();

  const routeRecipe = route.params?.recipe;
  const recipeId = routeRecipe?.id;

  const { data: fetchedRecipe, loading, error, refetch } = useRecipeById(recipeId);
  const { data: fridgeItems } = useFridgeItems();

  const [activeTab, setActiveTab] = useState('ingredients');
  const [expandedStep, setExpandedStep] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [servings, setServings] = useState(2);

  // Mock suggestions chỉ có id/name/cookTime/matchPercent, KHÔNG có
  // ingredients/steps. Khi bấm "Xem công thức" từ Home, route params truyền
  // nguyên suggestion đó — ta phải dùng id để fetch full recipe từ service.
  // Ưu tiên: fetchedRecipe (đầy đủ) > routeRecipe (chỉ khi có ingredients) > FALLBACK.
  const recipe =
    fetchedRecipe ||
    (routeRecipe?.ingredients ? routeRecipe : null) ||
    FALLBACK_RECIPE;

  // servings là "derived state" từ recipe.servings, nhưng người dùng có thể
  // chỉnh bằng Stepper -> cần giữ state cục bộ.
  // Theo pattern "adjust state during render" của React: khi recipe.servings
  // đổi (đổi món / fetch xong) thì đồng bộ lại giá trị đang hiển thị.
  // Trước đây dùng useEffect -> setState trong effect (react-hooks/set-state-in-effect).
  const [syncedServings, setSyncedServings] = useState(recipe?.servings);
  if (recipe?.servings && recipe.servings !== syncedServings) {
    setSyncedServings(recipe.servings);
    setServings(recipe.servings);
  }

  // Tính match percent
  const matchInfo = useMemo(() => {
    if (!recipe?.ingredients || !fridgeItems) {
      return {
        haveCount: 0,
        needCount: recipe?.ingredients?.length || 0,
        percent: 0,
        missingItems: [],
      };
    }
    const fridgeNames = fridgeItems.map((it) => it.name.toLowerCase());
    const have = [];
    const missing = [];
    for (const ing of recipe.ingredients) {
      const name = typeof ing === 'string' ? ing : ing.name;
      const found = fridgeNames.some(
        (n) => n.includes(name.toLowerCase()) || name.toLowerCase().includes(n)
      );
      if (found) have.push(name);
      else missing.push(name);
    }
    const total = recipe.ingredients.length;
    const percent = total > 0 ? Math.round((have.length / total) * 100) : 0;
    return {
      haveCount: have.length,
      needCount: missing.length,
      percent,
      missingItems: missing,
      haveItems: have,
    };
  }, [recipe, fridgeItems]);

  const isIngredientInFridge = useCallback(
    (ingredientName) => {
      if (!fridgeItems) return false;
      const lower = ingredientName.toLowerCase();
      return fridgeItems.some(
        (it) => it.name.toLowerCase().includes(lower) || lower.includes(it.name.toLowerCase())
      );
    },
    [fridgeItems]
  );

  // Scale ingredients theo servings
  const scaledIngredients = useMemo(() => {
    if (!recipe?.ingredients) return [];
    const ratio = servings / (recipe.servings || 1);
    return recipe.ingredients.map((ing) => {
      if (typeof ing === 'string') return { name: ing, amount: null, unit: null };
      return {
        name: ing.name,
        amount: ing.amount ? Math.round(ing.amount * ratio * 10) / 10 : null,
        unit: ing.unit,
      };
    });
  }, [recipe, servings]);

  const toggleFavorite = useCallback(() => {
    setIsFavorite((v) => !v);
    showSuccess(isFavorite ? t('home.removedFromFavorites') : t('home.addedToFavorites'));
  }, [isFavorite, t]);

  const addMissingToShoppingList = useCallback(async () => {
    showSuccess(t('home.addedToShoppingList'));
  }, [t]);

  const imageMap = {
    recipe_tomato_egg: require('../../../../assets/images/recipe_tomato_egg.png'),
    recipe_veggie_soup: require('../../../../assets/images/recipe_veggie_soup.png'),
  };
  const imageSource = recipe.image && imageMap[recipe.image] ? imageMap[recipe.image] : null;

  // Loading — chỉ hiện skeleton khi chưa có dữ liệu nào để hiển thị.
  if (loading && !recipe?.ingredients) {
    return (
      <View style={styles.container}>
        <Skeleton width="100%" height={sp(280)} borderRadius={0} />
        <View style={{ padding: sp(20) }}>
          <Skeleton width="80%" height={sp(24)} style={{ marginBottom: sp(12) }} />
          <Skeleton width="60%" height={sp(16)} style={{ marginBottom: sp(20) }} />
          <Skeleton width="100%" height={sp(120)} borderRadius={sp(12)} />
        </View>
      </View>
    );
  }

  if (error && !fetchedRecipe && !routeRecipe?.ingredients) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <ErrorState onRetry={refetch} style={{ marginTop: sp(80) }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          {imageSource ? (
            <Image source={imageSource} style={styles.heroImg} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={isDark ? ['#19271E', '#1E3A25'] : ['#E8F5E9', '#C7EFC2']}
              style={[styles.heroImg, { alignItems: 'center', justifyContent: 'center' }]}
            >
              <ChefHat color={isDark ? AppColors.primaryLight : AppColors.primary} size={80} />
            </LinearGradient>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={styles.heroOverlay} />
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
            <ChevronLeft color="#FFFFFF" size={24} />
          </Pressable>
          <Pressable
            onPress={() => showSuccess('Đã sao chép link')}
            style={[styles.backBtn, { left: undefined, right: 16 }]}
            hitSlop={8}
          >
            <Share2 color="#FFFFFF" size={20} />
          </Pressable>

          {matchInfo.percent > 0 ? (
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>{matchInfo.percent}% KHỚP</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.body, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
          <Text
            style={[
              styles.title,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(24) },
            ]}
          >
            {recipe.name}
          </Text>

          {/* Rating + reviews */}
          {recipe.rating ? (
            <View style={styles.ratingRow}>
              <Star color="#FFB300" size={14} fill="#FFB300" />
              <Text
                style={[
                  styles.ratingText,
                  { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) },
                ]}
              >
                {recipe.rating}
              </Text>
              <Text
                style={[
                  styles.reviewText,
                  {
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    fontSize: sp(12),
                  },
                ]}
              >
                ({recipe.reviews} đánh giá)
              </Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <View style={[styles.metaItem, { backgroundColor: isDark ? '#19271E' : '#E8F5E9' }]}>
              <Clock color={isDark ? AppColors.primaryLight : AppColors.forestAccent} size={16} />
              <Text
                style={[
                  styles.metaText,
                  { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) },
                ]}
              >
                {recipe.cookTime} {t('home.minutes')}
              </Text>
            </View>
            <View style={[styles.metaItem, { backgroundColor: isDark ? '#19271E' : '#E8F5E9' }]}>
              <Users color={isDark ? AppColors.primaryLight : AppColors.forestAccent} size={16} />
              <Text
                style={[
                  styles.metaText,
                  { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) },
                ]}
              >
                {servings} {t('home.people')}
              </Text>
            </View>
          </View>

          {/* Match summary */}
          {fridgeItems && recipe.ingredients ? (
            <View
              style={[
                styles.matchCard,
                {
                  backgroundColor:
                    matchInfo.percent === 100
                      ? isDark
                        ? '#1B3324'
                        : '#E8F5E9'
                      : isDark
                        ? '#3D2E1A'
                        : '#FFF3E0',
                  borderColor:
                    matchInfo.percent === 100
                      ? isDark
                        ? '#2E4D36'
                        : '#A5D6A7'
                      : isDark
                        ? '#5E4A35'
                        : '#FFCC80',
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.matchTitle,
                    {
                      color:
                        matchInfo.percent === 100
                          ? isDark
                            ? AppColors.primaryLight
                            : AppColors.primaryDark
                          : isDark
                            ? '#FFB74D'
                            : '#E65100',
                    },
                  ]}
                >
                  {matchInfo.percent === 100
                    ? '✅ Đủ nguyên liệu!'
                    : `Còn thiếu ${matchInfo.needCount} nguyên liệu`}
                </Text>
                <Text
                  style={[
                    styles.matchSub,
                    {
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      fontSize: sp(11),
                    },
                  ]}
                >
                  Có sẵn: {matchInfo.haveCount}/{recipe.ingredients.length}
                </Text>
              </View>
              {matchInfo.needCount > 0 ? (
                <Pressable
                  onPress={addMissingToShoppingList}
                  style={({ pressed }) => [
                    styles.addListBtn,
                    {
                      backgroundColor: isDark ? '#5E4A35' : '#FFCC80',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.addListText,
                      { color: isDark ? '#FFB74D' : '#E65100', fontSize: sp(11) },
                    ]}
                  >
                    + Thêm vào DS
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Tabs */}
          <View style={{ marginTop: sp(24) }}>
            <SegmentedControl options={TABS} selectedKey={activeTab} onSelect={setActiveTab} />
          </View>

          {/* Tab content */}
          {activeTab === 'ingredients' ? (
            <View style={{ marginTop: sp(20) }}>
              {/* Servings adjuster */}
              <View
                style={[
                  styles.servingsCard,
                  {
                    backgroundColor: isDark ? '#19271E' : '#E8F5E9',
                    borderColor: isDark ? '#2E4D36' : '#A5E69C',
                  },
                ]}
              >
                <View>
                  <Text
                    style={[
                      styles.servingsLabel,
                      {
                        color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                        fontSize: sp(11),
                      },
                    ]}
                  >
                    SỐ NGƯỜI ĂN
                  </Text>
                  <Text
                    style={[
                      styles.servingsValue,
                      { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(20) },
                    ]}
                  >
                    {servings} người
                  </Text>
                </View>
                <Stepper value={servings} onChange={setServings} min={1} max={12} />
              </View>

              <View style={{ marginTop: sp(16) }}>
                {scaledIngredients.map((ing, i) => {
                  const have = isIngredientInFridge(ing.name);
                  return (
                    <View
                      key={i}
                      style={[styles.ingRow, { backgroundColor: isDark ? '#19271E' : '#F4F7F4' }]}
                    >
                      <View
                        style={[
                          styles.ingCheck,
                          {
                            backgroundColor: have ? AppColors.primary : 'transparent',
                            borderColor: have ? AppColors.primary : isDark ? '#2E4D36' : '#C7D6CB',
                          },
                        ]}
                      >
                        {have ? <Text style={styles.ingCheckText}>✓</Text> : null}
                      </View>
                      <Text
                        style={[
                          styles.ingText,
                          {
                            color: isDark ? '#FFFFFF' : AppColors.textPrimary,
                            fontWeight: have ? FontWeights.semibold : FontWeights.regular,
                          },
                        ]}
                      >
                        {ing.name}
                      </Text>
                      {ing.amount ? (
                        <Text
                          style={[
                            styles.ingAmount,
                            {
                              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                              fontSize: sp(12),
                            },
                          ]}
                        >
                          {ing.amount} {ing.unit}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {activeTab === 'steps' ? (
            <View style={{ marginTop: sp(20) }}>
              {recipe.steps.map((step, i) => {
                const expanded = expandedStep === i || expandedStep === 'all';
                return (
                  <Pressable
                    key={i}
                    onPress={() => setExpandedStep(expandedStep === i ? null : i)}
                    style={[styles.stepRow, { backgroundColor: isDark ? '#19271E' : '#F4F7F4' }]}
                  >
                    <View style={[styles.stepNum, { backgroundColor: AppColors.primary }]}>
                      <Text style={styles.stepNumText}>{i + 1}</Text>
                    </View>
                    <Text
                      style={[
                        styles.stepText,
                        { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(14) },
                      ]}
                      numberOfLines={expanded ? undefined : 2}
                    >
                      {step}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {activeTab === 'nutrition' && recipe.nutrition ? (
            <View style={{ marginTop: sp(20) }}>
              <View
                style={[
                  styles.nutritionHero,
                  {
                    backgroundColor: isDark ? '#19271E' : '#E8F5E9',
                    borderColor: isDark ? '#2E4D36' : '#A5E69C',
                  },
                ]}
              >
                <Flame color={isDark ? AppColors.primaryLight : AppColors.primary} size={28} />
                <Text
                  style={[
                    styles.nutritionBig,
                    { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(36) },
                  ]}
                >
                  {recipe.nutrition.calories}
                </Text>
                <Text
                  style={[
                    styles.nutritionLabel,
                    {
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      fontSize: sp(12),
                    },
                  ]}
                >
                  kcal / {servings} người
                </Text>
              </View>
              <View style={styles.nutritionGrid}>
                <NutritionItem
                  icon={Beef}
                  label="Protein"
                  value={recipe.nutrition.protein}
                  unit="g"
                  color="#E57373"
                  isDark={isDark}
                />
                <NutritionItem
                  icon={Wheat}
                  label="Carbs"
                  value={recipe.nutrition.carbs}
                  unit="g"
                  color="#FFB300"
                  isDark={isDark}
                />
                <NutritionItem
                  icon={Droplet}
                  label="Fat"
                  value={recipe.nutrition.fat}
                  unit="g"
                  color="#9C27B0"
                  isDark={isDark}
                />
              </View>
            </View>
          ) : null}

          {activeTab === 'tips' ? (
            <View style={{ marginTop: sp(20) }}>
              {recipe.tips?.length > 0 ? (
                <ListSection title="Mẹo nấu ăn" style={{ marginBottom: sp(16) }}>
                  {recipe.tips.map((tip, i) => (
                    <View
                      key={i}
                      style={[styles.tipRow, { backgroundColor: isDark ? '#19271E' : '#F4F7F4' }]}
                    >
                      <Text style={[styles.tipBullet, { color: AppColors.primary }]}>💡</Text>
                      <Text
                        style={[
                          styles.tipText,
                          { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) },
                        ]}
                      >
                        {tip}
                      </Text>
                    </View>
                  ))}
                </ListSection>
              ) : null}

              {recipe.variants?.length > 0 ? (
                <ListSection title="Biến thể" style={{}}>
                  {recipe.variants.map((variant, i) => (
                    <View
                      key={i}
                      style={[
                        styles.variantRow,
                        { backgroundColor: isDark ? '#19271E' : '#F4F7F4' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.variantName,
                          { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(14) },
                        ]}
                      >
                        {variant.name}
                      </Text>
                      <Text
                        style={[
                          styles.variantDesc,
                          {
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                            fontSize: sp(12),
                          },
                        ]}
                      >
                        {variant.description}
                      </Text>
                    </View>
                  ))}
                </ListSection>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View
        style={[
          styles.bottom,
          {
            backgroundColor: isDark ? '#0E1611' : '#FFFFFF',
            borderTopColor: isDark ? '#2E4D36' : '#E3E8E4',
          },
        ]}
      >
        <Pressable
          onPress={toggleFavorite}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              backgroundColor: isFavorite ? AppColors.error : isDark ? '#19271E' : '#E8F5E9',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          hitSlop={8}
        >
          <Heart
            color={isFavorite ? '#FFFFFF' : isDark ? AppColors.primaryLight : AppColors.primary}
            size={20}
            fill={isFavorite ? '#FFFFFF' : 'transparent'}
          />
        </Pressable>
        <View style={{ flex: 1, marginLeft: sp(12) }}>
          <CustomButton
            title={t('home.startCooking')}
            onPress={() => showSuccess(t('home.startCooking'))}
          />
        </View>
      </View>
    </View>
  );
};

const NutritionItem = ({ icon: Icon, label, value, unit, color, isDark }) => (
  <View style={[styles.nutritionItem, { backgroundColor: isDark ? '#19271E' : '#F4F7F4' }]}>
    <View style={[styles.nutritionIcon, { backgroundColor: color + '20' }]}>
      <Icon color={color} size={18} />
    </View>
    <Text
      style={[
        styles.nutritionItemLabel,
        { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(11) },
      ]}
    >
      {label}
    </Text>
    <Text
      style={[
        styles.nutritionItemValue,
        { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(20) },
      ]}
    >
      {value}
      {unit}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { width: '100%', height: sp(280), position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
  },
  matchText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.5,
  },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  title: { fontFamily: FontFamily.black, fontWeight: FontWeights.black },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  ratingText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginLeft: 4,
  },
  reviewText: {
    fontFamily: FontFamily.regular,
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  metaText: { fontFamily: FontFamily.semibold, fontWeight: FontWeights.semibold },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  matchTitle: { fontSize: 13, fontFamily: FontFamily.bold, fontWeight: FontWeights.bold },
  matchSub: { fontFamily: FontFamily.medium, fontWeight: FontWeights.medium, marginTop: 2 },
  addListBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addListText: { fontFamily: FontFamily.bold, fontWeight: FontWeights.bold },
  servingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  servingsLabel: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.5,
  },
  servingsValue: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginTop: 2,
  },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  ingCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingCheckText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ingText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    marginLeft: 10,
  },
  ingAmount: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: 12,
  },
  stepText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    marginLeft: 10,
    lineHeight: 20,
  },
  nutritionHero: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  nutritionBig: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginTop: 6,
  },
  nutritionLabel: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginTop: 2,
  },
  nutritionGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  nutritionItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  nutritionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  nutritionItemLabel: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
  },
  nutritionItemValue: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginTop: 2,
  },
  tipRow: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 16,
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    lineHeight: 20,
  },
  variantRow: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  variantName: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  variantDesc: {
    fontFamily: FontFamily.regular,
    marginTop: 4,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
