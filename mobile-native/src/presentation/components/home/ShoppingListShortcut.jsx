/**
 * ShoppingListShortcut
 *
 * Nút tắt "Danh sách mua" đặt trên Home screen — giải quyết yêu cầu:
 * user bấm "+ Thêm vào DS" ở màn công thức rồi không biết mở danh sách ở đâu.
 *
 * ⚠️ Hiển thị số lượng món CHƯA MUA để user biết có gì cần đi chợ.
 *   Đếm từ `GET /meal-planning/shopping-lists` (mọi list, gộp lại) — dùng
 *   đúng service `getShoppingList()` mà ShoppingReminderScreen đang dùng để
 *   hai màn luôn hiển thị cùng số liệu.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, ChevronRight } from 'lucide-react-native';
import { useServices } from '../../../data/ServiceProvider';

export const ShoppingListShortcut = ({ onPress }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const services = useServices();

  const [pendingCount, setPendingCount] = useState(0);

  const loadCount = useCallback(async () => {
    try {
      const items = await services.recipeService.getShoppingList();
      const list = Array.isArray(items) ? items : [];
      setPendingCount(list.filter((i) => !i.done).length);
    } catch {
      // Không chặn Home: đếm lỗi thì để 0, user vẫn bấm vào được.
      setPendingCount(0);
    }
  }, [services]);

  useEffect(() => {
    // `loadCount` async -> setState chỉ chạy sau `await`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCount();
  }, [loadCount]);

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
      testID="home-shopping-list-shortcut"
      accessibilityLabel={t('home.shoppingOpenList')}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: isDark ? '#233629' : '#E8F5E9' },
        ]}
      >
        <ShoppingCart color={AppColors.primary} size={20} />
      </View>

      <View style={{ flex: 1, marginLeft: sp(12) }}>
        <Text
          style={[
            styles.title,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) },
          ]}
        >
          {t('home.shoppingTitle')}
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
          {pendingCount > 0
            ? t('home.shoppingPendingCount', { count: pendingCount })
            : t('home.shoppingEmpty')}
        </Text>
      </View>

      <ChevronRight
        color={isDark ? AppColors.darkTextSecondary : AppColors.hintText}
        size={18}
      />
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
