import React from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Camera, Receipt, Barcode, Edit3, X } from 'lucide-react-native';

export const SelectInputMethodScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();

  const METHODS = [
    {
      id: 'manual',
      label: t('scan.manualAdd'),
      desc: 'Nhập thủ công từng nguyên liệu',
      icon: Edit3,
      color: '#FF9800',
      target: 'ManualAddIngredient',
    },
    {
      id: 'scan_photo',
      label: t('scan.scanFood'),
      desc: 'Chụp ảnh thực phẩm để AI nhận diện',
      icon: Camera,
      color: '#4CAF50',
      target: 'ScanFoodPhoto',
    },
    {
      id: 'scan_receipt',
      label: t('scan.scanReceipt'),
      desc: 'Quét hóa đơn siêu thị',
      icon: Receipt,
      color: '#2196F3',
      target: 'ScanReceipt',
    },
    {
      id: 'scan_barcode',
      label: t('scan.scanBarcode'),
      desc: 'Quét mã vạch sản phẩm',
      icon: Barcode,
      color: '#9C27B0',
      target: 'ScanBarcode',
    },
  ];

  return (
    <View style={styles.overlay}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.5)" />
      <Pressable style={styles.backdrop} onPress={() => navigation.goBack()} />
      <View style={[styles.sheet, { backgroundColor: isDark ? '#16231A' : '#FFFFFF' }]}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(18) }]}>
            {t('scan.selectMethod')}
          </Text>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <X color={isDark ? AppColors.darkTextSecondary : AppColors.hintText} size={22} />
          </Pressable>
        </View>

        {METHODS.map((m) => {
          const Icon = m.icon;
          return (
            <Pressable
              key={m.id}
              onPress={() => {
                navigation.replace(m.target);
              }}
              style={({ pressed }) => [
                styles.methodRow,
                {
                  backgroundColor: isDark ? '#19271E' : '#F4F7F4',
                  borderColor: isDark ? '#2E4D36' : 'transparent',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: m.color + '22' }]}>
                <Icon color={m.color} size={24} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.methodLabel, { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) }]}>
                  {m.label}
                </Text>
                <Text style={[styles.methodDesc, { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(12) }]}>
                  {m.desc}
                </Text>
              </View>
            </Pressable>
          );
        })}
        <View style={{ height: 24 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9DA8A0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  methodDesc: {
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
});
