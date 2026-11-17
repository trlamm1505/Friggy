/**
 * SyncStatusBadge - badge nhỏ hiển thị số thao tác đang chờ đồng bộ.
 *
 * ⚠️ VÌ SAO CẦN:
 *   Khi offline, user thao tác được lưu vào hàng đợi nhưng CHƯA lên server.
 *   Không có badge, user không biết thay đổi của mình đang "treo" -> dễ
 *   thao tác lại (tạo bản ghi trùng) hoặc nghĩ app bị lỗi.
 *
 * ⚠️ HIỂN THỊ:
 *   - conflictCount > 0 -> badge ĐỎ "N thao tác lỗi" (B5), bấm được ->
 *     mở modal chi tiết để user BỎ QUA / THỬ LẠI từng thao tác.
 *   - pendingCount > 0 -> hiện badge số (màu cảnh báo).
 *   - isSyncing -> hiện "đang đồng bộ..." (màu trung tính).
 *   - Không có gì -> ẩn hoàn toàn (không chiếm chỗ).
 *
 * R7: comment tiếng Việt.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { useTranslation } from 'react-i18next';
import { CloudUpload, RefreshCw, AlertTriangle } from 'lucide-react-native';
import { useSyncEngine } from '../../hooks/useSyncEngine';
import { SyncConflictModal } from './SyncConflictModal';

export const SyncStatusBadge = ({ testID = 'sync-status-badge' }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { pendingCount, isSyncing, conflictCount } = useSyncEngine({
    autoSyncOnMount: false,
    syncOnReconnect: false,
  });

  const [conflictVisible, setConflictVisible] = useState(false);

  // Không có gì để báo -> ẩn.
  if (!isSyncing && pendingCount === 0 && conflictCount === 0) return null;

  // ⚠️ B5: có conflict -> badge ĐỎ, bấm được -> mở modal chi tiết.
  if (conflictCount > 0) {
    const conflictLabel = t('offline.conflictCount', { count: conflictCount });

    return (
      <>
        <Pressable
          testID={`${testID}-conflict`}
          accessibilityRole="button"
          accessibilityLabel={conflictLabel}
          onPress={() => setConflictVisible(true)}
          style={({ pressed }) => [
            styles.container,
            {
              backgroundColor: isDark ? '#3A1F1F' : '#FDECEA',
              borderColor: isDark ? '#5C2B2B' : '#F5C6C2',
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <AlertTriangle size={13} strokeWidth={2.4} color={AppColors.error} />
          <Text style={[styles.text, { color: AppColors.error, fontSize: sp(11) }]}>
            {conflictLabel}
          </Text>
        </Pressable>

        <SyncConflictModal visible={conflictVisible} onClose={() => setConflictVisible(false)} />
      </>
    );
  }

  const label = isSyncing
    ? t('offline.syncing')
    : pendingCount === 1
      ? t('offline.syncPendingOne')
      : t('offline.syncPending', { count: pendingCount });

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#233629' : '#F1F8E9',
          borderColor: isDark ? '#2E4D36' : '#C8E6C9',
        },
      ]}
    >
      {isSyncing ? (
        <RefreshCw size={13} strokeWidth={2.4} color={AppColors.primary} />
      ) : (
        <CloudUpload size={13} strokeWidth={2.4} color={AppColors.primary} />
      )}
      <Text style={[styles.text, { color: AppColors.primary, fontSize: sp(11) }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(5),
    paddingHorizontal: sp(9),
    paddingVertical: sp(5),
    borderRadius: sp(20),
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
  },
});

export default SyncStatusBadge;
