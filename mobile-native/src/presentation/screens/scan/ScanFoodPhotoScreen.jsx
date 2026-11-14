/**
 * ScanFoodPhotoScreen
 *
 * B2 — nối vào BE thật (thay `setTimeout` + Alert giả).
 *
 * Luồng thật (giống Flutter `scan_food_photo_screen.dart`):
 *   1. Chụp / chọn ảnh -> `POST /fridge/scan/image` (multipart `file`)
 *      -> trả ngay `{ scanId, status: 'pending', detectedItems: [] }`
 *      (`detectedItems` lúc này LUÔN RỖNG — AI chưa xử lý xong).
 *   2. Poll `GET /fridge/scan/:scanId` mỗi 2s (tối đa 60s) tới khi
 *      `success` (lấy `detectedItems`) hoặc `failed`.
 *   3. `replace` sang `ScanResultReview` kèm `{ scanId, scanType, items }`
 *      để user kiểm tra / sửa trước khi `confirmScan`.
 *
 * Cả 3 bước gom trong `useScanFlow()` dùng chung với 2 màn scan còn lại.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Camera, Image as ImageIcon, RotateCw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { CustomButton } from '../../components/common/CustomButton';
import { ErrorState } from '../../components/common/ErrorState';
import { useScanFlow } from '../../hooks/useScanFlow';
import { Routes } from '../../../shared/constants/routes';

export const ScanFoodPhotoScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [imageUri, setImageUri] = useState(null);
  const { phase, error, startScan, clearError } = useScanFlow();

  const busy = phase === 'uploading' || phase === 'polling';

  const pickImage = async (fromCamera) => {
    if (busy) return;
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true });
    if (!result.canceled && result.assets && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      clearError();
    }
  };

  const handleProcess = async () => {
    if (!imageUri || busy) return;
    try {
      const result = await startScan('image', imageUri);
      // `null` = user rời màn giữa chừng -> bỏ qua, không điều hướng.
      if (!result) return;
      navigation.replace(Routes.ScanResultReview, {
        scanId: result.scanId,
        scanType: result.scanType,
        items: result.items,
      });
    } catch {
      // Lỗi đã lưu trong hook -> banner ErrorState bên dưới tự hiện.
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#000' }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.iconBtn}>
          <ChevronLeft color="#FFFFFF" size={24} />
        </Pressable>
        <Text style={styles.topTitle}>{t('scan.scanFood')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.previewArea}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Camera color="rgba(255,255,255,0.5)" size={64} />
            <Text style={styles.placeholderText}>{t('scan.captureImage')}</Text>
          </View>
        )}
        {busy ? (
          <View style={styles.progressOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.progressText}>
              {phase === 'uploading' ? t('scan.uploading') : t('scan.analyzing')}
            </Text>
          </View>
        ) : null}
      </View>

      {error && !busy ? (
        <ErrorState message={error?.message} onRetry={handleProcess} style={styles.errorBox} />
      ) : null}

      <View style={styles.bottom}>
        <View style={styles.actionRow}>
          <Pressable onPress={() => pickImage(false)} disabled={busy} style={styles.actionBtn} hitSlop={8}>
            <ImageIcon color="#FFFFFF" size={26} />
            <Text style={styles.actionLabel}>{t('scan.fromGallery')}</Text>
          </Pressable>

          <Pressable onPress={() => pickImage(true)} disabled={busy} style={styles.captureBtn} hitSlop={8}>
            <View style={styles.captureInner} />
          </Pressable>

          {imageUri ? (
            <Pressable
              onPress={() => {
                if (busy) return;
                setImageUri(null);
                clearError();
              }}
              style={styles.actionBtn}
              hitSlop={8}
            >
              <RotateCw color="#FFFFFF" size={26} />
              <Text style={styles.actionLabel}>{t('scan.retake')}</Text>
            </Pressable>
          ) : (
            <View style={styles.actionBtn} />
          )}
        </View>

        {imageUri ? (
          <View style={{ marginTop: 20 }}>
            <CustomButton title={t('scan.usePhoto')} onPress={handleProcess} loading={busy} />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  previewArea: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginTop: 12,
  },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  progressText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorBox: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
  },
  bottom: {
    padding: 24,
    paddingBottom: 32,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  actionBtn: {
    alignItems: 'center',
    width: 80,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    fontSize: 12,
    marginTop: 6,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
  },
});
