import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Barcode, Zap, ZapOff } from 'lucide-react-native';
import { CustomButton } from '../../components/common/CustomButton';

export const ScanBarcodeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const handleStartScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      Alert.alert(t('scan.processing'), 'Đã quét được sản phẩm: Sữa tươi Vinamilk 1L', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.iconBtn}>
          <ChevronLeft color="#FFFFFF" size={24} />
        </Pressable>
        <Text style={styles.topTitle}>{t('scan.scanBarcode')}</Text>
        <Pressable onPress={() => setTorchOn(!torchOn)} hitSlop={8} style={styles.iconBtn}>
          {torchOn ? (
            <Zap color="#FFD700" size={22} fill="#FFD700" />
          ) : (
            <ZapOff color="#FFFFFF" size={22} />
          )}
        </Pressable>
      </View>

      <View style={styles.scanArea}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          {scanning ? (
            <View style={styles.scanLine} />
          ) : (
            <View style={styles.placeholder}>
              <Barcode color="rgba(255,255,255,0.5)" size={64} />
            </View>
          )}
        </View>
        <Text style={styles.hint}>Đặt mã vạch vào khung hình chữ nhật</Text>
      </View>

      <View style={styles.bottom}>
        {scanning ? (
          <View style={[styles.statusBadge, { backgroundColor: AppColors.primary }]}>
            <Text style={styles.statusText}>Đang quét...</Text>
          </View>
        ) : (
          <CustomButton title="Bắt đầu quét" onPress={handleStartScan} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: 16,
  },
  scanArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  frame: {
    width: '100%',
    aspectRatio: 1.5,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: AppColors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '50%',
    height: 2,
    backgroundColor: AppColors.primary,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    fontSize: 14,
    marginTop: 32,
    textAlign: 'center',
  },
  bottom: {
    padding: 24,
    paddingBottom: 32,
  },
  statusBadge: {
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: 15,
  },
});
