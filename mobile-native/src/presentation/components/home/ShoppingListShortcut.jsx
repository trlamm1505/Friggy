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
 *
 * ⚠️ VÌ SAO CẦN GỘP VỚI CACHE LOCAL (bug user báo):
 *   User tick N món khi OFFLINE -> thao tác nằm trong hàng đợi + cache local
 *   đánh dấu 'pending'. Khi bật mạng lại, server CHƯA kịp nhận (hoặc mới
 *   nhận xong) -> `getShoppingList()` trả về danh sách CHƯA tick -> Home hiện
 *   "N món chưa mua" (số cũ) dù user đã tick.
 *   => Với món có row 'pending' trong cache, lấy trạng thái tick TỪ CACHE
 *      (đây là ý định mới nhất của user), ngược lại lấy từ server.
 *
 * ⚠️ VÌ SAO `useFocusEffect` + `refreshKey`:
 *   Chỉ load 1 lần lúc mount -> quay lại Home từ màn "Danh sách mua"
 *   (vừa tick món) số liệu không đổi. `useFocusEffect` load lại mỗi lần
 *   màn có focus; `refreshKey` báo Home refresh sau khi sync xong.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, ChevronRight } from 'lucide-react-native';
import { useServices } from '../../../data/ServiceProvider';
import { offlineCache } from '../../../data/offline/OfflineCache';

export const ShoppingListShortcut = ({ onPress, refreshKey = 0 }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const services = useServices();

  const [pendingCount, setPendingCount] = useState(0);

  const loadCount = useCallback(async () => {
    // Đọc cache local TRƯỚC -> biết món nào user vừa tick/thêm offline.
    let localItems = [];
    try {
      localItems = await offlineCache.getShoppingItems();
    } catch {
      localItems = [];
    }

    try {
      const items = await services.recipeService.getShoppingList();
      const serverList = Array.isArray(items) ? items : [];

      // Map cache theo id (ưu tiên row 'pending' = ý định mới nhất của user).
      const localById = new Map(localItems.map((i) => [String(i.id), i]));

      // 1) Món có trên server: lấy `done` từ cache nếu row đó đang 'pending'.
      const merged = serverList.map((item) => {
        const local = localById.get(String(item.id));
        if (!local) return item;
        if (local._syncStatus !== 'pending') return item;
        return { ...item, done: local.done };
      });

      // 2) Món CHỈ có trong cache (thêm offline -> chưa lên server) -> phải tính
      //    vào, nếu không số "món chưa mua" bị thiếu.
      const serverIds = new Set(serverList.map((i) => String(i.id)));
      localItems.forEach((local) => {
        if (serverIds.has(String(local.id))) return;
        if (local._syncStatus !== 'pending') return;
        merged.push(local);
      });

      setPendingCount(merged.filter((i) => !i.done).length);
    } catch {
      // Offline (hoặc lỗi) -> dùng cache local.
      setPendingCount(localItems.filter((i) => !i.done).length);
    }
  }, [services]);

  // Load lại mỗi lần màn có focus (quay lại Home từ màn danh sách mua...).
  useFocusEffect(
    useCallback(() => {
      // `loadCount` async -> setState chỉ chạy sau `await`.
      loadCount();
      return undefined;
    }, [loadCount])
  );

  // Home báo refresh (sau pull-to-refresh / sau khi sync xong).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCount();
  }, [loadCount, refreshKey]);

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
