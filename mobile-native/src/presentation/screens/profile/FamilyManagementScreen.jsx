/**
 * FamilyManagementScreen
 *
 * Redesigned (Sprint 6):
 * - Header gradient với icon Crown
 * - Member card cải thiện visual với role badge
 * - Confirm dialog khi remove member
 * - i18n đầy đủ
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { Crown, User, UserPlus, Share2, Copy, Trash2 } from 'lucide-react-native';
import { CustomButton } from '../../components/common/CustomButton';
import { showInfo, showSuccess } from '../../utils/helpers';
import familyMembersMock from '../../../shared/mocks/family-members.json';

export const FamilyManagementScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [members, setMembers] = useState(familyMembersMock.members);

  const remove = useCallback(
    (id, name) => {
      Alert.alert(t('home.removeMember'), `${t('home.removeMemberConfirm')}\n\n"${name}"`, [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.removeMember'),
          style: 'destructive',
          onPress: () => setMembers(members.filter((m) => m.id !== id)),
        },
      ]);
    },
    [members, t],
  );

  const copyCode = useCallback(() => {
    showSuccess(t('home.codeCopied'));
  }, [t]);

  const headerBg = isDark ? ['#19271E', '#1B2E21'] : ['#E8F5E9', '#FFFFFF'];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text
          style={[
            styles.title,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(24) },
          ]}
        >
          {t('home.familyManagement')}
        </Text>

        {/* Invite code card */}
        <View style={styles.inviteCardWrap}>
          <LinearGradient
            colors={headerBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: sp(20) }]}
          />
          <View style={styles.inviteHeader}>
            <View style={[styles.crownWrap, { backgroundColor: AppColors.primary }]}>
              <Crown color="#FFFFFF" size={20} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1, marginLeft: sp(12) }}>
              <Text
                style={[
                  styles.inviteTitle,
                  { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) },
                ]}
              >
                {t('home.inviteCode')}
              </Text>
              <Text
                style={[
                  styles.inviteSubtitle,
                  { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(11) },
                ]}
              >
                {t('home.shareInviteCode')}
              </Text>
            </View>
          </View>
          <View style={styles.inviteCodeRow}>
            <Text
              style={[
                styles.inviteCode,
                { color: AppColors.primary, fontSize: sp(24) },
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
                onPress={copyCode}
                style={({ pressed }) => [
                  styles.actionBtnPrimary,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
                hitSlop={6}
              >
                <Share2 color="#FFFFFF" size={16} />
              </Pressable>
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(11) },
          ]}
        >
          {t('home.membersCount', { count: members.length })}
        </Text>

        {members.map((m) => {
          const isOwner = m.role === 'owner';
          const roleColor = isOwner
            ? { bg: AppColors.primary, fg: '#FFFFFF' }
            : isDark
            ? { bg: '#233629', fg: AppColors.primaryLight }
            : { bg: '#E8F5E9', fg: AppColors.forestAccent };

          return (
            <View
              key={m.id}
              style={[
                styles.memberRow,
                {
                  backgroundColor: isDark ? '#19271E' : '#F4F7F4',
                  borderColor: isDark ? '#2E4D36' : 'transparent',
                },
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: roleColor.bg },
                ]}
              >
                {isOwner ? (
                  <Crown color={roleColor.fg} size={20} strokeWidth={2.5} />
                ) : (
                  <Text
                    style={[
                      styles.avatarText,
                      { color: roleColor.fg, fontSize: sp(15) },
                    ]}
                  >
                    {(m.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: sp(12) }}>
                <Text
                  style={[
                    styles.memberName,
                    { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) },
                  ]}
                  numberOfLines={1}
                >
                  {m.name}
                </Text>
                <View style={[styles.roleChip, { backgroundColor: roleColor.bg }]}>
                  <Text
                    style={[
                      styles.roleText,
                      { color: roleColor.fg, fontSize: sp(10) },
                    ]}
                  >
                    {isOwner ? t('home.owner').toUpperCase() : t('home.member').toUpperCase()}
                  </Text>
                </View>
              </View>
              {!isOwner ? (
                <Pressable
                  onPress={() => remove(m.id, m.name)}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.removeBtn,
                    { backgroundColor: isDark ? '#3D1F1A' : '#FFEBEE', opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Trash2 color={isDark ? '#FF8A80' : '#B71C1C'} size={16} />
                </Pressable>
              ) : null}
            </View>
          );
        })}

        <View style={{ marginTop: sp(28) }}>
          <CustomButton
            title={t('home.inviteMember')}
            onPress={() => showInfo('Mở chia sẻ mã mời')}
            icon={<UserPlus color="#FFFFFF" size={18} />}
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
  inviteCardWrap: {
    borderRadius: sp(20),
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: AppColors.primary,
    padding: sp(16),
    marginTop: sp(20),
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crownWrap: {
    width: sp(40),
    height: sp(40),
    borderRadius: sp(20),
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
    marginTop: sp(16),
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
  actionBtnPrimary: {
    width: sp(36),
    height: sp(36),
    borderRadius: sp(18),
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.8,
    marginTop: sp(28),
    marginBottom: sp(12),
    marginLeft: sp(4),
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp(14),
    borderRadius: sp(12),
    borderWidth: 1,
    marginBottom: sp(10),
  },
  avatar: {
    width: sp(44),
    height: sp(44),
    borderRadius: sp(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  memberName: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  roleChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: sp(8),
    paddingVertical: sp(2),
    borderRadius: sp(6),
    marginTop: sp(4),
  },
  roleText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.5,
  },
  removeBtn: {
    width: sp(36),
    height: sp(36),
    borderRadius: sp(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
