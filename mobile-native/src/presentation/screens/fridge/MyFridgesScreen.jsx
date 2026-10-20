/**
 * MyFridgesScreen
 *
 * Redesigned (Sprint 8):
 * - Dùng FridgeCard component (mỗi tủ lạnh = 1 card)
 * - Multiple fridges (Family / Personal / Future)
 * - Active state highlight
 * - Invite code section
 * - Add new fridge button ở dưới
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { FridgeCard } from '../../components/fridge/FridgeCard';
import { CustomButton } from '../../components/common/CustomButton';
import { EmptyState } from '../../components/common/EmptyState';
import { Users, Home, Plus, Share2, Copy, Refrigerator } from 'lucide-react-native';
import { showSuccess } from '../../utils/helpers';
import familyMembersMock from '../../../shared/mocks/family-members.json';

const FRIDGES_MOCK = [
  {
    id: 'family',
    icon: Users,
    name: 'Tủ lạnh gia đình',
    description: 'Tủ lạnh chung cho cả gia đình',
    memberCount: familyMembersMock.members.length,
    isActive: true,
  },
  {
    id: 'personal',
    icon: Home,
    name: 'Tủ lạnh cá nhân',
    description: 'Tủ lạnh riêng của bạn',
    memberCount: 1,
    isActive: false,
  },
];

export const MyFridgesScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [fridges, setFridges] = useState(FRIDGES_MOCK);

  const switchFridge = useCallback(
    (id) => {
      setFridges((prev) =>
        prev.map((f) => ({ ...f, isActive: f.id === id })),
      );
      showSuccess(`Đã chuyển sang ${fridges.find((f) => f.id === id)?.name}`);
    },
    [fridges],
  );

  const copyCode = useCallback(() => {
    showSuccess(t('home.codeCopied'));
  }, [t]);

  const shareCode = useCallback(() => {
    Share.share({
      message: `Tham gia tủ lạnh gia đình Friggy với mã: ${familyMembersMock.inviteCode}`,
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : AppColors.accentGreen }]}>
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text
          style={[
            styles.title,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(24) },
          ]}
        >
          {t('home.fridgeMyFridges')}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(13) },
          ]}
        >
          Chuyển đổi giữa các tủ lạnh của bạn
        </Text>

        {fridges.length === 0 ? (
          <View style={{ marginTop: sp(40) }}>
            <EmptyState
              emoji="🧊"
              title={t('home.fridgeNoFridges')}
              hint={t('home.fridgeNoFridgesHint')}
            />
          </View>
        ) : (
          <View style={{ marginTop: sp(20), gap: sp(12) }}>
            {fridges.map((fridge) => (
              <FridgeCard
                key={fridge.id}
                icon={fridge.icon}
                name={fridge.name}
                description={fridge.description}
                memberCount={fridge.memberCount}
                isActive={fridge.isActive}
                onPress={() => switchFridge(fridge.id)}
              />
            ))}
          </View>
        )}

        {/* Invite code section */}
        <View
          style={[
            styles.inviteCard,
            {
              backgroundColor: isDark ? '#19271E' : '#FFFFFF',
              borderColor: AppColors.primary,
            },
          ]}
        >
          <View style={styles.inviteHeader}>
            <View style={[styles.inviteIcon, { backgroundColor: AppColors.primary }]}>
              <Share2 color="#FFFFFF" size={18} />
            </View>
            <View style={{ flex: 1, marginLeft: sp(12) }}>
              <Text
                style={[
                  styles.inviteTitle,
                  { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(14) },
                ]}
              >
                {t('home.fridgeInviteCode')}
              </Text>
              <Text
                style={[
                  styles.inviteSubtitle,
                  { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(11) },
                ]}
                numberOfLines={1}
              >
                Chia sẻ mã để thêm thành viên
              </Text>
            </View>
          </View>
          <View style={styles.inviteCodeRow}>
            <Text
              style={[
                styles.inviteCode,
                { color: AppColors.primary, fontSize: sp(22) },
              ]}
            >
              {familyMembersMock.inviteCode}
            </Text>
            <View style={styles.inviteActions}>
              <Pressable
                onPress={copyCode}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: isDark ? '#233629' : '#E8F5E9', opacity: pressed ? 0.7 : 1 },
                ]}
                hitSlop={6}
              >
                <Copy color={isDark ? AppColors.primaryLight : AppColors.forestAccent} size={16} />
              </Pressable>
              <Pressable
                onPress={shareCode}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: AppColors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
                hitSlop={6}
              >
                <Share2 color="#FFFFFF" size={16} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Add new fridge button */}
        <View style={{ marginTop: sp(28) }}>
          <CustomButton
            title={t('home.fridgeAddNew')}
            onPress={() => showSuccess('Tính năng tạo tủ lạnh mới (mock)')}
            icon={<Plus color="#FFFFFF" size={18} />}
            variant="outline"
          />
        </View>
        <View style={{ marginTop: sp(12) }}>
          <CustomButton
            title={t('home.fridgeJoinFamily')}
            onPress={() => showSuccess('Tính năng tham gia (mock)')}
            icon={<Refrigerator color="#FFFFFF" size={18} />}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: sp(20),
    paddingTop: sp(8),
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    marginTop: sp(4),
  },
  inviteCard: {
    marginTop: sp(28),
    borderRadius: sp(20),
    borderWidth: 1.5,
    padding: sp(16),
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteIcon: {
    width: sp(36),
    height: sp(36),
    borderRadius: sp(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  inviteSubtitle: {
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: sp(14),
    paddingTop: sp(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  inviteCode: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    letterSpacing: 4,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: sp(8),
  },
  actionBtn: {
    width: sp(36),
    height: sp(36),
    borderRadius: sp(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
