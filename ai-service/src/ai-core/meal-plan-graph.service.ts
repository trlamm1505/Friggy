/**
 * MealPlanGraphService — Điều phối Multi-Agent Pipeline
 *
 * Đây là service trung tâm của Cấp độ 2 (Multi-Agent System).
 * Điều phối toàn bộ flow tạo thực đơn tuần:
 *
 * Flow:
 *   SupervisorAgent (thu thập context)
 *       ↓
 *   [NutritionAgent + AccountantAgent] chạy SONG SONG (Promise.all)
 *       ↓ (cả 2 xong)
 *   ChefAgent (lập thực đơn)
 *       ↓
 *   EvaluatorAgent (kiểm tra, retry tối đa 3 lần nếu vượt budget > 20%)
 *       ↓
 *   Lưu DB + emit progress qua Redis Pub/Sub
 *
 * Mỗi bước emit event lên Redis channel để FE biết tiến độ qua SSE.
 */
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { SupervisorAgent } from './agents/supervisor.agent';
import { NutritionAgent } from './agents/nutrition.agent';
import { AccountantAgent } from './agents/accountant.agent';
import { ChefAgent } from './agents/chef.agent';
import { EvaluatorAgent } from './agents/evaluator.agent';
import type { WeeklyPlanResult } from './agents/chef.agent';

// ─────────────────────────────────────────────────────────
// Tham số đầu vào cho pipeline
// ─────────────────────────────────────────────────────────
export interface MealPlanJobData {
  jobId: string;          // ID job BullMQ để FE subscribe SSE
  userId: string;
  weekStartDate: string;  // ISO date 'YYYY-MM-DD'
  budget: number;         // VND
}

// ─────────────────────────────────────────────────────────
// Các bước tiến độ emit qua Redis Pub/Sub
// FE subscribe channel `meal_plan:{jobId}:progress` để nhận
// ─────────────────────────────────────────────────────────
export type PipelineStep =
  | 'supervisor_start'
  | 'supervisor_done'
  | 'agents_parallel_start'
  | 'nutrition_done'
  | 'accountant_done'
  | 'chef_start'
  | 'chef_done'
  | 'evaluator_start'
  | 'evaluator_retry'
  | 'evaluator_done'
  | 'completed'
  | 'failed';

@Injectable()
export class MealPlanGraphService {
  private readonly logger = new Logger(MealPlanGraphService.name);

  // Số lần retry tối đa của EvaluatorAgent
  private readonly MAX_RETRY = 3;

  constructor(
    private readonly redis: RedisService,
    private readonly supervisor: SupervisorAgent,
    private readonly nutrition: NutritionAgent,
    private readonly accountant: AccountantAgent,
    private readonly chef: ChefAgent,
    private readonly evaluator: EvaluatorAgent,
  ) {}

