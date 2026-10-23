/**
 * OnboardingSurveyScreen
 *
 * Redesigned (Sprint 7):
 * - ProgressBar component (linear, có label "Bước X/Y" + %)
 * - Animated entry: slide in cho mỗi step
 * - i18n đầy đủ (4 steps: diet, spice, allergies, family size)
 * - Step 3 multi-select (allergies) thay vì single
 * - Skip button cuối
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../shared/stores/useAuthStore';
import { useServices } from '../../../data/ServiceProvider';
import { showSuccess } from '../../utils/helpers';
import { Check, Search, Ruler, Scale } from 'lucide-react-native';
import { ProgressBar } from '../../components/common/ProgressBar';
import { CustomButton } from '../../components/common/CustomButton';
import { CustomTextField } from '../../components/common/CustomTextField';

/**
 * 5 bước onboarding — KHỚP Flutter `Mobile/lib/screens/onboarding_survey_screen.dart`
 * (sprint A2, fix 23/10). Trước đây RN chỉ có 4 bước và THIẾU 4 field:
 *   - `primaryGoal`   — bị gán cứng `save_money` (bước 1 của Flutter)
 *   - `activityLevel`  — không có trong UI lẫn payload (bước 3b của Flutter)
 *   - `height`/`weight`— không có trong UI lẫn payload (bước 5 của Flutter)
 * Cả 4 field này BE `OnboardingDto` ĐÃ hỗ trợ → lỗi thuần UI, không phải lỗi service.
 *
 * Bước 4 (dị ứng) đổi từ chip tĩnh sang quick-tag + Ô TÌM KIẾM, theo Flutter:
 *   - 8 nguyên liệu phổ biến hardcode TÊN tiếng Việt (không có ID sẵn)
 *   - `ingredientId` được RESOLVE RUNTIME bằng `searchIngredients()` trỏ
 *     `GET /ingredients` — giống hệt Flutter (`_toggleQuickTag`,
 *     `onboarding_survey_screen.dart:94-127`).
 *   - Vì sao không hardcode ID như bản RN cũ: ID trong catalog BE có thể đổi
 *     theo seed/migration, hardcode sẽ âm thầm ghi sai dị ứng cho user.
 *
 * Đối chiếu `be/src/modules-api/users/dto/users.dto.ts`:
 *  - `dietaryStyle`: enum `omnivore|vegetarian|vegan|keto|halal`
 *  - `householdSize`: số nguyên, BE `@IsInt() @Min(1) @Max(20)`
 *  - `height`: `@IsInt() @Min(50) @Max(250)` (cm)
 *  - `weight`: `@IsInt() @Min(10) @Max(500)` (kg)
 */
/**
 * 5 bước onboarding.
 *
 * `custom` = render riêng (không dùng `options` chung).
 * Không còn `multi` — bước 4 dùng cơ chế riêng (`toggleQuickTag` / `addIngredient`)
 * vì `ingredientId` phải resolve runtime từ catalog BE.
 */
const STEPS = [
  {
    titleKey: 'home.onboardingStep1Title',
    key: 'primaryGoal',
    options: [
      { value: 'save_money', labelKey: 'profile.goalSaveMoney' },
      { value: 'reduce_waste', labelKey: 'profile.goalReduceWaste' },
      { value: 'eat_healthy', labelKey: 'profile.goalEatHealthy' },
      { value: 'convenience', labelKey: 'profile.goalConvenience' },
    ],
  },
  {
    titleKey: 'home.onboardingStep2Title',
    key: 'cookingFrequency',
    options: [
      { value: 'daily', labelKey: 'profile.freqDaily' },
      { value: 'few_times_week', labelKey: 'profile.freqFewTimesWeek' },
      { value: 'weekends', labelKey: 'profile.freqWeekends' },
      { value: 'rarely', labelKey: 'profile.freqRarely' },
    ],
  },
  {
    titleKey: 'home.onboardingStep3Title',
    key: 'dietaryStyle',
    options: [
      { value: 'omnivore', labelKey: 'profile.dietOmnivore' },
      { value: 'vegetarian', labelKey: 'profile.vegetarian' },
      { value: 'vegan', labelKey: 'profile.vegan' },
      { value: 'keto', labelKey: 'profile.dietKeto' },
      { value: 'halal', labelKey: 'profile.halal' },
    ],
  },
  {
    titleKey: 'home.onboardingStep4Title',
    key: 'allergies',
    custom: 'allergies',
  },
  {
    titleKey: 'home.onboardingStep5Title',
    key: 'health',
    custom: 'health',
  },
];

