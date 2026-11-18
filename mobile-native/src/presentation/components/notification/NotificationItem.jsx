/**
 * NotificationItem
 *
 * Row hiển thị 1 notification:
 * - Icon (theo `uiType`: expiring/recipe/system/promo/budget/subscription/
 *   family/supplier/ingredient)
 * - Title + message + time
 * - Unread indicator (chấm xanh + border highlight)
 * - Press handler
 *
 * ⚠️ VÌ SAO DÙNG `uiType` THAY VÌ `type`:
 *   BE có 17 loại `NotificationType` (`be/prisma/schema.prisma` ->
 *   `enum NotificationType`). Nếu chỉ dùng 3 nhóm cũ
 *   (expiring/recipe/system) thì "gia đình mời bạn tham gia" và "gói nhà
 *   cung cấp sắp hết hạn" đều rơi về `system` -> user không phân biệt
 *   được thông báo nào cần hành động.
 *
 *   `uiType` (nhóm chi tiết 9 loại) được map ở `RealNotificationService`
 *   (`UI_TYPE_MAP`). `type` (3 nhóm cũ) vẫn được giữ để màn lọc cũ không hỏng.
 *
 * ⚠️ `type` VẪN được đọc làm FALLBACK (notification từ cache offline hoặc
 *   mock cũ chỉ có `type`).
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import {
  AlertCircle,
  ChefHat,
  Bell,
  Tag,
  Wallet,
  CreditCard,
  Users,
  Store,
  CheckCircle2,
  Trash2,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

/**
 * Icon cho từng nhóm UI.
 *
 * ⚠️ `CheckCircle2` dùng cho `ingredient` (nguyên liệu được DUYỆT).
 *   Nhóm `ingredient` gồm cả `ingredient_rejected` -> dùng chung 1 icon
 *   "đã xử lý" là chấp nhận được (màu đỏ của title/body vẫn phân biệt).
 */
const ICON_MAP = {
  expiring: AlertCircle,
  recipe: ChefHat,
  system: Bell,
  promo: Tag,
  budget: Wallet,
  subscription: CreditCard,
  family: Users,
  supplier: Store,
  ingredient: CheckCircle2,
};

/** Màu nhấn cho từng nhóm UI. */
const COLOR_MAP = {
  expiring: '#FF9800',
  recipe: AppColors.primary,
  system: '#2196F3',
  promo: '#E91E63',
  budget: '#9C27B0',
  subscription: '#607D8B',
  family: '#4CAF50',
  supplier: '#795548',
  ingredient: '#009688',
};

const formatTime = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (isYesterday) return 'hôm qua';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1)}`;
};

export const NotificationItem = ({ item, onPress, onLongPress, onDelete }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  // Ưu tiên `uiType` (nhóm chi tiết) -> fallback `type` (nhóm cũ) -> `system`.
  const uiType = item?.uiType || item?.type || 'system';
  const Icon = ICON_MAP[uiType] || Bell;
  const color = COLOR_MAP[uiType] || AppColors.primary;

  return (
    <Pressable
      onPress={() => onPress && onPress(item)}
      // Long-press -> xoá thông báo (`DELETE /notifications/:id` của BE).
      onLongPress={() => (onLongPress ? onLongPress(item) : onDelete?.(item))}
      delayLongPress={400}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.85 : item.read ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.row,
          {
            backgroundColor: isDark ? '#19271E' : '#F4F7F4',
            borderColor: !item.read ? color : 'transparent',
            borderWidth: !item.read ? 1.2 : 0,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
          <Icon color={color} size={20} />
        </View>
        <View style={{ flex: 1, marginLeft: sp(12) }}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.itemTitle,
                {
                  color: isDark ? '#FFFFFF' : AppColors.textPrimary,
                  flex: 1,
                },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {!item.read && (
              <View
                style={[
                  styles.unreadDot,
                  { backgroundColor: color },
                ]}
              />
            )}
            {/* Nút xoá nhanh (ngoài long-press) */}
            {onDelete ? (
              <Pressable
                onPress={() => onDelete(item)}
                hitSlop={8}
                style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Trash2 color={isDark ? '#8A9A8E' : '#9AA39C'} size={16} />
              </Pressable>
            ) : null}
          </View>
          <Text
            style={[
              styles.itemMsg,
              { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {item.message}
          </Text>
          <Text
            style={[
              styles.itemTime,
              { color: isDark ? AppColors.darkTextSecondary : AppColors.hintText },
            ]}
          >
            {formatTime(item.time)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: sp(14),
    borderRadius: sp(14),
  },
  iconWrap: {
    width: sp(40),
    height: sp(40),
    borderRadius: sp(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: sp(14),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  unreadDot: {
    width: sp(8),
    height: sp(8),
    borderRadius: sp(4),
    marginLeft: sp(8),
  },
  deleteBtn: {
    marginLeft: sp(10),
    padding: sp(2),
  },
  itemMsg: {
    fontSize: sp(12),
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  itemTime: {
    fontSize: sp(11),
    fontFamily: FontFamily.regular,
    marginTop: sp(4),
  },
});
