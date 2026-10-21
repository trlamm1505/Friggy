/**
 * ChangePasswordScreen
 *
 * Redesigned (Sprint 6):
 * - Header gradient mini với icon
 * - Form layout với prefix icons
 * - Error messages qua i18n
 * - Helper text cho password requirements
 * - Visual feedback khi password match
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackCircleButton } from '../../components/common/BackCircleButton';
import { CustomTextField } from '../../components/common/CustomTextField';
import { CustomButton } from '../../components/common/CustomButton';
import { showSuccess } from '../../utils/helpers';
import { isValidPassword } from '../../utils/validators';
import { Lock, ShieldCheck, KeyRound, Eye, EyeOff } from 'lucide-react-native';

const LockIcon = ({ color = '#8C9890' }) => <Lock color={color} size={20} />;

export const ChangePasswordScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSave = useCallback(() => {
    const e = {};
    if (!current) e.current = t('home.enterCurrentPassword');
    if (!isValidPassword(next)) e.next = t('home.passwordMin');
    if (next !== confirm) e.confirm = t('home.passwordsDoNotMatch');
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    showSuccess(t('home.passwordChanged'));
    navigation.goBack();
  }, [current, next, confirm, t, navigation]);

  // Check password match
  const passwordMatch = useMemo(
    () => next.length > 0 && confirm.length > 0 && next === confirm,
    [next, confirm]
  );
  const passwordMismatch = useMemo(() => confirm.length > 0 && next !== confirm, [next, confirm]);

  const iconColor = isDark ? AppColors.primaryLight : '#8C9890';
  const headerBg = isDark ? ['#19271E', '#1B2E21'] : ['#E8F5E9', '#FFFFFF'];
  const headerIconBg = isDark ? '#233629' : AppColors.accentGreen;
  const headerIconColor = isDark ? AppColors.primaryLight : AppColors.primary;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.container,
        { backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground },
      ]}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + sp(12) }]}>
        <BackCircleButton onPress={() => navigation.goBack()} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header gradient mini */}
        <View style={styles.headerCard}>
          <LinearGradient
            colors={headerBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.headerIconWrap, { backgroundColor: headerIconBg }]}>
            <KeyRound color={headerIconColor} size={32} strokeWidth={2.2} />
          </View>
          <Text
            style={[
              styles.headerTitle,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(20) },
            ]}
          >
            {t('profile.changePassword')}
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              {
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(13),
              },
            ]}
          >
            {t('home.passwordMin')}
          </Text>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            {
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              fontSize: sp(11),
            },
          ]}
        >
          THAY ĐỔI MẬT KHẨU
        </Text>
        <View style={styles.form}>
          <CustomTextField
            label={t('home.currentPassword')}
            value={current}
            onChangeText={setCurrent}
            secureTextEntry={!showCurrent}
            error={errors.current}
            prefixIcon={(props) => <LockIcon color={iconColor} />}
            suffixIcon={
              <Pressable onPress={() => setShowCurrent(!showCurrent)} hitSlop={8}>
                {showCurrent ? (
                  <Eye color={isDark ? AppColors.hintText : AppColors.hintText} size={20} />
                ) : (
                  <EyeOff color={isDark ? AppColors.hintText : AppColors.hintText} size={20} />
                )}
              </Pressable>
            }
          />
          <CustomTextField
            label={t('home.newPassword')}
            value={next}
            onChangeText={setNext}
            secureTextEntry={!showNext}
            error={errors.next}
            prefixIcon={(props) => <LockIcon color={iconColor} />}
            suffixIcon={
              <Pressable onPress={() => setShowNext(!showNext)} hitSlop={8}>
                {showNext ? (
                  <Eye color={isDark ? AppColors.hintText : AppColors.hintText} size={20} />
                ) : (
                  <EyeOff color={isDark ? AppColors.hintText : AppColors.hintText} size={20} />
                )}
              </Pressable>
            }
          />
          <CustomTextField
            label={t('home.confirmNewPassword')}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showConfirm}
            error={errors.confirm}
            prefixIcon={(props) => <LockIcon color={iconColor} />}
            suffixIcon={
              <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                {showConfirm ? (
                  <Eye color={isDark ? AppColors.hintText : AppColors.hintText} size={20} />
                ) : (
                  <EyeOff color={isDark ? AppColors.hintText : AppColors.hintText} size={20} />
                )}
              </Pressable>
            }
          />

          {/* Match feedback */}
          {passwordMatch && (
            <View
              style={[
                styles.matchHint,
                {
                  backgroundColor: isDark ? '#1B3324' : '#E8F5E9',
                  borderColor: isDark ? '#2E4D36' : '#A5D6A7',
                },
              ]}
            >
              <ShieldCheck
                color={isDark ? AppColors.primaryLight : AppColors.primaryDark}
                size={16}
              />
              <Text
                style={[
                  styles.matchHintText,
                  {
                    color: isDark ? AppColors.primaryLight : AppColors.primaryDark,
                    fontSize: sp(12),
                  },
                ]}
              >
                Mật khẩu khớp ✓
              </Text>
            </View>
          )}
          {passwordMismatch && (
            <View
              style={[
                styles.matchHint,
                {
                  backgroundColor: isDark ? '#3D1F1A' : '#FFEBEE',
                  borderColor: isDark ? '#5E352B' : '#FFCDD2',
                },
              ]}
            >
              <Text
                style={[
                  styles.matchHintText,
                  { color: isDark ? '#FF8A80' : '#B71C1C', fontSize: sp(12) },
                ]}
              >
                {t('home.passwordsDoNotMatch')}
              </Text>
            </View>
          )}
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
  topBar: {
    paddingHorizontal: sp(20),
    paddingBottom: sp(8),
  },
  scroll: {
    paddingHorizontal: sp(20),
    paddingTop: sp(8),
  },
  headerCard: {
    borderRadius: sp(20),
    overflow: 'hidden',
    padding: sp(24),
    alignItems: 'center',
    marginTop: sp(8),
    marginBottom: sp(8),
  },
  headerIconWrap: {
    width: sp(72),
    height: sp(72),
    borderRadius: sp(36),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp(12),
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    marginTop: sp(4),
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.8,
    marginTop: sp(20),
    marginBottom: sp(12),
    marginLeft: sp(4),
  },
  form: {
    gap: sp(14),
  },
  matchHint: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp(10),
    borderRadius: sp(10),
    borderWidth: 1,
    gap: sp(6),
  },
  matchHintText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: sp(6),
  },
});
