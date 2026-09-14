/**
 * EvaluatorAgent — Agent kiểm tra và tự động retry
 *
 * Agent cuối cùng trong pipeline, hoạt động như "kiểm tra chất lượng".
 * Tiêu chí fail (trigger retry): Tổng chi phí vượt ngân sách > 20%
 *
 * Nếu fail: ChefAgent được gọi lại với context bổ sung hướng dẫn tiết kiệm hơn.
 * Tối đa 3 lần retry. Nếu vẫn fail sau 3 lần → chấp nhận kết quả tốt nhất.
 */
import { Injectable, Logger } from '@nestjs/common';
import type { WeeklyPlanResult } from './chef.agent';
import type { BudgetReport } from './accountant.agent';

// ─────────────────────────────────────────────────────────
// Kết quả đánh giá của EvaluatorAgent
// ─────────────────────────────────────────────────────────
export interface EvaluationResult {
  passed: boolean;        // true = đạt, false = cần retry
  score: number;          // Điểm 0-100
  budgetAdherence: number; // % bám sát ngân sách (100 = đúng ngân sách)
  issues: string[];       // Danh sách vấn đề cần sửa (nếu fail)
  feedback: string;       // Phản hồi cụ thể cho ChefAgent khi retry
  attemptNumber: number;  // Lần thử thứ mấy
}

@Injectable()
export class EvaluatorAgent {
  private readonly logger = new Logger(EvaluatorAgent.name);

  // ─────────────────────────────────────────────────────────
  // Đánh giá thực đơn dựa trên tiêu chí: vượt ngân sách > 20%
  // ─────────────────────────────────────────────────────────
  evaluate(params: {
    plan: WeeklyPlanResult;
    budgetReport: BudgetReport;
    attemptNumber: number;
  }): EvaluationResult {
    const { plan, budgetReport, attemptNumber } = params;
    const issues: string[] = [];

    this.logger.log(
      `🔍 [EvaluatorAgent] Đánh giá thực đơn lần ${attemptNumber}: ${plan.slots.length} bữa | Chi phí ${plan.totalEstimatedCost.toLocaleString('vi-VN')}đ / Ngân sách ${budgetReport.weeklyBudget.toLocaleString('vi-VN')}đ`,
    );

    // ── Tiêu chí 1: Vượt ngân sách (tiêu chí bắt buộc — trigger retry) ──
    const budgetOverrun = plan.totalEstimatedCost - budgetReport.weeklyBudget;
    const budgetOverrunPercent = (budgetOverrun / budgetReport.weeklyBudget) * 100;
    const budgetAdherence = Math.max(0, 100 - Math.max(0, budgetOverrunPercent));

    if (budgetOverrunPercent > 20) {
      issues.push(
        `Chi phí vượt ngân sách ${budgetOverrunPercent.toFixed(1)}% ` +
        `(${plan.totalEstimatedCost.toLocaleString('vi-VN')}đ / ${budgetReport.weeklyBudget.toLocaleString('vi-VN')}đ)`,
      );
    }

    // ── Tiêu chí 2: Số bữa tối thiểu (không trigger retry, chỉ cảnh báo) ──
    if (plan.slots.length < 14) {
      issues.push(`Thực đơn chỉ có ${plan.slots.length}/21 bữa — thiếu dữ liệu`);
    }

    // Tính điểm tổng hợp
    const budgetScore = budgetAdherence;
    const completenessScore = Math.min(100, (plan.slots.length / 21) * 100);
    const score = Math.round((budgetScore * 0.7) + (completenessScore * 0.3));

    // Thực đơn đạt khi không vượt ngân sách quá 20%
    const passed = budgetOverrunPercent <= 20;

    const feedback = passed
      ? `✅ Thực đơn đạt yêu cầu (điểm: ${score}/100, bám sát ngân sách ${budgetAdherence.toFixed(0)}%)`
      : `❌ Cần điều chỉnh: ${issues.join('; ')}. Hãy chọn các công thức rẻ hơn, tối đa ${budgetReport.perMealBudget.toLocaleString('vi-VN')}đ/bữa.`;

    if (passed) {
      this.logger.log(`✅ [EvaluatorAgent] PASSED lần ${attemptNumber}: điểm ${score}/100`);
    } else {
      this.logger.warn(
        `❌ [EvaluatorAgent] FAILED lần ${attemptNumber}: ${issues.join(' | ')} → cần retry`,
      );
    }

    return { passed, score, budgetAdherence, issues, feedback, attemptNumber };
  }
}
