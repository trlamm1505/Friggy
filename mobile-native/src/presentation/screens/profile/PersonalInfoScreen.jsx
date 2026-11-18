/**
 * PersonalInfoScreen
 *
 * Redesigned (Sprint 6):
 * - Có header gradient mini + avatar
 * - Form layout đẹp hơn với CustomTextField (đã có icon prefix option)
 * - Phone field có prefix icon Phone
 * - Email field có prefix icon Mail
 * - Address field có prefix icon MapPin
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackCircleButton } from '../../components/common/BackCircleButton';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { CustomTextField } from '../../components/common/CustomTextField';
import { CustomButton } from '../../components/common/CustomButton';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { useAuthStore } from '../../../shared/stores/useAuthStore';
import { useServices } from '../../../data/ServiceProvider';
import { showSuccess, showError, showInfo, showMutationError } from '../../utils/helpers';
import { Mail, Phone, User, Calendar } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { persistLocalImage } from '../../../data/storage/localImageStore';

/**
 * Ô ngày sinh nhập theo DD/MM/YYYY (đúng thiết kế) nhưng BE validate
 * `@IsISO8601()` cho `dateOfBirth`. Chuyển đổi ở biên UI ↔ service:
 *   - hiển thị: ISO -> DD/MM/YYYY
 *   - lưu:     DD/MM/YYYY -> ISO (bỏ qua nếu người dùng gõ sai định dạng)
 */
