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
import { Send, Bot, User, History, Plus, Trash2 } from 'lucide-react-native';
import { showInfo, showError, showSuccess } from '../../utils/helpers';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { AiChatHistorySheet } from '../../components/chat/AiChatHistorySheet';
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
 * Chiều cao tổng của `CustomBottomNav` (bar 62 + padding trên/dưới + safe area).
 *
 * ⚠️ `CustomBottomNav` dùng `position: 'absolute'` -> nó ĐÈ lên mọi màn hình
 * nằm trong tab. Màn hình nào có UI ở đáy (input bar, nút hành động) đều phải
 * chừa đúng khoảng này, nếu không user sẽ không thấy / không bấm được.
 *
 * Nguồn sự thật: `CustomBottomNav.jsx` — `bar.height = 62`,
 * `paddingBottom = insets.bottom > 0 ? insets.bottom + 4 : 16`.
 * Dùng 100 (như `HomeScreen` / `FridgeInventoryScreen`) để có khoảng đệm an toàn.
 */
const BOTTOM_NAV_TOTAL_HEIGHT = 100;

/**
 * Format thời gian từ ISO string của BE (dùng khi nạp lại lịch sử chat).
 * Trả về chuỗi rỗng nếu date không hợp lệ.
 */
const formatMessageTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
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

  // Sheet lịch sử trò chuyện.
  const [historyVisible, setHistoryVisible] = useState(false);
  // Đang tạo session mới -> disable nút để tránh double-tap.
  const [creatingSession, setCreatingSession] = useState(false);

  const suggestionKeys = ['aiSug1', 'aiSug2', 'aiSug3', 'aiSug4'];

  /**
   * Tạo phiên chat mới và dùng làm phiên hiện tại.
   *
   * @returns {Promise<object|null>} session vừa tạo, hoặc null nếu lỗi.
   */
  const createSession = useCallback(async () => {
    const service = serviceRef.current;
    if (!service) return null;
    try {
      const session = await service.createSession();
      return session ?? null;
    } catch (e) {
      setError(e?.message ?? t('home.aiError'));
      return null;
    }
  }, [t]);

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

  /**
   * Nạp danh sách phiên chat cho sheet lịch sử.
   * Được truyền xuống `AiChatHistorySheet` qua prop `loadSessions`.
   *
   * ⚠️ Lọc bỏ phiên RỖNG (`messageCount === 0`):
   *   `AiChatScreen` tạo 1 session ngay khi mở app (để user chat được ngay),
   *   kể cả khi user chưa hỏi gì. Mỗi lần mở app lại sinh 1 phiên rỗng ->
   *   danh sách lịch sử lại đầy phiên trống, user thấy rác.
   *   Phiên rỗng không có giá trị gì trong "lịch sử trò chuyện" -> ẩn đi.
   */
  const loadSessions = useCallback(async () => {
    const service = serviceRef.current;
    if (!service) return [];
    const list = await service.getSessions({ page: 1, limit: 50 });
    return (Array.isArray(list) ? list : []).filter((s) => (s?.messageCount ?? 0) > 0);
  }, []);

  /**
   * Mở lại một phiên chat đã có: nạp lịch sử message của phiên đó và
   * hiển thị lại trong khung chat.
   *
   * ⚠️ Lịch sử BE có `role: 'user' | 'assistant'` -> UI dùng `sender: 'user' | 'ai'`.
   */
  const openSession = useCallback(
    async (session) => {
      const service = serviceRef.current;
      if (!service?.getSessionDetail || !session?.id) return;

      try {
        // `limit: 100` = max BE cho phép -> nạp được nhiều lịch sử nhất có thể.
        const detail = await service.getSessionDetail(session.id, { page: 1, limit: 100 });
        const history = detail?.messages ?? [];

        // Chuyển message BE -> shape của UI (sender/text/time).
        const restored = history.map((m, idx) => ({
          id: m.id ?? `hist-${idx}`,
          sender: m.role === 'assistant' ? 'ai' : 'user',
          text: m.content ?? '',
          time: formatMessageTime(m.createdAt),
          status: 'done',
        }));

        // Đang có phiên khác -> huỷ stream cũ trước khi chuyển.
        abortRef.current?.abort();
        sessionIdRef.current = session.id;
        setStreamingText('');
        setThinking(false);
        setError(null);

        setMessages(
          restored.length > 0
            ? restored
            : [{ id: `w-${Date.now()}`, sender: 'ai', text: t('home.aiWelcome'), time: now() }]
        );
        setHistoryVisible(false);
      } catch (e) {
        showError(e?.message ?? t('home.aiHistoryLoadFailed'));
      }
    },
    [t]
  );

  /**
   * Tạo cuộc trò chuyện mới: huỷ stream, tạo session mới, reset khung chat.
   */
  const startNewChat = useCallback(async () => {
    if (creatingSession) return;

    setCreatingSession(true);
    try {
      const session = await createSession();
      if (!session) {
        showError(t('home.aiError'));
        return;
      }

      abortRef.current?.abort();
      sessionIdRef.current = session.id;
      setMessages([
        { id: `w-${Date.now()}`, sender: 'ai', text: t('home.aiWelcome'), time: now() },
      ]);
      setStreamingText('');
      setThinking(false);
      setError(null);
      setHistoryVisible(false);
      showSuccess(t('home.aiNewChatDone'));
    } finally {
      setCreatingSession(false);
    }
  }, [createSession, creatingSession, t]);

  /**
   * Xóa phiên chat hiện tại (hoặc phiên bất kỳ được gọi từ sheet lịch sử).
   *
   * ⚠️ Nếu xóa đúng phiên đang mở -> tạo phiên mới để user vẫn chat được.
   */
  const deleteSession = useCallback(
    async (session) => {
      const service = serviceRef.current;
      if (!service?.deleteSession || !session?.id) return;

      await service.deleteSession(session.id);

      // Xóa phiên đang mở -> tạo phiên mới, reset khung chat.
      if (session.id === sessionIdRef.current) {
        const next = await createSession();
        abortRef.current?.abort();
        sessionIdRef.current = next?.id ?? null;
        setMessages([
          { id: `w-${Date.now()}`, sender: 'ai', text: t('home.aiWelcome'), time: now() },
        ]);
        setStreamingText('');
        setThinking(false);
      }

      showSuccess(t('home.aiDeleteDone'));
    },
    [createSession, t]
  );

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

      const userMsg = {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: messageText,
        time: now(),
        status: 'sending',
      };
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

        // ⚠️ Gắn handler NGAY để không có "unhandled promise rejection".
        //   `firstEvent` có thể reject (vd SSE trả 429 hết lượt AI) TRƯỚC khi
        //   `await service.sendMessage()` xong. Nếu chưa có handler, runtime
        //   báo unhandled rejection (đỏ màn hình ở dev Hermes).
        //   Handler này KHÔNG nuốt lỗi: `await firstEvent` bên dưới vẫn ném
        //   đúng error gốc ra ngoài -> UI hiển thị lỗi thật (R3).
        firstEvent.catch(() => {});

        // Bước 1: gửi tin nhắn (BE trả 202).
        try {
          await service.sendMessage(sessionIdRef.current, messageText);
          // Server đã nhận -> message user chuyển từ 'sending' sang 'done'.
          setMessages((prev) =>
            prev.map((m) => (m.id === userMsg.id ? { ...m, status: 'done' } : m))
          );
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
              {
                id: `a-${Date.now()}`,
                sender: 'ai',
                text: finalText,
                time: now(),
                status: 'done',
              },
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
            {
              id: `a-${Date.now()}`,
              sender: 'ai',
              text: accumulated,
              time: now(),
              status: 'done',
            },
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
          // Abort là hành động chủ động (user gửi tin mới / rời màn hình)
          // -> message không phải lỗi, chuyển về 'done' cho khỏi bị kẹt ở 'sending'.
          setMessages((prev) =>
            prev.map((m) => (m.id === userMsg.id ? { ...m, status: 'done' } : m))
          );
          return;
        }

        // ⚠️ 429 = hết lượt AI tuần này (BE `AiUsageLimitGuard`).
        //   Hiện message riêng cho dễ hiểu, KHÔNG bịa câu trả lời.
        const isAiLimit = e?.statusCode === 429;
        const message = isAiLimit ? t('home.aiLimitReached') : (e?.message ?? t('home.aiError'));
        setError(message);
        setStreamingText('');
        setThinking(false);
        // Message user gửi đi bị lỗi -> đánh dấu luôn để user thấy rõ.
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsg.id ? { ...m, status: 'error' } : m))
        );
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

  /**
   * Xóa cuộc trò chuyện hiện tại.
   *
   * ⚠️ KHÔNG chỉ reset local: gọi `DELETE /ai-chat/sessions/{id}` để BE xoá
   * thật, rồi tạo phiên mới -> user vẫn chat được ngay.
   */
  const clearChat = useCallback(async () => {
    const service = serviceRef.current;
    const currentId = sessionIdRef.current;

    abortRef.current?.abort();
    setStreamingText('');
    setThinking(false);
    setError(null);

    if (service?.deleteSession && currentId) {
      try {
        await service.deleteSession(currentId);
      } catch (e) {
        showError(e?.message ?? t('home.aiDeleteFailed'));
        return;
      }
    }

    const next = await createSession();
    sessionIdRef.current = next?.id ?? null;
    setMessages([{ id: Date.now(), sender: 'ai', text: t('home.aiWelcome'), time: now() }]);
    showInfo(t('home.aiClearChat'));
  }, [createSession, t]);

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
          <View style={styles.headerActions}>
            {/* 1. Xem lại lịch sử trò chuyện */}
            <Pressable
              onPress={() => setHistoryVisible(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('home.aiHistory')}
              style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <History
                color={isDark ? AppColors.darkTextSecondary : AppColors.textSecondary}
                size={20}
                strokeWidth={2}
              />
            </Pressable>

            {/* 2. Tạo cuộc trò chuyện mới */}
            <Pressable
              onPress={startNewChat}
              disabled={creatingSession}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('home.aiNewChat')}
              style={({ pressed }) => [
                styles.headerBtn,
                { opacity: creatingSession ? 0.4 : pressed ? 0.6 : 1 },
              ]}
            >
              <Plus
                color={isDark ? AppColors.darkTextSecondary : AppColors.textSecondary}
                size={20}
                strokeWidth={2}
              />
            </Pressable>

            {/* 3. Xóa cuộc trò chuyện hiện tại */}
            <Pressable
              onPress={clearChat}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('home.aiDeleteChat')}
              style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Trash2
                color={isDark ? AppColors.darkTextSecondary : AppColors.textSecondary}
                size={19}
                strokeWidth={2}
              />
            </Pressable>
          </View>
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
              message={{ sender: 'ai', text: streamingText, time: null, status: 'streaming' }}
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
              // ⚠️ BẮT BUỘC: `CustomBottomNav` dùng `position: 'absolute'` và nằm
              // ĐÈ lên content. Không paddingBottom ở đây thì ô nhập + nút Gửi bị
              // bottom nav che -> user không thấy và không bấm được.
              // Chiều cao nav = bar 62 + paddingBottom (insets.bottom + 4, fallback 16).
              // Chuẩn khớp với `HomeScreen` / `FridgeInventoryScreen` (dùng 100).
              paddingBottom: BOTTOM_NAV_TOTAL_HEIGHT + (insets.bottom > 0 ? insets.bottom : 0),
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

      {/* Sheet lịch sử trò chuyện */}
      <AiChatHistorySheet
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        onSelectSession={openSession}
        onDeleteSession={deleteSession}
        loadSessions={loadSessions}
        currentSessionId={sessionIdRef.current}
      />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(4),
  },
  headerBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
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
