/**
 * NextWeekSuggestionsScreen
 *
 * ⚠️ SPRINT B4 — ĐÃ NỐI BE THẬT (trước đây là `recipesMock` hardcode).
 *
 * Nguồn dữ liệu: `GET /meal-planning/plans` -> plan mới nhất ->
 * `GET /meal-planning/plans/{id}` -> `dailyPlans[]` -> `mealSlots[]`.
 *
 * ⚠️ `dayOfWeek` của BE = 1=T2 ... 7=CN (KHÁC với `Date.getDay()` của JS =
 *   0=CN ... 6=T7). Xem `ai-service/src/ai-core/tools/meal-plan.tools.ts:62`.
 *   => Phải quy đổi khi hiển thị, nếu không sẽ lệch 1 ngày.
 *
 * Tính năng:
 *   - Lịch 7 ngày, mỗi ngày hiện các bữa có trong kế hoạch.
 *   - Tick "đã nấu" -> `PATCH /meal-planning/slots/{id}` (optimistic + rollback).
 *   - "Đổi món" -> `POST /meal-planning/slots/{id}/regenerate` + SSE, chọn 1
 *     trong 3 gợi ý -> `PATCH /meal-planning/slots/{id}` đổi `recipeId`.
 *   - "Lập thực đơn từ đồ sắp hết hạn" -> `POST /meal-planning/plans/generate-from-expiring` + SSE.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { DayPlanCard } from '../../components/recipe/DayPlanCard';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Sparkles, Info, Wand2, ShoppingCart, X } from 'lucide-react-native';
import { Routes } from '../../../shared/constants/routes';
import { showSuccess, showError, showInfo } from '../../utils/helpers';
import { useServices } from '../../../data/ServiceProvider';

/**
 * Nhãn ngày theo quy ước BE: 1=T2 ... 7=CN.
 */
