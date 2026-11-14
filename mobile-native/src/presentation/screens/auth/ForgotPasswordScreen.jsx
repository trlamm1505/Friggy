import React, { useState, useCallback, useEffect } from 'react';
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
import { ChevronLeft, Mail, Check, Lock } from 'lucide-react-native';
import { CustomTextField } from '../../components/common/CustomTextField';
import { CustomButton } from '../../components/common/CustomButton';
import { isValidEmail } from '../../utils/validators';
import { showSuccess, showError } from '../../utils/helpers';
import { useAuthActions } from '../../../shared/stores/useAuthStore';
import { Routes } from '../../../shared/constants/routes';

export const ForgotPasswordScreen = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { sendResetOtp, resetPassword } = useAuthActions();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ── Bước 2: nhập OTP + mật khẩu mới ──
  // `expiresIn` đọc từ BE (config động), KHÔNG hardcode 300s.
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSecure, setIsSecure] = useState(true);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [otpError, setOtpError] = useState('');

  // Đếm ngược hết hạn OTP
  useEffect(() => {
    if (step !== 'otp' || otpExpiresIn <= 0) return undefined;
    const timer = setInterval(() => {
      setOtpExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, otpExpiresIn]);

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  /** Bước 1: gửi OTP đặt lại mật khẩu. */
  const handleSend = useCallback(async () => {
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
    try {
      const res = await sendResetOtp(email.trim());
      setOtpExpiresIn(res?.expiresIn || 0);
      setOtp('');
      setOtpError('');
      setStep('otp');
      showSuccess('Đã gửi mã OTP đặt lại mật khẩu');
    } catch (e) {
      const message = e?.message || 'Không gửi được mã OTP';
      setError(message);
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }, [email, sendResetOtp, t]);

  /** Bước 2: xác nhận OTP + đặt mật khẩu mới. */
  const handleReset = useCallback(async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError('Mã OTP phải gồm đúng 6 chữ số');
      return;
    }
    if (newPassword.length < 8) {
      setOtpError('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setOtpError('Mật khẩu xác nhận không khớp');
      return;
    }
    setOtpError('');
    setIsLoading(true);
    try {
      await resetPassword({
        email: email.trim(),
        otpCode: otp.trim(),
        newPassword,
      });
      showSuccess('Đặt lại mật khẩu thành công');
      navigation.navigate(Routes.Login);
    } catch (e) {
      const message = e?.message || 'Không đặt lại được mật khẩu';
      setOtpError(message);
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }, [otp, newPassword, confirmPassword, email, resetPassword, navigation]);

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
        {step === 'email' ? (
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
              <CustomButton title="Gửi mã OTP" onPress={handleSend} loading={isLoading} />
            </View>
          </>
        ) : (
          <>
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(28) },
              ]}
            >
              Đặt lại mật khẩu
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
              Mã OTP đã được gửi tới {email}. Nhập mã OTP và mật khẩu mới để tiếp tục.
            </Text>

            <View style={{ marginTop: 28 }}>
              <CustomTextField
                placeholder="Mã OTP 6 chữ số"
                value={otp}
                onChangeText={(v) => {
                  const clean = v.replace(/[^0-9]/g, '').slice(0, 6);
                  setOtp(clean);
                  if (otpError) setOtpError('');
                }}
                keyboardType="number-pad"
                error={otpError}
                maxLength={6}
                prefixIcon={(props) => (
                  <Lock {...props} color={isDark ? AppColors.primaryLight : '#8C9890'} size={22} />
                )}
              />
            </View>

            {otpExpiresIn > 0 && (
              <Text
                style={[
                  styles.countdownText,
                  { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
                ]}
              >
                Mã OTP hết hạn sau {formatCountdown(otpExpiresIn)}
              </Text>
            )}

            <View style={{ marginTop: 18 }}>
              <CustomTextField
                placeholder="Mật khẩu mới"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={isSecure}
                prefixIcon={(props) => (
                  <Lock {...props} color={isDark ? AppColors.primaryLight : '#8C9890'} size={22} />
                )}
                suffixIcon={
                  <Pressable onPress={() => setIsSecure(!isSecure)} hitSlop={8}>
                    {isSecure ? (
                      <Check color={AppColors.hintText} size={22} />
                    ) : (
                      <Check color={AppColors.primary} size={22} />
                    )}
                  </Pressable>
                }
              />
            </View>

            <View style={{ marginTop: 14 }}>
              <CustomTextField
                placeholder="Xác nhận mật khẩu mới"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={isSecure}
                prefixIcon={(props) => (
                  <Lock {...props} color={isDark ? AppColors.primaryLight : '#8C9890'} size={22} />
                )}
              />
            </View>

            <View style={{ marginTop: 24 }}>
              <CustomButton title="Đặt lại mật khẩu" onPress={handleReset} loading={isLoading} />
            </View>

            <View style={{ marginTop: 14 }}>
              <CustomButton
                title="Quay lại"
                onPress={() => {
                  setStep('email');
                  setOtp('');
                  setOtpError('');
                }}
                variant="text"
              />
            </View>
          </>
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
  countdownText: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginTop: 10,
    marginLeft: 4,
    fontSize: 12,
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
