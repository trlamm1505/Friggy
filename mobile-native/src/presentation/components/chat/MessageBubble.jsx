/**
 * MessageBubble
 *
 * Chat message bubble dùng cho AiChatScreen.
 * - sender: 'user' | 'ai'
 * - text, time
 * - avatar (optional icon component)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily } from '../../theme/typography';

export const MessageBubble = ({
  message,
  avatar: AvatarComponent,
  showAvatar = true,
}) => {
  const { isDark } = useTheme();
  const isUser = message.sender === 'user';

  const renderAvatar = () => {
    if (!showAvatar || !AvatarComponent) return null;
    return <AvatarComponent />;
  };

  return (
    <View style={[styles.row, isUser && styles.userRow]}>
      {!isUser ? renderAvatar() : null}
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
          {
            backgroundColor: isUser
              ? AppColors.primary
              : isDark
              ? '#19271E'
              : '#FFFFFF',
            borderColor: isUser
              ? 'transparent'
              : isDark
              ? '#2E4D36'
              : '#A5E69C',
          },
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            {
              color: isUser ? '#FFFFFF' : isDark ? '#FFFFFF' : AppColors.textPrimary,
              fontSize: sp(14),
            },
          ]}
        >
          {message.text}
        </Text>
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
