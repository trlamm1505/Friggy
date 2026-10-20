/**
 * BrandLogo
 *
 * Logo Friggy với 2 phần "Fri" + "ggy" (2 màu) + optional leaf icon.
 * size: small (24) | medium (40) | large (62) | xlarge (80)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { Leaf } from 'lucide-react-native';

const SIZES = {
  small: { fontSize: 22, leafSize: 14, gap: 2 },
  medium: { fontSize: 32, leafSize: 18, gap: 3 },
  large: { fontSize: 48, leafSize: 24, gap: 4 },
  xlarge: { fontSize: 64, leafSize: 32, gap: 5 },
};

export const BrandLogo = ({ size = 'medium', withLeaf = true, style }) => {
  const { isDark } = useTheme();
  const s = SIZES[size] || SIZES.medium;
  const brandPrimary = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const brandAccent = isDark ? AppColors.primaryLight : AppColors.primary;

  return (
    <View style={[styles.row, { gap: s.gap }, style]}>
      <Text
        style={[
          styles.text,
          { fontSize: sp(s.fontSize) },
        ]}
      >
        <Text style={{ color: brandPrimary }}>Fri</Text>
        <Text style={{ color: brandAccent }}>ggy</Text>
      </Text>
      {withLeaf ? (
        <View style={{ transform: [{ rotate: '20deg' }, { translateY: -s.fontSize * 0.18 }] }}>
          <Leaf color={brandAccent} size={s.leafSize} strokeWidth={2.5} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  text: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    letterSpacing: 0.5,
  },
});