/**
 * 8 nguyên liệu dị ứng phổ biến — theo Flutter `onboarding_survey_screen.dart:799-808`.
 *
 * CHỈ CÓ TÊN, KHÔNG CÓ `ingredientId` — giống Flutter. ID sẽ resolve runtime qua
 * `searchIngredients()`. Đừng thêm ID tĩnh ở đây: nếu catalog BE đổi, ta sẽ
 * ghi dị ứng sai mà không có lỗi nào báo ra.
 */
const COMMON_ALLERGENS = ['Tôm', 'Cua', 'Trứng', 'Sữa', 'Đậu phộng', 'Cá', 'Thịt bò', 'Đậu nành'];

export const OnboardingSurveyScreen = () => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { completeOnboarding } = useAuthStore();
  const { userService } = useServices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    primaryGoal: '',
    cookingFrequency: '',
    dietaryStyle: '',
    householdSize: '2',
    // Mảng `{ id, name }` — id là `ingredientId` thật từ catalog BE.
    allergies: [],
    height: '170',
    weight: '65',
    activityLevel: 'moderate',
  });

  // Ô tìm kiếm nguyên liệu ở bước 4.
  const [ingredientQuery, setIngredientQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef(null);

  const current = STEPS[step];

  const iconColor = isDark ? AppColors.primaryLight : '#8C9890';

  // Slide animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    slideAnim.setValue(40);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [step, slideAnim]);

  /**
   * Chọn 1 đáp án cho bước single-choice (1, 2, 3).
   *
   * Bước 4 (dị ứng) KHÔNG dùng hàm này — nó là multi-select với `ingredientId`
   * resolve runtime, nên đi qua `toggleQuickTag` / `addIngredient` riêng.
   */
  const handleSelect = useCallback(
    (value) => {
      setAnswers((prev) => ({ ...prev, [current.key]: value }));
    },
    [current]
  );

  const canProceed = useMemo(() => {
    const a = answers;
    switch (current.key) {
      // Bước 1 + 2: BE `OnboardingDto` BẮT BUỘC 2 field này (không @IsOptional).
      case 'primaryGoal':
      case 'cookingFrequency':
        return !!a[current.key];
      // Bước 4 (dị ứng): TÙY CHỌN — bỏ trống vẫn qua được (Flutter cũng vậy).
      case 'allergies':
        return true;
      // Bước 5: tùy chọn, nhưng nhập sai giá trị sẽ bị BE 400 -> chặn tại chỗ.
      case 'health': {
        const h = Number(a.height);
        const w = Number(a.weight);
        const heightOk = !a.height || (Number.isInteger(h) && h >= 50 && h <= 250);
        const weightOk = !a.weight || (Number.isInteger(w) && w >= 10 && w <= 500);
        return heightOk && weightOk;
      }
      default:
        return true;
    }
  }, [current, answers]);

  /**
   * Tìm nguyên liệu theo tên (debounce 300ms) — giống Flutter
   * `_onAllergySearchChanged` (`onboarding_survey_screen.dart:66-76`).
   */
  const onSearchChange = useCallback(
    (text) => {
      setIngredientQuery(text);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (!text.trim()) {
        setSearchResults([]);
        return;
      }
      searchTimer.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const items = await userService.searchIngredients(text.trim(), 15);
          setSearchResults(Array.isArray(items) ? items : []);
        } catch (_e) {
          // Offline -> không có gợi ý, nhưng quick-tag vẫn dùng được.
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [userService]
  );

  // Dọn timer khi rời màn để tránh setState sau unmount.
  useEffect(() => () => searchTimer.current && clearTimeout(searchTimer.current), []);

  const addIngredient = useCallback((id, name) => {
    setAnswers((prev) => {
      if (prev.allergies.some((x) => x.id === Number(id))) return prev;
      return { ...prev, allergies: [...prev.allergies, { id: Number(id), name }] };
    });
  }, []);

  /**
   * Resolve tên nguyên liệu phổ biến -> `ingredientId` thật.
   *
   * 2 tầng, y hệt Flutter `_toggleQuickTag` (`onboarding_survey_screen.dart:94-127`):
   *   1. `searchIngredients()` với tên đầy đủ ("Tôm")
   *   2. Không có -> thử với tên rút gọn ("Cá" -> "cá") rồi báo lỗi nhẹ
   *
   * Vì sao KHÔNG hardcode ID: catalog BE đổi theo seed/migration. Hardcode sẽ
   * ghi dị ứng SAI mà không có lỗi nào báo ra — kiểu bug âm thầm tệ nhất.
   */
  const toggleQuickTag = useCallback(
    async (name) => {
      const already = answers.allergies.find((x) => x.name === name);
      if (already) {
        setAnswers((prev) => ({
          ...prev,
          allergies: prev.allergies.filter((x) => x.id !== already.id),
        }));
        return;
      }
      try {
        const items = await userService.searchIngredients(name, 5);
        if (Array.isArray(items) && items.length > 0) {
          addIngredient(items[0].id, items[0].name);
        } else {
          // Tên quick-tag không có trong catalog -> bỏ qua, không chặn luồng.
        }
      } catch (_e) {
        // Offline -> user vẫn có thể dùng ô tìm kiếm ở dưới.
      }
    },
    [answers.allergies, userService, addIngredient]
  );

  /**
   * Gửi onboarding thật về BE.
   *
   * Thứ tự 2 call — theo Flutter `onboarding_survey_screen.dart:176-186`:
   *   1. POST /users/me/onboarding  (bắt buộc primaryGoal + cookingFrequency)
   *   2. POST /users/me/allergies   (từng cái một; 1 cái lỗi KHÔNG được chặn luồng)
   *
   * Vì sao vẫn `completeOnboarding()` dù API lỗi: Flutter làm đúng vậy
   * (`onboarding_survey_screen.dart:219-225` → fallback sang Home). Kẹt người
   * dùng ở onboarding vì mất mạng là trải nghiệm tệ hơn là vào Home và tự sửa
   * lại sau ở màn Tùy chọn.
   */
  const submitToBackend = useCallback(async () => {
    // Parse số nguyên: BE `@IsInt()` — gửi "170.5" sẽ 400.
    const parseIntOrUndef = (v) => {
      if (v === '' || v === null || v === undefined) return undefined;
      const n = Number(v);
      return Number.isInteger(n) ? n : undefined;
    };

    await userService.submitOnboarding({
      // Bắt buộc theo BE `OnboardingDto`.
      primaryGoal: answers.primaryGoal || 'save_money',
      cookingFrequency: answers.cookingFrequency || 'daily',
      // Optional — chỉ gửi khi có thật (RealUserService tự omit null/undefined).
      dietaryStyle: answers.dietaryStyle || undefined,
      activityLevel: answers.activityLevel || undefined,
      householdSize: Number(answers.householdSize) || 1,
      height: parseIntOrUndef(answers.height),
      weight: parseIntOrUndef(answers.weight),
    });

    // Mỗi allergy một lần gọi — lỗi 1 cái bỏ qua, không rollback cả danh sách.
    for (const item of answers.allergies) {
      try {
        await userService.addAllergy(item.id);
      } catch (_e) {
        // Bỏ qua: trùng (400) hoặc mạng lỗi, các cái còn lại vẫn phải lưu.
      }
    }
  }, [userService, answers]);

  const handleNext = useCallback(async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitToBackend();
      showSuccess(t('home.onboardingComplete'));
    } catch (_e) {
      // Offline / BE lỗi -> vẫn coi như xong ở client, vào Home (không kẹt user).
    } finally {
      setIsSubmitting(false);
      // Không gọi navigation.reset({ routes: [{ name: 'MainFlow' }] }).
      // completeOnboarding() set isOnboarded trong useAuthStore ->
      // RootNavigator re-render, thay OnboardingFlow bằng MainFlow.
      // Reset thủ công sẽ dispatch vào stack đã bị thay -> warning
      //   "The action 'RESET' ... was not handled by any navigator"
      completeOnboarding();
    }
  }, [step, submitToBackend, completeOnboarding, t]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  const handleSkip = useCallback(() => {
    completeOnboarding();
    // Xem handleNext — không reset thủ công, RootNavigator tự chuyển flow.
  }, [completeOnboarding]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <LinearGradient
        colors={isDark ? ['#0E1611', '#142017', '#1B2E21'] : ['#FFFFFF', '#F5FCF4', '#C7EFC2']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Top bar with skip */}
      <View style={[styles.topBar, { paddingTop: insets.top + sp(12) }]}>
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
        >
          <Text
            style={[
              styles.topBarText,
              {
                color:
                  step > 0
                    ? isDark
                      ? AppColors.primaryLight
                      : AppColors.primary
                    : isDark
                      ? AppColors.darkTextSecondary
                      : AppColors.textSecondary,
                fontSize: sp(14),
              },
            ]}
          >
            {t('home.onboardingBack')}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSkip}
          hitSlop={8}
          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
        >
          <Text
            style={[
              styles.topBarText,
              {
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(14),
              },
            ]}
          >
            {t('home.onboardingSkip')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress bar */}
        <ProgressBar
          current={step}
          total={STEPS.length}
          showLabels
          style={{ marginBottom: sp(32) }}
        />

        {/* Animated content */}
        <Animated.View
          style={{
            transform: [{ translateX: slideAnim }],
            opacity: slideAnim.interpolate({ inputRange: [0, 40], outputRange: [1, 0.3] }),
          }}
        >
          <Text
            style={[
              styles.title,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(26) },
            ]}
          >
            {t(current.titleKey)}
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
            {current.key === 'allergies'
              ? `${t('home.onboardingSelectMany')} · ${t('home.onboardingOptional')}`
              : current.key === 'health'
                ? t('home.onboardingOptional')
                : t('home.onboardingSelectOne')}
          </Text>

          <View style={{ marginTop: 24 }}>
            {/* ─── Bước 4: dị ứng — quick-tag + ô tìm kiếm ─── */}
            {current.key === 'allergies' ? (
              <View>
                {/* Quick-tag 8 nguyên liệu phổ biến — ID resolve runtime. */}
                <View style={styles.tagRow}>
                  {COMMON_ALLERGENS.map((name) => {
                    const selected = answers.allergies.some((x) => x.name === name);
                    return (
                      <Pressable
                        key={name}
                        onPress={() => toggleQuickTag(name)}
                        style={({ pressed }) => [
                          styles.tag,
                          {
                            backgroundColor: selected
                              ? AppColors.primary
                              : isDark
                                ? '#19271E'
                                : '#F2F5F3',
                            borderColor: selected
                              ? AppColors.primary
                              : isDark
                                ? '#2E4D36'
                                : '#E3E8E4',
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selected
                              ? '#FFFFFF'
                              : isDark
                                ? '#FFFFFF'
                                : AppColors.textPrimary,
                            fontSize: sp(13),
                            fontFamily: FontFamily.semibold,
                            fontWeight: FontWeights.semibold,
                          }}
                        >
                          {name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Danh sách đã chọn */}
                {answers.allergies.length > 0 ? (
                  <View style={{ marginTop: sp(16) }}>
                    <Text
                      style={{
                        color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                        fontSize: sp(13),
                        fontFamily: FontFamily.semibold,
                        fontWeight: FontWeights.semibold,
                      }}
                    >
                      {t('home.onboardingSelectedList', { count: answers.allergies.length })}
                    </Text>
                    <View style={styles.tagRow}>
                      {answers.allergies.map((item) => (
                        <Pressable
                          key={item.id}
                          onPress={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              allergies: prev.allergies.filter((x) => x.id !== item.id),
                            }))
                          }
                          style={[
                            styles.tag,
                            { backgroundColor: '#FFD32F2F', borderColor: '#FFD32F2F' },
                          ]}
                        >
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: sp(13),
                              fontFamily: FontFamily.semibold,
                              fontWeight: FontWeights.semibold,
                            }}
                          >
                            {item.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <Text
                    style={{
                      marginTop: sp(16),
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      fontSize: sp(13),
                    }}
                  >
                    {t('home.onboardingNoAllergy')}
                  </Text>
                )}

                {/* Ô tìm nguyên liệu khác */}
                <View style={{ marginTop: sp(16) }}>
                  <CustomTextField
                    value={ingredientQuery}
                    onChangeText={onSearchChange}
                    placeholder={t('home.onboardingSearchIngredient')}
                    prefixIcon={(props) => <Search {...props} color={iconColor} size={20} />}
                  />
                  {isSearching ? (
                    <Text
                      style={{
                        marginTop: sp(8),
                        fontSize: sp(12),
                        color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      }}
                    >
                      ...
                    </Text>
                  ) : null}
                  {searchResults.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        addIngredient(item.id, item.name);
                        setIngredientQuery('');
                        setSearchResults([]);
                      }}
                      style={({ pressed }) => [
                        styles.option,
                        {
                          marginTop: sp(8),
                          backgroundColor: isDark ? '#19271E' : '#F2F5F3',
                          borderColor: isDark ? '#2E4D36' : '#E3E8E4',
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : /* ─── Bước 5: chiều cao / cân nặng ─── */ current.key === 'health' ? (
              <View>
                <SectionLabel isDark={isDark} label={t('home.onboardingHeight')} />
                <CustomTextField
                  value={answers.height}
                  onChangeText={(v) =>
                    setAnswers((p) => ({ ...p, height: v.replace(/[^0-9]/g, '') }))
                  }
                  keyboardType="number-pad"
                  prefixIcon={(props) => <Ruler {...props} color={iconColor} size={20} />}
                />
                <View style={{ height: sp(12) }} />
                <SectionLabel isDark={isDark} label={t('home.onboardingWeight')} />
                <CustomTextField
                  value={answers.weight}
                  onChangeText={(v) =>
                    setAnswers((p) => ({ ...p, weight: v.replace(/[^0-9]/g, '') }))
                  }
                  keyboardType="number-pad"
                  prefixIcon={(props) => <Scale {...props} color={iconColor} size={20} />}
                />
              </View>
            ) : (
              /* ─── Bước 1-3: chọn 1 đáp án ─── */ current.options.map((opt) => {
                const selected = answers[current.key] === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleSelect(opt.value)}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor: selected
                          ? isDark
                            ? '#1E3A25'
                            : AppColors.accentGreen
                          : isDark
                            ? '#19271E'
                            : '#F2F5F3',
                        borderColor: selected ? AppColors.primary : isDark ? '#2E4D36' : '#E3E8E4',
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) },
                      ]}
                    >
                      {t(opt.labelKey, { defaultValue: opt.labelKey })}
                    </Text>
                    {selected ? (
                      <View style={[styles.checkBadge, { backgroundColor: AppColors.primary }]}>
                        <Check color="#FFFFFF" size={14} strokeWidth={3} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <CustomButton
          title={step === STEPS.length - 1 ? t('home.onboardingFinish') : t('home.onboardingNext')}
          onPress={handleNext}
          disabled={!canProceed}
          loading={isSubmitting}
          height={52}
        />
      </View>
    </View>
  );
};

const SectionLabel = ({ label, isDark }) => (
  <Text
    style={{
      marginBottom: sp(8),
      marginLeft: sp(4),
      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
      fontSize: sp(13),
      fontFamily: FontFamily.semibold,
      fontWeight: FontWeights.semibold,
    }}
  >
    {label}
  </Text>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50, // override bằng insets.top ở inline style
    paddingBottom: 12,
  },
  topBarText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  optionText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp(8),
  },
  tag: {
    paddingHorizontal: sp(14),
    paddingVertical: sp(8),
    borderRadius: 20,
    borderWidth: 1.5,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
});
