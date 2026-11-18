/**
 * MessageBubble
 *
 * Chat message bubble dùng cho AiChatScreen.
 * - sender: 'user' | 'ai'
 * - text, time
 * - avatar (optional icon component)
 *
 * ⚠️ SPRINT B4 — typed states (plan mục 5.7):
 *   `status` cho biết trạng thái của 1 message:
 *     - 'sending'  : đang chờ server nhận (mới gửi, chưa có phản hồi)
 *     - 'streaming' : đang nhận token từ SSE (hiện con trỏ nhấp nháy)
 *     - 'done'     : đã hoàn tất (mặc định)
 *     - 'error'    : lỗi (viền đỏ + icon cảnh báo)
 *   Không truyền `status` -> coi như 'done' (tương thích ngược).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily } from '../../theme/typography';
import { MarkdownText } from './MarkdownText';

export const MessageBubble = ({ message, avatar: AvatarComponent, showAvatar = true }) => {
  const { isDark } = useTheme();
  const isUser = message.sender === 'user';
  const status = message.status ?? 'done';

  const renderAvatar = () => {
    if (!showAvatar || !AvatarComponent) return null;
    return <AvatarComponent />;
  };

  // Viền đỏ cho message lỗi (chỉ áp dụng cho bubble AI).
  const borderColor =
    status === 'error'
      ? isDark
        ? '#7F1D1D'
        : '#F5C6C2'
      : isUser
        ? 'transparent'
        : isDark
          ? '#2E4D36'
          : '#A5E69C';

  return (
    <View style={[styles.row, isUser && styles.userRow]}>
      {!isUser ? renderAvatar() : null}
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
          {
            backgroundColor: isUser ? AppColors.primary : isDark ? '#19271E' : '#FFFFFF',
            borderColor,
          },
        ]}
      >
        {isUser ? (
          <Text
            style={[
              styles.bubbleText,
              {
                color: '#FFFFFF',
                fontSize: sp(14),
              },
            ]}
          >
            {message.text}
          </Text>
        ) : (
          // ⚠️ Bubble AI: render MARKDOWN (AI trả `**bold**`, `*italic*`,
          //   `## heading`, `- list`...). Trước đây render text thuần -> user
          //   thấy nguyên ký tự `**`.
          //   `streaming` -> ẩn marker chưa đóng để không nhấp nháy ký tự thô.
          <MarkdownText
            text={message.text}
            color={isDark ? '#FFFFFF' : AppColors.textPrimary}
            fontSize={sp(14)}
            isDark={isDark}
            streaming={status === 'streaming'}
            cursor={status === 'streaming' ? '▍' : null}
          />
        )}
        {message.time ? (
          <Text
            style={[
              styles.timeText,
              {
                color: isUser
                  ? 'rgba(255,255,255,0.7)'
                  : isDark
                    ? AppColors.darkTextSecondary
                    : AppColors.hintText,
                fontSize: sp(10),
              },
            ]}
          >
            {message.time}
          </Text>
        ) : null}
      </View>
      {isUser ? <View style={{ marginLeft: sp(8) }}>{renderAvatar()}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: sp(12),
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    padding: sp(12),
    borderRadius: sp(18),
    borderWidth: 1,
  },
  aiBubble: {
    borderBottomLeftRadius: sp(4),
  },
  userBubble: {
    borderBottomRightRadius: sp(4),
  },
  bubbleText: {
    fontFamily: FontFamily.regular,
    lineHeight: sp(20),
  },
  timeText: {
    fontFamily: FontFamily.regular,
    marginTop: sp(4),
    alignSelf: 'flex-end',
  },
});
