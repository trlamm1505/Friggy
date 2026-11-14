/**
 * ProfileHeader
 *
 * Header cho các màn hình profile: avatar + name + email + edit button.
 */

import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { Edit3, Camera } from 'lucide-react-native';

/**
 * `onAvatarPress` / `avatarBusy` phục vụ upload avatar (Sprint A2).
 * Cả hai là optional: màn hình chỉ hiện avatar vẫn dùng được như cũ.
 */
export const ProfileHeader = ({
  name,
  email,
  avatarUrl,
  onEdit,
  onAvatarPress,
  avatarBusy = false,
  size = 'large',
  style,
}) => {
  const { isDark } = useTheme();
  const sizes = {
    large: { avatar: sp(96), fontSize: sp(22), iconSize: 14, btnSize: 32 },
    medium: { avatar: sp(64), fontSize: sp(18), iconSize: 12, btnSize: 26 },
    small: { avatar: sp(40), fontSize: sp(15), iconSize: 10, btnSize: 22 },
  };
  const s = sizes[size] || sizes.large;

  const initial = (name || 'T').charAt(0).toUpperCase();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.avatarWrap}>
        {/* Bọc Pressable khi có onAvatarPress để bấm vào ảnh mở thư viện ảnh.
            Vẫn giữ phần tử hình tròn cũ bên trong để không đổi layout. */}
        <Pressable
          onPress={onAvatarPress}
          disabled={!onAvatarPress || avatarBusy}
          style={({ pressed }) => (onAvatarPress ? { opacity: pressed ? 0.85 : 1 } : null)}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: isDark ? '#233629' : AppColors.accentGreen,
                width: s.avatar,
                height: s.avatar,
                borderRadius: s.avatar / 2,
              },
            ]}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: s.avatar, height: s.avatar, borderRadius: s.avatar / 2 }}
              />
            ) : (
              <Text
                style={[
                  styles.avatarText,
                  {
                    color: isDark ? AppColors.primaryLight : AppColors.forestAccent,
                    fontSize: s.fontSize + 6,
                  },
                ]}
              >
                {initial}
              </Text>
            )}
            {/* Overlay loading khi đang upload — không cho bấm lại. */}
            {avatarBusy ? (
              <View
                style={[
                  styles.avatarOverlay,
                  { width: s.avatar, height: s.avatar, borderRadius: s.avatar / 2 },
                ]}
              >
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : null}
          </View>
        </Pressable>
        {/* Nút camera nhỏ để đổi ảnh — chỉ hiện khi màn hình truyền onAvatarPress. */}
        {onAvatarPress && !avatarBusy ? (
          <Pressable
            onPress={onAvatarPress}
            style={({ pressed }) => [
              styles.cameraBtn,
              {
                backgroundColor: isDark ? '#233629' : AppColors.primary,
                width: s.btnSize,
                height: s.btnSize,
                borderRadius: s.btnSize / 2,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            hitSlop={6}
          >
            <Camera color="#FFFFFF" size={s.iconSize} strokeWidth={2.5} />
          </Pressable>
        ) : null}
        {onEdit ? (
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [
              styles.editBtn,
              {
                backgroundColor: AppColors.primary,
                width: s.btnSize,
                height: s.btnSize,
                borderRadius: s.btnSize / 2,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            hitSlop={6}
          >
            <Edit3 color="#FFFFFF" size={s.iconSize} strokeWidth={2.5} />
          </Pressable>
        ) : null}
      </View>

      {name ? (
        <Text
          style={[
            styles.name,
            {
              color: isDark ? '#FFFFFF' : AppColors.textPrimary,
              fontSize: s.fontSize,
              marginTop: sp(12),
            },
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>
      ) : null}

      {email ? (
        <Text
          style={[
            styles.email,
            {
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              fontSize: sp(13),
              marginTop: sp(4),
            },
          ]}
          numberOfLines={1}
        >
          {email}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cameraBtn: {
    position: 'absolute',
    right: sp(-2),
    bottom: sp(-2),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  editBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  name: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    textAlign: 'center',
  },
  email: {
    fontFamily: FontFamily.regular,
    textAlign: 'center',
  },
});
