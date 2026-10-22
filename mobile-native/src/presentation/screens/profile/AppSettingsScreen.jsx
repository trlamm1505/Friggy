/**
 * AppSettingsScreen
 *
 * Redesigned (Sprint 7):
 * - SettingsSection + SettingsMenuItem + ToggleRow
 * - i18n đầy đủ
 * - Group: Appearance (theme) / Language (locale) / Notifications (3 toggles) /
 *   Sound (2 toggles) / Data (clear cache + version)
 *
 * Ghi chú (2026-10-22): 2 control chuyển từ UserProfileScreen sang đây để trang
 * tài khoản chỉ còn 7 mục đã chốt (profile / family / preferences / allergies /
 * change password / settings / logout):
 *   - home.theme     -> t('home.settingsAppearance')
 *   - home.language  -> t('home.settingsLanguage')
 * Logic (useThemeStore + useLanguageStore) giữ nguyên, chỉ đổi chỗ render.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackCircleButton } from '../../components/common/BackCircleButton';
import { SettingsSection } from '../../components/common/SettingsSection';
import { SettingsMenuItem } from '../../components/common/SettingsMenuItem';
import { ToggleRow } from '../../components/common/ToggleRow';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { useThemeStore } from '../../../shared/stores/useThemeStore';
import { useLanguageStore } from '../../../shared/stores/useLanguageStore';
import {
  Bell,
  Mail,
  Smartphone,
  Trash2,
  Vibrate,
  Info,
  FileText,
  Shield,
  Github,
  Moon,
  Globe,
} from 'lucide-react-native';

export const AppSettingsScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { themeMode, setThemeMode } = useThemeStore();
  const { locale, setLocale } = useLanguageStore();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const themeOptions = [
    { key: 'light', label: t('home.light') },
    { key: 'dark', label: t('home.dark') },
    { key: 'system', label: t('home.system') },
  ];

  const languageOptions = [
    { key: 'vi', label: t('home.vietnamese') },
    { key: 'en', label: t('home.english') },
  ];

  const handleClearCache = useCallback(() => {
    Alert.alert(
      t('home.settingsClearCache'),
      'Bạn có chắc muốn xóa cache? Dữ liệu offline sẽ bị xóa.',
      [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.settingsClearCache'),
          style: 'destructive',
          onPress: () => {
            // mock: chỉ show success
            Alert.alert('Thành công', 'Đã xóa cache');
          },
        },
      ]
    );
  }, [t]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground },
      ]}
    >
      <View style={{ paddingTop: insets.top + sp(12), paddingHorizontal: sp(20) }}>
        <BackCircleButton onPress={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text
          style={[
            styles.title,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(24) },
          ]}
        >
          {t('home.appSettings')}
        </Text>

        {/* Appearance — chuyển theme (light / dark / system) */}
        <SettingsSection title={t('home.settingsAppearance')}>
          <SettingsMenuItem
            icon={Moon}
            label={t('home.theme')}
            customRight={
              <View style={{ maxWidth: sp(170) }}>
                <SegmentedControl
                  options={themeOptions}
                  selectedKey={themeMode}
                  onSelect={setThemeMode}
                />
              </View>
            }
            isLast
          />
        </SettingsSection>

        {/* Language */}
        <SettingsSection title={t('home.settingsLanguage')}>
          <SettingsMenuItem
            icon={Globe}
            label={t('home.language')}
            customRight={
              <View style={{ maxWidth: sp(160) }}>
                <SegmentedControl
                  options={languageOptions}
                  selectedKey={locale}
                  onSelect={setLocale}
                />
              </View>
            }
            isLast
          />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title={t('home.settingsNotifications')}>
          <ToggleRow
            icon={Bell}
            label={t('home.settingsPushNotifications')}
            value={pushEnabled}
            onChange={setPushEnabled}
          />
          <ToggleRow
            icon={Mail}
            label={t('home.settingsEmailNotifications')}
            value={emailEnabled}
            onChange={setEmailEnabled}
            isLast
          />
        </SettingsSection>

        {/* Sound */}
        <SettingsSection title={t('home.settingsSound')}>
          <ToggleRow
            icon={Smartphone}
            label={t('home.settingsSoundEffects')}
            value={soundEnabled}
            onChange={setSoundEnabled}
          />
          <ToggleRow
            icon={Vibrate}
            label={t('home.settingsVibration')}
            value={vibrationEnabled}
            onChange={setVibrationEnabled}
            isLast
          />
        </SettingsSection>

        {/* Data */}
        <SettingsSection title={t('home.settingsData')}>
          <SettingsMenuItem
            icon={Trash2}
            label={t('home.settingsClearCache')}
            value={t('home.settingsCacheSize', { size: '12.4' })}
            onPress={handleClearCache}
          />
          <SettingsMenuItem icon={Info} label={t('home.settingsVersion')} value="1.0.0" isLast />
        </SettingsSection>

        {/* About */}
        <SettingsSection title={t('home.settingsAbout')}>
          <SettingsMenuItem icon={Shield} label={t('home.settingsPrivacy')} onPress={() => {}} />
          <SettingsMenuItem icon={FileText} label={t('home.settingsTerms')} onPress={() => {}} />
          <SettingsMenuItem
            icon={Github}
            label={t('home.settingsOpenSource')}
            onPress={() => {}}
            isLast
          />
        </SettingsSection>

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
});
