/**
 * NotificationItem
 *
 * Row hiển thị 1 notification:
 * - Icon (theo type: expiring/recipe/system)
 * - Title + message + time
 * - Unread indicator (chấm xanh + border highlight)
 * - Press handler
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { AlertCircle, ChefHat, Bell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const ICON_MAP = {
  expiring: AlertCircle,
  recipe: ChefHat,
  system: Bell,
};

const COLOR_MAP = {
  expiring: '#FF9800',
  recipe: AppColors.primary,
  system: '#2196F3',
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
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const NotificationItem = ({ item, onPress }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const Icon = ICON_MAP[item.type] || Bell;
  const color = COLOR_MAP[item.type] || AppColors.primary;

  return (
    <Pressable
      onPress={() => onPress && onPress(item)}
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
