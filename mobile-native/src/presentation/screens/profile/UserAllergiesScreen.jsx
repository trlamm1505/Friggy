/**
 * UserAllergiesScreen
 *
 * Redesigned (Sprint 6):
 * - Severity badge có 3 mức (low/medium/high) với màu sắc riêng
 * - Tap to expand/collapse severity picker
 * - i18n đầy đủ
 * - Empty state dùng EmptyState component
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackCircleButton } from '../../components/common/BackCircleButton';
import { Plus, X } from 'lucide-react-native';
import allergiesMock from '../../../shared/mocks/allergies.json';
import { showInfo } from '../../utils/helpers';
import { EmptyState } from '../../components/common/EmptyState';

const SEVERITY_COLORS = {
  low: { bg: '#E8F5E9', fg: '#1B5E20', darkBg: '#1B3324', darkFg: AppColors.primaryLight },
  medium: { bg: '#FFF3E0', fg: '#E65100', darkBg: '#3D2E1A', darkFg: '#FFB74D' },
  high: { bg: '#FFEBEE', fg: '#B71C1C', darkBg: '#3D1F1A', darkFg: '#FF8A80' },
};

const SEVERITY_LABELS = {
  low: 'home.severityLow',
  medium: 'home.severityMedium',
  high: 'home.severityHigh',
};

const SeverityBadge = ({ severity, isDark }) => {
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;
  return (
    <View style={[styles.severityBadge, { backgroundColor: isDark ? color.darkBg : color.bg }]}>
      <View style={[styles.severityDot, { backgroundColor: isDark ? color.darkFg : color.fg }]} />
    </View>
  );
};

export const UserAllergiesScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [allergies, setAllergies] = useState(allergiesMock.allergies);

  const remove = useCallback(
    (id) => {
      Alert.alert(t('home.removeAllergy'), t('home.removeMemberConfirm'), [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.removeAllergy'),
          style: 'destructive',
          onPress: () => setAllergies(allergies.filter((a) => a.id !== id)),
        },
      ]);
    },
    [allergies, t]
  );

  const cycleSeverity = useCallback(
    (id) => {
      setAllergies(
        allergies.map((a) => {
          if (a.id !== id) return a;
          const order = ['low', 'medium', 'high'];
          const idx = order.indexOf(a.severity);
          return { ...a, severity: order[(idx + 1) % order.length] };
        })
      );
    },
    [allergies]
  );

  const add = useCallback(() => {
    showInfo('Mở dialog thêm dị ứng (mock)');
    setAllergies([
      ...allergies,
      { id: String(Date.now()), name: `Dị ứng mới ${allergies.length + 1}`, severity: 'medium' },
    ]);
  }, [allergies]);

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
          {t('home.allergiesTitle')}
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
          {t('home.allergiesSubtitle')}
        </Text>

        {allergies.length === 0 ? (
          <View style={{ marginTop: sp(40) }}>
            <EmptyState
              emoji="🤧"
              title={t('home.noAllergies')}
              hint={t('home.noAllergiesHint')}
              actionText={t('home.addAllergy')}
              onAction={add}
            />
          </View>
        ) : (
          <View style={{ marginTop: sp(20) }}>
            {allergies.map((a) => {
              const color = SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.medium;
              return (
                <View
                  key={a.id}
                  style={[
                    styles.row,
                    {
                      backgroundColor: isDark ? '#19271E' : '#F4F7F4',
                      borderColor: isDark ? '#2E4D36' : 'transparent',
                      borderLeftColor: isDark ? color.darkFg : color.fg,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => cycleSeverity(a.id)}
                    style={styles.severityTap}
                    hitSlop={4}
                  >
                    <SeverityBadge severity={a.severity} isDark={isDark} />
                  </Pressable>
                  <View style={{ flex: 1, marginLeft: sp(10) }}>
                    <Text
                      style={[
                        styles.name,
                        { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) },
                      ]}
                      numberOfLines={1}
                    >
                      {a.name}
                    </Text>
                    <Text
                      style={[
                        styles.severityLabel,
                        {
                          color: isDark ? color.darkFg : color.fg,
                          fontSize: sp(11),
                        },
                      ]}
                    >
                      {t('home.severity')}: {t(SEVERITY_LABELS[a.severity])}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => remove(a.id)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <X
                      color={isDark ? AppColors.darkTextSecondary : AppColors.hintText}
                      size={18}
                    />
                  </Pressable>
                </View>
              );
            })}

            {/* Add button */}
            <Pressable
              onPress={add}
              style={({ pressed }) => [
                styles.addBtn,
                {
                  backgroundColor: isDark ? '#19271E' : '#E8F5E9',
                  borderColor: isDark ? '#2E4D36' : '#A5E69C',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Plus color={isDark ? AppColors.primaryLight : AppColors.forestAccent} size={20} />
              <Text
                style={[
                  styles.addText,
                  {
                    color: isDark ? AppColors.primaryLight : AppColors.forestAccent,
                    fontSize: sp(14),
                  },
                ]}
              >
                {t('home.addAllergy')}
              </Text>
            </Pressable>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
      {/* P0.8: FAB nút + nổi góc phải dưới (ảnh 6) */}
      <Pressable
        onPress={add}
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: insets.bottom + sp(24),
            backgroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Plus color="#FFFFFF" size={26} strokeWidth={2.6} />
      </Pressable>
    </View>
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
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    marginTop: sp(6),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp(14),
    borderRadius: sp(12),
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: sp(10),
  },
  severityTap: {
    padding: sp(2),
  },
  severityBadge: {
    width: sp(28),
    height: sp(28),
    borderRadius: sp(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityDot: {
    width: sp(10),
    height: sp(10),
    borderRadius: sp(5),
  },
  name: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  severityLabel: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginTop: sp(2),
  },
  removeBtn: {
    width: sp(32),
    height: sp(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp(14),
    borderRadius: sp(12),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: sp(4),
  },
  addText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: sp(8),
  },
  fab: {
    position: 'absolute',
    right: sp(20),
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
