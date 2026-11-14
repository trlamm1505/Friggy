import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { Leaf, Star, CheckCircle2, Crown, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import premiumMascot from '../../../../assets/images/premium_banner_mascot.png';

export const PremiumBanner = ({ isFamilyPlan = false, onTryNowTap }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  // Card phẳng: nền + viền tĩnh theo theme, không gradient, không shadow.
  // Viền light TRƯỚC đây là rgba(255,255,255,0.9) — trắng 90% đặt trên gradient
  // bắt đầu bằng #FFFFFF nên gần như vô hình. Đổi sang màu có tương phản thật
  // và dùng chung với GreetingBanner để hai banner trên Home đồng bộ.
  const bgColor = isDark ? AppColors.darkCardBg : '#FFFFFF';
  const borderColor = isDark ? '#2E4D36' : '#A5E69C';
  const titleColor = isDark ? '#FFFFFF' : '#0F5A24';
  const subtitleColor = isDark ? '#D0D7D1' : '#0F5A24';
  const badgeBg = isFamilyPlan ? '#2E7D32' : '#F5B025';
  const badgeIcon = isFamilyPlan ? Users : Crown;

  return (
    <Pressable
      onPress={onTryNowTap}
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
    >
      <View style={[styles.wrap, { backgroundColor: bgColor, borderColor }]}>
        {/* Mascot right */}
        <View style={styles.mascotWrap}>
          <Image source={premiumMascot} style={styles.mascot} resizeMode="contain" />
        </View>

        {/* Left text */}
        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <Text style={[styles.brand, { fontSize: sp(20), color: titleColor }]}>
              <Text style={{ color: titleColor }}>Fri</Text>
              <Text style={{ color: AppColors.primary }}>ggy</Text>
            </Text>
            <Leaf color={AppColors.primary} size={15} strokeWidth={2.5} style={{ marginLeft: 2 }} />
            <View style={{ width: 6 }} />
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              {React.createElement(badgeIcon, { color: '#FFFFFF', size: 11, strokeWidth: 2.5 })}
              <Text style={[styles.badgeText, { fontSize: sp(9) }]}>
                {isFamilyPlan ? t('home.familyPlanBadge') : t('home.premiumBadge')}
              </Text>
            </View>
          </View>

          <View style={{ height: 8 }} />

          <Text style={[styles.headline, { color: titleColor, fontSize: sp(17.5) }]}>
            {isFamilyPlan
              ? t('home.familyAccountActive')
              : `${t('home.cookBetter')}\n${t('home.saveMore')}`}
          </Text>

          <View style={styles.starsRow}>
            <View style={styles.stars}>
              <Star color="#FFB300" size={58} fill="#FFB300" />
              <Star color="#FFB300" size={26} fill="#FFB300" style={styles.star1} />
              <Star color="#FFB300" size={34} fill="#FFB300" style={styles.star2} />
            </View>
          </View>

          <Text style={[styles.subtitle, { color: subtitleColor, fontSize: sp(12) }]}>
            {isFamilyPlan
              ? t('home.enjoyingUnlimited')
              : `${t('home.unlockRecipes')}\n${t('home.smartFeatures')}`}
          </Text>
        </View>

        {/* Bottom right action */}
        <View style={styles.actionWrap}>
          {isFamilyPlan ? (
            <View style={[styles.activeBtn, { backgroundColor: isDark ? '#233629' : '#E8F5E9', borderColor: isDark ? '#2E4D36' : '#A5D6A7' }]}>
              <CheckCircle2 color="#2E7D32" size={16} />
              <Text style={[styles.activeText, { color: isDark ? AppColors.primaryLight : '#1B5E20', fontSize: sp(12.5) }]}>
                {t('home.activePlan')}
              </Text>
            </View>
          ) : (
            <View style={[styles.ctaBtn, { backgroundColor: isDark ? AppColors.primaryLight : '#0F853B' }]}>
              <Text style={[styles.ctaText, { color: isDark ? '#0E1611' : '#FFFFFF', fontSize: sp(13) }]}>
                {t('home.tryNow')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    height: sp(244),
    marginHorizontal: sp(20),
    borderRadius: sp(26),
    // Qua sp() để quy đổi về số pixel nguyên theo density. Giá trị lẻ thô
    // (1.4) bị Android làm tròn mỗi cạnh một kiểu nên viền dày mỏng không đều.
    borderWidth: sp(1.5),
    overflow: 'hidden',
  },
  // TRƯỚC ĐÂY dùng số px thô (right:25, width:175, top:14, left:22, right:145)
  // trong khi phần còn lại của app scale theo sp() -> trên máy nhỏ/nhỏ hơn 412px
  // mascot tràn sang trái, đè lên chữ. Đã đưa tất cả về sp() để đồng bộ tỉ lệ.
  mascotWrap: {
    position: 'absolute',
    right: sp(14),
    top: sp(6),
    bottom: sp(40),
    width: sp(160),
  },
  mascot: {
    width: '100%',
    height: '100%',
  },
  textWrap: {
    position: 'absolute',
    top: sp(14),
    bottom: sp(14),
    left: sp(20),
    right: sp(158),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brand: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    marginLeft: 3,
    letterSpacing: 0.4,
  },
  headline: {
    fontFamily: FontFamily.extrabold,
    fontWeight: FontWeights.extrabold,
    lineHeight: 20,
  },
  starsRow: {
    paddingLeft: sp(44),
    marginTop: sp(6),
  },
  stars: {
    width: sp(104),
    height: sp(58),
    position: 'relative',
  },
  star1: {
    position: 'absolute',
    left: 52,
    top: 0,
  },
  star2: {
    position: 'absolute',
    left: 40,
    bottom: 0,
  },
  subtitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    lineHeight: 15,
    marginTop: 6,
  },
  actionWrap: {
    position: 'absolute',
    right: 16,
    bottom: 12,
  },
  activeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.2,
  },
  activeText: {
    fontFamily: FontFamily.extrabold,
    fontWeight: FontWeights.extrabold,
    marginLeft: 5,
  },
  ctaBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    shadowColor: '#0F853B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaText: {
    fontFamily: FontFamily.extrabold,
    fontWeight: FontWeights.extrabold,
  },
});
