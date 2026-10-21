import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Mail, Check } from 'lucide-react-native';
import { CustomTextField } from '../../components/common/CustomTextField';
import { CustomButton } from '../../components/common/CustomButton';
import { isValidEmail } from '../../utils/validators';
import { showSuccess } from '../../utils/helpers';
import { Routes } from '../../../shared/constants/routes';

export const ForgotPasswordScreen = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = () => {
    if (!email.trim()) {
      setError(t('auth.enterEmail'));
      return;
    }
    if (!isValidEmail(email)) {
      setError(t('auth.invalidEmail'));
      return;
    }
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSent(true);
      showSuccess('Đã gửi liên kết đặt lại');
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: isDark ? '#0E1611' : AppColors.accentGreen }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={
          isDark ? ['#0E1611', '#142017', '#1B2E21'] : ['#FFFFFF', '#F5FCF4', '#C7EFC2', '#86D978']
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top back button */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <ChevronLeft color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={20} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!sent ? (
          <>
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(28) },
              ]}
            >
              {t('auth.forgotPasswordTitle')}
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  fontSize: sp(15),
                },
              ]}
            >
              {t('auth.forgotPasswordDesc')}
            </Text>
            <View style={{ marginTop: 32 }}>
              <CustomTextField
                placeholder={t('auth.email')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                error={error}
                prefixIcon={(props) => (
                  <Mail {...props} color={isDark ? AppColors.primaryLight : '#8C9890'} size={22} />
                )}
              />
            </View>
            <View style={{ marginTop: 24 }}>
              <CustomButton
                title={t('auth.sendResetLink')}
                onPress={handleSend}
                loading={isLoading}
              />
            </View>
          </>
        ) : (
          <View style={styles.successBlock}>
            <View style={[styles.checkCircle, { backgroundColor: AppColors.primary }]}>
              <Check color="#FFFFFF" size={32} strokeWidth={3} />
            </View>
            <Text
              style={[
                styles.title,
                {
                  color: isDark ? '#FFFFFF' : AppColors.textPrimary,
                  fontSize: sp(28),
                  textAlign: 'center',
                },
              ]}
            >
              {t('auth.checkYourEmail')}
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  fontSize: sp(15),
                  textAlign: 'center',
                },
              ]}
            >
              {t('auth.emailSentDesc')}
            </Text>
            <View style={{ marginTop: 24, width: '100%' }}>
              <CustomButton
                title={t('auth.backToLogin')}
                onPress={() => navigation.navigate(Routes.Login)}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  backRow: {
    padding: 8,
  },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 80,
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    marginTop: 8,
    lineHeight: 22,
  },
  successBlock: {
    alignItems: 'center',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
});
