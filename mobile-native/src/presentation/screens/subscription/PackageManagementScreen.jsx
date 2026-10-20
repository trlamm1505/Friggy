import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { Check, Crown, Users, Sparkles } from 'lucide-react-native';
import { CustomButton } from '../../components/common/CustomButton';
import { showInfo } from '../../utils/helpers';
import packagesMock from '../../../shared/mocks/packages.json';

const formatVND = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

export const PackageManagementScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [period, setPeriod] = useState('monthly');
  const [packages] = useState(packagesMock.packages);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(24) }]}>
          {t('subscription.title')}
        </Text>

        {/* Period switcher */}
        <View style={[styles.periodRow, { backgroundColor: isDark ? '#19271E' : AppColors.accentGreen }]}>
          {['monthly', 'yearly'].map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[
                styles.periodBtn,
                {
                  backgroundColor: period === p ? AppColors.primary : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.periodText,
                  { color: period === p ? '#FFFFFF' : isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) },
                ]}
              >
                {p === 'monthly' ? t('subscription.monthly') : t('subscription.yearly')}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Current plan */}
        <View style={[styles.currentCard, { backgroundColor: isDark ? '#1E3A25' : AppColors.accentGreen, borderColor: AppColors.primary }]}>
          <View style={styles.currentHeader}>
            <Sparkles color={AppColors.primary} size={18} />
            <Text style={[styles.currentLabel, { color: isDark ? AppColors.primaryLight : AppColors.forestAccent, fontSize: sp(13) }]}>
              {t('subscription.currentPlan')}
            </Text>
          </View>
          <Text style={[styles.currentPlan, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(18) }]}>
            {t('subscription.free')}
          </Text>
        </View>

        {/* Package cards */}
        {packages.map((pkg) => {
          const isFamily = pkg.name.toLowerCase().includes('gia đình') || pkg.name.toLowerCase().includes('family');
          const Icon = isFamily ? Users : Crown;
          return (
            <View
              key={pkg.id}
              style={[
                styles.pkgCard,
                {
                  backgroundColor: isDark ? '#19271E' : '#FFFFFF',
                  borderColor: isFamily ? AppColors.primary : isDark ? '#2E4D36' : '#A5E69C',
                  borderWidth: isFamily ? 2 : 1,
                },
              ]}
            >
              <View style={styles.pkgHeader}>
                <View style={[styles.pkgIcon, { backgroundColor: isFamily ? AppColors.primary : '#F5B025' }]}>
                  <Icon color="#FFFFFF" size={20} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.pkgName, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(17) }]}>
                    {pkg.name}
                  </Text>
                  <Text style={[styles.pkgPrice, { color: AppColors.primary, fontSize: sp(20) }]}>
                    {formatVND(pkg.price)}
                    <Text style={[styles.pkgUnit, { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(13) }]}>
                      {pkg.period === 'monthly' ? t('subscription.perMonth') : t('subscription.perYear')}
                    </Text>
                  </Text>
                </View>
                {isFamily ? (
                  <View style={styles.recommendBadge}>
                    <Text style={styles.recommendText}>Đề xuất</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.featuresList}>
                {pkg.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Check color={AppColors.primary} size={16} />
                    <Text style={[styles.featureText, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) }]}>
                      {f}
                    </Text>
                  </View>
                ))}
              </View>
              <CustomButton
                title={t('subscription.subscribeNow')}
                onPress={() => showInfo('Mở flow thanh toán')}
                variant={isFamily ? 'primary' : 'outline'}
              />
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  periodRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 24,
    marginTop: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  periodText: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  currentCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  currentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentLabel: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: 6,
  },
  currentPlan: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginTop: 6,
  },
  pkgCard: {
    padding: 16,
    borderRadius: 18,
    marginTop: 16,
  },
  pkgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pkgIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pkgName: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  pkgPrice: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginTop: 4,
  },
  pkgUnit: {
    fontFamily: FontFamily.regular,
  },
  recommendBadge: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recommendText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: 10,
  },
  featuresList: {
    marginTop: 12,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    fontFamily: FontFamily.regular,
    marginLeft: 8,
  },
});
