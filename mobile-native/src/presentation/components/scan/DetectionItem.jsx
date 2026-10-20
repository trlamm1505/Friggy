/**
 * DetectionItem
 *
 * 1 row trong scan result (cà chua, sữa, trứng, etc).
 * - name, onChange, onRemove
 * - editable input inline
 * - remove button
 * - optional confidence bar
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { Trash2, GripVertical } from 'lucide-react-native';

export const DetectionItem = ({
  name,
  confidence,
  onChange,
  onRemove,
  editable = true,
  style,
}) => {
  const { isDark } = useTheme();
  const nameColor = isDark ? '#FFFFFF' : AppColors.textPrimary;
  const handleColor = isDark ? AppColors.darkTextSecondary : AppColors.hintText;

  const confidenceColor = useMemo(() => {
    if (confidence == null) return null;
    if (confidence >= 0.8) return AppColors.primary;
    if (confidence >= 0.5) return '#FF9800';
    return '#FF5252';
  }, [confidence]);

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isDark ? '#19271E' : '#F4F7F4',
          borderColor: isDark ? '#2E4D36' : 'transparent',
        },
        style,
      ]}
    >
      {editable ? (
        <GripVertical color={handleColor} size={16} />
      ) : (
        <View style={[styles.bullet, { backgroundColor: AppColors.primary }]} />
      )}

      <View style={{ flex: 1, marginLeft: sp(10) }}>
        {editable ? (
          <TextInput
            value={name}
            onChangeText={onChange}
            placeholder="Tên nguyên liệu"
            placeholderTextColor={isDark ? AppColors.hintText : AppColors.hintText}
            style={[
              styles.input,
              { color: nameColor, fontSize: sp(15) },
            ]}
            returnKeyType="done"
          />
        ) : (
          <Text
            style={[
              styles.name,
              { color: nameColor, fontSize: sp(15) },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
        )}

        {confidence != null ? (
          <View style={styles.confidenceRow}>
            <View
              style={[
                styles.confidenceBarBg,
                { backgroundColor: isDark ? '#2E4D36' : '#E3E8E4' },
              ]}
            >
              <View
                style={[
                  styles.confidenceBarFill,
                  {
                    backgroundColor: confidenceColor,
                    width: `${Math.round(confidence * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.confidenceText,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  fontSize: sp(10),
                },
              ]}
            >
              {Math.round(confidence * 100)}%
            </Text>
          </View>
        ) : null}
      </View>

      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={({ pressed }) => [
            styles.removeBtn,
            { backgroundColor: isDark ? '#3D1F1A' : '#FFEBEE', opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Trash2 color={isDark ? '#FF8A80' : '#B71C1C'} size={14} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp(12),
    borderRadius: sp(12),
    borderWidth: 1,
    marginBottom: sp(10),
  },
  bullet: {
    width: sp(8),
    height: sp(8),
    borderRadius: sp(4),
  },
  name: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  input: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    padding: 0,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp(4),
    gap: sp(6),
  },
  confidenceBarBg: {
    flex: 1,
    height: sp(4),
    borderRadius: sp(2),
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: sp(2),
  },
  confidenceText: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginLeft: sp(6),
    minWidth: sp(28),
    textAlign: 'right',
  },
  removeBtn: {
    width: sp(28),
    height: sp(28),
    borderRadius: sp(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: sp(8),
  },
});