const isoToDisplay = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const displayToIso = (text) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((text || '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
};

export const PersonalInfoScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuthStore();
  const { userService } = useServices();

  // Nạp profile thật từ BE (GET /users/me). Fallback về store khi lỗi mạng.
  // isLoading chặn lưu: bấm lưu lúc đang tải sẽ ghi đè dữ liệu BE bằng giá trị mặc định.
  const [isLoading, setIsLoading] = useState(true);
  // ⚠️ KHÔNG hardcode giá trị giả ('Trần Quốc Lâm', '0901234567'...).
  //   Nếu offline mà chưa có cache, user sẽ LƯU ĐÈ dữ liệu thật bằng dữ liệu bịa.
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  // BE `UserProfile` KHÔNG có cột `phone` -> không sửa được, hiển thị readonly.
  const phone = user?.phone || '';
  // State giữ định dạng hiển thị DD/MM/yyyy; convert sang ISO ngay khi lưu.
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('male');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // Avatar: URL đã qua appConfig.getImageUrl() trong service, hiển thị thẳng.
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  // Giữ URI ảnh vừa chọn -> dùng khi offline (để hiện ảnh local ngay).
  const lastPickedUriRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await userService.getProfile();
        if (cancelled || !p) return;
        setName(p.name ?? '');
        setEmail(p.email ?? '');
        setAvatarUrl(p.avatar ?? null);
        setBirthday(isoToDisplay(p.birthday));
        setGender(p.gender ?? 'male');
        setBio(p.bio ?? '');
      } catch (_e) {
        // Offline / lỗi -> giữ giá trị từ store, user vẫn sửa được rồi thử lại.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userService]);

  /**
   * Chọn ảnh rồi upload NGAY — không preview tạm, không đợi bấm Lưu.
   * Giống hệt Flutter `personal_info_screen.dart:191-203`.
   * Resize 512x512 / quality 85 để khớp, BE giới hạn 5MB.
   *
   * ⚠️ OFFLINE (F1) — thao tác KHÔNG bị mất:
   *   `SafeService` bắt lỗi mạng -> `MutationHandlers.userService.uploadAvatar`
   *   lưu `avatar_local_path` + đẩy op `AVATAR_UPLOAD` vào hàng đợi -> ném
   *   `OfflineQueuedError`. Lúc này phải:
   *     1. hiện ảnh LOCAL ngay (file vẫn nằm trên máy),
   *     2. báo "đã lưu offline" (KHÔNG báo lỗi đỏ),
   *     3. KHÔNG chặn người dùng tiếp tục dùng app.
   */
  const handlePickAvatar = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError('Cần cấp quyền truy cập thư viện ảnh để đổi avatar');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        // Flutter dùng ImagePicker cho scan ảnh, RN dùng expo-image-picker
        // nên chỉ hỗ trợ 'images' chứ không phải ImagePicker.MediaType.images.
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      const asset = picked?.canceled ? null : picked?.assets?.[0];
      if (!asset?.uri) return;

      // ⚠️ Copy ảnh vào thư mục persistent của app TRƯỚC khi upload.
      //   URI của ImagePicker nằm trong cache của OS -> có thể bị xoá bất cứ
      //   lúc nào. Nếu offline (đã vào hàng đợi), file cache biến mất thì op
      //   `AVATAR_UPLOAD` không upload được nữa -> avatar mất trắng.
      const localUri = await persistLocalImage(asset.uri);
      lastPickedUriRef.current = localUri;

      setIsUploadingAvatar(true);
      const res = await userService.uploadAvatar(localUri);
      const newUrl = res?.url ?? null;
      setAvatarUrl(newUrl);
      // Đồng bộ store để UserProfileScreen hiện avatar mới ngay khi quay lại.
      setUser({ ...user, ...(newUrl ? { avatar: newUrl } : {}) });
      showSuccess(t('profile.avatarUpdated'));
    } catch (e) {
      // ⚠️ Offline: thao tác đã được lưu vào hàng đợi -> KHÔNG phải lỗi.
      //   Hiện ảnh local ngay + báo "đã lưu offline, sẽ đồng bộ khi có mạng".
      if (e?.isOfflineQueued === true) {
        const localUri = lastPickedUriRef.current;
        if (localUri) {
          setAvatarUrl(localUri);
          setUser({ ...user, avatar: localUri });
        }
        showInfo(t('offline.savedQueued'));
        return;
      }
      showError(e?.message || 'Không thể tải ảnh đại diện');
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [userService, user, setUser, t]);

  /**
   * PATCH /users/me/profile.
   *
   * `email` KHÔNG gửi: BE `UpdateProfileDto` chỉ nhận name / dateOfBirth /
   * gender / bio. Ô email hiển thị readonly vì lý do đó, không phải sửa UI.
   */
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const updated = await userService.updateProfile({
        name,
        birthday: displayToIso(birthday),
        gender,
        bio,
      });
      setUser({ ...user, ...(updated ?? {}) });
      showSuccess(t('profile.saveChanges'));
      navigation.goBack();
    } catch (e) {
      // 4xx đi thẳng lên đây (BE từ chối dữ liệu) → hiện lỗi thật, KHÔNG báo thành công.
      //
      // ⚠️ OFFLINE (v4): nếu lỗi mạng, thao tác đã được lưu vào hàng đợi
      //   (`OfflineQueuedError`) -> báo "đã lưu offline" và KHÔNG thoát màn,
      //   để user thấy giá trị đã sửa ngay (cache đã cập nhật optimistic).
      const queued = showMutationError(e, 'Không thể lưu thông tin', {
        offlineMessage: t('offline.savedQueued'),
      });
      if (queued) {
        // Cập nhật store luôn để UserProfileScreen hiện thông tin mới ngay khi
        // quay lại (cache đã lưu, nhưng store là nguồn UI của màn profile).
        setUser({
          ...user,
          name,
          ...(displayToIso(birthday) ? { dateOfBirth: displayToIso(birthday) } : {}),
          gender,
          bio,
        });
        return;
      }

      showError(e?.message || 'Không thể lưu thông tin');
    } finally {
      setIsSaving(false);
    }
  }, [userService, name, birthday, gender, bio, user, setUser, navigation, t]);

  const iconColor = isDark ? AppColors.primaryLight : '#8C9890';
  const textareaBg = isDark ? AppColors.darkCardBg : AppColors.inputBackground;
  const textareaFg = isDark ? AppColors.darkTextPrimary : AppColors.textPrimary;

  // P0.8 (ảnh 11): 3 option giới tính
  const genderOptions = [
    { key: 'male', label: t('profile.genderMale') },
    { key: 'female', label: t('profile.genderFemale') },
    { key: 'other', label: t('profile.genderOther') },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.container,
        { backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground },
      ]}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + sp(12) }]}>
        <BackCircleButton onPress={() => navigation.goBack()} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: sp(4) }}>
          <ProfileHeader
            name={name}
            email={email}
            avatarUrl={avatarUrl}
            size="medium"
            onAvatarPress={isUploadingAvatar ? undefined : handlePickAvatar}
            avatarBusy={isUploadingAvatar}
          />
        </View>

        <Text
          style={[
            styles.sectionTitle,
            {
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              fontSize: sp(11),
            },
          ]}
        >
          {t('home.account').toUpperCase()}
        </Text>
        <View style={styles.form}>
          <CustomTextField
            label={t('auth.fullName')}
            value={name}
            onChangeText={setName}
            prefixIcon={(props) => <User {...props} color={iconColor} size={20} />}
          />
          {/* Email KHÔNG sửa được: BE `UpdateProfileDto` không có field `email`.
              Hiện readonly thay vì giả vờ sửa được rồi âm thầm bị bỏ qua. */}
          <CustomTextField
            label={t('auth.email')}
            value={email}
            editable={false}
            keyboardType="email-address"
            prefixIcon={(props) => <Mail {...props} color={iconColor} size={20} />}
          />
          {/* Số điện thoại KHÔNG sửa được: BE `UserProfile` không có cột `phone`
              và `UpdateProfileDto` không nhận field này -> sửa xong cũng bị bỏ qua.
              Hiện readonly cho đúng thực tế. */}
          <CustomTextField
            label={t('home.phone')}
            value={phone}
            editable={false}
            keyboardType="phone-pad"
            prefixIcon={(props) => <Phone {...props} color={iconColor} size={20} />}
          />
          <CustomTextField
            label={t('profile.birthday')}
            value={birthday}
            onChangeText={setBirthday}
            placeholder="DD/MM/YYYY"
            prefixIcon={(props) => <Calendar {...props} color={iconColor} size={20} />}
          />
          {/* P0.8 (ảnh 11): chọn giới tính Nam / Nữ / Khác */}
          <View>
            <Text
              style={[
                styles.fieldLabel,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  fontSize: sp(12),
                },
              ]}
            >
              {t('profile.gender')}
            </Text>
            <SegmentedControl options={genderOptions} selectedKey={gender} onSelect={setGender} />
          </View>
          {/* P0.8 (ảnh 11): text area tiểu sử */}
          <View>
            <Text
              style={[
                styles.fieldLabel,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  fontSize: sp(12),
                },
              ]}
            >
              {t('profile.bio')}
            </Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
              placeholder={t('profile.bioPlaceholder')}
              placeholderTextColor={AppColors.hintText}
              style={[
                styles.bioArea,
                {
                  backgroundColor: textareaBg,
                  color: textareaFg,
                  borderColor: isDark ? AppColors.darkCardBorder : AppColors.border,
                  fontSize: sp(14),
                },
              ]}
            />
          </View>
        </View>

        <View style={{ marginTop: sp(32) }}>
          <CustomButton
            title={t('profile.saveChanges')}
            onPress={handleSave}
            loading={isLoading || isSaving}
          />
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: sp(20),
    paddingBottom: sp(8),
  },
  scroll: {
    paddingHorizontal: sp(20),
    paddingTop: sp(8),
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.8,
    marginTop: sp(24),
    marginBottom: sp(12),
    marginLeft: sp(4),
  },
  fieldLabel: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginBottom: sp(8),
  },
  form: {
    gap: sp(14),
  },
  bioArea: {
    borderRadius: sp(12),
    borderWidth: 1,
    paddingHorizontal: sp(14),
    paddingVertical: sp(12),
    minHeight: sp(96),
    fontFamily: FontFamily.regular,
  },
});
