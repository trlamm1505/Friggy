/**
 * DayPlanCard
 *
 * Card cho 1 ngày trong NextWeekSuggestionsScreen.
 *
 * ⚠️ SPRINT B4 — đã đổi từ "1 món/ngày" sang "N bữa/ngày":
 *   BE meal plan có nhiều slot mỗi ngày (breakfast/lunch/dinner), mỗi slot có
 *   `mealType` riêng. Không được đoán bữa theo index.
 *
 * Props:
 *   - `slots`     : mảng slot (mỗi slot: { id, recipeId, name, mealType, cooked, ... })
 *   - `dayLabel`  : 'T2'..'CN'
 *   - `dayNumber` : ngày trong tháng
 *   - `isToday` / `isTomorrow`
 *   - `onSlotPress(slot)` : mở chi tiết công thức
 *   - `onToggleCooked(slot)` : tick "đã nấu"
 *   - `onReplace(slot)` : đổi món bằng AI
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { Clock, RefreshCw, Check } from 'lucide-react-native';

/**
 * Nhãn bữa. `mealType` lấy từ BE (breakfast|lunch|dinner|snack).
 */
const MEAL_LABELS = {
  breakfast: 'home.mealBreakfast',
  lunch: 'home.mealLunch',
  dinner: 'home.mealDinner',
  snack: 'home.mealSnack',
  dessert: 'home.mealDessert',
  drink: 'home.mealDrink',
};

/**
 * Màu nhấn theo bữa (giống `CookingSuggestionsSection`).
 */
const MEAL_ACCENTS = {
  breakfast: AppColors.accentOrange,
  lunch: AppColors.primary,
  dinner: AppColors.forestAccent,
  snack: AppColors.textSecondary,
  dessert: AppColors.textSecondary,
  drink: AppColors.textSecondary,
};

export const DayPlanCard = ({
  slots = [],
  dayLabel,
  dayNumber,
  isToday,
  isTomorrow,
  onSlotPress,
  onToggleCooked,
  onReplace,
  style,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const borderColor = isToday
    ? AppColors.primary
    : isDark
    ? '#2E4D36'
    : '#E3E8E4';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#19271E' : '#F4F7F4',
          borderColor,
          borderWidth: isToday ? 2 : 1,
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
            {isToday ? t('home.weekPlanToday') : isTomorrow ? t('home.weekPlanTomorrow') : dayLabel}
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

      {slots.length === 0 ? (
        // Ngày chưa có món -> gợi ý tạo thực đơn bằng AI.
        <View style={styles.emptyHint}>
          <Text
            style={[
              styles.emptyText,
              {
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(12),
              },
            ]}
            >
              {t('home.weekPlanNoDish')}
            </Text>
        </View>
      ) : (
        slots.map((slot) => {
          const accent = MEAL_ACCENTS[slot.mealType] ?? AppColors.primary;

          return (
            <View key={slot.id} style={styles.slotRow}>
              {/* Tag bữa */}
              <View
                style={[
                  styles.mealTag,
                  {
                    backgroundColor: isDark ? '#233629' : '#E8F5E9',
                    borderColor: accent,
                  },
                ]}
              >
                <Text style={[styles.mealTagText, { color: accent, fontSize: sp(10) }]}>
                  {t(MEAL_LABELS[slot.mealType] ?? 'home.mealSnack')}
                </Text>
              </View>

              {/* Nội dung món */}
              <Pressable
                onPress={() => onSlotPress && onSlotPress(slot)}
                style={styles.slotMain}
              >
                <Text
                  style={[
                    styles.recipeName,
                    {
                      color: isDark ? '#FFFFFF' : AppColors.textPrimary,
                      fontSize: sp(14),
                      textDecorationLine: slot.cooked ? 'line-through' : 'none',
                    },
                  ]}
                  numberOfLines={1}
                  >
                  {slot.name || t('home.weekPlanNoDishName')}
                </Text>
                <View style={styles.metaRow}>
                  <Clock color={isDark ? AppColors.darkTextSecondary : AppColors.hintText} size={11} />
                  <Text
                    style={[
                      styles.metaText,
                      {
                        color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                        fontSize: sp(11),
                      },
                    ]}
                  >
                    {slot.cookTime} {t('home.minutes')}
                  </Text>
                </View>
              </Pressable>

              {/* Nút tick "đã nấu" */}
              {onToggleCooked ? (
                <Pressable
                  onPress={() => onToggleCooked(slot)}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.cookBtn,
                    {
                      backgroundColor: slot.cooked ? AppColors.primary : 'transparent',
                      borderColor: slot.cooked ? AppColors.primary : borderColor,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Check
                    color={slot.cooked ? '#FFFFFF' : isDark ? AppColors.primaryLight : AppColors.primary}
                    size={14}
                    strokeWidth={3}
                  />
                </Pressable>
              ) : null}

              {/* Nút đổi món bằng AI */}
              {onReplace ? (
                <Pressable
                  onPress={() => onReplace(slot)}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.replaceBtn,
                    {
                      backgroundColor: isDark ? '#233629' : '#FFFFFF',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <RefreshCw color={isDark ? AppColors.primaryLight : AppColors.primary} size={14} />
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'column',
    padding: sp(14),
    borderRadius: sp(16),
    marginBottom: sp(10),
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
  emptyHint: {
    paddingVertical: sp(10),
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.regular,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp(6),
  },
  mealTag: {
    paddingHorizontal: sp(8),
    paddingVertical: sp(3),
    borderRadius: sp(9),
    borderWidth: 1,
    minWidth: sp(46),
    alignItems: 'center',
  },
  mealTagText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  slotMain: {
    flex: 1,
    marginLeft: sp(10),
  },
  recipeName: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp(2),
    gap: 4,
  },
  metaText: {
    fontFamily: FontFamily.regular,
  },
  cookBtn: {
    width: sp(28),
    height: sp(28),
    borderRadius: sp(14),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: sp(6),
  },
  replaceBtn: {
    width: sp(32),
    height: sp(32),
    borderRadius: sp(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: sp(6),
  },
});
