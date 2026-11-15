/**
 * LoginScreen
 *
 * Redesigned (Sprint 6):
 * - Animated entrance (fade in + slide up) cho card
 * - i18n đầy đủ cho success messages, social login labels
 * - Improved form validation với better error messages
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { AppGradients } from '../../theme/gradients';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, ChevronLeft } from 'lucide-react-native';
import { CustomTextField } from '../../components/common/CustomTextField';
import { CustomButton } from '../../components/common/CustomButton';
import { CustomCheckbox } from '../../components/common/CustomCheckbox';
import { CustomDivider } from '../../components/common/CustomDivider';
import { SocialButton } from '../../components/common/SocialButton';
import { Routes } from '../../../shared/constants/routes';
import { isValidEmail, isValidPassword } from '../../utils/validators';
import { useAuthActions } from '../../../shared/stores/useAuthStore';
import { showSuccess, showError } from '../../utils/helpers';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { TokenStorage } from '../../../data/storage/TokenStorage';
import { getGoogleIdToken } from '../../utils/googleAuth';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LoginScreen = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { signIn, signInWithGoogle, resumeOfflineSession } = useAuthActions();
  const { isOffline } = useNetworkStatus();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSecure, setIsSecure] = useState(true);
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  // ⚠️ OFFLINE (đối chiếu Flutter 14/11 - `checkAndRefreshToken`):
  //   Nếu máy đã từng đăng nhập -> có token + user trong MMKV.
  //   Khi mất mạng, màn Login vẫn phải cho user vào app bằng phiên local,
  //   không bắt user nhập lại mật khẩu (server không check được).
  //   -> Hiện nút "Đăng nhập bằng dữ liệu đã lưu".
  // Đọc 1 lần lúc mount (token trong MMKV là bất biến trong phiên màn Login).
  const [hasSavedSession] = useState(() => {
    try {
      return Boolean(TokenStorage.getAccessToken() || TokenStorage.getRefreshToken());
    } catch (_e) {
      return false;
    }
  });

  const topPadding = 44;
  const topHeaderHeight = SCREEN_HEIGHT * 0.35 + topPadding;

  // Entry animation
  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [cardAnim]);

  const handleLogin = useCallback(async () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = t('home.enterEmail');
    else if (!isValidEmail(email)) newErrors.email = t('home.invalidEmail');
    if (!password) newErrors.password = t('home.enterPassword');
    else if (!isValidPassword(password)) newErrors.password = t('home.passwordMin');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      await signIn({ email: email.trim(), password });
      showSuccess(t('home.loginSuccess'));
      // KHÔNG navigation.reset: signIn đã set isAuthenticated ->
      // RootNavigator tự đổi sang Onboarding/Main.
    } catch (e) {
      // ApiException đã chuẩn hoá message (lỗi mạng vs lỗi server khác nhau).
      // Lỗi 401 ở endpoint login = sai mật khẩu, KHÔNG phải hết phiên ->
      // ApiClient không refresh, không logout nhầm (BẮT BUỘC 6).
      const message = e?.message || 'Đăng nhập thất bại, vui lòng thử lại';
      setErrors({ email: message });
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, signIn, t]);

  const handleGoogleLogin = useCallback(async () => {
    setErrors({});
    setIsLoading(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) {
        showError('Không lấy được Google ID Token');
        return;
      }
      await signInWithGoogle(idToken);
      showSuccess(t('home.googleLoginSuccess'));
      // KHÔNG navigation.reset: signInWithGoogle đã set isAuthenticated ->
      // RootNavigator tự đổi sang Onboarding/Main.
    } catch (e) {
      const message = e?.message || 'Đăng nhập Google thất bại';
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }, [signInWithGoogle, t]);

  /**
   * Đăng nhập OFFLINE bằng phiên đã lưu trên máy.
   *
   * Không verify mật khẩu (server offline không check được) - chỉ dùng
   * token/user đã lưu. Đây là cơ chế tương đương Flutter: token còn trong
   * bộ nhớ + lỗi mạng -> vẫn coi là đã đăng nhập.
   */
  const handleOfflineLogin = useCallback(async () => {
    setErrors({});
    setIsLoading(true);
    try {
      const ok = await resumeOfflineSession();
      if (ok) {
        showSuccess(t('offline.loginOfflineSuccess'));
        // KHÔNG navigation.reset: `login()` đã set isAuthenticated ->
        // RootNavigator tự đổi sang Onboarding/Main.
      } else {
        showError(t('offline.loginOfflineUnavailable'));
      }
    } catch (e) {
      showError(e?.message || t('offline.loginOfflineUnavailable'));
    } finally {
      setIsLoading(false);
    }
  }, [resumeOfflineSession, t]);

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top gradient header */}
        <View style={styles.headerWrap}>
          <LinearGradient
            colors={AppGradients.getBackground(isDark).colors}
            locations={AppGradients.getBackground(isDark).locations}
            start={AppGradients.getBackground(isDark).start}
            end={AppGradients.getBackground(isDark).end}
            style={[StyleSheet.absoluteFillObject, { height: topHeaderHeight + 60 }]}
          />
          <View style={[styles.mascotWrap, { top: topPadding + 55, height: topHeaderHeight - 35 }]}>
            <Image
              source={require('../../../../assets/images/mascot_login.png')}
              style={{ width: 260, height: '100%' }}
              resizeMode="contain"
            />
          </View>
          <View style={[styles.topBar, { top: topPadding + 12, left: 16 }]}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
              <ChevronLeft color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={18} />
              <Text style={[styles.brand, { fontSize: sp(26), marginLeft: 4 }]}>
                <Text style={{ color: isDark ? '#FFFFFF' : AppColors.textPrimary }}>Fri</Text>
                <Text style={{ color: isDark ? AppColors.primaryLight : AppColors.primary }}>
                  ggy
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Card bottom */}
        <Animated.View
          style={[
            styles.card,
            {
              marginTop: topHeaderHeight,
              backgroundColor: isDark ? '#0E1611' : '#FFFFFF',
              opacity: cardAnim,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: isDark ? '#FFFFFF' : AppColors.textPrimary,
                fontSize: sp(30),
              },
            ]}
          >
            {t('home.welcome')}
          </Text>

          <View style={{ marginTop: 18 }}>
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
          </View>
          <View style={{ marginTop: 12 }}>
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
          </View>

          <View style={styles.optionsRow}>
            <CustomCheckbox
              checked={remember}
              onChange={() => setRemember(!remember)}
              label={t('home.rememberMe')}
            />
            <Pressable onPress={() => navigation.navigate(Routes.ForgotPassword)}>
              <Text
                style={[
                  styles.forgotText,
                  { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(14) },
                ]}
              >
                {t('home.forgotPassword')}
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 20 }}>
            <CustomButton
              title={t('home.login')}
              onPress={handleLogin}
              loading={isLoading}
              variant="primary"
              height={54}
            />
          </View>

          <View style={{ marginTop: 20 }}>
            <CustomDivider text={t('home.orContinueWith')} />
          </View>

          <View style={{ marginTop: 18 }}>
            <SocialButton type="google" onPress={handleGoogleLogin} />
          </View>

          {/* Đăng nhập offline: chỉ hiện khi máy có phiên đã lưu.
              Đồng thời ưu tiên hiện khi đang offline (lúc đó màn Login
              vô dụng vì server không xác thực được). */}
          {hasSavedSession && (
            <View style={{ marginTop: 18 }}>
              {isOffline && (
                <Text
                  style={[
                    styles.offlineHint,
                    { color: isDark ? AppColors.hintText : '#6B786F', fontSize: sp(12) },
                  ]}
                >
                  {t('offline.loginOfflineHint')}
                </Text>
              )}
              <CustomButton
                title={t('offline.loginOffline')}
                onPress={handleOfflineLogin}
                loading={isLoading}
                variant="outline"
                height={50}
              />
            </View>
          )}

          <View style={styles.footer}>
            <Text
              style={[
                styles.footerText,
                { color: isDark ? AppColors.hintText : '#6B786F', fontSize: sp(14) },
              ]}
            >
              {t('home.noAccount')}
            </Text>
            <Pressable onPress={() => navigation.navigate(Routes.Register)}>
              <Text
                style={[
                  styles.footerLink,
                  { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(14) },
                ]}
              >
                {t('home.register')}
              </Text>
            </Pressable>
          </View>

          <View style={{ height: 60 }} />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    overflow: 'visible',
  },
  mascotWrap: {
    position: 'absolute',
    right: 0,
    width: 260,
  },
  topBar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  brand: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    letterSpacing: -0.5,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  forgotText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  offlineHint: {
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    marginBottom: 10,
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
