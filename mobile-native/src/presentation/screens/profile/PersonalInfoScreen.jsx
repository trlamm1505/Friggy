/**
 * PersonalInfoScreen
 *
 * Redesigned (Sprint 6):
 * - Có header gradient mini + avatar
 * - Form layout đẹp hơn với CustomTextField (đã có icon prefix option)
 * - Phone field có prefix icon Phone
 * - Email field có prefix icon Mail
 * - Address field có prefix icon MapPin
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { CustomTextField } from '../../components/common/CustomTextField';
import { CustomButton } from '../../components/common/CustomButton';
import { useAuthStore } from '../../../shared/stores/useAuthStore';
import { showSuccess } from '../../utils/helpers';
import { Mail, Phone, MapPin, User } from 'lucide-react-native';

export const PersonalInfoScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState(user?.name || 'Trần Quốc Lâm');
  const [email, setEmail] = useState(user?.email || 'lam@example.com');
  const [phone, setPhone] = useState('0901234567');
  const [address, setAddress] = useState('Hà Nội, Việt Nam');

  const handleSave = useCallback(() => {
    setUser({ ...user, name, email });
    showSuccess(t('profile.saveChanges'));
    navigation.goBack();
  }, [user, setUser, name, email, navigation, t]);

  const iconColor = isDark ? AppColors.primaryLight : '#8C9890';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}
    >
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: sp(4) }}>
          <ProfileHeader name={name} email={email} size="medium" />
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(11) },
          ]}
        >
          {t('home.account').toUpperCase()}
        </Text>
        <View style={styles.form}>
          <CustomTextField
            label={t('auth.fullName')}
            value={name}
            onChangeText={setName}
            prefixIcon={(props) => <User {...props} color={iconColor} size={20} />}
          />
          <CustomTextField
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            prefixIcon={(props) => <Mail {...props} color={iconColor} size={20} />}
          />
          <CustomTextField
            label={t('home.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            prefixIcon={(props) => <Phone {...props} color={iconColor} size={20} />}
          />
          <CustomTextField
            label={t('home.address')}
            value={address}
            onChangeText={setAddress}
            prefixIcon={(props) => <MapPin {...props} color={iconColor} size={20} />}
          />
        </View>

        <View style={{ marginTop: sp(32) }}>
          <CustomButton title={t('profile.saveChanges')} onPress={handleSave} />
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.8,
    marginTop: sp(24),
    marginBottom: sp(12),
    marginLeft: sp(4),
  },
  form: {
    gap: sp(14),
  },
});
