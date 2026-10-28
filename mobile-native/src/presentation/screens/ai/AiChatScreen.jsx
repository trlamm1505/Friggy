/**
 * AiChatScreen
 *
 * ⚠️ SPRINT B4 — ĐÃ NỐI BE THẬT (trước đây là `generateReply()` hardcode).
 *
 * Luồng thật (2 bước, xem `ai-chat.controller.ts`):
 *   1. POST /ai-chat/sessions/{id}/messages  -> 202 (đã nhận)
 *   2. Mở SSE GET /ai-chat/sessions/{id}/stream -> nhận `chunk` / `done` / `error`
 *
 * ⚠️ PHÂN GIẢI SERVICE (không sửa `ServiceProvider.jsx` — file immutable):
 *   `useServiceHooks.js` cũng immutable nên không thêm hook. Key
 *   `aiChatService` không có trong `ServiceProvider.defaultServices`, nên ta
 *   đọc thẳng từ registry:
 *     - `isMockMode()` -> dùng `MockAiChatService` (demo UI, không đụng BE)
 *     - ngược lại      -> dùng `RealAiChatService` đã đăng ký side-effect
 *
 *   ⚠️ TUYỆT ĐỐI KHÔNG fallback sang mock khi BE lỗi (R3): user phải thấy
 *   lỗi thật, không phải câu trả lời giả.
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
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Bot, User, Sparkles } from 'lucide-react-native';
import { showInfo, showError } from '../../utils/helpers';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ScreenBackground } from '../../components/common/ScreenBackground';
import { getRegisteredService, isMockMode } from '../../../data/api/ServiceRegistry';
import { MockAiChatService } from '../../../data/services/mock/MockAiChatService';

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

/**
 * Lấy service AI Chat phù hợp với mode hiện tại.
 *
 * @returns {object} service có `createSession` / `sendMessage` / `streamSession`
 */
