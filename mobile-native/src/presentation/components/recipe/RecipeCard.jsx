/**
 * RecipeCard
 *
 * Card hiển thị recipe với:
 * - Image (với fallback nếu không có ảnh)
 * - Match % badge (góc trên phải)
 * - Tên recipe
 * - Cook time + difficulty
 * - Tags
 *
 * Hỗ trợ dark mode + cả light.
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

export const RecipeCard = ({ recipe, onPress, onBookmarkPress, style, width = 200 }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const difficultyKey = DIFFICULTY_LABELS[recipe.difficulty] || 'home.easy';
  const difficultyColor = DIFFICULTY_COLORS[recipe.difficulty] || DIFFICULTY_COLORS.easy;

  // Resolve image
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
            width,
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
              <ChefHat color={isDark ? AppColors.primaryLight : AppColors.primary} size={36} />
            </View>
          )}
          {/* Gradient overlay ở dưới ảnh để match badge dễ đọc */}
          {recipe.matchPercent != null && (
            <View style={[styles.matchBadge, { backgroundColor: AppColors.primary }]}>
              <Text style={styles.matchText}>{recipe.matchPercent}%</Text>
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
              <Clock color={isDark ? AppColors.darkTextSecondary : AppColors.hintText} size={12} />
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
                {t(difficultyKey)}
              </Text>
            </View>
          </View>

          {recipe.tags && recipe.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {recipe.tags.slice(0, 2).map((tag, i) => (
                <View
                  key={i}
                  style={[
                    styles.tag,
                    { backgroundColor: isDark ? '#233629' : AppColors.accentGreen },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      { color: isDark ? AppColors.primaryLight : AppColors.forestAccent },
                    ]}
                  >
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {onBookmarkPress ? (
            <Pressable
              onPress={() => onBookmarkPress(recipe)}
              hitSlop={8}
              style={({ pressed }) => [styles.bookmarkBtn, { opacity: pressed ? 0.6 : 1 }]}
              testID={`recipe-card-bookmark-${recipe.id}`}
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
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: sp(16),
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageWrap: {
    width: '100%',
    height: sp(110),
    position: 'relative',
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
  matchBadge: {
    position: 'absolute',
    top: sp(8),
    right: sp(8),
    paddingHorizontal: sp(8),
    paddingVertical: sp(3),
    borderRadius: sp(10),
  },
  matchText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: sp(10),
  },
  body: {
    padding: sp(10),
  },
  bookmarkBtn: {
    position: 'absolute',
    top: sp(8),
    right: sp(8),
    padding: sp(4),
    borderRadius: sp(8),
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  name: {
    fontSize: sp(13),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    lineHeight: sp(17),
    minHeight: sp(34),
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
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: sp(8),
  },
  tag: {
    paddingHorizontal: sp(6),
    paddingVertical: sp(2),
    borderRadius: sp(6),
    marginRight: sp(4),
    marginBottom: sp(2),
  },
  tagText: {
    fontSize: sp(9),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
});
