/**
 * FridgeCard
 *
 * Card hiển thị 1 tủ lạnh (gia đình / phòng trọ / cá nhân).
 *
 * ⚠️ B1 — thay đổi so với bản Sprint 8:
 * 1. Bỏ prop `icon` (component). Trước đây truyền `Users` / `Home` trực tiếp
 *    từ `MyFridgesScreen` -> `FridgeCard` phải render component lạ. Nay nhận
 *    `iconName` (string) và tự map sang icon trong `FRIDGE_ICONS`, để data từ
 *    service (JSON) cũng dùng được mà không cần truyền function.
 * 2. Thêm `totalItems` / `expiringCount` — `MyFridgesScreen` lấy số thật từ
 *    `GET /fridge/stats`. Bản cũ chỉ có `memberCount`, người dùng không thấy
 *    tủ của mình có bao nhiêu đồ.
 * 3. `memberCount` chỉ hiện khi > 0 — tủ cá nhân không có thành viên.
 * 4. `description` dùng key i18n qua `labelKey` + `t()`, không hardcode
 *    tiếng Việt (R7 + i18n nhất quán với phần còn lại của màn hình).
 *
 * R2: KHÔNG nhận URL ảnh từ BE ở component này — icon là icon, không phải ảnh.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { ChevronRight, Check, Users, Home, Refrigerator, Package } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

/**
 * Map `iconName` -> component lucide.
 * Tách ra khỏi component để `MyFridgesScreen` không cần import lucide.
 */
const FRIDGE_ICONS = {
  users: Users,
  home: Home,
  refrigerator: Refrigerator,
  package: Package,
};

export const FridgeCard = ({
  iconName = 'users',
  name,
  description,
  memberCount,
  totalItems,
  expiringCount,
  isActive = false,
  onPress,
  onLongPress,
  style,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const Icon = FRIDGE_ICONS[iconName] || Refrigerator;

  const iconBg = isActive ? AppColors.primary : isDark ? '#233629' : AppColors.accentGreen;
  const iconColor = isActive ? '#FFFFFF' : isDark ? AppColors.primaryLight : AppColors.forestAccent;
  const nameColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const descColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isDark ? '#19271E' : '#FFFFFF',
          borderColor: isActive ? AppColors.primary : isDark ? '#2E4D36' : '#A5E69C',
          borderWidth: isActive ? 2 : 1,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Icon color={iconColor} size={28} strokeWidth={2.2} />
      </View>

      <View style={{ flex: 1, marginLeft: sp(12) }}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: nameColor, fontSize: sp(16) }]} numberOfLines={1}>
            {name}
          </Text>
          {isActive ? (
            <View style={[styles.activeBadge, { backgroundColor: AppColors.primary }]}>
              <Check color="#FFFFFF" size={10} strokeWidth={3} />
            </View>
          ) : null}
        </View>

        {description ? (
          <Text
            style={[styles.description, { color: descColor, fontSize: sp(12) }]}
            numberOfLines={1}
          >
            {description}
          </Text>
        ) : null}

        {/* Số liệu thật từ GET /fridge/stats — chỉ hiện cho tủ đang nối BE. */}
        {totalItems !== undefined && totalItems !== null ? (
          <View style={styles.statRow}>
            <View style={[styles.statChip, { backgroundColor: iconBg }]}>
              <Text style={[styles.statChipText, { color: iconColor, fontSize: sp(10) }]}>
                {totalItems} {t('fridge.items')}
              </Text>
            </View>
            {expiringCount > 0 ? (
              <View
                style={[
                  styles.statChip,
                  { backgroundColor: isDark ? '#4A2822' : 'rgba(232,188,176,0.85)' },
                ]}
              >
                <Text
                  style={[
                    styles.statChipText,
                    {
                      color: isDark ? '#FF8A80' : '#B71C1C',
                      fontSize: sp(10),
                    },
                  ]}
                >
                  {expiringCount} {t('fridge.expiringItems')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {memberCount ? (
          <View style={styles.memberRow}>
            <Users color={descColor} size={11} />
            <Text style={[styles.memberText, { color: descColor, fontSize: sp(11) }]}>
              {t('home.fridgeMemberCount', { count: memberCount })}
            </Text>
          </View>
        ) : null}
      </View>

      {onPress ? (
        <ChevronRight color={isDark ? AppColors.darkTextSecondary : AppColors.hintText} size={18} />
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp(16),
    borderRadius: sp(18),
  },
  iconWrap: {
    width: sp(56),
    height: sp(56),
    borderRadius: sp(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(6),
  },
  name: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  activeBadge: {
    width: sp(16),
    height: sp(16),
    borderRadius: sp(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: sp(6),
  },
  description: {
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(6),
    marginTop: sp(6),
  },
  statChip: {
    paddingHorizontal: sp(7),
    paddingVertical: sp(2),
    borderRadius: sp(8),
  },
  statChipText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp(4),
    gap: sp(4),
  },
  memberText: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginLeft: sp(4),
  },
});
