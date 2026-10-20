/**
 * CookingSuggestionsSection
 *
 * Redesigned (Sprint 2):
 * - Data từ useRecipeSuggestions() thay vì mock JSON trực tiếp
 * - Dùng RecipeCard mới
 * - AI suggestion badge ở header
 * - Loading skeleton
 * - Error + retry
 * - Empty state
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { Sparkles, ChefHat, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRecipeSuggestions } from '../../hooks/useServiceHooks';
import { RecipeCard } from '../recipe/RecipeCard';
import { Skeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';

export const CookingSuggestionsSection = ({ onRecipeTap, onUpgradeTap }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { data: suggestions, loading, error, refetch } = useRecipeSuggestions();

  // Loading state
  if (loading) {
    return (
      <View style={styles.wrap}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Sparkles color={isDark ? AppColors.primaryLight : AppColors.forestAccent} size={20} />
              <Text
                style={[
                  styles.title,
                  { color: isDark ? '#FFFFFF' : AppColors.textPrimary, marginLeft: sp(8) },
                ]}
              >
                {t('home.cookingSuggestions')}
              </Text>
            </View>
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
              ]}
            >
              {t('home.loading')}
            </Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {[0, 1, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.skeletonCard,
                {
                  backgroundColor: isDark ? AppColors.darkCardBg : '#FFFFFF',
                  borderColor: isDark ? AppColors.darkCardBorder : AppColors.availableBorder,
                },
              ]}
            >
              <Skeleton width="100%" height={sp(110)} borderRadius={0} />
              <View style={{ padding: sp(10), gap: sp(8) }}>
                <Skeleton width="80%" height={sp(13)} />
                <Skeleton width="60%" height={sp(11)} />
                <View style={{ flexDirection: 'row', gap: sp(4) }}>
                  <Skeleton width={sp(40)} height={sp(16)} borderRadius={sp(6)} />
                  <Skeleton width={sp(40)} height={sp(16)} borderRadius={sp(6)} />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.wrap}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <ChefHat color={isDark ? AppColors.primaryLight : AppColors.forestAccent} size={20} />
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, marginLeft: sp(8) },
              ]}
            >
              {t('home.cookingSuggestions')}
            </Text>
          </View>
        </View>
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  // Empty state
  if (!suggestions || suggestions.length === 0) {
    return (
      <View style={styles.wrap}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Sparkles color={isDark ? AppColors.primaryLight : AppColors.forestAccent} size={20} />
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, marginLeft: sp(8) },
              ]}
            >
              {t('home.cookingSuggestions')}
            </Text>
          </View>
        </View>
        <EmptyState
          emoji="🍳"
          title={t('home.noData')}
          hint={t('home.tipMoreRecipes')}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Sparkles color={isDark ? AppColors.primaryLight : AppColors.forestAccent} size={20} />
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, marginLeft: sp(8) },
              ]}
            >
              {t('home.cookingSuggestions')}
            </Text>
            {/* AI badge */}
            <View
              style={[
                styles.aiBadge,
                { backgroundColor: isDark ? '#1B3324' : AppColors.accentGreen },
              ]}
            >
              <Text
                style={[
                  styles.aiBadgeText,
                  { color: isDark ? AppColors.primaryLight : AppColors.forestAccent },
                ]}
              >
                {t('home.aiSuggestion')}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.subtitle,
              { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
            ]}
          >
            {t('home.tipMoreRecipes')}
          </Text>
        </View>
        <Pressable
          onPress={refetch}
          style={({ pressed }) => [
            styles.refreshBtn,
            {
              backgroundColor: isDark ? '#233629' : AppColors.accentGreen,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <RefreshCw
            color={isDark ? AppColors.primaryLight : AppColors.forestAccent}
            size={14}
          />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {suggestions.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onPress={onRecipeTap}
            width={sp(200)}
            style={{ marginRight: sp(12) }}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: sp(24),
  },
  headerRow: {
    paddingHorizontal: sp(20),
    marginBottom: sp(12),
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: sp(16),
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    fontSize: sp(12),
    marginTop: sp(4),
    marginLeft: sp(28),
  },
  aiBadge: {
    paddingHorizontal: sp(6),
    paddingVertical: sp(2),
    borderRadius: sp(6),
    marginLeft: sp(8),
  },
  aiBadgeText: {
    fontSize: sp(9),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  refreshBtn: {
    width: sp(32),
    height: sp(32),
    borderRadius: sp(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: sp(2),
  },
  scroll: {
    paddingHorizontal: sp(20),
  },
  skeletonCard: {
    width: sp(200),
    borderRadius: sp(16),
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: sp(12),
  },
});
