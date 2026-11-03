/**
 * FamilyTokenDialog - nhập token lời mời từ email.
 *
 * Sprint A3 (24/10).
 *
 * ⚠️ VÌ SAO TÁCH RIÊNG (thay vì dùng ô nhập trong `FamilyPlanModal`):
 *   Flutter có DIALOG RIÊNG cho việc này (`family_management_screen.dart:349-433`)
 *   với 2 nút: "Từ chối" (reject) + "Chấp nhận" (accept).
 *   Trước đó RN chỉ có ô nhập token NẰM TRONG paywall `FamilyPlanModal` ->
 *   người dùng đã có token (không muốn mua gói) vẫn phải mở paywall -> UX sai.
 *   Đặc biệt nút "Từ chối" (`POST /family/reject`) chưa hề có UI.
 *
 *   BE (`family.controller.ts:78, 99`): accept/reject là `@Public()` -> nhập
 *   token thủ công, KHÔNG deep link (Flutter cũng không có deep link).
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { X, KeyRound } from 'lucide-react-native';
import { CustomButton } from '../common/CustomButton';
import { useServices } from '../../../data/ServiceProvider';
import { showSuccess, showError, showInfo } from '../../utils/helpers';

export const FamilyTokenDialog = ({ visible, onClose, onSuccess }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { userService } = useServices();

  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setToken('');
    setBusy(false);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose?.();
  }, [reset, onClose]);

  /** Chấp nhận lời mời -> `POST /family/accept`. */
  const handleAccept = useCallback(async () => {
    const value = token.trim();
    if (!value) {
      showInfo(t('familyPlan.enterToken'));
      return;
    }
    setBusy(true);
    try {
      const res = await userService.acceptFamilyInvite(value);
      showSuccess(res?.message || t('familyPlan.acceptSuccess'));
      reset();
      onClose?.();
      onSuccess?.();
    } catch (e) {
      showError(e?.message || t('familyPlan.acceptFailed'));
    } finally {
      setBusy(false);
    }
  }, [userService, token, t, reset, onClose, onSuccess]);

  /** Từ chối lời mời -> `POST /family/reject`. */
  const handleReject = useCallback(async () => {
    const value = token.trim();
    if (!value) {
      showInfo(t('familyPlan.enterToken'));
      return;
    }
    setBusy(true);
    try {
      const res = await userService.rejectFamilyInvite(value);
      showSuccess(res?.message || t('familyPlan.rejectSuccess'));
      reset();
      onClose?.();
    } catch (e) {
      showError(e?.message || t('familyPlan.rejectFailed'));
    } finally {
      setBusy(false);
    }
  }, [userService, token, t, reset, onClose]);

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <View
        style={[
          styles.dialog,
          {
            backgroundColor: isDark ? '#19271E' : '#FFFFFF',
            borderColor: isDark ? '#2E4D36' : '#E0E8E1',
          },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: AppColors.primary }]}>
            <KeyRound color="#FFFFFF" size={18} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1, marginLeft: sp(10) }}>
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(16) },
              ]}
            >
              {t('familyManage.tokenDialogTitle')}
            </Text>
          </View>
          <Pressable
            onPress={close}
            hitSlop={10}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <X color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={20} />
          </Pressable>
        </View>

        <Text
          style={[
            styles.hint,
            {
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              fontSize: sp(12),
            },
          ]}
        >
          {t('familyManage.tokenDialogHint')}
        </Text>

        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder={t('familyManage.tokenPlaceholder')}
          placeholderTextColor={isDark ? '#6B7C71' : '#9AA79E'}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
          style={[
            styles.input,
            {
              backgroundColor: isDark ? '#233629' : '#F4F7F4',
              borderColor: isDark ? '#2E4D36' : '#E0E8E1',
              color: isDark ? '#FFFFFF' : AppColors.textPrimary,
              fontSize: sp(13),
            },
          ]}
        />

        <View style={{ flexDirection: 'row', gap: sp(10), marginTop: sp(14) }}>
          <View style={{ flex: 1 }}>
            <CustomButton
              title={t('familyManage.rejectToken')}
              onPress={handleReject}
              variant="outline"
              height={46}
              borderRadius={23}
              disabled={busy}
            />
          </View>
          <View style={{ flex: 1 }}>
            <CustomButton
              title={t('familyManage.acceptToken')}
              onPress={handleAccept}
              loading={busy}
              height={46}
              borderRadius={23}
            />
          </View>
        </View>

        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator size="small" color={AppColors.primary} />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp(20),
  },
  dialog: {
    width: '100%',
    borderRadius: sp(20),
    borderWidth: 1,
    padding: sp(18),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp(10),
  },
  iconWrap: {
    width: sp(34),
    height: sp(34),
    borderRadius: sp(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  hint: {
    fontFamily: FontFamily.regular,
    marginBottom: sp(12),
    lineHeight: sp(18),
  },
  input: {
    borderWidth: 1,
    borderRadius: sp(12),
    paddingHorizontal: sp(12),
    paddingVertical: sp(11),
    fontFamily: FontFamily.regular,
  },
  busyRow: {
    alignItems: 'center',
    marginTop: sp(10),
  },
});