const DAY_LABELS_BE = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const NextWeekSuggestionsScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const services = useServices();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState('');
  // Chi tiết slot (modal): `{ loading, data, slot, error }`.
  const [slotDetail, setSlotDetail] = useState(null);

  // Dùng ref để tránh đóng gói lại callback khi stream SSE đang chạy.
  const mountedRef = useRef(true);
  const abortRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await services.recipeService.getNextWeekPlan();
      if (!mountedRef.current) return;
      setPlan(data);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    // Gọi fetch SAU khi effect chạy, không gọi trực tiếp trong thân effect.
    // `react-hooks/set-state-in-effect` (React Compiler rule) chặn setState
    // đồng bộ trong effect body vì gây cascading render.
    // `loadPlan` là async -> setState chỉ chạy sau `await` -> hợp lệ.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlan();
  }, [loadPlan]);

  /**
   * Sắp xếp 7 ngày theo `dayOfWeek` của BE (1=T2 ... 7=CN).
   *
   * BE có thể trả thiếu ngày (chưa lập kế hoạch) -> bổ sung ngày trống để
   * lịch luôn hiện đủ 7 dòng (giống Flutter).
   */
  const days = useMemo(() => {
    const byDay = new Map();
    (plan?.days ?? []).forEach((day) => {
      byDay.set(day.dayOfWeek, day);
    });

    return Array.from({ length: 7 }, (_, i) => {
      const dayOfWeek = i + 1; // 1=T2 ... 7=CN
      const found = byDay.get(dayOfWeek);
      return {
        dayOfWeek,
        dayLabel: DAY_LABELS_BE[dayOfWeek],
        dayNumber: found?.date ? Number(String(found.date).slice(8, 10)) : null,
        date: found?.date ?? null,
        slots: found?.slots ?? [],
      };
    });
  }, [plan]);

  /**
   * Ngày hôm nay / ngày mai.
   *
   * ⚠️ KHÔNG được dùng index trong mảng `days` — `days[0]` LUÔN là T2
   * (BE quy ước 1=T2 ... 7=CN), không phải "hôm nay". Phải so `date` của
   * ngày đó với ngày thật, nếu không app sẽ gắn nhãn "HÔM NAY" cho T2
   * bất kể hôm nay là thứ mấy.
   */
  const todayStr = useMemo(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, []);

  /**
   * Tick "đã nấu" — optimistic update + rollback nếu API lỗi.
   *
   * @param {object} slot
   */
  const toggleCooked = useCallback(
    async (slot) => {
      if (!slot?.id) return;

      const nextCooked = !slot.cooked;

      // Optimistic: cập nhật UI trước.
      setPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          days: prev.days.map((day) => ({
            ...day,
            slots: day.slots.map((s) => (s.id === slot.id ? { ...s, cooked: nextCooked } : s)),
          })),
        };
      });

      try {
        await services.recipeService.updateSlot(slot.id, { completed: nextCooked });
      } catch (e) {
        // Rollback.
        setPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            days: prev.days.map((day) => ({
              ...day,
              slots: day.slots.map((s) => (s.id === slot.id ? { ...s, cooked: !nextCooked } : s)),
            })),
          };
        });
        showError(e?.message ?? t('home.error'));
      }
    },
    [services, t]
  );

  /**
   * Áp dụng món mới cho slot.
   *
   * ⚠️ BE `PATCH /slots/:id` nhận `recipeId` (uuid của công thức). Gợi ý của
   * AI là TEXT, không phải uuid -> tìm công thức khớp tên trong danh sách
   * recipes rồi đổi. Không có công thức khớp -> báo user, KHÔNG gửi id bừa.
   *
   * ⚠️ KHÁI BÁO TRƯỚC `replaceSlot` vì `replaceSlot` tham chiếu nó (rule
   * `react-hooks/immutability` chặn truy cập biến trước khi khai báo).
   */
  const applyNewRecipe = useCallback(
    async (slot, dishName) => {
      try {
        const recipes = await services.recipeService.getRecipesFiltered({ search: dishName });
        const match =
          recipes.find((r) => dishName.toLowerCase().includes(r.name?.toLowerCase())) ??
          recipes.find((r) => r.name?.toLowerCase().includes(dishName.slice(0, 12).toLowerCase()));

        if (!match) {
          showError(t('home.aiDishNotFound'));
          return;
        }

        await services.recipeService.updateSlot(slot.id, { recipeId: match.id });

        // Cập nhật UI tại chỗ.
        setPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            days: prev.days.map((day) => ({
              ...day,
              slots: day.slots.map((s) =>
                s.id === slot.id
                  ? {
                      ...s,
                      recipeId: match.id,
                      name: match.name,
                      cookTime: match.cookTime,
                    }
                  : s
              ),
            })),
          };
        });

        showSuccess(t('home.aiDishReplaced'));
      } catch (e) {
        showError(e?.message ?? t('home.error'));
      }
    },
    [services, t]
  );

  /**
   * Đổi món bằng AI.
   *
   * Luồng: POST /slots/:id/regenerate (202) -> SSE nhận 3 gợi ý ->
   * user chọn 1 -> PATCH /slots/:id { recipeId }.
   */
  const replaceSlot = useCallback(
    async (slot) => {
      if (!slot?.id || aiBusy) return;

      setAiBusy(true);
      setAiProgress(t('home.aiThinking'));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const job = await services.recipeService.regenerateSlot(slot.id, 'want_different');
        if (!job?.jobId) throw new Error(t('home.error'));

        const streamPath = `/meal-planning/slots/${slot.id}/regenerate/${job.jobId}/stream`;

        let suggestions = '';
        let done = false;

        for await (const evt of services.recipeService.streamPlanProgress(streamPath, {
          signal: controller.signal,
        })) {
          if (controller.signal.aborted) break;

          if (evt.event === 'done') {
            // BE gửi payload phẳng `{ event, slotId, suggestions, message }`.
            const data = typeof evt.data === 'object' && evt.data !== null ? evt.data : {};
            suggestions = data.suggestions ?? '';
            done = true;
            break;
          }
          if (evt.event === 'error') {
            const data = typeof evt.data === 'object' && evt.data !== null ? evt.data : {};
            throw new Error(data.message ?? t('home.error'));
          }
        }

        if (!done || !suggestions.trim()) {
          throw new Error(t('home.aiError'));
        }

        // Đưa 3 gợi ý (dạng "1. ... 2. ... 3. ...") vào Alert để user chọn.
        const options = suggestions
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => /^\d+\./.test(line))
          .map((line) => line.replace(/^\d+\.\s*/, ''));

        if (options.length === 0) {
          showInfo(suggestions);
          return;
        }

        Alert.alert(t('home.weekPlanReplace'), t('home.aiChooseDish'), [
          ...options.slice(0, 3).map((option) => ({
            text: option.length > 60 ? `${option.slice(0, 60)}…` : option,
            onPress: () => applyNewRecipe(slot, option),
          })),
          { text: t('home.cancel'), style: 'cancel' },
        ]);
      } catch (e) {
        if (!controller.signal.aborted) {
          // ⚠️ 429 = hết lượt AI tuần này (BE `AiUsageLimitGuard`).
          showError(
            e?.statusCode === 429 ? t('home.aiLimitReached') : (e?.message ?? t('home.error'))
          );
        }
      } finally {
        abortRef.current = null;
        setAiBusy(false);
        setAiProgress('');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [services, aiBusy, t]
  );

  /**
   * Tạo danh sách mua từ kế hoạch tuần hiện tại.
   */
  const createShoppingList = useCallback(async () => {
    if (!plan?.id) return;
    try {
      await services.recipeService.createShoppingList(plan.id);
      showSuccess(t('home.shoppingListCreated'));
    } catch (e) {
      showError(e?.message ?? t('home.error'));
    }
  }, [services, plan, t]);

  /**
   * Nhờ AI lập thực đơn ưu tiên nguyên liệu sắp hết hạn.
   *
   * Luồng: POST /plans/generate-from-expiring (202 + jobId) -> SSE tiến độ ->
   * event `completed` -> load lại kế hoạch.
   */
  const generateFromExpiring = useCallback(async () => {
    if (aiBusy) return;

    setAiBusy(true);
    setAiProgress(t('home.aiThinking'));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const job = await services.recipeService.generateFromExpiring({ withinDays: 3, days: 2 });
      if (!job?.jobId) throw new Error(t('home.error'));

      const streamPath = `/meal-planning/plans/generate-from-expiring/${job.jobId}/stream`;

      let finished = false;

      for await (const evt of services.recipeService.streamPlanProgress(streamPath, {
        signal: controller.signal,
      })) {
        if (controller.signal.aborted) break;

        // BE gửi `{ event, message, ... }` cho từng bước -> hiện message
        // để user biết AI đang làm gì.
        const data = typeof evt.data === 'object' && evt.data !== null ? evt.data : {};
        if (typeof data.message === 'string' && data.message.trim()) {
          setAiProgress(data.message);
        }

        if (evt.event === 'completed') {
          finished = true;
          break;
        }
        if (evt.event === 'failed') {
          throw new Error(data.message ?? t('home.error'));
        }
      }

      if (!finished) {
        throw new Error(t('home.aiError'));
      }

      await loadPlan();
      showSuccess(t('home.aiPlanCreated'));
    } catch (e) {
      if (!controller.signal.aborted) {
        // ⚠️ 429 = hết lượt AI tuần này (BE `AiUsageLimitGuard`).
        showError(
          e?.statusCode === 429 ? t('home.aiLimitReached') : (e?.message ?? t('home.error'))
        );
      }
    } finally {
      abortRef.current = null;
      setAiBusy(false);
      setAiProgress('');
    }
  }, [aiBusy, services, loadPlan, t]);

  /**
   * Mở chi tiết 1 slot: `GET /meal-planning/slots/{id}`.
   *
   * BE trả công thức + các bước nấu + phân tích tủ lạnh
   * (`summary.missingItems` = nguyên liệu thiếu / thiếu một phần).
   *
   * ⚠️ Không điều hướng thẳng sang `RecipeDetail` vì màn đó cần `recipeId`
   * (id công thức), còn slot có `id` là id bản ghi meal plan -> phải gọi
   * API lấy `slot.recipe.id` trước. Hiện modal chi tiết cho đủ thông tin
   * (công thức + nguyên liệu + bước nấu + phân tích tủ lạnh).
   */
  const openSlot = useCallback(
    async (slot) => {
      if (!slot?.id) return;

      setSlotDetail({ loading: true, data: null, slot });
      try {
        const detail = await services.recipeService.getSlotDetail(slot.id);
        setSlotDetail({ loading: false, data: detail, slot });
      } catch (e) {
        setSlotDetail({ loading: false, data: null, slot, error: e });
        showError(e?.message ?? t('home.slotDetailLoadFailed'));
      }
    },
    [services, t]
  );

  // ── Loading ──
  if (loading && !plan) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
        <View style={styles.scroll}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.skeletonCard, { backgroundColor: isDark ? '#19271E' : '#F4F7F4' }]}
            >
              <Skeleton width="35%" height={sp(16)} borderRadius={sp(8)} />
              <Skeleton
                width="85%"
                height={sp(14)}
                borderRadius={sp(7)}
                style={{ marginTop: sp(12) }}
              />
              <Skeleton
                width="60%"
                height={sp(12)}
                borderRadius={sp(6)}
                style={{ marginTop: sp(8) }}
              />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ── Error ──
  if (error && !plan) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
        <View style={styles.scroll}>
          <ErrorState onRetry={loadPlan} />
        </View>
      </View>
    );
  }

  const hasAnySlot = days.some((d) => d.slots.length > 0);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <View style={[styles.iconBadge, { backgroundColor: isDark ? '#19271E' : '#E8F5E9' }]}>
            <Sparkles color={isDark ? AppColors.primaryLight : AppColors.primary} size={20} />
          </View>
          <View style={{ flex: 1, marginLeft: sp(12) }}>
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(22) },
              ]}
            >
              {t('home.weekPlanTitle')}
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  fontSize: sp(13),
                },
              ]}
            >
              {t('home.weekPlanSubtitle')}
            </Text>
          </View>
        </View>

        {/* Info banner */}
        <View
          style={[
            styles.infoBanner,
            {
              backgroundColor: isDark ? '#1B3324' : '#E8F5E9',
              borderColor: isDark ? '#2E4D36' : '#A5E69C',
            },
          ]}
        >
          <Info color={isDark ? AppColors.primaryLight : AppColors.primary} size={16} />
          <Text
            style={[
              styles.infoText,
              { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(12) },
            ]}
          >
            {t('home.weekPlanHint')}
          </Text>
        </View>

        {/* Thanh thao tác AI */}
        <View style={styles.actionRow}>
          {aiBusy ? (
            <View style={styles.aiProgressRow}>
              <ActivityIndicator size="small" color={AppColors.primary} />
              <Text
                style={[
                  styles.aiProgressText,
                  {
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    fontSize: sp(12),
                  },
                ]}
              >
                {aiProgress || t('home.aiThinking')}
              </Text>
            </View>
          ) : (
            <>
              <Pressable
                onPress={generateFromExpiring}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: isDark ? '#233629' : '#E8F5E9',
                    borderColor: isDark ? '#2E4D36' : '#A5E69C',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Wand2 color={isDark ? AppColors.primaryLight : AppColors.primary} size={14} />
                <Text
                  style={[
                    styles.actionText,
                    {
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                      fontSize: sp(12),
                    },
                  ]}
                >
                  {t('home.aiAskChef')}
                </Text>
              </Pressable>

              <Pressable
                onPress={createShoppingList}
                disabled={!plan?.id}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: isDark ? '#233629' : '#E8F5E9',
                    borderColor: isDark ? '#2E4D36' : '#A5E69C',
                    opacity: !plan?.id ? 0.5 : pressed ? 0.7 : 1,
                  },
                ]}
              >
                <ShoppingCart
                  color={isDark ? AppColors.primaryLight : AppColors.primary}
                  size={14}
                />
                <Text
                  style={[
                    styles.actionText,
                    {
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                      fontSize: sp(12),
                    },
                  ]}
                >
                  {t('home.shoppingCreateFromPlan')}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Lịch 7 ngày */}
        {!hasAnySlot ? (
          <EmptyState
            emoji="🗓️"
            title={t('home.weekPlanEmpty')}
            hint={t('home.weekPlanEmptyHint')}
          />
        ) : (
          days.map((day) => (
            <DayPlanCard
              key={day.dayOfWeek}
              slots={day.slots}
              dayLabel={day.dayLabel}
              dayNumber={day.dayNumber ?? '-'}
              isToday={day.date === todayStr}
              isTomorrow={day.date === tomorrowStr}
              onSlotPress={openSlot}
              onToggleCooked={toggleCooked}
              onReplace={replaceSlot}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <SlotDetailModal
        state={slotDetail}
        onClose={() => setSlotDetail(null)}
        onOpenRecipe={(recipeId) => {
          setSlotDetail(null);
          navigation.navigate(Routes.RecipeDetail, { recipeId });
        }}
      />
    </View>
  );
};

/**
 * Modal chi tiết slot: công thức + nguyên liệu + bước nấu + phân tích tủ lạnh.
 *
 * ⚠️ Được đặt trong file màn hình (không tách file mới) vì plan Mục 1 chỉ
 * cho DEV B tạo đúng danh sách file đã liệt kê.
 */
const SlotDetailModal = ({ state, onClose, onOpenRecipe }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  if (!state) return null;

  const { loading, data } = state;
  const recipe = data?.recipe ?? null;
  const summary = data?.summary ?? null;
  const missingItems = summary?.missingItems ?? [];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalSheet, { backgroundColor: isDark ? '#19271E' : '#FFFFFF' }]}
          onPress={(e) => e.stopPropagation?.()}
        >
          <View style={styles.modalHeader}>
            <Text
              style={[
                styles.modalTitle,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(17) },
              ]}
              numberOfLines={2}
            >
              {recipe?.name ?? t('home.slotDetailNoRecipe')}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={22} />
            </Pressable>
          </View>

          {loading ? (
            <View style={{ paddingVertical: sp(24) }}>
              <ActivityIndicator size="small" color={AppColors.primary} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Tóm tắt tủ lạnh */}
              {summary ? (
                <View style={styles.fridgeSummary}>
                  <Text
                    style={[
                      styles.fridgeSummaryText,
                      {
                        color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                        fontSize: sp(12),
                      },
                    ]}
                  >
                    {t('home.slotDetailFridgeReady')}: {summary.haveCount ?? 0} •{' '}
                    {t('home.slotDetailMissing')}: {summary.missingCount ?? 0}
                  </Text>
                </View>
              ) : null}

              {/* Nguyên liệu còn thiếu */}
              {missingItems.length > 0 ? (
                <View style={styles.sectionBlock}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(14) },
                    ]}
                  >
                    {t('home.slotDetailMissing')}
                  </Text>
                  {missingItems.map((item, idx) => (
                    <View
                      key={`${item.ingredientId ?? item.name}-${idx}`}
                      style={styles.ingredientRow}
                    >
                      <Text
                        style={[
                          styles.ingredientName,
                          { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <View
                        style={[
                          styles.fridgeBadge,
                          {
                            backgroundColor:
                              item.fridgeStatus === 'partial' ? '#FF980020' : '#FF525220',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.fridgeBadgeText,
                            {
                              color:
                                item.fridgeStatus === 'partial'
                                  ? AppColors.accentOrange
                                  : AppColors.error,
                              fontSize: sp(10),
                            },
                          ]}
                        >
                          {item.fridgeStatus === 'partial'
                            ? t('home.slotDetailPartial')
                            : t('home.slotDetailMissingShort')}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Khẩu phần */}
              {data?.servings ? (
                <Text
                  style={[
                    styles.servingsText,
                    {
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      fontSize: sp(12),
                    },
                  ]}
                >
                  {t('home.slotDetailServings')}: {data.servings} • {recipe?.cookTime}{' '}
                  {t('home.minutes')}
                </Text>
              ) : null}

              {/* Các bước nấu */}
              {recipe?.steps?.length ? (
                <View style={styles.sectionBlock}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(14) },
                    ]}
                  >
                    {t('home.slotDetailSteps')}
                  </Text>
                  {recipe.steps.map((step, idx) => (
                    <View key={idx} style={styles.stepRow}>
                      <Text
                        style={[
                          styles.stepNumber,
                          {
                            backgroundColor: isDark ? '#233629' : '#E8F5E9',
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                            fontSize: sp(11),
                          },
                        ]}
                      >
                        {idx + 1}
                      </Text>
                      <Text
                        style={[
                          styles.stepText,
                          { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(13) },
                        ]}
                      >
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {recipe?.id ? (
                <Pressable
                  onPress={() => onOpenRecipe(recipe.id)}
                  style={({ pressed }) => [
                    styles.openRecipeBtn,
                    { backgroundColor: AppColors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.openRecipeText}>{t('recipe.viewDetail')}</Text>
                </Pressable>
              ) : null}

              <View style={{ height: sp(16) }} />
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  headerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    marginLeft: 8,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp(8),
    marginBottom: sp(16),
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(6),
    paddingHorizontal: sp(12),
    paddingVertical: sp(8),
    borderRadius: sp(20),
    borderWidth: 1,
  },
  actionText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  aiProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(8),
    paddingVertical: sp(8),
  },
  aiProgressText: {
    fontFamily: FontFamily.regular,
  },
  skeletonCard: {
    padding: sp(16),
    borderRadius: sp(16),
    marginBottom: sp(10),
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '80%',
    borderTopLeftRadius: sp(20),
    borderTopRightRadius: sp(20),
    paddingHorizontal: sp(20),
    paddingTop: sp(16),
    paddingBottom: sp(24),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp(12),
    gap: sp(8),
  },
  modalTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  fridgeSummary: {
    padding: sp(12),
    borderRadius: sp(12),
    backgroundColor: 'transparent',
    marginBottom: sp(12),
  },
  fridgeSummaryText: {
    fontFamily: FontFamily.regular,
  },
  sectionBlock: {
    marginBottom: sp(14),
    gap: sp(6),
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    marginBottom: sp(4),
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp(4),
    gap: sp(8),
  },
  ingredientName: {
    flex: 1,
    fontFamily: FontFamily.regular,
  },
  fridgeBadge: {
    paddingHorizontal: sp(8),
    paddingVertical: sp(2),
    borderRadius: sp(8),
  },
  fridgeBadgeText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  servingsText: {
    fontFamily: FontFamily.regular,
    marginBottom: sp(12),
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sp(8),
    paddingVertical: sp(3),
  },
  stepNumber: {
    width: sp(20),
    height: sp(20),
    borderRadius: sp(10),
    textAlign: 'center',
    lineHeight: sp(20),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    overflow: 'hidden',
  },
  stepText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    lineHeight: sp(19),
  },
  openRecipeBtn: {
    marginTop: sp(8),
    paddingVertical: sp(12),
    borderRadius: sp(12),
    alignItems: 'center',
  },
  openRecipeText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    fontSize: sp(14),
  },
});
