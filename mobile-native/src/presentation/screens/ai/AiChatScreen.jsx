/**
 * AiChatScreen
 *
 * Redesigned (Sprint 7):
 * - MessageBubble component (tách từ inline code)
 * - Suggestion chips khi mới mở (gợi ý câu hỏi)
 * - Animated typing indicator (3 dots fade in/out)
 * - Avatar cho AI (Bot icon) và user (User icon)
 * - Smart reply generator với pattern matching thông minh hơn
 * - Pull-down to clear chat
 * - Auto-scroll to bottom khi có tin nhắn mới
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { AppGradients } from '../../theme/gradients';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Bot, User, Sparkles } from 'lucide-react-native';
import { showInfo } from '../../utils/helpers';
import { MessageBubble } from '../../components/chat/MessageBubble';

const AIAvatar = () => {
  return (
    <View style={[styles.avatar, { backgroundColor: AppColors.primary }]}>
      <Bot color="#FFFFFF" size={16} strokeWidth={2.2} />
    </View>
  );
};

const UserAvatar = () => {
  const { isDark } = useTheme();
  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor: isDark ? '#233629' : AppColors.accentGreen,
        },
      ]}
    >
      <User color={isDark ? AppColors.primaryLight : AppColors.forestAccent} size={16} />
    </View>
  );
};

const TypingIndicator = ({ isDark }) => {
  const opacity1 = useRef(new Animated.Value(0.3)).current;
  const opacity2 = useRef(new Animated.Value(0.3)).current;
  const opacity3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animations = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity1, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity1, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(opacity2, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity2, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(opacity3, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity3, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ),
    ];
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [opacity1, opacity2, opacity3]);

  return (
    <View
      style={[
        styles.bubble,
        styles.aiBubble,
        {
          backgroundColor: isDark ? '#19271E' : '#FFFFFF',
          borderColor: isDark ? '#2E4D36' : '#A5E69C',
        },
      ]}
    >
      <View style={styles.thinkingDots}>
        <Animated.View
          style={[styles.dot, { backgroundColor: AppColors.primary, opacity: opacity1 }]}
        />
        <Animated.View
          style={[styles.dot, { backgroundColor: AppColors.primary, opacity: opacity2 }]}
        />
        <Animated.View
          style={[styles.dot, { backgroundColor: AppColors.primary, opacity: opacity3 }]}
        />
      </View>
    </View>
  );
};

const now = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const generateReply = (input, t) => {
  const lower = input.toLowerCase();
  if (lower.includes('trứng') || lower.includes('egg')) {
    return 'Với trứng trong tủ lạnh, bạn có thể làm: Trứng xào cà chua, Trứng chiên, Trứng luộc, hoặc Trứng cuộn rau. Bạn muốn công thức chi tiết không?';
  }
  if (lower.includes('cà chua') || lower.includes('tomato')) {
    return 'Cà chua rất tốt cho sức khỏe! Bạn có thể nấu: Canh cà chua, Cà chua xào trứng, Salad cà chua. Món nào bạn thích nhất?';
  }
  if (
    lower.includes('gợi ý') ||
    lower.includes('cook') ||
    lower.includes('nấu') ||
    lower.includes('today')
  ) {
    return 'Dựa trên tủ lạnh của bạn, tôi gợi ý 3 món:\n1. Trứng xào cà chua (15 phút)\n2. Canh rau củ (25 phút)\n3. Thịt heo kho trứng (45 phút)\nBạn thích món nào?';
  }
  if (lower.includes('bảo quản') || lower.includes('store')) {
    return 'Mẹo bảo quản:\n• Rau củ: rửa sạch, lau khô, cho vào hộp kín, để ngăn mát 3-5 ngày\n• Thịt: chia phần nhỏ, gói kín, cấp đông\n• Sữa: để ngăn mát, uống trong 5-7 ngày sau mở';
  }
  if (lower.includes('calo') || lower.includes('calorie')) {
    return 'Món ăn ít calo gợi ý:\n• Canh rau củ (~80 calo/bát)\n• Salad cà chua dưa chuột (~60 calo)\n• Trứng luộc (~78 calo/quả)\nBạn muốn công thức chi tiết?';
  }
  return (
    'Tôi hiểu bạn đang hỏi về "' +
    input +
    '". Tôi sẽ tìm công thức phù hợp với nguyên liệu trong tủ lạnh. Bạn cho tôi biết thêm chi tiết nhé!'
  );
};

export const AiChatScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState(() => [
    { id: 1, sender: 'ai', text: t('home.aiWelcome'), time: now() },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  const suggestionKeys = ['aiSug1', 'aiSug2', 'aiSug3', 'aiSug4'];

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, thinking]);

  const send = useCallback(
    (text) => {
      const messageText = (text ?? input).trim();
      if (!messageText) return;
      const userMsg = { id: Date.now(), sender: 'user', text: messageText, time: now() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setThinking(true);
      setTimeout(() => {
        const reply = generateReply(messageText, t);
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, sender: 'ai', text: reply, time: now() },
        ]);
        setThinking(false);
      }, 1200);
    },
    [input, t]
  );

  const handleSuggestion = useCallback(
    (key) => {
      send(t('home.' + key));
    },
    [send, t]
  );

  const clearChat = useCallback(() => {
    setMessages([{ id: Date.now(), sender: 'ai', text: t('home.aiWelcome'), time: now() }]);
    showInfo(t('home.aiClearChat'));
  }, [t]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: isDark ? '#0E1611' : AppColors.accentGreen }]}
    >
      <LinearGradient
        colors={AppGradients.getBackground(isDark).colors}
        locations={AppGradients.getBackground(isDark).locations}
        start={AppGradients.getBackground(isDark).start}
        end={AppGradients.getBackground(isDark).end}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + sp(12) }]}>
        <AIAvatarLarge />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={[
              styles.headerTitle,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(17) },
            ]}
          >
            {t('home.aiTitle')}
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text
              style={[
                styles.headerStatus,
                {
                  color: isDark ? AppColors.primaryLight : AppColors.forestAccent,
                  fontSize: sp(12),
                },
              ]}
            >
              {t('home.aiOnline')}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={clearChat}
          hitSlop={8}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Sparkles
            color={isDark ? AppColors.darkTextSecondary : AppColors.textSecondary}
            size={20}
          />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            avatar={m.sender === 'ai' ? AIAvatar : UserAvatar}
            showAvatar
          />
        ))}

        {thinking ? <TypingIndicator isDark={isDark} /> : null}

        {/* Suggestion chips (chỉ hiển thị khi mới mở) */}
        {messages.length === 1 && !thinking ? (
          <View style={styles.suggestionsBlock}>
            <Text
              style={[
                styles.suggestionsTitle,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  fontSize: sp(12),
                },
              ]}
            >
              {t('home.aiSuggestions')}
            </Text>
            <View style={styles.suggestionsWrap}>
              {suggestionKeys.map((k) => (
                <Pressable
                  key={k}
                  onPress={() => handleSuggestion(k)}
                  style={({ pressed }) => [
                    styles.suggestionChip,
                    {
                      backgroundColor: isDark ? '#19271E' : '#FFFFFF',
                      borderColor: isDark ? '#2E4D36' : '#A5E69C',
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.suggestionText,
                      {
                        color: isDark ? AppColors.primaryLight : AppColors.forestAccent,
                        fontSize: sp(12),
                      },
                    ]}
                  >
                    {t('home.' + k)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: isDark ? '#0E1611' : '#FFFFFF',
            borderTopColor: isDark ? '#2E4D36' : '#E3E8E4',
          },
        ]}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('home.aiAskPlaceholder')}
          placeholderTextColor={AppColors.hintText}
          style={[
            styles.input,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(15) },
          ]}
          multiline
        />
        <Pressable
          onPress={() => send()}
          disabled={!input.trim()}
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: AppColors.primary,
              opacity: !input.trim() ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Send color="#FFFFFF" size={20} strokeWidth={2.2} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const AIAvatarLarge = () => (
  <View style={[styles.aiAvatarLarge, { backgroundColor: AppColors.primary }]}>
    <Bot color="#FFFFFF" size={24} strokeWidth={2.2} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    // safe area top được cộng ở inline style: { paddingTop: insets.top + sp(12) }
    paddingTop: 12,
    paddingBottom: 12,
  },
  aiAvatarLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.primary,
    marginRight: 4,
  },
  headerStatus: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  messages: {
    flex: 1,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
  },
  thinkingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  suggestionsBlock: {
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  suggestionsTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  suggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  suggestionText: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
  },
});
