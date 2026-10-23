/**
 * FridgeItem
 *
 * Row hiển thị 1 nguyên liệu trong tủ lạnh:
 * - Icon (theo category: vegetable/meat/dairy/fruit/other)
 * - Name + quantity
 * - Expiry badge với màu sắc (fresh: xanh, expiring: cam, expired: đỏ)
 * - Press handler
 */

import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { AlertCircle, Carrot, Beef, Egg, Apple, Leaf } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getDaysToExpiry } from '../../utils/fridgeDates';

const CATEGORY_ICON = {
  vegetable: Carrot,
  meat: Beef,
  dairy: Egg,
  fruit: Apple,
  other: Leaf,
};

const CATEGORY_COLOR = {
  vegetable: '#4CAF50',
  meat: '#E57373',
  dairy: '#FFB300',
  fruit: '#FF7043',
  other: '#9E9E9E',
};

const STATUS_COLOR = {
  fresh: { bg: '#E8F5E9', fg: '#1B5E20', darkBg: '#1B3324', darkFg: AppColors.primaryLight },
  expiring: { bg: '#FFF3E0', fg: '#E65100', darkBg: '#3D2E1A', darkFg: '#FFB74D' },
  expired: { bg: '#FFEBEE', fg: '#B71C1C', darkBg: '#3D1F1A', darkFg: '#FF8A80' },
};

const formatExpiry = (days, isEn) => {
  // `days === null` = không có hạn dùng (BE trả `expiresAt: null`, hoặc mock
  // chưa gán). Không phải là "Đã hết hạn" -> hiện "Không rõ hạn" cho đúng.
  if (days === null) return isEn ? 'No expiry' : 'Không rõ hạn';
  if (days < 0) return isEn ? 'Expired' : 'Đã hết hạn';
  if (days === 0) return isEn ? 'Today' : 'Hôm nay';
  if (days === 1) return isEn ? 'Tomorrow' : 'Ngày mai';
  return isEn ? `${days}d` : `${days} ngày`;
};

const IMAGE_MAP = {
  food_tomato: require('../../../../assets/images/food_tomato.png'),
  food_milk: require('../../../../assets/images/food_milk.png'),
  food_pork: require('../../../../assets/images/food_pork.png'),
  food_bokchoy: require('../../../../assets/images/food_bokchoy.png'),
};

export const FridgeItem = ({ item, onPress, style }) => {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const Icon = CATEGORY_ICON[item.category] || Leaf;
  const iconColor = CATEGORY_COLOR[item.category] || CATEGORY_COLOR.other;
  const days = getDaysToExpiry(item.expiryDate);
  // `days === null` (không có hạn dùng) -> coi như còn tươi, không phải expired.
  const status =
    item.status ||
    (days === null ? 'fresh' : days < 0 ? 'expired' : days <= 3 ? 'expiring' : 'fresh');
  const colorScheme = STATUS_COLOR[status];
  const badgeBg = isDark ? colorScheme.darkBg : colorScheme.bg;
  const badgeFg = isDark ? colorScheme.darkFg : colorScheme.fg;

  const imageSource = item.image && IMAGE_MAP[item.image] ? IMAGE_MAP[item.image] : null;

  return (
    <Pressable
      onPress={() => onPress && onPress(item)}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.row,
          {
            backgroundColor: isDark ? '#19271E' : '#F4F7F4',
            borderColor: status === 'expiring' || status === 'expired'
              ? badgeFg
              : 'transparent',
            borderWidth: status === 'expiring' || status === 'expired' ? 1 : 0,
          },
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: iconColor + (isDark ? '33' : '22') },
          ]}
        >
          {imageSource ? (
            <Image source={imageSource} style={styles.image} resizeMode="contain" />
          ) : (
            <Icon color={iconColor} size={22} strokeWidth={2.2} />
          )}
        </View>
        <View style={{ flex: 1, marginLeft: sp(12) }}>
          <Text
            style={[
              styles.name,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary },
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={[
              styles.qty,
              { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {item.quantity} {item.unit}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          {status === 'expired' || status === 'expiring' ? (
            <AlertCircle color={badgeFg} size={11} strokeWidth={2.5} />
          ) : null}
          <Text
            style={[
              styles.badgeText,
              { color: badgeFg, marginLeft: status !== 'fresh' ? sp(3) : 0 },
            ]}
          >
            {formatExpiry(days, isEn)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp(14),
    borderRadius: sp(14),
  },
  iconWrap: {
    width: sp(44),
    height: sp(44),
    borderRadius: sp(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: sp(36),
    height: sp(36),
  },
  name: {
    fontSize: sp(15),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  qty: {
    fontSize: sp(12),
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(8),
    paddingVertical: sp(4),
    borderRadius: sp(10),
  },
  badgeText: {
    fontSize: sp(11),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
});