  // ─────────────────────────────────────────────────────────
  // Chạy toàn bộ pipeline tạo thực đơn tuần
  // Được gọi bởi MealPlanWorker (BullMQ consumer)
  // ─────────────────────────────────────────────────────────
  async run(jobData: MealPlanJobData): Promise<WeeklyPlanResult> {
    const { jobId, userId, weekStartDate, budget } = jobData;
    const channel = `meal_plan:${jobId}:progress`;

    this.logger.log(
      `🚀 [MealPlanGraph] Bắt đầu pipeline: jobId=${jobId} | userId=${userId} | tuần=${weekStartDate} | ngân sách=${budget.toLocaleString('vi-VN')}đ`,
    );

    try {
      // ── Bước 1: Supervisor thu thập context ──
      await this.emitProgress(channel, 'supervisor_start', { message: 'Đang thu thập thông tin người dùng...' });

      const context = await this.supervisor.gatherContext({ userId, weekStartDate, budget });

      await this.emitProgress(channel, 'supervisor_done', {
        message: 'Đã có đủ thông tin',
        allergies: context.allergies.length,
        ingredientsInFridge: context.availableIngredients.length,
      });

      // ── Bước 2: Nutrition + Accountant chạy SONG SONG ──
      await this.emitProgress(channel, 'agents_parallel_start', {
        message: 'Đang phân tích dinh dưỡng và ngân sách đồng thời...',
      });

      const [nutritionReport, budgetReport] = await Promise.all([
        this.nutrition.analyze(context).then((report) => {
          this.emitProgress(channel, 'nutrition_done', {
            message: 'Phân tích dinh dưỡng xong',
            dailyCaloriesTarget: report.dailyCaloriesTarget,
          });
          return report;
        }),
        this.accountant.analyze(context).then((report) => {
          this.emitProgress(channel, 'accountant_done', {
            message: 'Phân tích ngân sách xong',
            affordableRecipes: report.affordableRecipeIds.length,
          });
          return report;
        }),
      ]);

      // ── Bước 3: Chef lập thực đơn (có thể retry) ──
      let bestPlan: WeeklyPlanResult | null = null;
      let bestScore = -1;

      for (let attempt = 1; attempt <= this.MAX_RETRY; attempt++) {
        await this.emitProgress(channel, 'chef_start', {
          message: `Đang lập thực đơn (lần ${attempt}/${this.MAX_RETRY})...`,
          attempt,
        });

        // Lần đầu lưu DB, retry thì không lưu (tránh bản ghi thừa)
        const plan = await this.chef.createPlan({
          context,
          nutritionReport,
          budgetReport,
          saveToDb: attempt === 1,
        });

        await this.emitProgress(channel, 'chef_done', {
          message: 'Đã có thực đơn nháp',
          totalCost: plan.totalEstimatedCost,
          mealCount: plan.slots.length,
        });

        // ── Bước 4: Evaluator kiểm tra ──
        await this.emitProgress(channel, 'evaluator_start', {
          message: 'Đang kiểm tra chất lượng thực đơn...',
          attempt,
        });

        const evaluation = this.evaluator.evaluate({ plan, budgetReport, attemptNumber: attempt });

        // Giữ lại plan tốt nhất dù có fail hay không
        if (evaluation.score > bestScore) {
          bestScore = evaluation.score;
          bestPlan = plan;
        }

        if (evaluation.passed) {
          // Đạt yêu cầu — kết thúc
          await this.emitProgress(channel, 'evaluator_done', {
            message: evaluation.feedback,
            score: evaluation.score,
            passed: true,
            attempt,
          });
          break;
        } else if (attempt < this.MAX_RETRY) {
          // Chưa đạt — thông báo retry
          await this.emitProgress(channel, 'evaluator_retry', {
            message: evaluation.feedback,
            score: evaluation.score,
            passed: false,
            attempt,
            nextAttempt: attempt + 1,
            issues: evaluation.issues,
          });

          // Thêm feedback của EvaluatorAgent vào nutritionReport.recommendations
          // để ChefAgent biết cần sửa gì ở lần sau
          nutritionReport.recommendations = `[Lần ${attempt + 1}] ${evaluation.feedback}`;
        } else {
          // Hết lượt retry — chấp nhận kết quả tốt nhất
          this.logger.warn(
            `⚠️ [MealPlanGraph] Đã hết ${this.MAX_RETRY} lần retry — dùng plan điểm ${bestScore}/100`,
          );
          await this.emitProgress(channel, 'evaluator_done', {
            message: `Đã thử ${this.MAX_RETRY} lần, dùng thực đơn tốt nhất (điểm ${bestScore}/100)`,
            score: bestScore,
            passed: false,
            attempt,
          });
        }
      }

      // Lưu DB cho bestPlan nếu lần đầu thất bại và bestPlan từ retry chưa được lưu
      if (bestPlan && !bestPlan.weeklyPlanId) {
        const saveResult = await this.chef['mealPlanTools'].saveWeeklyPlan({
          userId: context.userId,
          weekStartDate: context.weekStartDate,
          totalBudget: context.budget,
          slots: bestPlan.slots
            .filter((s) => s.recipeId !== null)
            .map((s) => ({
            dayOfWeek: s.dayOfWeek,
            mealType: s.mealType,
            recipeId: s.recipeId as string,
            servings: s.servings ?? (context.userPreferences.householdSize ?? 1),
          })),
        });
        bestPlan.weeklyPlanId = saveResult.weeklyPlanId;
      }

      // ── Bước 5: Pipeline hoàn thành ──
      await this.emitProgress(channel, 'completed', {
        message: '🎉 Thực đơn tuần đã sẵn sàng!',
        weeklyPlanId: bestPlan!.weeklyPlanId,
        totalEstimatedCost: bestPlan!.totalEstimatedCost,
        mealCount: bestPlan!.slots.length,
        score: bestScore,
      });

      this.logger.log(
        `🎉 [MealPlanGraph] Pipeline hoàn thành: jobId=${jobId} | weeklyPlanId=${bestPlan!.weeklyPlanId} | điểm=${bestScore}`,
      );

      return bestPlan!;
    } catch (err) {
      // Lỗi nghiêm trọng — emit failed event để FE biết
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`❌ [MealPlanGraph] Pipeline thất bại: ${errorMessage}`);

      await this.emitProgress(channel, 'failed', {
        message: `Tạo thực đơn thất bại: ${errorMessage}`,
        error: errorMessage,
      });

      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────
  // Emit event tiến độ lên Redis Pub/Sub channel
  // FE subscribe channel này để nhận SSE stream
  // ─────────────────────────────────────────────────────────
  private async emitProgress(
    channel: string,
    step: PipelineStep,
    data: Record<string, unknown>,
  ): Promise<void> {
    const payload = JSON.stringify({ step, timestamp: new Date().toISOString(), ...data });
    await this.redis.publish(channel, payload);
    this.logger.debug(`📡 [MealPlanGraph] Emit ${step}: ${payload}`);
  }
}
