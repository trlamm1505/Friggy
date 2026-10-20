/**
 * SortMenu
 *
 * Dropdown menu đơn giản để chọn sort option.
 * Hiển thị bằng Pressable + Modal đơn giản (dùng inline overlay).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { ArrowUpDown, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export const SortMenu = ({ options = [], selectedKey, onSelect, style }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((o) => o.key === selectedKey);
  const buttonLabel = selectedOption?.label || t('home.sortBy');

  const handleSelect = (key) => {
    onSelect && onSelect(key);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: isDark ? '#19271E' : '#F4F7F4',
            borderColor: isDark ? '#2E4D36' : '#E3E8E4',
            opacity: pressed ? 0.7 : 1,
          },
          style,
        ]}
      >
        <ArrowUpDown
          color={isDark ? AppColors.primaryLight : AppColors.forestAccent}
          size={14}
        />
        <Text
          style={[
            styles.buttonText,
            { color: isDark ? AppColors.primaryLight : AppColors.forestAccent },
          ]}
        >
          {buttonLabel}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.menu,
                  {
                    backgroundColor: isDark ? AppColors.darkCardBg : '#FFFFFF',
                    borderColor: isDark ? AppColors.darkCardBorder : AppColors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.menuTitle,
                    { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
                  ]}
                >
                  {t('home.sortBy')}
                </Text>
                {options.map((opt) => {
                  const isSelected = opt.key === selectedKey;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => handleSelect(opt.key)}
                      style={({ pressed }) => [
                        styles.menuItem,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? '#233629'
                              : AppColors.accentGreen
                            : 'transparent',
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.menuItemText,
                          {
                            color: isSelected
                              ? isDark
                                ? AppColors.primaryLight
                                : AppColors.primaryDark
                              : isDark
                              ? '#FFFFFF'
                              : AppColors.textPrimary,
                            fontWeight: isSelected ? FontWeights.bold : FontWeights.medium,
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {isSelected && (
                        <Check
                          color={isDark ? AppColors.primaryLight : AppColors.primaryDark}
                          size={16}
                          strokeWidth={2.5}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(12),
    paddingVertical: sp(7),
    borderRadius: sp(14),
    borderWidth: 1,
    gap: sp(6),
  },
  buttonText: {
    fontSize: sp(12),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: sp(6),
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp(20),
  },
  menu: {
    width: '100%',
    maxWidth: 320,
    borderRadius: sp(16),
    borderWidth: 1,
    padding: sp(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  menuTitle: {
    fontSize: sp(11),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: sp(12),
    paddingTop: sp(8),
    paddingBottom: sp(4),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp(12),
    paddingVertical: sp(12),
    borderRadius: sp(10),
  },
  menuItemText: {
    fontSize: sp(14),
    fontFamily: FontFamily.medium,
  },
});
