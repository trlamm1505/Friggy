/**
 * SyncConflictModal - modal chi tiết các thao tác offline bị XUNG ĐỘT (409).
 *
 * ⚠️ B5 - VÌ SAO CẦN:
 *   BE dùng optimistic locking: `PATCH /fridge/items/:id` bắt buộc `version`
 *   đúng mới nhất. Khi user sửa 1 món offline mà server đã có bản khác ->
 *   server trả 409 -> op bị đánh dấu `sync_state = 'conflict'` và KHÔNG
 *   được retry mỗi vòng sync (nếu không sẽ retry vô hạn).
 *
 *   -> User phải TỰ QUYẾT: giữ thay đổi của mình (thử lại với version mới)
 *      hay bỏ qua thay đổi (xoá op, kéo lại dữ liệu server).
 *
 * ⚠️ KHÔNG THÊM DEPENDENCY:
 *   Dùng `Modal` của react-native (giống `SortMenu`).
 *
 * R7: comment tiếng Việt.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, Trash2, RotateCcw } from 'lucide-react-native';
import { outboxQueue, SYNC_STATES } from '../../../data/offline/OutboxQueue';
import { useServices } from '../../../data/ServiceProvider';
import { showSuccess, showError, showInfo } from '../../utils/helpers';
import { useSyncEngine } from '../../hooks/useSyncEngine';

export const SyncConflictModal = ({ visible, onClose, testID = 'sync-conflict-modal' }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { fridgeService } = useServices();
  const { syncNow } = useSyncEngine({ autoSyncOnMount: false, syncOnReconnect: false });

  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  /**
   * Nạp danh sách op đang conflict.
   */
  const loadConflicts = useCallback(async () => {
    try {
      const rows = await outboxQueue.listByState(SYNC_STATES.CONFLICT);
      setConflicts(rows);
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[SyncConflictModal] không đọc được conflict:', e?.message);
      }
    }
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    loadConflicts();
    return undefined;
  }, [visible, loadConflicts]);

  /**
   * BỎ QUA: xoá op conflict + kéo lại dữ liệu server (đồng bộ ngay).
   */
  const handleDiscard = useCallback(
    async (op) => {
      setBusyId(op.id);
      try {
        await outboxQueue.clearConflict(op.id);
        await loadConflicts();
        await syncNow();
        showSuccess(t('offline.conflictDiscarded'));
      } catch (e) {
        showError(e?.message || t('offline.conflictActionFailed'));
      } finally {
        setBusyId(null);
      }
    },
    [loadConflicts, syncNow, t]
  );

  /**
   * THỬ LẠI: lấy version mới nhất từ server rồi đưa op về hàng đợi.
   *
   * ⚠️ `requeueWithVersion` ghi version vào payload -> BE nhận đúng version
   *   -> không còn 409.
   */
  const handleRetry = useCallback(
    async (op) => {
      setBusyId(op.id);
      try {
        let version;
        // Chỉ item tủ lạnh mới có optimistic locking -> cần version mới.
        if (op.op_type?.startsWith('fridge_') && op.entity_id) {
          try {
            const items = await fridgeService.getItems({});
            const found = (items ?? []).find((i) => i?.id === op.entity_id);
            version = found?.version ?? undefined;
          } catch (e) {
            // Không lấy được version -> vẫn thử lại với version cũ trong payload.
          }
        }

        const ok = await outboxQueue.requeueWithVersion(op.id, version);
        if (!ok) {
          showInfo(t('offline.conflictActionFailed'));
          return;
        }
        await loadConflicts();
        await syncNow();
        showSuccess(t('offline.conflictRetried'));
      } catch (e) {
        showError(e?.message || t('offline.conflictActionFailed'));
      } finally {
        setBusyId(null);
      }
    },
    [fridgeService, loadConflicts, syncNow, t]
  );

  const close = useCallback(() => {
    onClose?.();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View
          testID={testID}
          style={[
            styles.card,
            {
              backgroundColor: isDark ? AppColors.darkCardBg : '#FFFFFF',
              borderColor: isDark ? AppColors.darkCardBorder : AppColors.border,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: AppColors.error }]}>
              <AlertTriangle color="#FFFFFF" size={18} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, marginLeft: sp(10) }}>
              <Text
                style={[
                  styles.title,
                  { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) },
                ]}
              >
                {t('offline.conflictTitle')}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
                ]}
              >
                {t('offline.conflictSubtitle')}
              </Text>
            </View>
            <Pressable onPress={close} hitSlop={10} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <X color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={20} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={AppColors.primary} />
            </View>
          ) : conflicts.length === 0 ? (
            <Text
              style={[
                styles.emptyText,
                { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
              ]}
            >
              {t('offline.conflictEmpty')}
            </Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: sp(4) }}>
              {conflicts.map((op) => (
                <View
                  key={op.id}
                  style={[
                    styles.row,
                    {
                      backgroundColor: isDark ? '#233629' : '#F7FAF7',
                      borderColor: isDark ? AppColors.darkCardBorder : AppColors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: isDark ? '#FFFFFF' : AppColors.textPrimary },
                      ]}
                    >
                      {t(`offline.opType.${op.op_type}`, { defaultValue: op.op_type })}
                    </Text>
                    {op.entity_id ? (
                      <Text
                        style={[
                          styles.rowSub,
                          { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary },
                        ]}
                      >
                        {op.entity_id}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => handleRetry(op)}
                      disabled={busyId === op.id}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        { borderColor: AppColors.primary, opacity: pressed ? 0.6 : 1 },
                      ]}
                    >
                      <RotateCcw size={13} strokeWidth={2.4} color={AppColors.primary} />
                      <Text style={[styles.actionText, { color: AppColors.primary }]}>
                        {t('offline.conflictRetry')}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleDiscard(op)}
                      disabled={busyId === op.id}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        { borderColor: AppColors.error, opacity: pressed ? 0.6 : 1 },
                      ]}
                    >
                      <Trash2 size={13} strokeWidth={2.4} color={AppColors.error} />
                      <Text style={[styles.actionText, { color: AppColors.error }]}>
                        {t('offline.conflictDiscard')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp(20),
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: sp(18),
    borderWidth: 1,
    padding: sp(16),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp(12),
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
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: sp(11),
    marginTop: sp(2),
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: sp(16),
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: sp(13),
    textAlign: 'center',
    paddingVertical: sp(16),
  },
  list: {
    maxHeight: sp(320),
  },
  row: {
    borderRadius: sp(12),
    borderWidth: 1,
    padding: sp(10),
    marginBottom: sp(8),
  },
  rowTitle: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    fontSize: sp(13),
  },
  rowSub: {
    fontFamily: FontFamily.regular,
    fontSize: sp(11),
    marginTop: sp(2),
  },
  actions: {
    flexDirection: 'row',
    gap: sp(8),
    marginTop: sp(10),
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(5),
    borderWidth: 1,
    borderRadius: sp(14),
    paddingHorizontal: sp(10),
    paddingVertical: sp(5),
  },
  actionText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    fontSize: sp(11),
  },
});

export default SyncConflictModal;
