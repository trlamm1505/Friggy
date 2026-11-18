/**
 * InDevelopmentScreen - màn placeholder cho tính năng đang phát triển.
 *
 * ⚠️ DÙNG CHO (19/11):
 *   - `ScanReceiptScreen` (Quét hóa đơn)
 *   - `ScanBarcodeScreen` (Quét mã vạch / QR)
 *   2 luồng này BE + ai-service chưa hoàn chỉnh (AI scan chưa ổn định,
 *   kết quả trả về rỗng) -> ở `SelectInputMethodScreen` đã khoá nút, nhưng
 *   vẫn cần chặn ở màn đích để tránh dead-end khi deep-link trực tiếp.
 *
 * ⚠️ KHI BẬT LẠI TÍNH NĂNG:
 *   1. `SelectInputMethodScreen`: xoá `disabled: true` ở method tương ứng.
 *   2. `MainScreens.jsx`: đổi component route về `ScanReceiptScreen` /
 *      `ScanBarcodeScreen`.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Construction, ChevronLeft } from 'lucide-react-native';

import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { CustomButton } from '../../components/common/CustomButton';

export const InDevelopmentScreen = ({ title }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: AppColors.accentGreen }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, sp(8)) + sp(8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <ChevronLeft color={AppColors.headerTextLight} size={sp(22)} strokeWidth={2.4} />
        </Pressable>
        <Text
          style={[
            styles.title,
            { color: AppColors.headerTextLight, fontSize: sp(20) },
          ]}
          numberOfLines={1}
        >
          {title || t('scan.selectMethod')}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Construction color="#FFFFFF" size={sp(46)} strokeWidth={2} />
        </View>
        <Text style={styles.heading}>{t('scan.inDevelopment')}</Text>
        <Text style={styles.desc}>{t('scan.inDevelopmentDesc')}</Text>

        <View style={{ width: '100%', marginTop: sp(28) }}>
          <CustomButton
            title={t('common.back')}
            onPress={() => navigation.goBack()}
            height={50}
            borderRadius={25}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(20),
    paddingBottom: sp(10),
  },
  backBtn: {
    width: sp(40),
    height: sp(40),
    borderRadius: sp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginLeft: sp(14),
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sp(28),
    paddingBottom: sp(60),
  },
  iconWrap: {
    width: sp(96),
    height: sp(96),
    borderRadius: sp(48),
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    marginTop: sp(24),
    fontSize: sp(20),
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  desc: {
    marginTop: sp(10),
    fontSize: sp(14),
    lineHeight: sp(21),
    fontFamily: FontFamily.regular,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
});
