/**
 * MyFridgesScreen
 *
 * B1 — nối số liệu thật cho "Tủ Lạnh Gia Đình".
 *
 * ⚠️ QUYẾT ĐỊNH ĐÃ CHỐT (prompt mục 5.1):
 *   "BE KHÔNG có endpoint multi-fridge" -> Q3 chốt **FOLLOW FLUTTER**:
 *   giữ 3 tủ, chỉ "Tủ Lạnh Gia Đình" gọi thật, 2 tủ còn lại là UI tĩnh.
 *   KHÔNG simplify thành 1 tủ.
 *
 *   3 tủ giống Flutter production (my_fridges_screen.dart:77-101):
 *     1. family   — Tủ Lạnh Gia Đình  → GỌI THẬT
 *     2. roommates — Tủ Lạnh Phòng Trọ → UI tĩnh
 *     3. personal — Tủ Lạnh Cá Nhân  → UI tĩnh
 *
 * Endpoint dùng cho tủ family:
 *   - `GET /fridge/stats` -> `totalItems` + `expiringSoonCount` (qua `getFridgeStats`)
 *   - `GET /family/me`   -> `activeCount` (qua `userService.getFamily()`)
 *
 * ⚠️ `getFridgeStats` phải có trong prototype của `MockFridgeService` thì mới
 * được `SafeService.withFallback` bọc — đã bổ sung (mục 5.1 cảnh báo cuối).
 *
 * ⚠️ KHÔNG có invite code từ BE: `FamilyRoleDto` chỉ có { role, group }, và
 * `group` không có field `inviteCode`. Khi role !== 'owner' hoặc group = null thì
 * ẩn hẳn card mã mời thay vì hiện mã giả — giả mã là nói dối người dùng.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useServices } from '../../../data/ServiceProvider';
import { Share2, Plus, Refrigerator } from 'lucide-react-native';
import { showSuccess } from '../../utils/helpers';

// 2 tủ tĩnh — BE không có endpoint multi-fridge (chốt 23/10, xem header file).
// `totalItems`/`expiringCount` cố tình KHÔNG khai báo -> FridgeCard ẩn chip số liệu.
const STATIC_FRIDGES = [
  {
    id: 'roommates',
    iconName: 'users',
    nameKey: 'home.fridgeRoommatesFridge',
    descKey: 'home.fridgeRoommatesDesc',
  },
  {
    id: 'personal',
    iconName: 'home',
    nameKey: 'home.fridgePersonalFridge',
    descKey: 'home.fridgePersonalDesc',
  },
];

export const MyFridgesScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { fridgeService, userService } = useServices();

  const [activeId, setActiveId] = useState('family');
  const [stats, setStats] = useState(null);
  const [family, setFamily] = useState(null);

  /**
   * Gọi song song 2 endpoint của tủ family:
   *   - `GET /fridge/stats` -> totalItems + expiringSoonCount
   *   - `GET /family/me`   -> activeCount (thành viên gia đình)
   *
   * `SafeService` đã tự quyết định fallback (5xx/network -> mock, 4xx -> throw).
   * Ở đây catch thêm để KHÔNG làm vỡ màn hình: mất số liệu thì bỏ chip số,
   * vẫn xem được danh sách tủ. Đây là lỗi hiển thị phụ, không phải lỗi chính —
   * nên nuốt + hiện tủ không số liệu, KHÔNG đổi cả màn thành ErrorState.
   */

  // Gọi fetch SAU khi effect chạy, không gọi trực tiếp trong thân effect.
  // `react-hooks/set-state-in-effect` (React Compiler rule) chặn việc setState
  // đồng bộ trong effect body vì gây cascading render. Đặt vào callback của
  // task microtask là cách repo này đã dùng ở `FridgeInventoryScreen` (debounce).
  // Thêm guard `cancelled` để không setState sau khi unmount.
  useEffect(() => {
    let cancelled = false;

    Promise.all([fridgeService.getFridgeStats(), userService.getFamily()])
      .then(([s, f]) => {
        if (cancelled) return;
        setStats(s || null);
        setFamily(f || null);
      })
      .catch(() => {
        if (cancelled) return;
        // Giữ UI dùng được: tủ vẫn hiện, chỉ thiếu số liệu (như loadFamilyData).
        setStats(null);
        setFamily(null);
      });

    return () => {
      cancelled = true;
    };
  }, [fridgeService, userService]);

  const fridges = useMemo(() => {
    const familyFridge = {
      id: 'family',
      iconName: 'users',
      nameKey: 'home.fridgeFamilyFridge',
      descKey: 'home.fridgeFamilyDesc',
      // Số liệu thật — undefined khi request lỗi để FridgeCard ẩn chip.
      totalItems: stats?.totalItems,
      expiringCount: stats?.expiringSoonCount ?? 0,
      // BE `FamilyGroupDto.activeCount` KHÔNG bao gồm owner (family.dto.ts:63),
      // còn mock `getFamily()` trả `{ members }` đã tính cả owner. Hai shape
      // khác nhau -> đọc được cả hai, cộng 1 chỉ khi BE trả `activeCount`.
      // KHÔNG sửa `MockUserService` vì ngoài phạm vi B1 (rule 2.4 số 3).
      memberCount:
        family?.activeCount !== undefined && family?.activeCount !== null
          ? family.activeCount + 1
          : family?.members?.length,
    };

    return [familyFridge, ...STATIC_FRIDGES].map((f) => ({
      ...f,
      isActive: f.id === activeId,
    }));
  }, [stats, family, activeId]);

  const switchFridge = useCallback(
    (id) => {
      setActiveId(id);
      const target = fridges.find((f) => f.id === id);
      if (target) showSuccess(`${t('home.fridgeSwitch')} ${t(target.nameKey)}`);
    },
    [fridges, t]
  );

  // BE KHÔNG có endpoint sinh invite code (FamilyRoleDto không có field này).
  // Chỉ hiện card mời khi user LÀ chủ gia đình (`role === 'owner'`).
  // Người không phải owner không có mã để chia sẻ -> ẩn hẳn, không hiện mã giả.
  //
  // Trong MOCK mode, `family` đến từ `family-members.json` (không có `role`,
  // không có `inviteCode`) -> cả 2 điều kiện false -> card ẩn. Đúng mụn đích:
  // không hiện mã giả. Khi nào BE trả `inviteCode` thì tự hiện, không cần sửa UI.
  const inviteCode = family?.inviteCode ?? null;
  const canInvite = Boolean(inviteCode) && family?.role === 'owner';

  const shareCode = useCallback(() => {
    if (!inviteCode) return;
    Share.share({ message: `${t('home.fridgeInviteCode')}: ${inviteCode}` });
  }, [inviteCode, t]);

  return (
    <View
      style={[styles.container, { backgroundColor: isDark ? '#0E1611' : AppColors.accentGreen }]}
    >
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
            {
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              fontSize: sp(13),
            },
          ]}
        >
          {t('home.fridgeSwitchHint')}
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
                iconName={fridge.iconName}
                name={t(fridge.nameKey)}
                description={t(fridge.descKey)}
                memberCount={fridge.memberCount}
                totalItems={fridge.totalItems}
                expiringCount={fridge.expiringCount}
                isActive={fridge.isActive}
                onPress={() => switchFridge(fridge.id)}
              />
            ))}
          </View>
        )}

        {/* Mã mời — chỉ chủ gia đình mới có. BE chưa trả field này nên
            hiện tại luôn ẩn; đã comment để DEV A bổ sung API sau. */}
        {canInvite ? (
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
                    {
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      fontSize: sp(11),
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t('home.fridgeInviteHint')}
                </Text>
              </View>
            </View>
            <View style={styles.inviteCodeRow}>
              <Text style={[styles.inviteCode, { color: AppColors.primary, fontSize: sp(22) }]}>
                {inviteCode}
              </Text>
              <View style={styles.inviteActions}>
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
        ) : null}

        <View style={{ marginTop: sp(28) }}>
          <CustomButton
            title={t('home.fridgeAddNew')}
            onPress={() => showSuccess(t('home.fridgeAddNewComingSoon'))}
            icon={<Plus color="#FFFFFF" size={18} />}
            variant="outline"
          />
        </View>
        <View style={{ marginTop: sp(12) }}>
          <CustomButton
            title={t('home.fridgeJoinFamily')}
            onPress={() => showSuccess(t('home.fridgeJoinFamilyComingSoon'))}
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