const resolveAiChatService = () => {
  if (isMockMode()) {
    return new MockAiChatService();
  }
  // Real đã đăng ký side-effect ở `RealAiChatService.js` -> import file đó
  // để chắc chắn đã đăng ký (side-effect import không có biến export).
  require('../../../data/services/real/RealAiChatService');
  return getRegisteredService('aiChatService');
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
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // Phiên chat hiện tại (BE giữ lịch sử theo sessionId).
  const sessionIdRef = useRef(null);
  const serviceRef = useRef(null);
  // Dùng để huỷ stream khi user gửi tin mới hoặc rời màn hình.
  const abortRef = useRef(null);

  const suggestionKeys = ['aiSug1', 'aiSug2', 'aiSug3', 'aiSug4'];

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, thinking, streamingText]);

  // Tạo phiên chat khi vào màn hình (nếu chưa có).
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const service = resolveAiChatService();
        serviceRef.current = service;
        if (!service) return;

        const session = await service.createSession();
        if (cancelled) return;
        sessionIdRef.current = session?.id ?? null;
      } catch (e) {
        if (cancelled) return;
        // Lỗi tạo phiên -> vẫn cho user gõ, lúc gửi sẽ báo lỗi rõ ràng.
        setError(e?.message ?? t('home.aiError'));
      }
    };

    init();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback(
    async (text) => {
      const messageText = (text ?? input).trim();
      if (!messageText) return;
      if (thinking) return;

      const service = serviceRef.current;
      if (!service) {
        showError(t('home.aiError'));
        return;
      }

      // Chưa có session -> thử tạo lại (lần trước có thể lỗi mạng).
      if (!sessionIdRef.current) {
        try {
          const session = await service.createSession();
          sessionIdRef.current = session?.id ?? null;
        } catch (e) {
          setError(e?.message ?? t('home.aiError'));
          showError(t('home.aiError'));
          return;
        }
      }

      const userMsg = { id: `u-${Date.now()}`, sender: 'user', text: messageText, time: now() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setThinking(true);
      setError(null);
      setStreamingText('');

      // Huỷ stream cũ nếu còn chạy.
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // ⚠️ THỨ TỰ BẮT BUỘC: mở SSE TRƯỚC, gửi message SAU.
        //
        // BE `POST /messages` publish job lên RabbitMQ, ai-service xử lý và
        // PUBLISH chunk ĐẦU TIÊN vào Redis rất nhanh. Nếu FE gửi message
        // trước rồi mới mở SSE, các chunk đầu có thể bị publish TRƯỚC khi
        // BE kịp subscribe -> MẤT token đầu tiên của câu trả lời.
        //
        // Tham chiếu: Flutter làm đúng thứ tự này
        // (`Mobile/lib/screens/ai_chat_screen.dart:258` — comment
        // "Subscribe to SSE stream FIRST so we catch real-time tokens").
        const iterator = service
          .streamSession(sessionIdRef.current, { signal: controller.signal })
          [Symbol.asyncIterator]();

        // `next()` đầu tiên mở kết nối HTTP (generator lazy) -> subscribe
        // Redis phía BE được thiết lập TRƯỚC khi message được gửi.
        const firstEvent = iterator.next();

        // Bước 1: gửi tin nhắn (BE trả 202).
        try {
          await service.sendMessage(sessionIdRef.current, messageText);
        } catch (sendError) {
          // Gửi lỗi -> huỷ stream, tránh promise `firstEvent` bị unhandled.
          controller.abort();
          firstEvent.catch(() => {});
          throw sendError;
        }

        // Bước 2: nối chunk vào message đang stream.
        let accumulated = '';
        // Cờ đã chốt message -> tránh thêm trùng khi stream đóng sau `done`.
        let committed = false;

        let result = await firstEvent;

        while (!result.done) {
          if (controller.signal.aborted) break;

          const evt = result.value;

          if (evt.event === 'chunk') {
            accumulated += evt.data ?? '';
            setStreamingText(accumulated);
          } else if (evt.event === 'done') {
            // Chốt message AI vào danh sách.
            const finalText = accumulated.trim() ? accumulated : t('home.aiEmptyReply');
            setMessages((prev) => [
              ...prev,
              { id: `a-${Date.now()}`, sender: 'ai', text: finalText, time: now() },
            ]);
            setStreamingText('');
            setThinking(false);
            committed = true;
            break;
          } else if (evt.event === 'error') {
            throw new Error(
              typeof evt.data === 'string' ? evt.data : (evt.data?.message ?? t('home.aiError'))
            );
          }
          // `tool_call` / `tool_result` -> bỏ qua, chỉ dùng để báo trạng thái.

          result = await iterator.next();
        }

        // Server đóng stream mà KHÔNG gửi `done` -> vẫn chốt text đã nhận.
        // ⚠️ Chỉ chạy khi chưa chốt ở nhánh `done` (tránh thêm message trùng).
        if (!committed && accumulated.trim() && !controller.signal.aborted) {
          setMessages((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, sender: 'ai', text: accumulated, time: now() },
          ]);
          setStreamingText('');
        }
        setThinking(false);
      } catch (e) {
        // R3: lỗi thật -> hiện ra UI, KHÔNG bịa câu trả lời.
        // ⚠️ Nếu stream bị huỷ (unmount / user gửi tin mới) -> im lặng, KHÔNG
        // báo lỗi (abort là hành động chủ động, không phải lỗi mạng).
        if (controller.signal.aborted) {
          setThinking(false);
          return;
        }

        const message = e?.message ?? t('home.aiError');
        setError(message);
        setStreamingText('');
        setThinking(false);
        showError(message);
      }
    },
    [input, thinking, t]
  );

  const handleSuggestion = useCallback(
    (key) => {
      send(t('home.' + key));
    },
    [send, t]
  );

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([{ id: Date.now(), sender: 'ai', text: t('home.aiWelcome'), time: now() }]);
    setStreamingText('');
    setThinking(false);
    setError(null);
    showInfo(t('home.aiClearChat'));
  }, [t]);

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
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

          {/* Message đang stream — hiện text tới dần */}
          {streamingText ? (
            <MessageBubble
              message={{ sender: 'ai', text: streamingText, time: null }}
              avatar={AIAvatar}
              showAvatar
            />
          ) : null}

          {thinking && !streamingText ? <TypingIndicator isDark={isDark} /> : null}

          {/* Lỗi thật từ BE */}
          {error ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: isDark ? '#3A1E1E' : '#FDECEA',
                  borderColor: isDark ? '#7F1D1D' : '#F5C6C2',
                },
              ]}
            >
              <Text
                style={[
                  styles.errorText,
                  { color: isDark ? '#FCA5A5' : '#B91C1C', fontSize: sp(12) },
                ]}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* Suggestion chips (chỉ hiển thị khi mới mở) */}
          {messages.length === 1 && !thinking && !streamingText ? (
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
            disabled={!input.trim() || thinking}
            accessibilityRole="button"
            accessibilityLabel={t('home.aiSend')}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: AppColors.primary,
                opacity: !input.trim() || thinking ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Send color="#FFFFFF" size={20} strokeWidth={2.2} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
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
  errorBox: {
    padding: sp(12),
    borderRadius: sp(12),
    borderWidth: 1,
    marginBottom: sp(12),
  },
  errorText: {
    fontFamily: FontFamily.regular,
    lineHeight: sp(18),
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
