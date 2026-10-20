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
import userMock from '../../../shared/mocks/user.json';
import { useAuthStore } from '../../../shared/stores/useAuthStore';
import { Routes } from '../../../shared/constants/routes';

const PasswordRule = ({ ok, label }) => {
  const { isDark } = useTheme();
  return (
    <View style={styles.ruleRow}>
      <View
        style={[
          styles.ruleIcon,
          { backgroundColor: ok ? (isDark ? '#1B3324' : '#E8F5E9') : (isDark ? '#3D1F1A' : '#FFEBEE') },
        ]}
      >
        {ok ? (
          <Check color={isDark ? AppColors.primaryLight : AppColors.primaryDark} size={10} strokeWidth={3} />
        ) : (
          <X color={isDark ? '#FF8A80' : '#B71C1C'} size={10} strokeWidth={3} />
        )}
      </View>
      <Text
        style={[
          styles.ruleText,
          {
            color: ok
              ? isDark ? AppColors.primaryLight : AppColors.primaryDark
              : isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
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
  const { login } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSecure, setIsSecure] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
    [password, confirm],
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

  const handleRegister = useCallback(() => {
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
    setTimeout(() => {
      setIsLoading(false);
      login({ ...userMock, name: name || userMock.name });
      navigation.reset({ index: 0, routes: [{ name: Routes.LoginSuccessVideo }] });
    }, 800);
  }, [name, email, password, confirm, login, navigation, t]);

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
        colors={isDark ? ['#0E1611', '#142017', '#1B2E21'] : ['#FFFFFF', '#F5FCF4', '#C7EFC2', '#86D978']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backRow}
        >
          <ChevronLeft
            color={isDark ? '#FFFFFF' : AppColors.textPrimary}
            size={20}
          />
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
              {t('home.createAccount')}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(14) },
              ]}
            >
              {t('home.joinFriggy')}
            </Text>
          </View>

          <View style={styles.form}>
            <CustomTextField
              placeholder={t('home.fullName')}
              value={name}
              onChangeText={setName}
              error={errors.name}
              prefixIcon={(props) => <User {...props} color={isDark ? AppColors.primaryLight : '#8C9890'} size={22} />}
            />
            <View style={{ height: 12 }} />
            <CustomTextField
              placeholder={t('home.email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              error={errors.email}
              prefixIcon={(props) => <Mail {...props} color={isDark ? AppColors.primaryLight : '#8C9890'} size={22} />}
            />
            <View style={{ height: 12 }} />
            <CustomTextField
              placeholder={t('home.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={isSecure}
              error={errors.password}
              prefixIcon={(props) => <Lock {...props} color={isDark ? AppColors.primaryLight : '#8C9890'} size={22} />}
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
              prefixIcon={(props) => <Lock {...props} color={isDark ? AppColors.primaryLight : '#8C9890'} size={22} />}
              suffixIcon={
                passwordsMatch ? (
                  <Check color={AppColors.primary} size={22} />
                ) : null
              }
            />

            <View style={{ marginTop: 24 }}>
              <CustomButton title={t('home.register')} onPress={handleRegister} loading={isLoading} />
            </View>

            <View style={{ marginTop: 20 }}>
              <CustomDivider text={t('home.orContinueWith')} />
            </View>

            <View style={{ marginTop: 18 }}>
              <SocialButton
                type="google"
                onPress={() => {
                  setIsLoading(true);
                  setTimeout(() => {
                    setIsLoading(false);
                    login(userMock);
                    navigation.reset({
                      index: 0,
                      routes: [{ name: Routes.LoginSuccessVideo }],
                    });
                  }, 600);
                }}
              />
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
                    { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(14) },
                  ]}
                >
                  {t('home.login')}
                </Text>
              </Pressable>
            </View>
            <View style={{ height: 60 }} />
          </View>
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
