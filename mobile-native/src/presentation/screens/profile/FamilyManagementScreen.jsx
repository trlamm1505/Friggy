/**
 * FamilyManagementScreen
 *
 * Redesigned (Sprint 6):
 * - Header gradient với icon Crown
 * - Member card cải thiện visual với role badge
 * - Confirm dialog khi remove member
 * - i18n đầy đủ
 *
 * Sprint A3 (23/10): nối BE thật.
 *   BE `GET /family/me` trả `FamilyRoleDto` = `{ role: 'owner'|'member'|'none', group }`.
 *   - `role === 'none'` hoặc `group == null` -> hiện EMPTY STATE
 *     (2 nút: Nâng cấp Gói Gia đình + Nhập token lời mời).
 *   - `role === 'member'` -> KHÔNG hiện nút Xoá / Giải tán (BE chỉ cho owner).
 *   - `group.members` KHÔNG bao gồm owner (`family.dto.ts:61`) -> owner hiển thị riêng.
 *
 * KHÔNG có nút "Tạo gia đình": BE không có endpoint tạo group - group được tạo
 * ngầm bởi webhook PayOS khi kích hoạt gói `family`
 * (`subscriptions.service.ts:239-244` -> `familyService.createGroupForOwner`).
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { Crown, User, UserPlus, Share2, Copy, Trash2, Users } from 'lucide-react-native';
import { CustomButton } from '../../components/common/CustomButton';
import { showInfo, showSuccess, showError } from '../../utils/helpers';
import { useServices } from '../../../data/ServiceProvider';
import { FamilyPlanModal } from '../../components/home/FamilyPlanModal';

export const FamilyManagementScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { userService } = useServices();

  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await userService.getFamilyInfo();
      setFamily(data);
    } catch (e) {
      if (__DEV__) console.warn('[FamilyManagementScreen] load error:', e?.message);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userService]);

  useEffect(() => {
    load();
  }, [load]);

  const role = family?.role ?? 'none';
  const isOwner = role === 'owner';
  const hasGroup = !!family?.groupId;

  /** Danh sách hiển thị = owner (riêng) + members (BE không gồm owner). */
  const members = useMemo(() => {
    if (!family) return [];
    const list = [];
    if (family.owner) {
      list.push({
        id: family.owner.id,
        name: family.owner.name,
        avatar: family.owner.avatar,
        role: 'owner',
        status: 'active',
      });
    }
    list.push(...family.members.map((m) => ({ ...m, role: m.status === 'pending' ? 'pending' : 'member' })));
    return list;
  }, [family]);

  const remove = useCallback(
    (id, name) => {
      Alert.alert(t('home.removeMember'), `${t('home.removeMemberConfirm')}\n\n"${name}"`, [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.removeMember'),
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.removeFamilyMember(id);
              showSuccess(t('familyManage.removeDone'));
              load();
            } catch (e) {
              showError(e?.message || t('familyManage.loadFailed'));
            }
          },
        },
      ]);
    },
    [userService, t, load],
  );

  const dissolve = useCallback(() => {
    Alert.alert(t('familyManage.dissolveTitle'), t('familyManage.dissolveConfirm'), [
      { text: t('home.cancel'), style: 'cancel' },
      {
        text: t('familyManage.dissolve'),
        style: 'destructive',
        onPress: async () => {
          try {
            await userService.dissolveFamilyGroup();
            showSuccess(t('familyManage.dissolveDone'));
            load();
          } catch (e) {
            showError(e?.message || t('familyManage.loadFailed'));
          }
        },
      },
    ]);
  }, [userService, t, load]);

  const submitInvite = useCallback(async () => {
    const email = inviteEmail.trim();
    if (!email) {
      showError(t('familyManage.invalidEmail'));
      return;
    }
    setInviting(true);
    try {
      const res = await userService.inviteFamilyMember(email);
      // BE trả CHỈ `{ message }` - không có danh sách "đang chờ".
      showSuccess(res?.message || t('familyManage.inviteSent', { email }));
      setInviteEmail('');
      setInviteOpen(false);
      load();
    } catch (e) {
      showError(e?.message || t('familyManage.inviteFailed'));
    } finally {
      setInviting(false);
    }
  }, [userService, inviteEmail, t, load]);

  const headerBg = isDark ? ['#19271E', '#1B2E21'] : ['#E8F5E9', '#FFFFFF'];

  // ── Loading ──
  if (loading && !family) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  // ── Load failed ──
  if (loadError && !family) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <Text style={{ color: isDark ? '#FFFFFF' : AppColors.textPrimary, marginBottom: 12 }}>
          {t('familyManage.loadFailed')}
        </Text>
        <CustomButton title={t('home.retry')} onPress={load} width={160} height={46} borderRadius={23} />
      </View>
    );
  }

  // ── Chưa có gia đình (role = 'none') ──
  if (!hasGroup) {
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

          <View style={[styles.emptyCard, { backgroundColor: isDark ? '#19271E' : '#F4F7F4' }]}>
            <View style={[styles.crownWrap, { backgroundColor: AppColors.primary }]}>
              <Users color="#FFFFFF" size={26} strokeWidth={2.5} />
            </View>
            <Text
              style={[
                styles.emptyTitle,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(17) },
              ]}
            >
              {t('familyManage.noGroupTitle')}
            </Text>
            <Text
              style={[
                styles.emptyHint,
                { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(12) },
              ]}
            >
              {t('familyManage.noGroupHint')}
            </Text>

            <View style={{ width: '100%', marginTop: sp(18) }}>
              <CustomButton
                title={t('familyManage.upgradeFamily')}
                onPress={() => setPlanModalOpen(true)}
                icon={<Users color="#FFFFFF" size={18} />}
              />
            </View>
            <View style={{ width: '100%', marginTop: sp(10) }}>
              <CustomButton
                title={t('familyManage.haveToken')}
                onPress={() => setPlanModalOpen(true)}
                variant="outline"
                height={48}
                borderRadius={24}
              />
            </View>
          </View>
        </ScrollView>

        <FamilyPlanModal
          visible={planModalOpen}
          onClose={() => setPlanModalOpen(false)}
          onSuccess={load}
        />
      </View>
    );
  }

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

        {/* Thẻ nhóm: số thành viên active + giới hạn */}
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
                {t('home.familyManagement')}
              </Text>
              <Text
                style={[
                  styles.inviteSubtitle,
                  { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(11) },
                ]}
              >
                {t('familyManage.activeMembers', {
                  active: family?.activeCount ?? 0,
                  max: family?.maxMembers ?? 5,
                })}
              </Text>
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
          const isOwnerRow = m.role === 'owner';
          const isPending = m.role === 'pending';
          const roleColor = isOwnerRow
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
                {isOwnerRow ? (
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
                    {isOwnerRow
                      ? t('home.owner').toUpperCase()
                      : isPending
                      ? t('familyManage.pending').toUpperCase()
                      : t('home.member').toUpperCase()}
                  </Text>
                </View>
              </View>
              {/* Chỉ owner mới xoá được thành viên (BE chỉ cho owner) */}
              {isOwner && !isOwnerRow && !isPending ? (
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

        {/* Nút mời: chỉ owner */}
        {isOwner ? (
          <View style={{ marginTop: sp(28) }}>
            <CustomButton
              title={t('home.inviteMember')}
              onPress={() => setInviteOpen(true)}
              icon={<UserPlus color="#FFFFFF" size={18} />}
            />
          </View>
        ) : (
          <Text
            style={[
              styles.ownerOnlyHint,
              { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(11) },
            ]}
          >
            {t('familyManage.ownerOnlyHint')}
          </Text>
        )}

        {/* Nút giải tán: chỉ owner */}
        {isOwner ? (
          <View style={{ marginTop: sp(10) }}>
            <CustomButton
              title={t('familyManage.dissolve')}
              onPress={dissolve}
              variant="outline"
              height={48}
              borderRadius={24}
            />
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Dialog mời thành viên ── */}
      {inviteOpen ? (
        <View style={styles.dialogBackdrop}>
          <View
            style={[
              styles.dialog,
              { backgroundColor: isDark ? '#142018' : '#FFFFFF', borderColor: isDark ? '#2E4D36' : '#E0E8E1' },
            ]}
          >
            <Text
              style={[
                styles.inviteTitle,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(16) },
              ]}
            >
              {t('familyManage.inviteTitle')}
            </Text>
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder={t('familyManage.inviteEmailPlaceholder')}
              placeholderTextColor={isDark ? '#6B7C71' : '#9AA79E'}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.emailInput,
                {
                  backgroundColor: isDark ? '#19271E' : '#F4F7F4',
                  borderColor: isDark ? '#2E4D36' : '#E0E8E1',
                  color: isDark ? '#FFFFFF' : AppColors.textPrimary,
                  fontSize: sp(13),
                },
              ]}
            />
            <View style={{ flexDirection: 'row', gap: sp(10), marginTop: sp(8) }}>
              <View style={{ flex: 1 }}>
                <CustomButton
                  title={t('home.cancel')}
                  onPress={() => setInviteOpen(false)}
                  variant="outline"
                  height={46}
                  borderRadius={23}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomButton
                  title={t('home.inviteMember')}
                  onPress={submitInvite}
                  loading={inviting}
                  height={46}
                  borderRadius={23}
                />
              </View>
            </View>
          </View>
        </View>
      ) : null}

      <FamilyPlanModal
        visible={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onSuccess={load}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    marginTop: sp(24),
    padding: sp(20),
    borderRadius: sp(20),
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginTop: sp(12),
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: FontFamily.regular,
    marginTop: sp(6),
    textAlign: 'center',
    lineHeight: 18,
  },
  ownerOnlyHint: {
    fontFamily: FontFamily.regular,
    marginTop: sp(20),
    textAlign: 'center',
  },
  dialogBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp(20),
  },
  dialog: {
    width: '100%',
    borderRadius: sp(20),
    borderWidth: 1,
    padding: sp(18),
  },
  emailInput: {
    borderWidth: 1,
    borderRadius: sp(10),
    paddingHorizontal: sp(12),
    paddingVertical: sp(10),
    marginTop: sp(12),
    fontFamily: FontFamily.regular,
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
