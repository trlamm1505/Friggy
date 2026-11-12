/**
 * WeeklyPlanShortcut
 *
 * Nút tắt "Xem thực đơn tuần" đặt ở Home, NGAY DƯỚI banner "Tạo meal plan
 * theo tuần" (MealPlanCreateSection).
 *
 * ⚠️ VÌ SAO CẦN NÚT NÀY:
 *   Trước đây `Routes.NextWeekSuggestions` CHỈ được mở từ nhánh "thành công"
 *   của luồng tạo thực đơn (`MealPlanCreateSection.onPressPlan`). => Sau khi
 *   tạo xong, nếu user bấm Back thì thoát hẳn khỏi màn thực đơn và KHÔNG còn
 *   đường nào để quay lại, chỉ còn cách tạo thực đơn MỚI.
 *
 *   Flutter giải quyết bằng banner "Gợi ý thực phẩm cho tuần tới"
 *   (`weekly_statistics_section.dart:355-433` với `onMealSuggestionsTap`).
 *   RN đã bỏ banner đó khi tách luồng "Tạo meal plan" ra -> mất luôn entry
 *   point xem lại thực đơn. Component này khôi phục lại entry point đó.
 *
 * ⚠️ HIỂN THỈ SỐ LƯỢNG BỮA:
 *   Đếm từ `GET /meal-planning/plans` -> plan MỚI NHẤT ->
 *   `GET /meal-planning/plans/{id}` -> `dailyPlans[].mealSlots[]`.
 *   Dùng đúng service `getNextWeekPlan()` mà màn thực đơn đang dùng, nên
 *   hai màn luôn thấy cùng số liệu.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, ChevronRight } from 'lucide-react-native';
import { useServices } from '../../../data/ServiceProvider';

export const WeeklyPlanShortcut = ({ onPress }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const services = useServices();

  const [slotCount, setSlotCount] = useState(0);
  const [hasPlan, setHasPlan] = useState(false);

  const load = useCallback(async () => {
    try {
      const plan = await services.recipeService.getNextWeekPlan();
      const days = Array.isArray(plan?.days) ? plan.days : [];
      const count = days.reduce((sum, day) => sum + (day?.slots?.length ?? 0), 0);
      setSlotCount(count);
      setHasPlan(count > 0);
    } catch {
      // Không chặn Home: lỗi thì coi như chưa có thực đơn, user vẫn bấm
      // vào được (màn thực đơn tự hiện EmptyState + nút tạo).
      setSlotCount(0);
      setHasPlan(false);
    }
  }, [services]);

  useEffect(() => {
    // `load` async -> setState chỉ chạy sau `await`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // ⚠️ Home là 1 TAB nên component này KHÔNG unmount khi user mở màn thực
  //    đơn tuần rồi bấm Back -> state sẽ bị cũ. => Refetch mỗi lần focus.
  //    Bỏ qua lần focus đầu (hook đã tự fetch khi mount).
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return undefined;
      }
      load();
      return undefined;
    }, [load])
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isDark ? '#19271E' : '#FFFFFF',
          borderColor: isDark ? '#2E4D36' : '#E3E8E4',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      testID="home-weekly-plan-shortcut"
      accessibilityLabel={t('home.weekPlanViewTitle')}
    >
      <View
        style={[styles.iconWrap, { backgroundColor: isDark ? '#233629' : AppColors.accentGreen }]}
      >
        <CalendarCheck color={isDark ? AppColors.primaryLight : AppColors.primary} size={20} />
      </View>

      <View style={{ flex: 1, marginLeft: sp(12) }}>
        <Text
          style={[
            styles.title,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) },
          ]}
        >
          {t('home.weekPlanViewTitle')}
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              fontSize: sp(12),
            },
          ]}
        >
          {hasPlan
            ? t('home.weekPlanViewSubtitle', { count: slotCount })
            : t('home.weekPlanViewEmpty')}
        </Text>
      </View>

      <ChevronRight color={isDark ? AppColors.darkTextSecondary : AppColors.hintText} size={18} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: sp(20),
    padding: sp(14),
    borderRadius: sp(14),
    borderWidth: 1,
  },
  iconWrap: {
    width: sp(40),
    height: sp(40),
    borderRadius: sp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
});
