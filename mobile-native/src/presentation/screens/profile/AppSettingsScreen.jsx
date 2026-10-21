/**
 * AppSettingsScreen
 *
 * Redesigned (Sprint 7):
 * - SettingsSection + SettingsMenuItem + ToggleRow
 * - i18n đầy đủ
 * - Group: Notifications (3 toggles) / Sound (2 toggles) / Data (clear cache + version)
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
} from 'lucide-react-native';

export const AppSettingsScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

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
