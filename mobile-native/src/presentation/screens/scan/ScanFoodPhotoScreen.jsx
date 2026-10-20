import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Camera, Image as ImageIcon, RotateCw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { CustomButton } from '../../components/common/CustomButton';

export const ScanFoodPhotoScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [imageUri, setImageUri] = useState(null);
  const [processing, setProcessing] = useState(false);

  const pickImage = async (fromCamera) => {
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true });
    if (!result.canceled && result.assets && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleProcess = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      Alert.alert(t('scan.processing'), 'AI đã nhận diện 3 nguyên liệu', [
        {
          text: 'OK',
          onPress: () => navigation.replace(Routes.ScanResultReview, { items: ['Cà chua', 'Sữa tươi', 'Trứng'] }),
        },
      ]);
    }, 1500);
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
      </View>

      <View style={styles.bottom}>
        <View style={styles.actionRow}>
          <Pressable onPress={() => pickImage(false)} style={styles.actionBtn} hitSlop={8}>
            <ImageIcon color="#FFFFFF" size={26} />
            <Text style={styles.actionLabel}>{t('scan.fromGallery')}</Text>
          </Pressable>

          <Pressable onPress={() => pickImage(true)} style={styles.captureBtn} hitSlop={8}>
            <View style={styles.captureInner} />
          </Pressable>

          {imageUri ? (
            <Pressable onPress={() => setImageUri(null)} style={styles.actionBtn} hitSlop={8}>
              <RotateCw color="#FFFFFF" size={26} />
              <Text style={styles.actionLabel}>{t('scan.retake')}</Text>
            </Pressable>
          ) : (
            <View style={styles.actionBtn} />
          )}
        </View>

        {imageUri ? (
          <View style={{ marginTop: 20 }}>
            <CustomButton title={t('scan.usePhoto')} onPress={handleProcess} loading={processing} />
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
