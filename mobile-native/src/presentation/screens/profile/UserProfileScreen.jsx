/**
 * UserProfileScreen
 *
 * Redesigned (Sprint 6):
 * - Dùng các component reusable: ProfileHeader, SettingsSection, SettingsMenuItem, SegmentedControl
 * - Từ 350 dòng inline code → ~120 dòng
 * - i18n đầy đủ cho mọi label hardcoded
 */

import React, { useCallback } from 'react';
import { View, ScrollView, Alert, Pressable, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors, AppGradients } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../../shared/stores/useAuthStore';
import { useLanguageStore } from '../../../shared/stores/useLanguageStore';
import { useThemeStore } from '../../../shared/stores/useThemeStore';
import { Routes } from '../../../shared/constants/routes';
import { LogOut, User, Heart, Users, Settings, Lock, Globe, Moon } from 'lucide-react-native';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { SettingsSection } from '../../components/common/SettingsSection';
import { SettingsMenuItem } from '../../components/common/SettingsMenuItem';
import { SegmentedControl } from '../../components/common/SegmentedControl';

export const UserProfileScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();
  const { locale, setLocale } = useLanguageStore();
  const { themeMode, setThemeMode } = useThemeStore();

  const handleLogout = useCallback(() => {
    Alert.alert(t('profile.logout'), t('home.logoutConfirm'), [
      { text: t('home.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: () => {
          logout();
          navigation.getParent()?.reset({
            index: 0,
            routes: [{ name: 'AuthFlow' }],
          });
        },
      },
    ]);
  }, [logout, navigation, t]);

  const languageOptions = [
    { value: 'vi', label: t('home.vietnamese') },
    { value: 'en', label: t('home.english') },
  ];

  const themeOptions = [
    { value: 'light', label: t('home.light') },
    { value: 'dark', label: t('home.dark') },
    { value: 'system', label: t('home.system') },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={AppGradients.getBackground(isDark).colors}
        locations={AppGradients.getBackground(isDark).locations}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: sp(50) }}>
          <ProfileHeader
            name={user?.name}
            email={user?.email}
            onEdit={() => navigation.navigate(Routes.PersonalInfo)}
          />
        </View>

        {/* Account section */}
        <SettingsSection title={t('home.account')}>
          <SettingsMenuItem
            icon={User}
            label={t('profile.personalInfo')}
            onPress={() => navigation.navigate(Routes.PersonalInfo)}
          />
          <SettingsMenuItem
            icon={Heart}
            label={t('profile.userPreferences')}
            onPress={() => navigation.navigate(Routes.UserPreferences)}
          />
          <SettingsMenuItem
            icon={Settings}
            label={t('profile.userAllergies')}
            onPress={() => navigation.navigate(Routes.UserAllergies)}
            isLast
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

        {/* Settings section */}
        <SettingsSection title={t('home.settings')}>
          <SettingsMenuItem
            icon={Lock}
            label={t('profile.changePassword')}
            onPress={() => navigation.navigate(Routes.ChangePassword)}
          />
          <SettingsMenuItem
            icon={Globe}
            label={t('home.language')}
            customRight={
              <View style={{ maxWidth: sp(160) }}>
                <SegmentedControl
                  options={languageOptions}
                  selected={locale}
                  onChange={setLocale}
                />
              </View>
            }
          />
          <SettingsMenuItem
            icon={Moon}
            label={t('home.theme')}
            customRight={
              <View style={{ maxWidth: sp(170) }}>
                <SegmentedControl
                  options={themeOptions}
                  selected={themeMode}
                  onChange={setThemeMode}
                />
              </View>
            }
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
            <Text style={[styles.logoutText, { fontSize: sp(15) }]}>
              {t('profile.logout')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
