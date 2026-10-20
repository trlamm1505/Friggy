/**
 * RecipeSuggestionsScreen
 *
 * Redesigned (Sprint 9):
 * - Difficulty filter với counts chính xác (tính từ data)
 * - CookTime filter (Quick <15 / Medium 15-30 / Long >30)
 * - Sticky sort label
 * - Tap sort menu → mở modal bottom sheet style inline
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterChips } from '../../components/common/FilterChips';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/common/Skeleton';
import { useRecipesFiltered } from '../../hooks/useServiceHooks';
import { Routes } from '../../../shared/constants/routes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecipeListItem } from '../../components/recipe/RecipeListItem';
import { ArrowUpDown, Check, X } from 'lucide-react-native';

const DIFFICULTY_KEYS = {
  ALL: 'all',
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

const COOKTIME_KEYS = {
  ALL: 'all',
  QUICK: 'quick',     // < 15 min
  MEDIUM: 'medium',   // 15-30 min
  LONG: 'long',       // > 30 min
};

const SORT_KEYS = {
  COOK_TIME_ASC: 'cookTime_asc',
  COOK_TIME_DESC: 'cookTime_desc',
  DIFFICULTY_ASC: 'difficulty_asc',
  NAME_ASC: 'name_asc',
};

export const RecipeSuggestionsScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState(DIFFICULTY_KEYS.ALL);
  const [cookTime, setCookTime] = useState(COOKTIME_KEYS.ALL);
  const [sort, setSort] = useState(SORT_KEYS.COOK_TIME_ASC);
  const [sortModalOpen, setSortModalOpen] = useState(false);

  // Tính filter client-side (recipe list ngắn)
  const filteredClient = useMemo(() => {
    let result = [];
    // Mock: dùng recipesMock
    // Nếu có data từ service thì dùng, fallback mock
    return result;
  }, []);

  const serviceFilters = useMemo(() => {
    const f = {};
    if (search.trim()) f.search = search.trim();
    if (difficulty !== DIFFICULTY_KEYS.ALL) f.difficulty = difficulty;
    if (sort === SORT_KEYS.NAME_ASC) {
      f.sortBy = 'name';
      f.sortDir = 'asc';
    } else if (sort === SORT_KEYS.COOK_TIME_ASC) {
      f.sortBy = 'cookTime';
      f.sortDir = 'asc';
    } else if (sort === SORT_KEYS.COOK_TIME_DESC) {
      f.sortBy = 'cookTime';
      f.sortDir = 'desc';
    } else if (sort === SORT_KEYS.DIFFICULTY_ASC) {
      f.sortBy = 'difficulty';
      f.sortDir = 'asc';
    }
    return f;
  }, [search, difficulty, sort]);

  const { data: recipes, loading, error, refetch } = useRecipesFiltered(serviceFilters);

  // Cook time filter client-side
  const finalRecipes = useMemo(() => {
    if (cookTime === COOKTIME_KEYS.ALL) return recipes;
    return recipes.filter((r) => {
      const t = r.cookTime;
      if (cookTime === COOKTIME_KEYS.QUICK) return t < 15;
      if (cookTime === COOKTIME_KEYS.MEDIUM) return t >= 15 && t <= 30;
      if (cookTime === COOKTIME_KEYS.LONG) return t > 30;
      return true;
    });
  }, [recipes, cookTime]);

  // Counts by difficulty
  const difficultyCounts = useMemo(() => {
    const all = recipes || [];
    return {
      all: all.length,
      easy: all.filter((r) => r.difficulty === 'easy').length,
      medium: all.filter((r) => r.difficulty === 'medium').length,
      hard: all.filter((r) => r.difficulty === 'hard').length,
    };
  }, [recipes]);

  // Counts by cook time
  const cookTimeCounts = useMemo(() => {
    const all = recipes || [];
    return {
      all: all.length,
      quick: all.filter((r) => r.cookTime < 15).length,
      medium: all.filter((r) => r.cookTime >= 15 && r.cookTime <= 30).length,
      long: all.filter((r) => r.cookTime > 30).length,
    };
  }, [recipes]);

  const difficultyOptions = [
    { key: DIFFICULTY_KEYS.ALL, label: 'Tất cả', count: difficultyCounts.all },
    { key: DIFFICULTY_KEYS.EASY, label: 'Dễ', count: difficultyCounts.easy, color: AppColors.primaryDark },
    { key: DIFFICULTY_KEYS.MEDIUM, label: 'Vừa', count: difficultyCounts.medium, color: '#E65100' },
    { key: DIFFICULTY_KEYS.HARD, label: 'Khó', count: difficultyCounts.hard, color: AppColors.error },
  ];

  const cookTimeOptions = [
    { key: COOKTIME_KEYS.ALL, label: 'Mọi thời gian', count: cookTimeCounts.all },
    { key: COOKTIME_KEYS.QUICK, label: '< 15 phút', count: cookTimeCounts.quick, color: '#4CAF50' },
    { key: COOKTIME_KEYS.MEDIUM, label: '15-30 phút', count: cookTimeCounts.medium, color: '#FF9800' },
    { key: COOKTIME_KEYS.LONG, label: '> 30 phút', count: cookTimeCounts.long, color: '#9C27B0' },
  ];

  const sortOptions = [
    { key: SORT_KEYS.COOK_TIME_ASC, label: 'Thời gian nấu tăng dần' },
    { key: SORT_KEYS.COOK_TIME_DESC, label: 'Thời gian nấu giảm dần' },
    { key: SORT_KEYS.DIFFICULTY_ASC, label: 'Độ khó tăng dần' },
    { key: SORT_KEYS.NAME_ASC, label: 'Tên A-Z' },
  ];

  const currentSortLabel = sortOptions.find((o) => o.key === sort)?.label || '';

  // Loading
  if (loading && !recipes.length) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : AppColors.textPrimary }]}>
            Tất cả công thức
          </Text>
        </View>
        <View style={{ paddingHorizontal: sp(20), gap: sp(10) }}>
          <Skeleton width="100%" height={sp(42)} borderRadius={sp(12)} style={{ marginBottom: sp(8) }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={sp(90)} borderRadius={sp(14)} />
          ))}
        </View>
      </View>
    );
  }

  if (error && !recipes.length) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
        <ErrorState onRetry={refetch} style={{ marginTop: sp(40) }} />
      </View>
    );
  }

  const hasFilters = search || difficulty !== DIFFICULTY_KEYS.ALL || cookTime !== COOKTIME_KEYS.ALL;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(22) }]}>
          Tất cả công thức
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(13) }]}>
          {finalRecipes.length > 0
            ? t('home.resultCount', { count: finalRecipes.length })
            : 'Không có món nào'}
        </Text>
      </View>

      <View style={{ paddingHorizontal: sp(20), marginBottom: sp(10) }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm công thức..." />
      </View>

      <FilterChips
        options={difficultyOptions}
        selectedKey={difficulty}
        onSelect={setDifficulty}
        style={{ marginBottom: sp(8) }}
      />

      <FilterChips
        options={cookTimeOptions}
        selectedKey={cookTime}
        onSelect={setCookTime}
        style={{ marginBottom: sp(10) }}
      />

      {/* Sticky sort bar */}
      <View
        style={[
          styles.sortRow,
          {
            backgroundColor: isDark ? '#0E1611' : '#FFFFFF',
            borderBottomColor: isDark ? '#2E4D36' : '#E3E8E4',
          },
        ]}
      >
        <Text style={[styles.sortLabel, { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(12) }]}>
          Sắp xếp theo
        </Text>
        <Pressable
          onPress={() => setSortModalOpen(true)}
          style={({ pressed }) => [
            styles.sortBtn,
            {
              backgroundColor: isDark ? '#19271E' : '#E8F5E9',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <ArrowUpDown color={isDark ? AppColors.primaryLight : AppColors.primary} size={14} />
          <Text style={[styles.sortBtnText, { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(12) }]}>
            {currentSortLabel}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={finalRecipes}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: 100 + insets.bottom }}
        ItemSeparatorComponent={() => <View style={{ height: sp(10) }} />}
        ListEmptyComponent={
          <EmptyState
            emoji="🍳"
            title={hasFilters ? t('home.noResults') : 'Chưa có công thức'}
            hint={hasFilters ? t('home.noResultsHint') : 'Thử thêm công thức mới'}
          />
        }
        renderItem={({ item }) => (
          <RecipeListItem
            recipe={item}
            onPress={(recipe) => navigation.navigate(Routes.RecipeDetail, { recipe })}
          />
        )}
      />

      {/* Sort bottom sheet */}
      <Modal visible={sortModalOpen} animationType="slide" transparent onRequestClose={() => setSortModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSortModalOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.bottomSheet,
              {
                backgroundColor: isDark ? '#19271E' : '#FFFFFF',
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(18) }]}>
                Sắp xếp theo
              </Text>
              <Pressable onPress={() => setSortModalOpen(false)} hitSlop={6}>
                <X color={isDark ? AppColors.darkTextSecondary : AppColors.textSecondary} size={22} />
              </Pressable>
            </View>
            {sortOptions.map((opt) => {
              const active = sort === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setSort(opt.key);
                    setSortModalOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.sheetItem,
                    {
                      backgroundColor: active
                        ? isDark ? '#1B3324' : AppColors.accentGreen
                        : 'transparent',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sheetItemText,
                      {
                        color: active
                          ? isDark ? AppColors.primaryLight : AppColors.primary
                          : isDark ? '#FFFFFF' : AppColors.textPrimary,
                        fontSize: sp(15),
                        fontWeight: active ? 'bold' : 'normal',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {active ? <Check color={isDark ? AppColors.primaryLight : AppColors.primary} size={18} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: sp(20),
    paddingTop: sp(8),
    paddingBottom: sp(12),
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginTop: 4,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp(20),
    paddingVertical: sp(8),
    borderBottomWidth: 1,
  },
  sortLabel: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(10),
    paddingVertical: sp(6),
    borderRadius: sp(14),
    gap: 4,
  },
  sortBtnText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: sp(4),
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp(12),
    paddingVertical: sp(14),
    borderRadius: sp(12),
  },
  sheetItemText: {
    fontFamily: FontFamily.regular,
  },
});
