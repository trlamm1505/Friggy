/**
 * RecipeListItem
 *
 * Recipe card dạng horizontal (full width, image bên trái).
 * Dùng cho RecipeSuggestionsScreen list view.
 */

import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { Clock, ChefHat, Bookmark } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const DIFFICULTY_LABELS = {
  easy: 'home.easy',
  medium: 'home.medium',
  hard: 'home.hard',
};

const DIFFICULTY_COLORS = {
  easy: { bg: '#E8F5E9', fg: AppColors.primaryDark },
  medium: { bg: '#FFF3E0', fg: '#E65100' },
  hard: { bg: '#FFEBEE', fg: AppColors.error },
};

export const RecipeListItem = ({ recipe, onPress, onBookmarkPress, style }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const difficultyColor = DIFFICULTY_COLORS[recipe.difficulty] || DIFFICULTY_COLORS.easy;

  const imageMap = {
    recipe_tomato_egg: require('../../../../assets/images/recipe_tomato_egg.png'),
    recipe_veggie_soup: require('../../../../assets/images/recipe_veggie_soup.png'),
  };
  // URL tuyệt đối từ BE -> `{ uri }`; key của mock -> asset đóng gói sẵn.
  const resolveImageSource = (image) => {
    if (!image || typeof image !== 'string') return null;
    if (/^https?:\/\//i.test(image)) return { uri: image };
    return imageMap[image] || null;
  };
  const imageSource = resolveImageSource(recipe.image);

  return (
    <Pressable
      onPress={() => onPress && onPress(recipe)}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, style]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? AppColors.darkCardBg : '#FFFFFF',
            borderColor: isDark ? AppColors.darkCardBorder : AppColors.availableBorder,
          },
        ]}
      >
        <View style={styles.imageWrap}>
          {imageSource ? (
            <Image source={imageSource} style={styles.image} resizeMode="cover" />
          ) : (
            <View
              style={[
                styles.imageFallback,
                { backgroundColor: isDark ? '#233629' : AppColors.accentGreen },
              ]}
            >
              <ChefHat color={isDark ? AppColors.primaryLight : AppColors.primary} size={32} />
            </View>
          )}
        </View>
        <View style={styles.body}>
          <Text
            style={[styles.name, { color: isDark ? '#FFFFFF' : AppColors.textPrimary }]}
            numberOfLines={2}
          >
            {recipe.name}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock color={isDark ? AppColors.darkTextSecondary : AppColors.hintText} size={13} />
              <Text
                style={[
                  styles.metaText,
                  { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
                ]}
              >
                {recipe.cookTime} {t('home.minutes')}
              </Text>
            </View>
            <View
              style={[
                styles.difficultyChip,
                { backgroundColor: isDark ? '#233629' : difficultyColor.bg },
              ]}
            >
              <Text
                style={[
                  styles.difficultyText,
                  { color: isDark ? AppColors.primaryLight : difficultyColor.fg },
                ]}
              >
                {t(DIFFICULTY_LABELS[recipe.difficulty] || 'home.easy')}
              </Text>
            </View>
          </View>

          <View style={styles.servingsRow}>
            <Text
              style={[
                styles.servings,
                { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
              ]}
            >
              {recipe.servings} {t('home.people')}
            </Text>
            {onBookmarkPress ? (
              <Pressable
                onPress={() => onBookmarkPress(recipe)}
                hitSlop={8}
                style={({ pressed }) => [styles.bookmarkBtn, { opacity: pressed ? 0.6 : 1 }]}
                testID={`recipe-bookmark-${recipe.id}`}
                accessibilityLabel={t('home.favorite')}
              >
                <Bookmark
                  color={
                    recipe.bookmarked
                      ? AppColors.primary
                      : isDark
                        ? AppColors.darkTextSecondary
                        : AppColors.textSecondary
                  }
                  size={16}
                  fill={recipe.bookmarked ? AppColors.primary : 'transparent'}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: sp(16),
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: sp(96),
  },
  imageWrap: {
    width: sp(96),
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    padding: sp(10),
    justifyContent: 'center',
  },
  name: {
    fontSize: sp(14),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    lineHeight: sp(18),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: sp(8),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(4),
  },
  metaText: {
    fontSize: sp(11),
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginLeft: sp(4),
  },
  difficultyChip: {
    paddingHorizontal: sp(6),
    paddingVertical: sp(2),
    borderRadius: sp(6),
  },
  difficultyText: {
    fontSize: sp(9),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  servingsRow: {
    marginTop: sp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookmarkBtn: {
    padding: sp(2),
  },
  servings: {
    fontSize: sp(11),
    fontFamily: FontFamily.regular,
  },
});
