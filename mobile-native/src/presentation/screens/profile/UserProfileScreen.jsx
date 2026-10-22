/**
 * UserProfileScreen
 *
 * Redesigned (Sprint 6):
 * - Dùng các component reusable: ProfileHeader, SettingsSection, SettingsMenuItem
 * - Từ 350 dòng inline code → ~120 dòng
 * - i18n đầy đủ cho mọi label hardcoded
 *
 * 2026-10-22: trang tài khoản rút gọn còn đúng 7 mục đã chốt:
 *   1. Thông tin cá nhân          5. Đổi mật khẩu
 *   2. Nhóm gia đình               6. Cài đặt
 *   3. Tùy chọn ăn uống và kỹ năng 7. Đăng xuất
 *   4. Dị ứng thực phẩm
 * (dị ứng nằm chung section "Tùy chọn ăn uống" với mục 3)
 *
 * Ngôn ngữ + giao diện (theme) ĐÃ CHUYỂN sang AppSettingsScreen.
 * `useThemeStore` / `useLanguageStore` / `SegmentedControl` không còn import ở đây
 * — logic chuyển theme vẫn nguyên vẹn, chỉ đổi chỗ render.
 */

import React, { useCallback } from 'react';
import { View, ScrollView, Alert, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../shared/stores/useAuthStore';
import { Routes } from '../../../shared/constants/routes';
import { ScreenBackground } from '../../components/common/ScreenBackground';
import {
  LogOut,
  User,
  Heart,
  Users,
  Settings,
  Lock,
  AlertTriangle,
  Sparkles,
} from 'lucide-react-native';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { SettingsSection } from '../../components/common/SettingsSection';
import { SettingsMenuItem } from '../../components/common/SettingsMenuItem';

export const UserProfileScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const handleLogout = useCallback(() => {
    Alert.alert(t('profile.logout'), t('home.logoutConfirm'), [
      { text: t('home.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: () => {
          // P0.7.2: trước đây gọi navigation.getParent()?.reset() - chính là
          // thứ phát ra action RESET bay vào inner navigator (MainScreens) mà
          // không có route name 'AuthFlow', gây warning:
          //   "The action 'RESET' ... was not handled by any navigator"
          // Sửa: chỉ logout() - RootNavigator nghe useAuthStore.isAuthenticated
          // tự re-render để hiển thị AuthFlow. Không cần reset thủ công.
          logout();
        },
      },
    ]);
  }, [logout, t]);

  // P0.8 (ảnh 12): quota AI tuần này
  const aiUsed = 0;
  const aiTotal = 17;

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={{ paddingBottom: sp(100) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + sp(16) }}>
          <ProfileHeader
            name={user?.name}
            email={user?.email}
            onEdit={() => navigation.navigate(Routes.PersonalInfo)}
          />
        </View>

        {/* P0.8 (ảnh 12): card lượt AI tuần này */}
        <View
          style={[
            styles.quotaCard,
            {
              backgroundColor: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
              borderColor: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
            },
          ]}
        >
          <View style={styles.quotaLeft}>
            <View
              style={[
                styles.quotaIcon,
                { backgroundColor: isDark ? AppColors.darkIconBg : AppColors.accentGreen },
              ]}
            >
              <Sparkles
                color={isDark ? AppColors.primaryLight : AppColors.primary}
                size={18}
                strokeWidth={2.2}
              />
            </View>
            <Text
              style={[
                styles.quotaText,
                {
                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                  fontSize: sp(13),
                },
              ]}
            >
              {t('profile.aiQuota', { used: aiUsed, total: aiTotal })}
            </Text>
          </View>
          <View
            style={[
              styles.quotaBadge,
              {
                backgroundColor: isDark ? AppColors.primaryLight : AppColors.accentGreen,
              },
            ]}
          >
            <Text
              style={[
                styles.quotaBadgeText,
                {
                  color: isDark ? AppColors.darkBackground : AppColors.forestAccent,
                  fontSize: sp(12),
                },
              ]}
            >
              {aiUsed}/{aiTotal}
            </Text>
          </View>
        </View>

        {/* Account section — thông tin cá nhân */}
        <SettingsSection title={t('home.account')}>
          <SettingsMenuItem
            icon={User}
            label={t('profile.personalInfo')}
            onPress={() => navigation.navigate(Routes.PersonalInfo)}
          />
        </SettingsSection>

        {/* Family section */}
        <SettingsSection title={t('home.family')}>
          <SettingsMenuItem
            icon={Users}
            label={t('profile.familyManagement')}
            onPress={() => navigation.navigate(Routes.FamilyManagement)}
            isLast
          />
        </SettingsSection>

        {/* Preferences — tùy chọn ăn uống và kỹ năng */}
        <SettingsSection title={t('home.preferences')}>
          <SettingsMenuItem
            icon={Heart}
            label={t('profile.userPreferences')}
            onPress={() => navigation.navigate(Routes.UserPreferences)}
          />
          <SettingsMenuItem
            icon={AlertTriangle}
            label={t('profile.userAllergies')}
            onPress={() => navigation.navigate(Routes.UserAllergies)}
            isLast
          />
        </SettingsSection>

        {/* Settings section — đổi mật khẩu + cài đặt ứng dụng.
            Ngôn ngữ & giao diện (theme) đã chuyển sang AppSettingsScreen. */}
        <SettingsSection title={t('home.settings')}>
          <SettingsMenuItem
            icon={Lock}
            label={t('profile.changePassword')}
            onPress={() => navigation.navigate(Routes.ChangePassword)}
          />
          <SettingsMenuItem
            icon={Settings}
            label={t('profile.appSettings')}
            onPress={() => navigation.navigate(Routes.AppSettings)}
            isLast
          />
        </SettingsSection>

        {/* Logout */}
        <View style={styles.logoutBlock}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutBtn,
              {
                backgroundColor: isDark ? '#2A1C19' : '#FAF1EB',
                borderColor: '#FF8A80',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <LogOut color="#FF5252" size={18} />
            <Text style={[styles.logoutText, { fontSize: sp(15) }]}>{t('profile.logout')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  quotaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: sp(20),
    marginTop: sp(16),
    paddingVertical: sp(12),
    paddingHorizontal: sp(14),
    borderRadius: sp(14),
    borderWidth: 1,
    borderColor: AppColors.lightCardBorder,
    backgroundColor: AppColors.lightCardBg,
  },
  quotaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quotaIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sp(10),
  },
  quotaText: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    flexShrink: 1,
  },
  quotaBadge: {
    paddingHorizontal: sp(10),
    paddingVertical: sp(4),
    borderRadius: sp(10),
    marginLeft: sp(8),
  },
  quotaBadgeText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  logoutBlock: {
    paddingHorizontal: sp(20),
    marginTop: sp(24),
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp(14),
    borderRadius: sp(14),
    borderWidth: 1,
  },
  logoutText: {
    color: '#FF5252',
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginLeft: sp(8),
  },
});
