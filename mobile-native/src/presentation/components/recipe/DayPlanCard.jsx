/**
 * DayPlanCard
 *
 * Card cho 1 ngày trong NextWeekSuggestionsScreen.
 * - dayLabel (T2, T3... hoặc "Today"/"Tomorrow")
 * - dayNumber
 * - recipe
 * - onPress, onReplace
 */

import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { ChefHat, Clock, RefreshCw, Plus } from 'lucide-react-native';

const imageMap = {
  recipe_tomato_egg: require('../../../../assets/images/recipe_tomato_egg.png'),
  recipe_veggie_soup: require('../../../../assets/images/recipe_veggie_soup.png'),
};

export const DayPlanCard = ({
  recipe,
  dayLabel,
  dayNumber,
  isToday,
  isTomorrow,
  onPress,
  onReplace,
  onAdd,
  style,
}) => {
  const { isDark } = useTheme();

  if (!recipe) {
    // Empty day
    return (
      <View
        style={[
          styles.card,
          styles.empty,
          {
            backgroundColor: isDark ? '#19271E' : '#F4F7F4',
            borderColor: isDark ? '#2E4D36' : '#E3E8E4',
            borderStyle: 'dashed',
          },
          style,
        ]}
      >
        <View style={styles.dayHeader}>
          <View style={styles.dayLabelWrap}>
            <Text
              style={[
                styles.dayLabel,
                { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(11) },
              ]}
            >
              {dayLabel}
            </Text>
            <Text
              style={[
                styles.dayNumber,
                { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(20) },
              ]}
            >
              {dayNumber}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onAdd}
          style={({ pressed }) => [
            styles.addBtn,
            { borderColor: isDark ? AppColors.primaryLight : AppColors.primary, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Plus color={isDark ? AppColors.primaryLight : AppColors.primary} size={16} />
          <Text
            style={[
              styles.addText,
              { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(13) },
            ]}
          >
            Thêm món
          </Text>
        </Pressable>
      </View>
    );
  }

  const imageSource = imageMap[recipe.image];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isDark ? '#19271E' : '#F4F7F4',
          borderColor: isToday
            ? AppColors.primary
            : isDark ? '#2E4D36' : 'transparent',
          borderWidth: isToday ? 2 : 1,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <View style={styles.dayHeader}>
        <View style={styles.dayLabelWrap}>
          <Text
            style={[
              styles.dayLabel,
              {
                color: isToday
                  ? AppColors.primary
                  : isDark
                  ? AppColors.darkTextSecondary
                  : AppColors.textSecondary,
                fontSize: sp(11),
              },
            ]}
          >
            {isToday ? 'Hôm nay' : isTomorrow ? 'Ngày mai' : dayLabel}
          </Text>
          <Text
            style={[
              styles.dayNumber,
              {
                color: isToday
                  ? AppColors.primary
                  : isDark
                  ? '#FFFFFF'
                  : AppColors.textPrimary,
                fontSize: sp(20),
              },
            ]}
          >
            {dayNumber}
          </Text>
        </View>
        {isToday ? (
          <View style={[styles.todayBadge, { backgroundColor: AppColors.primary }]}>
            <Text style={styles.todayText}>TODAY</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={[styles.imageWrap, { backgroundColor: isDark ? '#233629' : '#E8F5E9' }]}>
          {imageSource ? (
            <Image source={imageSource} style={styles.image} resizeMode="cover" />
          ) : (
            <ChefHat color={isDark ? AppColors.primaryLight : AppColors.primary} size={28} />
          )}
        </View>
        <View style={{ flex: 1, marginLeft: sp(12) }}>
          <Text
            style={[
              styles.recipeName,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) },
            ]}
            numberOfLines={2}
          >
            {recipe.name}
          </Text>
          <View style={styles.metaRow}>
            <Clock color={isDark ? AppColors.darkTextSecondary : AppColors.hintText} size={12} />
            <Text
              style={[
                styles.metaText,
                { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(12) },
              ]}
            >
              {recipe.cookTime} phút
            </Text>
          </View>
        </View>
        {onReplace ? (
          <Pressable
            onPress={onReplace}
            hitSlop={6}
            style={({ pressed }) => [
              styles.replaceBtn,
              { backgroundColor: isDark ? '#233629' : '#FFFFFF', opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <RefreshCw color={isDark ? AppColors.primaryLight : AppColors.primary} size={14} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'column',
    padding: sp(14),
    borderRadius: sp(16),
    marginBottom: sp(10),
  },
  empty: {
    minHeight: 90,
    justifyContent: 'space-between',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: sp(10),
  },
  dayLabelWrap: {
    flexDirection: 'column',
  },
  dayLabel: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginTop: 2,
  },
  todayBadge: {
    paddingHorizontal: sp(8),
    paddingVertical: sp(2),
    borderRadius: sp(8),
  },
  todayText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageWrap: {
    width: sp(56),
    height: sp(56),
    borderRadius: sp(12),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  recipeName: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp(4),
    gap: 4,
  },
  metaText: {
    fontFamily: FontFamily.regular,
    marginLeft: sp(4),
  },
  replaceBtn: {
    width: sp(32),
    height: sp(32),
    borderRadius: sp(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: sp(8),
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sp(10),
    borderRadius: sp(10),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 4,
  },
  addText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: sp(4),
  },
});
