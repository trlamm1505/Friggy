import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { CustomTextField } from '../../components/common/CustomTextField';
import { CustomButton } from '../../components/common/CustomButton';
import { CustomChip } from '../../components/common/CustomChip';
import { showSuccess } from '../../utils/helpers';

const CATEGORIES = [
  { value: 'vegetable', label: 'Rau củ' },
  { value: 'meat', label: 'Thịt' },
  { value: 'dairy', label: 'Sữa & Trứng' },
  { value: 'fruit', label: 'Trái cây' },
  { value: 'seafood', label: 'Hải sản' },
];

const UNITS = ['quả', 'kg', 'g', 'hộp', 'chai', 'bó', 'củ'];

export const ManualAddIngredientScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('vegetable');
  const [unit, setUnit] = useState('quả');
  const [quantity, setQuantity] = useState('1');
  const [expiry, setExpiry] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      return;
    }
    showSuccess('Đã thêm nguyên liệu');
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: isDark ? '#0E1611' : AppColors.accentGreen }]}
    >
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(24) }]}>
          {t('fridge.addIngredient')}
        </Text>

        <View style={{ marginTop: 20 }}>
          <CustomTextField
            label={t('scan.ingredientName')}
            value={name}
            onChangeText={setName}
            placeholder="Cà chua"
          />
        </View>

        <Text style={[styles.label, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(14) }]}>
          Loại
        </Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <CustomChip
              key={c.value}
              label={c.label}
              selected={category === c.value}
              onPress={() => setCategory(c.value)}
            />
          ))}
        </View>

        <View style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <CustomTextField
              label={t('scan.quantity')}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="1"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(14) }]}>
              {t('scan.unit')}
            </Text>
            <View style={[styles.unitSelect, { backgroundColor: isDark ? '#19271E' : '#F2F5F3', borderColor: isDark ? '#2E4D36' : 'transparent' }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {UNITS.map((u) => (
                  <Pressable
                    key={u}
                    onPress={() => setUnit(u)}
                    style={[
                      styles.unitChip,
                      { backgroundColor: unit === u ? AppColors.primary : 'transparent' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitText,
                        { color: unit === u ? '#FFFFFF' : isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) },
                      ]}
                    >
                      {u}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <CustomTextField
            label={t('scan.expiryDate')}
            value={expiry}
            onChangeText={setExpiry}
            placeholder="DD/MM/YYYY"
          />
        </View>

        <View style={{ marginTop: 24 }}>
          <CustomButton title={t('scan.save')} onPress={handleSave} />
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    letterSpacing: -0.5,
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  unitSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 50,
    borderWidth: 1,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 4,
  },
  unitText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
});
