import React from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { Search, Sliders } from 'lucide-react-native';
import { FriggyAppBar } from '../navigation/FriggyAppBar';
import { useTranslation } from 'react-i18next';

export const HomeHeader = ({ onNotificationTap, onFilterTap, searchValue, onSearchChange }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <FriggyAppBar showBackButton={false} onNotificationTap={onNotificationTap} />
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDark ? '#19271E' : '#FFFFFF',
              borderColor: isDark
                ? '#2E4D36'
                : 'rgba(102,187,106,0.65)',
            },
          ]}
        >
          <Search color={isDark ? AppColors.primaryLight : '#2E7D32'} size={22} strokeWidth={2.2} />
          <TextInput
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor={isDark ? '#9DA8A0' : '#757575'}
            value={searchValue}
            onChangeText={onSearchChange}
            style={[
              styles.input,
              { color: isDark ? '#FFFFFF' : '#19221C', fontSize: sp(14.5) },
            ]}
          />
          <Pressable onPress={onFilterTap} hitSlop={8} style={styles.filterBtn}>
            <Sliders color={isDark ? AppColors.primaryLight : '#2E7D32'} size={20} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Trước đây toàn bộ giá trị ở đây là px thô (20/12/16/52/14/18/8) trong khi
  // phần còn lại của app dùng sp() -> header lệch tỉ lệ với GreetingBanner ngay
  // dưới nó. Đã chuyển hết về sp() để khoảng cách dọc đều nhau.
  wrap: {
    paddingHorizontal: sp(20),
    paddingVertical: sp(12),
  },
  searchRow: {
    marginTop: sp(14),
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: sp(52),
    paddingHorizontal: sp(14),
    borderRadius: sp(18),
    borderWidth: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    paddingVertical: sp(14),
    paddingHorizontal: sp(8),
  },
  filterBtn: {
    padding: sp(4),
  },
});
