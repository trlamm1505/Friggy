/**
 * AiChatHistorySheet - bottom sheet danh sách lịch sử trò chuyện với Đầu bếp AI.
 *
 * ⚠️ VÌ SAO TÁCH RIÊNG (không nhét vào `AiChatScreen`):
 *   - `AiChatScreen.jsx` đã dài (header + messages + input + streaming logic).
 *     Tách sheet ra giữ file màn hình tập trung vào "gửi tin + nhận chunk".
 *   - Sheet KHÔNG điều hướng đi nơi khác: nó trả `session` về cho cha qua
 *     `onSelectSession(session)`, cha quyết định có mở lại session đó hay không.
 *
 * NGUỒN SỰ THẬT (KHÔNG hardcode):
 *   - Danh sách phiên: `GET /ai-chat/sessions` -> `service.getSessions()`
 *   - Chi tiết phiên: `GET /ai-chat/sessions/{id}` -> `service.getSessionDetail(id)`
 *   - Tên phiên: BE trả `title` (có thể `null`) -> fallback sang chuỗi dịch "Cuộc trò chuyện"
 *   - Số tin nhắn: BE trả `messageCount` -> hiển thị "N tin nhắn"
 *   - Thời gian: BE trả `updatedAt` (ISO) -> format bằng `toLocaleString('vi-VN')`
 *
 * AN TOÀN:
 *   - `visible=false` -> return null (không render, không mở animation).
 *   - Lỗi mạng -> hiện `aiHistoryLoadError` TRONG sheet, KHÔNG fallback về danh sách
 *     giả (R3: user phải thấy lỗi thật).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Trash2, X } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';

/**
 * Format thời gian từ ISO string của BE.
 * Trả về chuỗi rỗng nếu date không hợp lệ.
 */
