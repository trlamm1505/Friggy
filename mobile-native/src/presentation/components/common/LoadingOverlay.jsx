import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';

export const LoadingOverlay = ({ visible, message }) => {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <LinearGradient
        colors={['#0E1611AA', '#16231AAA']}
        style={styles.bg}
      />
      <View style={styles.box}>
        <ActivityIndicator size="large" color={AppColors.primary} />
        {message ? (
          <Text style={[styles.text, { fontSize: sp(14) }]}>{message}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  box: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    color: AppColors.textPrimary,
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
  },
});
