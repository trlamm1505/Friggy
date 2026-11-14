/**
 * UserPreferencesScreen
 *
 * Sprint A2 — nối thật với `GET/PATCH /users/me/preferences`.
 *
 * QUYẾT ĐỊNH ĐỔI UI (23/10): thay nhóm chip "Mức cay" bằng "Mức vận động" +
 * "Cách AI tư vấn".
 *
 * Lý do: BE `UpdatePreferencesDto` (`be/src/modules-api/users/dto/users.dto.ts`)
 * KHÔNG có `spiceLevel` — nhập mức cay lên sẽ bị 400. Ngược lại BE có
 * `activityLevel` + `aiPersonalityMode`, mà Flutter đã dùng và gửi lên
 * (`local_user_preference_model.dart:81-95`). Giữ "Mức cay" nghĩa là giữ 1
 * trường không lưu được → giống hệt lỗi "UI đẹp, dữ liệu không lưu".
 *
 * Toàn bộ state bám đúng tên field của `UserPreferenceResponseDto` (13 field),
 * `RealUserService` chịu trách nhiệm map về. Không có state tạm ở đây.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackCircleButton } from '../../components/common/BackCircleButton';
import { CustomButton } from '../../components/common/CustomButton';
import { CustomChip } from '../../components/common/CustomChip';
import { CustomTextField } from '../../components/common/CustomTextField';
import { Stepper } from '../../components/common/Stepper';
import { useServices } from '../../../data/ServiceProvider';
import { showSuccess, showError } from '../../utils/helpers';
import { Wallet, Flame, Clock, Ruler, Scale } from 'lucide-react-native';

/** Giá trị mặc định — chỉ dùng cho lần tải đầu, sau đó ghi đè bằng dữ liệu BE. */
const INITIAL = {
  primaryGoal: 'save_money',
  cookingFrequency: 'daily',
  dietaryStyle: 'omnivore',
  skillLevel: 'beginner',
  activityLevel: 'moderate',
  aiPersonalityMode: 'friendly',
  householdSize: 2,
  weeklyBudget: '',
  dailyCalorieTarget: '',
  maxCookTimeMinutes: '',
  height: '',
  weight: '',
};

