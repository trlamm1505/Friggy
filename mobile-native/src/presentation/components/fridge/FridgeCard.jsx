/**
 * FridgeCard
 *
 * Card hiển thị 1 tủ lạnh (family/personal).
 * - icon (Users / Home / Refrigerator)
 * - name, description, memberCount
 * - isActive: highlight viền primary
 * - onPress: tap to switch
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { ChevronRight, Check, Users } from 'lucide-react-native';

export const FridgeCard = ({
  icon: Icon = Users,
  name,
  description,
  memberCount,
  isActive = false,
  onPress,
  onLongPress,
  style,
}) => {
  const { isDark } = useTheme();
  const iconBg = isActive
    ? AppColors.primary
    : isDark
    ? '#233629'
    : AppColors.accentGreen;
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
          borderColor: isActive
            ? AppColors.primary
            : isDark
            ? '#2E4D36'
            : '#A5E69C',
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
          <Text
            style={[styles.name, { color: nameColor, fontSize: sp(16) }]}
            numberOfLines={1}
          >
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
        {memberCount ? (
          <View style={styles.memberRow}>
            <Users color={descColor} size={11} />
            <Text
              style={[
                styles.memberText,
                { color: descColor, fontSize: sp(11) },
              ]}
            >
              {memberCount} thành viên
            </Text>
          </View>
        ) : null}
      </View>
      {onPress ? (
        <ChevronRight
          color={isDark ? AppColors.darkTextSecondary : AppColors.hintText}
          size={18}
        />
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
