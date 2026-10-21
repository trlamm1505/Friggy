/**
 * UserPreferencesScreen
 *
 * Redesigned (Sprint 6):
 * - Dùng Stepper component cho servings
 * - Dùng SettingsSection pattern
 * - i18n đầy đủ
 */

import React, { useState, useCallback } from 'react';
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
import { Stepper } from '../../components/common/Stepper';
import { showSuccess } from '../../utils/helpers';

export const UserPreferencesScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [diet, setDiet] = useState('none');
  const [spice, setSpice] = useState('medium');
  const [goal, setGoal] = useState('balanced');
  const [priority, setPriority] = useState('health');
  const [cookingSkill, setCookingSkill] = useState('beginner');
  const [servings, setServings] = useState(2);

  const handleSave = useCallback(() => {
    showSuccess(t('profile.saveChanges'));
    navigation.goBack();
  }, [navigation, t]);

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
          {t('home.preferences')}
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

        {/* P0.8 (ảnh 13): Mục tiêu chính */}
        <Section label={t('profile.goal')} isDark={isDark}>
          <View style={styles.chipRow}>
            {[
              { value: 'balanced', label: t('profile.goalBalanced') },
              { value: 'lose_weight', label: t('profile.goalLoseWeight') },
              { value: 'gain_muscle', label: t('profile.goalGainMuscle') },
              { value: 'save_time', label: t('profile.goalSaveTime') },
            ].map((g) => (
              <CustomChip
                key={g.value}
                label={g.label}
                selected={goal === g.value}
                onPress={() => setGoal(g.value)}
              />
            ))}
          </View>
        </Section>

        {/* P0.8 (ảnh 13): Tầm quan trọng khi chọn thực phẩm */}
        <Section label={t('profile.priority')} isDark={isDark}>
          <View style={styles.chipRow}>
            {[
              { value: 'health', label: t('profile.priorityHealth') },
              { value: 'taste', label: t('profile.priorityTaste') },
              { value: 'price', label: t('profile.priorityPrice') },
              { value: 'speed', label: t('profile.prioritySpeed') },
            ].map((p) => (
              <CustomChip
                key={p.value}
                label={p.label}
                selected={priority === p.value}
                onPress={() => setPriority(p.value)}
              />
            ))}
          </View>
        </Section>

        {/* Diet section */}
        <Section label={t('home.diet')} isDark={isDark}>
          <View style={styles.chipRow}>
            {[
              { value: 'none', label: t('home.dietNormal') },
              { value: 'vegetarian', label: t('home.dietVegetarian') },
              { value: 'vegan', label: t('home.dietVegan') },
              { value: 'halal', label: t('home.dietHalal') },
            ].map((d) => (
              <CustomChip
                key={d.value}
                label={d.label}
                selected={diet === d.value}
                onPress={() => setDiet(d.value)}
              />
            ))}
          </View>
        </Section>

        {/* Spice section */}
        <Section label={t('home.spice')} isDark={isDark}>
          <View style={styles.chipRow}>
            {[
              { value: 'none', label: t('home.spiceNone') },
              { value: 'mild', label: t('home.spiceMild') },
              { value: 'medium', label: t('home.spiceMedium') },
              { value: 'hot', label: t('home.spiceHot') },
            ].map((s) => (
              <CustomChip
                key={s.value}
                label={s.label}
                selected={spice === s.value}
                onPress={() => setSpice(s.value)}
              />
            ))}
          </View>
        </Section>

        {/* P0.8 (ảnh 13): Kỹ năng nấu ăn */}
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
                selected={cookingSkill === c.value}
                onPress={() => setCookingSkill(c.value)}
              />
            ))}
          </View>
        </Section>

        {/* Servings section */}
        <Section label={t('home.servingsLabel', { count: servings })} isDark={isDark}>
          <View style={styles.stepperWrap}>
            <Stepper value={servings} onChange={setServings} min={1} max={12} />
          </View>
        </Section>

        <View style={{ marginTop: sp(32) }}>
          <CustomButton title={t('profile.saveChanges')} onPress={handleSave} />
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