export const UserPreferencesScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { userService } = useServices();

  const [prefs, setPrefs] = useState(INITIAL);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const set = useCallback((key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Nạp preferences thật. Lỗi -> giữ INITIAL để màn hình vẫn dùng được.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await userService.getPreferences();
        if (cancelled || !p) return;
        setPrefs({
          primaryGoal: p.primaryGoal ?? INITIAL.primaryGoal,
          cookingFrequency: p.cookingFrequency ?? INITIAL.cookingFrequency,
          dietaryStyle: p.dietaryStyle,
          skillLevel: p.skillLevel,
          activityLevel: p.activityLevel,
          aiPersonalityMode: p.aiPersonalityMode,
          householdSize: p.householdSize ?? INITIAL.householdSize,
          // Ô nhập số hiển thị '' khi BE trả null — tránh hiện "null".
          weeklyBudget: p.weeklyBudget ?? '',
          dailyCalorieTarget: p.dailyCalorieTarget ?? '',
          maxCookTimeMinutes: p.maxCookTimeMinutes ?? '',
          height: p.height ?? '',
          weight: p.weight ?? '',
        });
      } catch (_e) {
        // Offline -> dùng giá trị mặc định, user vẫn chỉnh và lưu lại được.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userService]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await userService.updatePreferences({
        primaryGoal: prefs.primaryGoal,
        cookingFrequency: prefs.cookingFrequency,
        dietaryStyle: prefs.dietaryStyle,
        skillLevel: prefs.skillLevel,
        activityLevel: prefs.activityLevel,
        aiPersonalityMode: prefs.aiPersonalityMode,
        householdSize: Number(prefs.householdSize) || 1,
        weeklyBudget: prefs.weeklyBudget === '' ? null : Number(prefs.weeklyBudget),
        dailyCalorieTarget:
          prefs.dailyCalorieTarget === '' ? null : Number(prefs.dailyCalorieTarget),
        maxCookTimeMinutes:
          prefs.maxCookTimeMinutes === '' ? null : Number(prefs.maxCookTimeMinutes),
        height: prefs.height === '' ? null : Number(prefs.height),
        weight: prefs.weight === '' ? null : Number(prefs.weight),
      });
      showSuccess(t('profile.saveChanges'));
      navigation.goBack();
    } catch (e) {
      showError(e?.message || t('profile.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [userService, prefs, navigation, t]);

  const iconColor = isDark ? AppColors.primaryLight : '#8C9890';

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
          {t('profile.preferences')}
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              fontSize: sp(13),
            },
          ]}
        >
          Tùy chỉnh chế độ ăn để nhận gợi ý phù hợp hơn
        </Text>

        {/* Mục tiêu chính -> `primaryGoal` */}
        <Section label={t('profile.goal')} isDark={isDark}>
          <View style={styles.chipRow}>
            {[
              { value: 'save_money', label: 'Tiết kiệm tiền' },
              { value: 'reduce_waste', label: 'Giảm lãng phí' },
              { value: 'eat_healthy', label: 'Ăn lành mạnh' },
              { value: 'convenience', label: 'Nấu nhanh tiện lợi' },
            ].map((g) => (
              <CustomChip
                key={g.value}
                label={g.label}
                selected={prefs.primaryGoal === g.value}
                onPress={() => set('primaryGoal', g.value)}
              />
            ))}
          </View>
        </Section>

        {/* Tần suất nấu ăn -> `cookingFrequency` (BE bắt buộc khi onboarding) */}
        <Section label={t('profile.cookingFrequency')} isDark={isDark}>
          <View style={styles.chipRow}>
            {[
              { value: 'daily', label: t('profile.freqDaily') },
              { value: 'few_times_week', label: t('profile.freqFewTimesWeek') },
              { value: 'weekends', label: t('profile.freqWeekends') },
              { value: 'rarely', label: t('profile.freqRarely') },
            ].map((f) => (
              <CustomChip
                key={f.value}
                label={f.label}
                selected={prefs.cookingFrequency === f.value}
                onPress={() => set('cookingFrequency', f.value)}
              />
            ))}
          </View>
        </Section>

        {/* Chế độ ăn -> `dietaryStyle`. BE `DietaryStyleEnum` có `omnivore` + `keto`,
            mock cũ có `none` (không tồn tại ở BE) -> đã đổi theo enum BE. */}
        <Section label={t('home.diet')} isDark={isDark}>
          <View style={styles.chipRow}>
            {[
              { value: 'omnivore', label: t('profile.dietOmnivore') },
              { value: 'vegetarian', label: t('profile.vegetarian') },
              { value: 'vegan', label: t('profile.vegan') },
              { value: 'keto', label: t('profile.dietKeto') },
              { value: 'halal', label: t('profile.halal') },
            ].map((d) => (
              <CustomChip
                key={d.value}
                label={d.label}
                selected={prefs.dietaryStyle === d.value}
                onPress={() => set('dietaryStyle', d.value)}
              />
            ))}
          </View>
        </Section>

        {/* Kỹ năng nấu ăn -> `skillLevel` */}
        <Section label={t('profile.cookingSkill')} isDark={isDark}>
          <View style={styles.chipRow}>
            {[
              { value: 'beginner', label: t('profile.skillBeginner') },
              { value: 'intermediate', label: t('profile.skillIntermediate') },
              { value: 'advanced', label: t('profile.skillAdvanced') },
            ].map((c) => (
              <CustomChip
                key={c.value}
                label={c.label}
                selected={prefs.skillLevel === c.value}
                onPress={() => set('skillLevel', c.value)}
              />
            ))}
          </View>
        </Section>

        {/* Mức vận động -> `activityLevel` (THAY cho "Mức cay" — BE không có spiceLevel) */}
        <Section label={t('profile.activityLevel')} isDark={isDark}>
          <View style={styles.chipRow}>
            {[
              { value: 'sedentary', label: t('profile.activitySedentary') },
              { value: 'light', label: t('profile.activityLight') },
              { value: 'moderate', label: t('profile.activityModerate') },
              { value: 'active', label: t('profile.activityActive') },
            ].map((a) => (
              <CustomChip
                key={a.value}
                label={a.label}
                selected={prefs.activityLevel === a.value}
                onPress={() => set('activityLevel', a.value)}
              />
            ))}
          </View>
        </Section>

        {/* Cách AI tư vấn -> `aiPersonalityMode` */}
        <Section label={t('profile.aiPersonalityMode')} isDark={isDark}>
          <View style={styles.chipRow}>
            {[
              { value: 'friendly', label: t('profile.aiFriendly') },
              { value: 'professional', label: t('profile.aiProfessional') },
              { value: 'coach', label: t('profile.aiCoach') },
            ].map((m) => (
              <CustomChip
                key={m.value}
                label={m.label}
                selected={prefs.aiPersonalityMode === m.value}
                onPress={() => set('aiPersonalityMode', m.value)}
              />
            ))}
          </View>
        </Section>

        {/* Số người trong nhà -> `householdSize` */}
        <Section label={t('profile.householdSize')} isDark={isDark}>
          <View style={styles.stepperWrap}>
            <Stepper
              value={prefs.householdSize}
              onChange={(v) => set('householdSize', v)}
              min={1}
              max={12}
            />
          </View>
        </Section>

        {/* Ô nhập số — BE validate Min/Max, gửi sai sẽ bị 400.
            hint ghi rõ để user biết đơn vị (BE không có `@Min` cho weeklyBudget
            ngoài 0, nhưng calorie có `@Min(500)`). */}
        <Section label={t('profile.weeklyBudget')} isDark={isDark}>
          <CustomTextField
            value={prefs.weeklyBudget}
            onChangeText={(v) => set('weeklyBudget', v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder={t('profile.weeklyBudgetHint')}
            prefixIcon={(props) => <Wallet {...props} color={iconColor} size={20} />}
          />
        </Section>

        <Section label={t('profile.dailyCalorieTarget')} isDark={isDark}>
          <CustomTextField
            value={prefs.dailyCalorieTarget}
            onChangeText={(v) => set('dailyCalorieTarget', v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="500 - 10000"
            prefixIcon={(props) => <Flame {...props} color={iconColor} size={20} />}
          />
        </Section>

        <Section label={t('profile.maxCookTime')} isDark={isDark}>
          <CustomTextField
            value={prefs.maxCookTimeMinutes}
            onChangeText={(v) => set('maxCookTimeMinutes', v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="30"
            prefixIcon={(props) => <Clock {...props} color={iconColor} size={20} />}
          />
        </Section>

        <Section label={t('profile.height')} isDark={isDark}>
          <CustomTextField
            value={prefs.height}
            onChangeText={(v) => set('height', v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="170"
            prefixIcon={(props) => <Ruler {...props} color={iconColor} size={20} />}
          />
        </Section>

        <Section label={t('profile.weight')} isDark={isDark}>
          <CustomTextField
            value={prefs.weight}
            onChangeText={(v) => set('weight', v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="65"
            prefixIcon={(props) => <Scale {...props} color={iconColor} size={20} />}
          />
        </Section>

        <View style={{ marginTop: sp(32) }}>
          <CustomButton
            title={t('profile.saveChanges')}
            onPress={handleSave}
            loading={isSaving || isLoading}
          />
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const Section = ({ label, children, isDark }) => (
  <View style={{ marginTop: sp(20) }}>
    <Text
      style={[
        styles.label,
        { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(13) },
      ]}
    >
      {label}
    </Text>
    <View style={{ marginTop: sp(10) }}>{children}</View>
  </View>
);

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
  subtitle: {
    fontFamily: FontFamily.regular,
    marginTop: sp(6),
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: sp(4),
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stepperWrap: {
    alignItems: 'center',
    paddingVertical: sp(4),
  },
});