export const formatSessionTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const AiChatHistorySheet = ({
  visible,
  onClose,
  onSelectSession,
  onDeleteSession,
  loadSessions,
  currentSessionId = null,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Session đang bị xóa -> disable nút xóa của chính nó để tránh double-tap.
  const [deletingId, setDeletingId] = useState(null);

  // Nạp lại danh sách mỗi lần mở sheet.
  //
  // ⚠️ `setState` KHÔNG được gọi đồng bộ trong thân effect (rule
  // `react-hooks/set-state-in-effect`) -> gây cascading render. Vì vậy mọi
  // `setState` nằm trong callback bất đồng bộ của `load()`.
  useEffect(() => {
    if (!visible) return undefined;

    let cancelled = false;

    const load = async () => {
      try {
        const list = await loadSessions();
        if (cancelled) return;
        setSessions(Array.isArray(list) ? list : []);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message ?? t('home.aiHistoryLoadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // `setLoading(true)` đặt trong microtask để không chạy đồng bộ trong effect.
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    load();
    return () => {
      cancelled = true;
    };
  }, [visible, loadSessions, t]);

  const handleDelete = useCallback(
    async (session) => {
      if (!session?.id || deletingId) return;
      setDeletingId(session.id);
      try {
        await onDeleteSession(session);
        // Xóa thành công -> cập nhật danh sách local, không cần load lại.
        setSessions((prev) => prev.filter((s) => s.id !== session.id));
      } catch (e) {
        setError(e?.message ?? t('home.aiDeleteFailed'));
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, onDeleteSession, t]
  );

  const renderItem = useCallback(
    ({ item }) => {
      const isCurrent = item.id === currentSessionId;
      const title = item.title?.trim() || t('home.aiHistoryUntitled');
      const time = formatSessionTime(item.updatedAt ?? item.createdAt);
      const count = Number(item.messageCount) || 0;

      return (
        <View
          style={[
            styles.item,
            {
              backgroundColor: isDark ? '#19271E' : '#FFFFFF',
              borderColor: isCurrent ? AppColors.primary : isDark ? '#2E4D36' : '#E3E8E4',
            },
          ]}
        >
          <Pressable
            onPress={() => onSelectSession(item)}
            accessibilityRole="button"
            accessibilityLabel={t('home.aiHistoryOpen')}
            style={({ pressed }) => [styles.itemMain, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={styles.itemIconWrap}>
              <MessageCircle
                color={isDark ? AppColors.primaryLight : AppColors.primary}
                size={18}
                strokeWidth={2}
              />
            </View>
            <View style={styles.itemTextWrap}>
              <Text
                numberOfLines={1}
                style={[
                  styles.itemTitle,
                  {
                    color: isDark ? '#FFFFFF' : AppColors.textPrimary,
                    fontSize: sp(14),
                  },
                ]}
              >
                {title}
              </Text>
              <Text
                style={[
                  styles.itemMeta,
                  {
                    color: isDark ? AppColors.darkTextSecondary : AppColors.hintText,
                    fontSize: sp(11),
                  },
                ]}
              >
                {[count > 0 ? t('home.aiHistoryItemCount', { count }) : null, time || null]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
            </View>
            {isCurrent ? (
              <Text
                style={[
                  styles.currentTag,
                  { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(10) },
                ]}
              >
                {t('home.aiHistoryCurrent')}
              </Text>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => handleDelete(item)}
            disabled={deletingId === item.id}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('home.aiDeleteChat')}
            style={({ pressed }) => [
              styles.deleteBtn,
              { opacity: deletingId === item.id ? 0.4 : pressed ? 0.6 : 1 },
            ]}
          >
            {deletingId === item.id ? (
              <ActivityIndicator size="small" color={AppColors.error ?? '#B91C1C'} />
            ) : (
              <Trash2 color={isDark ? '#FCA5A5' : '#B91C1C'} size={17} strokeWidth={2} />
            )}
          </Pressable>
        </View>
      );
    },
    [currentSessionId, deletingId, handleDelete, onSelectSession, t, isDark]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: isDark ? '#0E1611' : '#FFFFFF',
            paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 20,
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: isDark ? '#2E4D36' : '#D8E0DA' }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: isDark ? '#FFFFFF' : AppColors.textPrimary,
                fontSize: sp(17),
              },
            ]}
          >
            {t('home.aiHistoryTitle')}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('home.aiClearChat')}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <X color={isDark ? AppColors.darkTextSecondary : AppColors.textSecondary} size={20} />
          </Pressable>
        </View>

        {/* Body */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={AppColors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text
              style={[
                styles.errorText,
                { color: isDark ? '#FCA5A5' : '#B91C1C', fontSize: sp(13) },
              ]}
            >
              {error}
            </Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.centerBox}>
            <MessageCircle
              color={isDark ? AppColors.darkTextSecondary : AppColors.hintText}
              size={38}
              strokeWidth={1.5}
            />
            <Text
              style={[
                styles.emptyTitle,
                {
                  color: isDark ? '#FFFFFF' : AppColors.textPrimary,
                  fontSize: sp(15),
                },
              ]}
            >
              {t('home.aiHistoryEmpty')}
            </Text>
            <Text
              style={[
                styles.emptyHint,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.hintText,
                  fontSize: sp(12),
                },
              ]}
            >
              {t('home.aiHistoryEmptyHint')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: sp(16),
    paddingTop: sp(8),
  },
  handleWrap: {
    alignItems: 'center',
    paddingBottom: sp(8),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: sp(12),
  },
  title: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  listContent: {
    paddingBottom: sp(8),
    gap: sp(8),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingRight: sp(6),
  },
  itemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp(10),
    paddingLeft: sp(10),
  },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,100,40,0.08)',
    marginRight: sp(10),
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  itemMeta: {
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  currentTag: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: sp(8),
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sp(32),
  },
  emptyTitle: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginTop: sp(12),
  },
  emptyHint: {
    fontFamily: FontFamily.regular,
    marginTop: sp(4),
    textAlign: 'center',
  },
  errorText: {
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    lineHeight: sp(18),
  },
});
