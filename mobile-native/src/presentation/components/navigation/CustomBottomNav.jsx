import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home as HomeIcon, Bot, User, Plus } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { FriggyIcon } from '../icons/FriggyIcon';
import { useNavigation } from '@react-navigation/native';
import { Routes } from '../../../shared/constants/routes';

export const CustomBottomNav = ({ activeTab = 0, onTabChange }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();

  const navBg = isDark ? 'rgba(20,36,25,0.92)' : 'rgba(255,255,255,0.88)';
  const navBorder = isDark ? 'rgba(46,77,54,0.8)' : 'rgba(0,0,0,0.06)';
  const accentColor = AppColors.forestAccent;
  const selectedColor = isDark ? AppColors.primaryLight : accentColor;
  const unselectedColor = isDark ? AppColors.darkTextSecondary : 'rgba(255,255,255,0.85)';

  const handleAdd = () => {
    navigation.navigate(Routes.SelectInputMethod);
  };

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 16 }]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: navBg,
            borderColor: navBorder,
            borderWidth: 0.8,
          },
        ]}
      >
        <NavItem
          active={activeTab === 0}
          selectedColor={selectedColor}
          unselectedColor={unselectedColor}
          label={t('tabs.home')}
          onPress={() => onTabChange(0)}
          renderIcon={(color) => <HomeIcon color={color} size={26} strokeWidth={2.2} />}
        />
        <NavItem
          active={activeTab === 1}
          selectedColor={selectedColor}
          unselectedColor={unselectedColor}
          label={t('tabs.fridge')}
          onPress={() => onTabChange(1)}
          renderIcon={(color) => <FriggyIcon size={24} color={color} isSelected={false} />}
        />
        <AddButton onPress={handleAdd} isDark={isDark} />
        <NavItem
          active={activeTab === 3}
          selectedColor={selectedColor}
          unselectedColor={unselectedColor}
          label={t('tabs.ai')}
          onPress={() => onTabChange(3)}
          renderIcon={(color) => <Bot color={color} size={25} strokeWidth={2.2} />}
        />
        <NavItem
          active={activeTab === 4}
          selectedColor={selectedColor}
          unselectedColor={unselectedColor}
          label={t('tabs.profile')}
          onPress={() => onTabChange(4)}
          renderIcon={(color) => <User color={color} size={26} strokeWidth={2.2} />}
        />
      </View>
    </View>
  );
};

const NavItem = ({ active, selectedColor, unselectedColor, label, onPress, renderIcon }) => {
  const color = active ? selectedColor : unselectedColor;
  return (
    <Pressable onPress={onPress} style={styles.item} hitSlop={4}>
      <View style={[styles.itemInner, { transform: [{ scale: active ? 1.1 : 1.0 }] }]}>
        {renderIcon(color)}
      </View>
      <Text
        style={[styles.itemLabel, { color, fontWeight: active ? '800' : '500', fontSize: sp(10) }]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const AddButton = ({ onPress, isDark }) => {
  const circleColor = isDark ? AppColors.primaryLight : AppColors.forestAccent;
  return (
    <Pressable onPress={onPress} style={styles.addWrap} hitSlop={4}>
      <View style={[styles.addCircle, { backgroundColor: circleColor, shadowColor: circleColor }]}>
        <Plus color="#FFFFFF" size={28} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  bar: {
    height: 62,
    paddingHorizontal: 8,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  itemInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    marginTop: 3,
    fontFamily: FontFamily.semibold,
  },
  addWrap: {
    flex: 0.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
