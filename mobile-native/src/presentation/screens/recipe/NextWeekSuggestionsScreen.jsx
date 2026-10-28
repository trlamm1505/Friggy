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
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
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
import { Sparkles, Info, Wand2, ShoppingCart } from 'lucide-react-native';
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
        slots: found?.slots ?? [],
      };
    });
  }, [plan]);

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

        Alert.alert(
          t('home.weekPlanReplace'),
          t('home.aiChooseDish'),
          [
            ...options.slice(0, 3).map((option) => ({
              text: option.length > 60 ? `${option.slice(0, 60)}…` : option,
              onPress: () => applyNewRecipe(slot, option),
            })),
            { text: t('home.cancel'), style: 'cancel' },
          ]
        );
      } catch (e) {
        if (!controller.signal.aborted) {
          showError(e?.message ?? t('home.error'));
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
        showError(e?.message ?? t('home.error'));
      }
    } finally {
      abortRef.current = null;
      setAiBusy(false);
      setAiProgress('');
    }
  }, [aiBusy, services, loadPlan, t]);

  const openSlot = useCallback(
    (slot) => {
      if (!slot?.recipeId) {
        showInfo(t('home.aiDishNotFound'));
        return;
      }
      navigation.navigate(Routes.RecipeDetail, { recipeId: slot.recipeId });
    },
    [navigation, t]
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
              <Skeleton width="85%" height={sp(14)} borderRadius={sp(7)} style={{ marginTop: sp(12) }} />
              <Skeleton width="60%" height={sp(12)} borderRadius={sp(6)} style={{ marginTop: sp(8) }} />
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
                    { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(12) },
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
                <ShoppingCart color={isDark ? AppColors.primaryLight : AppColors.primary} size={14} />
                <Text
                  style={[
                    styles.actionText,
                    { color: isDark ? AppColors.primaryLight : AppColors.primary, fontSize: sp(12) },
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
          days.map((day, i) => (
            <DayPlanCard
              key={day.dayOfWeek}
              slots={day.slots}
              dayLabel={day.dayLabel}
              dayNumber={day.dayNumber ?? '-'}
              isToday={i === 0}
              isTomorrow={i === 1}
              onSlotPress={openSlot}
              onToggleCooked={toggleCooked}
              onReplace={replaceSlot}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
});
