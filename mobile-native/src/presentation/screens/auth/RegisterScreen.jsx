/**
 * RegisterScreen
 *
 * Redesigned (Sprint 6):
 * - i18n đầy đủ cho form labels, validation
 * - Password strength feedback (hiển thị khi password đủ mạnh)
 * - Consistent error messages với LoginScreen
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Mail, Lock, User, Eye, EyeOff, Check, X } from 'lucide-react-native';
import { CustomTextField } from '../../components/common/CustomTextField';
import { CustomButton } from '../../components/common/CustomButton';
import { CustomDivider } from '../../components/common/CustomDivider';
import { SocialButton } from '../../components/common/SocialButton';
import { isValidEmail, isValidPassword } from '../../utils/validators';
import { useAuthActions } from '../../../shared/stores/useAuthStore';
import { showSuccess, showError } from '../../utils/helpers';
import { getGoogleIdToken } from '../../utils/googleAuth';
import { Routes } from '../../../shared/constants/routes';

const PasswordRule = ({ ok, label }) => {
  const { isDark } = useTheme();
  return (
    <View style={styles.ruleRow}>
      <View
        style={[
          styles.ruleIcon,
          {
            backgroundColor: ok ? (isDark ? '#1B3324' : '#E8F5E9') : isDark ? '#3D1F1A' : '#FFEBEE',
          },
        ]}
      >
        {ok ? (
          <Check
            color={isDark ? AppColors.primaryLight : AppColors.primaryDark}
            size={10}
            strokeWidth={3}
          />
        ) : (
          <X color={isDark ? '#FF8A80' : '#B71C1C'} size={10} strokeWidth={3} />
        )}
      </View>
      <Text
        style={[
          styles.ruleText,
          {
            color: ok
              ? isDark
                ? AppColors.primaryLight
                : AppColors.primaryDark
              : isDark
                ? AppColors.darkTextSecondary
                : AppColors.textSecondary,
            fontSize: sp(11),
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

export const RegisterScreen = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { sendRegisterOtp, verifyRegisterOtp, signInWithGoogle } = useAuthActions();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSecure, setIsSecure] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Bước 2: nhập OTP ──
  // BE yêu cầu 2 bước: POST /auth/email/register (gửi OTP) -> POST /auth/email/verify-otp.
  // `expiresIn` đọc từ BE (config động), KHÔNG hardcode 300s.
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [otp, setOtp] = useState('');
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);

  // Đếm ngược đặt lại mã OTP
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

  // Chặn bấm gửi lại OTP quá 3 lần / 10 phút (BE cũng có chặn, đây là chặn phía UI)
  const resendCountRef = useRef(0);
  useEffect(() => {
    if (step !== 'otp') return undefined;
    if (resendCountRef.current >= 3) {
      setResendDisabled(true);
      return undefined;
    }
    const timer = setTimeout(() => {
      resendCountRef.current += 1;
    }, 10000);
    return () => clearTimeout(timer);
  }, [step]);

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Password rules
  const passwordRules = useMemo(() => {
    return [
      { ok: password.length >= 6, label: t('home.passwordMin') },
      { ok: /[A-Z]/.test(password) || password.length === 0, label: 'Có chữ hoa (khuyến nghị)' },
      { ok: /\d/.test(password) || password.length === 0, label: 'Có số (khuyến nghị)' },
    ];
  }, [password, t]);

  const passwordsMatch = useMemo(
    () => confirm.length > 0 && password === confirm,
    [password, confirm]
  );

  // Entry animation
  const formAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(formAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [formAnim]);

  const handleRegister = useCallback(async () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = t('home.enterName');
    if (!email.trim()) newErrors.email = t('home.enterEmail');
    else if (!isValidEmail(email)) newErrors.email = t('home.invalidEmail');
    if (!password) newErrors.password = t('home.enterPassword');
    else if (!isValidPassword(password)) newErrors.password = t('home.passwordMin');
    if (password !== confirm) newErrors.confirm = t('home.passwordMismatch');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      // Bước 1: gửi OTP. `expiresIn` từ BE (động theo config admin).
      const res = await sendRegisterOtp(email.trim());
      setOtpExpiresIn(res?.expiresIn || 0);
      setOtp('');
      setOtpError('');
      setStep('otp');
    } catch (e) {
      const message = e?.message || 'Không gửi được mã OTP';
      setErrors({ email: message });
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }, [name, email, password, confirm, sendRegisterOtp, t]);

  /** Bước 2: xác nhận OTP -> tạo tài khoản + đăng nhập. */
  const handleVerifyOtp = useCallback(async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError('Mã OTP phải gồm đúng 6 chữ số');
      return;
    }
    setOtpError('');
    setIsLoading(true);
    try {
      await verifyRegisterOtp({
        email: email.trim(),
        otpCode: otp.trim(),
        password,
        name: name.trim(),
      });
      showSuccess(t('home.loginSuccess'));
      // KHÔNG navigation.reset: verifyRegisterOtp đã set isAuthenticated ->
      // RootNavigator tự đổi sang Onboarding/Main.
    } catch (e) {
      // BE trả "OTP đã vượt quá số lần thử..." -> xoá form OTP, yêu cầu OTP mới.
      const message = e?.message || 'Mã OTP không chính xác';
      if (/vượt quá số lần thử/i.test(message)) {
        setStep('form');
        setOtp('');
        resendCountRef.current = 0;
      }
      setOtpError(message);
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }, [otp, email, password, name, verifyRegisterOtp, t]);

  /** Gửi lại OTP. BE chặn tối đa 3 lần / 10 phút. */
  const handleResendOtp = useCallback(async () => {
    if (resendDisabled) return;
    setIsLoading(true);
    try {
      const res = await sendRegisterOtp(email.trim());
      setOtpExpiresIn(res?.expiresIn || 0);
      setOtp('');
      setOtpError('');
      showSuccess('Đã gửi lại mã OTP');
    } catch (e) {
      const message = e?.message || 'Không gửi lại được mã OTP';
      setOtpError(message);
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }, [resendDisabled, email, sendRegisterOtp]);

  const handleGoogleLogin = useCallback(async () => {
    setIsLoading(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return;
      await signInWithGoogle(idToken);
      showSuccess(t('home.googleLoginSuccess'));
      // KHÔNG navigation.reset: signInWithGoogle đã set isAuthenticated ->
      // RootNavigator tự đổi sang Onboarding/Main.
    } catch (e) {
      showError(e?.message || 'Đăng nhập Google thất bại');
    } finally {
      setIsLoading(false);
    }
  }, [signInWithGoogle, t]);

  const formTranslateY = formAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

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

      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <ChevronLeft color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={20} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: formAnim,
            transform: [{ translateY: formTranslateY }],
          }}
        >
          <View style={styles.titleBlock}>
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(30) },
              ]}
            >
              {step === 'form' ? t('home.createAccount') : 'Nhập mã OTP'}
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  fontSize: sp(14),
                },
              ]}
            >
              {step === 'form'
                ? t('home.joinFriggy')
                : `Mã OTP đã được gửi tới ${email}. Vui lòng nhập mã 6 chữ số để hoàn tất đăng ký.`}
            </Text>
          </View>

          {step === 'form' ? (
            <View style={styles.form}>
              <CustomTextField
                placeholder={t('home.fullName')}
                value={name}
                onChangeText={setName}
                error={errors.name}
                prefixIcon={(props) => (
                  <User {...props} color={isDark ? AppColors.primaryLight : '#8C9890'} size={22} />
                )}
              />
              <View style={{ height: 12 }} />
              <CustomTextField
                placeholder={t('home.email')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                error={errors.email}
                prefixIcon={(props) => (
                  <Mail {...props} color={isDark ? AppColors.primaryLight : '#8C9890'} size={22} />
                )}
              />
              <View style={{ height: 12 }} />
              <CustomTextField
                placeholder={t('home.password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={isSecure}
                error={errors.password}
                prefixIcon={(props) => (
                  <Lock {...props} color={isDark ? AppColors.primaryLight : '#8C9890'} size={22} />
                )}
                suffixIcon={
                  <Pressable onPress={() => setIsSecure(!isSecure)} hitSlop={8}>
                    {isSecure ? (
                      <EyeOff color={AppColors.hintText} size={22} />
                    ) : (
                      <Eye color={AppColors.hintText} size={22} />
                    )}
                  </Pressable>
                }
              />

              {/* Password rules hint */}
              {password.length > 0 && (
                <View style={styles.rulesWrap}>
                  {passwordRules.map((rule, i) => (
                    <PasswordRule key={i} ok={rule.ok} label={rule.label} />
                  ))}
                </View>
              )}

              <View style={{ height: 12 }} />
              <CustomTextField
                placeholder={t('home.confirmNewPassword')}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={isSecure}
                error={errors.confirm}
                prefixIcon={(props) => (
                  <Lock {...props} color={isDark ? AppColors.primaryLight : '#8C9890'} size={22} />
                )}
                suffixIcon={passwordsMatch ? <Check color={AppColors.primary} size={22} /> : null}
              />

              <View style={{ marginTop: 24 }}>
                <CustomButton
                  title={t('home.register')}
                  onPress={handleRegister}
                  loading={isLoading}
                />
              </View>

              <View style={{ marginTop: 20 }}>
                <CustomDivider text={t('home.orContinueWith')} />
              </View>

              <View style={{ marginTop: 18 }}>
                <SocialButton type="google" onPress={handleGoogleLogin} />
              </View>

              <View style={styles.footer}>
                <Text
                  style={[
                    styles.footerText,
                    { color: isDark ? AppColors.hintText : '#6B786F', fontSize: sp(14) },
                  ]}
                >
                  {t('home.haveAccount')}
                </Text>
                <Pressable onPress={() => navigation.navigate(Routes.Login)}>
                  <Text
                    style={[
                      styles.footerLink,
                      {
                        color: isDark ? AppColors.primaryLight : AppColors.primary,
                        fontSize: sp(14),
                      },
                    ]}
                  >
                    {t('home.login')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            // ── Bước 2: nhập OTP ──
            <View style={styles.form}>
              <CustomTextField
                placeholder="6 chữ số"
                value={otp}
                onChangeText={(v) => {
                  // Chỉ nhận số, tối đa 6 ký tự
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

              <View style={{ marginTop: 24 }}>
                <CustomButton
                  title="Xác nhận OTP"
                  onPress={handleVerifyOtp}
                  loading={isLoading}
                  disabled={otp.length !== 6}
                />
              </View>

              <View style={{ marginTop: 14 }}>
                <CustomButton
                  title={resendDisabled ? 'Đã gửi quá 3 lần' : 'Gửi lại mã OTP'}
                  onPress={handleResendOtp}
                  variant="outline"
                  loading={isLoading}
                  disabled={resendDisabled}
                />
              </View>

              <View style={{ marginTop: 14 }}>
                <CustomButton
                  title="Quay lại"
                  onPress={() => {
                    setStep('form');
                    setOtp('');
                    setOtpError('');
                  }}
                  variant="text"
                />
              </View>
            </View>
          )}
        </Animated.View>
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
  titleBlock: {
    marginBottom: 24,
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    marginTop: 6,
  },
  form: {},
  rulesWrap: {
    marginTop: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleText: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginLeft: 6,
  },
  countdownText: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginTop: 10,
    marginLeft: 4,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontFamily: FontFamily.regular,
  },
  footerLink: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginLeft: 4,
  },
});
