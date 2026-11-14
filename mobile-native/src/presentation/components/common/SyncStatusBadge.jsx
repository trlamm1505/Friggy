/**
 * SyncStatusBadge - badge nhỏ hiển thị số thao tác đang chờ đồng bộ.
 *
 * ⚠️ VÌ SAO CẦN:
 *   Khi offline, user thao tác được lưu vào hàng đợi nhưng CHƯA lên server.
 *   Không có badge, user không biết thay đổi của mình đang "treo" -> dễ
 *   thao tác lại (tạo bản ghi trùng) hoặc nghĩ app bị lỗi.
 *
 * ⚠️ HIỂN THỊ:
 *   - pendingCount > 0 -> hiện badge số (màu cảnh báo).
 *   - isSyncing -> hiện "đang đồng bộ..." (màu trung tính).
 *   - Không có gì -> ẩn hoàn toàn (không chiếm chỗ).
 *
 * R7: comment tiếng Việt.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { useTranslation } from 'react-i18next';
import { CloudUpload, RefreshCw } from 'lucide-react-native';
import { useSyncEngine } from '../../hooks/useSyncEngine';

export const SyncStatusBadge = ({ testID = 'sync-status-badge' }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { pendingCount, isSyncing } = useSyncEngine({
    autoSyncOnMount: false,
    syncOnReconnect: false,
  });

  // Không có gì để báo -> ẩn.
  if (!isSyncing && pendingCount === 0) return null;

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
