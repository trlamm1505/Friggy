/**
 * MealPlanCreateSection
 *
 * Nút "Tạo meal plan theo tuần" đặt BÊN DƯỚI phần "Thống kê tuần" ở Home.
 *
 * Tham chiếu Flutter:
 *   - `Mobile/lib/widgets/weekly_statistics_section.dart:355-433` — banner
 *     "Gợi ý thực phẩm cho tuần tới" (`onMealSuggestionsTap`).
 *   - `Mobile/lib/screens/next_week_suggestions_screen.dart:455-520` —
 *     `_generateWeeklyPlanWithAi()`: POST generate -> poll SSE -> reload plan.
 *
 * ⚠️ KHÁC BIỆT SO VỚI FLUTTER (có chủ đích):
 *   Flutter dùng POLLING (25 lần x 3.5s) vì Flutter chưa có SSE cho luồng
 *   này. RN ĐÃ CÓ Sẵn `SseClient` + `RealRecipeService.streamPlanProgress()`
 *   (dùng cho `generate-from-expiring` và `regenerate slot`) -> ta dùng SSE
 *   để có tiến độ realtime, đúng pattern các luồng AI khác trong RN.
 *
 * ⚠️ `POST /meal-planning/plans/generate` yêu cầu `weekStartDate` PHẢI là
 * Thứ 2 (xem `be/.../dto/meal-planning.dto.ts:24-41`). Ta luôn tính Thứ 2
 * của tuần hiện tại (giống Flutter) — KHÔNG cho user chọn ngày tùy ý để
 * tránh gửi ngày sai -> thực đơn lệch ngày.
 *
 * AI usage limit: BE `AiUsageLimitGuard` trả 429 khi hết lượt tuần -> UI
 * hiện message riêng (không phải lỗi chung).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Sparkles, X, ChevronRight, Wallet } from 'lucide-react-native';
import { CustomTextField } from '../common/CustomTextField';
import { CustomButton } from '../common/CustomButton';
import { useServices } from '../../../data/ServiceProvider';
import { showSuccess, showError } from '../../utils/helpers';
import {
  getWeekStartDateString,
  normalizeBudget,
  DEFAULT_WEEKLY_BUDGET,
} from '../../utils/mealPlanWeek';

export const MealPlanCreateSection = ({ onCreated, onPressPlan }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const services = useServices();

  const [modalOpen, setModalOpen] = useState(false);
  const [budget, setBudget] = useState(String(DEFAULT_WEEKLY_BUDGET));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  // Dùng ref để `finally` KHÔNG setState sau khi unmount (đóng modal khi
  // đang chờ AI).
  const mountedRef = useRef(true);
  const abortRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const openModal = useCallback(() => {
    setBudget(String(DEFAULT_WEEKLY_BUDGET));
    setProgress('');
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    // Hủy SSE nếu đang chạy -> user bấm "Huỷ" không bị treo.
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setProgress('');
    setModalOpen(false);
  }, []);

  /**
   * Tạo thực đơn tuần bằng AI.
   *
   * Luồng:
   *   1. POST /meal-planning/plans/generate -> 202 + jobId
   *   2. SSE /meal-planning/plans/generate/{jobId}/stream -> tiến độ từng bước
   *   3. event `completed` -> đóng modal + báo Home refresh + điều hướng
   *      sang màn thực đơn tuần tới (nếu user bấm nút).
   */
  const handleCreate = useCallback(async () => {
    if (busy) return;

    const budgetValue = normalizeBudget(budget);
    const weekStartDate = getWeekStartDateString();

    setBusy(true);
    setProgress(t('home.mealPlanPreparing'));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const job = await services.recipeService.generatePlan({
        weekStartDate,
        budget: budgetValue,
      });

      if (!job?.jobId) throw new Error(t('home.error'));

      // BE trả `streamUrl` = `/meal-planning/plans/generate/{jobId}/stream`.
      // Dùng `job.streamUrl` nếu có, fallback tự dựng (phòng BE đổi format).
      const streamPath = job.streamUrl ?? `/meal-planning/plans/generate/${job.jobId}/stream`;

      let finished = false;

      for await (const evt of services.recipeService.streamPlanProgress(streamPath, {
        signal: controller.signal,
      })) {
        if (controller.signal.aborted) break;

        const data = typeof evt.data === 'object' && evt.data !== null ? evt.data : {};

        // BE emit `{ step, message, ... }` cho từng bước của pipeline.
        if (typeof data.message === 'string' && data.message.trim()) {
          if (mountedRef.current) setProgress(data.message);
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

      if (!mountedRef.current) return;

      showSuccess(t('home.mealPlanCreated'));

      // Đóng modal trước -> user thấy màn thực đơn ngay.
      setBusy(false);
      setProgress('');
      setModalOpen(false);

      // Báo Home refresh (thống kê "Bữa đã nấu" + danh sách bữa hôm nay).
      if (onCreated) onCreated();

      // Điều hướng sang màn thực đơn tuần tới (giống Flutter: sau khi lập
      // xong thì user thấy ngay thực đơn).
      if (onPressPlan) onPressPlan();
    } catch (e) {
      if (!mountedRef.current) return;
      if (controller.signal.aborted) return;

      // ⚠️ 429 = hết lượt AI tuần này (BE `AiUsageLimitGuard`).
      showError(e?.statusCode === 429 ? t('home.aiLimitReached') : (e?.message ?? t('home.error')));
    } finally {
      abortRef.current = null;
      if (mountedRef.current) {
        setBusy(false);
        setProgress('');
      }
    }
  }, [budget, busy, onCreated, onPressPlan, services, t]);

  const weekStart = getWeekStartDateString();
  const budgetValid = normalizeBudget(budget) > 0;

  return (
    <>
      <Pressable
        onPress={openModal}
        style={({ pressed }) => [
          styles.banner,
          {
            backgroundColor: isDark ? '#19271E' : '#FFFFFF',
            borderColor: isDark ? '#81C784' : AppColors.welcomeDeepGreen,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        testID="home-create-meal-plan"
        accessibilityLabel={t('home.mealPlanCreateTitle')}
      >
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: isDark ? '#233629' : AppColors.welcomeDeepGreen },
          ]}
        >
          <CalendarDays
            color={isDark ? AppColors.primaryLight : '#FFFFFF'}
            size={24}
            strokeWidth={2.2}
          />
        </View>

        <View style={{ flex: 1, marginLeft: sp(12) }}>
          <Text
            style={[
              styles.title,
              { color: isDark ? '#FFFFFF' : AppColors.welcomeDeepGreen, fontSize: sp(15) },
            ]}
            numberOfLines={1}
          >
            {t('home.mealPlanCreateTitle')}
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(12),
              },
            ]}
            numberOfLines={2}
          >
            {t('home.mealPlanCreateSubtitle')}
          </Text>
        </View>

        <ChevronRight color={isDark ? AppColors.darkTextSecondary : AppColors.hintText} size={18} />
      </Pressable>

      {/* ── Modal cấu hình + tiến độ ── */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={closeModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: isDark ? '#142018' : '#FFFFFF' }]}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: isDark ? '#233629' : AppColors.accentGreen },
                ]}
              >
                <Sparkles
                  color={isDark ? AppColors.primaryLight : AppColors.primary}
                  size={20}
                  strokeWidth={2.2}
                />
              </View>
              <View style={{ flex: 1, marginLeft: sp(12) }}>
                <Text
                  style={[
                    styles.title,
                    { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(17) },
                  ]}
                  numberOfLines={1}
                >
                  {t('home.mealPlanCreateTitle')}
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    {
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      fontSize: sp(12),
                    },
                  ]}
                >
                  {t('home.mealPlanWeekStart', { date: weekStart })}
                </Text>
              </View>
              <Pressable onPress={closeModal} hitSlop={10}>
                <X color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={22} />
              </Pressable>
            </View>

            {/* Thông báo tiến độ AI */}
            {busy ? (
              <View
                style={[
                  styles.progressBox,
                  {
                    backgroundColor: isDark ? '#1B3324' : '#E8F5E9',
                    borderColor: isDark ? '#2E4D36' : '#A5E69C',
                  },
                ]}
              >
                <ActivityIndicator size="small" color={AppColors.primary} />
                <Text
                  style={[
                    styles.progressText,
                    {
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                      fontSize: sp(12.5),
                    },
                  ]}
                >
                  {progress || t('home.aiThinking')}
                </Text>
              </View>
            ) : (
              <>
                <Text
                  style={[
                    styles.descText,
                    {
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      fontSize: sp(13),
                    },
                  ]}
                >
                  {t('home.mealPlanCreateDesc')}
                </Text>

                <View style={{ marginTop: sp(14) }}>
                  <CustomTextField
                    label={t('home.mealPlanBudgetLabel')}
                    value={budget}
                    onChangeText={setBudget}
                    placeholder={String(DEFAULT_WEEKLY_BUDGET)}
                    keyboardType="numeric"
                    prefixIcon={<Wallet color={AppColors.hintText} size={18} />}
                    editable={!busy}
                    error={budgetValid ? undefined : t('home.mealPlanBudgetInvalid')}
                  />
                </View>

                <View style={{ marginTop: sp(8) }}>
                  <CustomButton
                    title={t('home.mealPlanCreateCta')}
                    onPress={handleCreate}
                    loading={busy}
                    disabled={!budgetValid}
                    icon={<Sparkles color="#FFFFFF" size={18} />}
                  />
                </View>
              </>
            )}

            <View style={{ height: sp(8) }} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: sp(20),
    padding: sp(14),
    borderRadius: sp(14),
    borderWidth: 1.5,
  },
  iconWrap: {
    width: sp(44),
    height: sp(44),
    borderRadius: sp(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  descText: {
    fontFamily: FontFamily.regular,
    lineHeight: sp(20),
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: sp(20),
    borderTopRightRadius: sp(20),
    paddingHorizontal: sp(20),
    paddingTop: sp(16),
    paddingBottom: sp(24),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp(12),
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(10),
    padding: sp(14),
    borderRadius: sp(14),
    borderWidth: 1,
    marginTop: sp(4),
  },
  progressText: {
    flex: 1,
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    lineHeight: sp(19),
  },
});
