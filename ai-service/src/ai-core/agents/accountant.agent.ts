/**
 * AccountantAgent — Agent chuyên quản lý ngân sách
 *
 * Chạy song song với NutritionAgent (cả 2 nhận cùng SupervisorContext).
 * Nhiệm vụ:
 *   1. Tính ngân sách trung bình cho mỗi bữa ăn
 *   2. Tìm các công thức phù hợp với ngân sách
 *   3. Tối ưu chi phí dựa trên nguyên liệu có sẵn (giảm lãng phí)
 *   4. Output: BudgetReport để ChefAgent dùng khi lập thực đơn
 *
 * Chi phí công thức được cache bởi RedisService (TTL 10 phút).
 */
import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../ai-provider.service';
import { PromptService } from '../prompt.service';
import { RecipeTools } from '../tools/recipe.tools';
import { MealPlanTools } from '../tools/meal-plan.tools';
import type { SupervisorContext } from './supervisor.agent';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { stripJsonFences } from '../utils/json.utils';

// ─────────────────────────────────────────────────────────
// Kết quả phân tích ngân sách — truyền cho ChefAgent
// ─────────────────────────────────────────────────────────
export interface BudgetReport {
  weeklyBudget: number;          // Ngân sách cả tuần (VND)
  dailyBudget: number;           // Ngân sách mỗi ngày
  perMealBudget: number;         // Ngân sách mỗi bữa (giả sử 3 bữa/ngày)
  affordableRecipeIds: string[]; // ID công thức nằm trong ngân sách
  savingsOpportunities: string[]; // Cơ hội tiết kiệm (ví dụ: dùng đồ sắp hết hạn)
  budgetWarning: string | null;  // Cảnh báo nếu ngân sách quá thấp
  recommendations: string;       // Gợi ý ngắn cho ChefAgent
}

@Injectable()
export class AccountantAgent {
  private readonly logger = new Logger(AccountantAgent.name);

  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly promptService: PromptService,
    private readonly recipeTools: RecipeTools,
    private readonly mealPlanTools: MealPlanTools,
  ) {}

  // ─────────────────────────────────────────────────────────
  // Phân tích ngân sách và tìm công thức phù hợp
  // ─────────────────────────────────────────────────────────
  async analyze(context: SupervisorContext): Promise<BudgetReport> {
    this.logger.log(
      `💰 [AccountantAgent] Bắt đầu phân tích ngân sách: ${context.budget.toLocaleString('vi-VN')}đ/tuần cho userId=${context.userId}`,
    );

    const householdSize = context.userPreferences.householdSize ?? 1;

    // Tính ngân sách theo khẩu phần
    const dailyBudget = Math.floor(context.budget / 7);
    const perMealBudget = Math.floor(dailyBudget / 3); // 3 bữa/ngày

    // Tìm công thức phù hợp ngân sách từ nguyên liệu có sẵn
    // (kết quả search được cache bởi RecipeTools)
    const affordableRecipes = await this.recipeTools.searchRecipes({
      ingredientNames: context.availableIngredients.slice(0, 10),
      maxCost: perMealBudget * householdSize, // estimatedCost trong DB là tổng cho servings người
      limit: 30,
    });

    const affordableRecipeIds = affordableRecipes.map((r: any) => r.id);

    // Dùng AI để sinh gợi ý tối ưu chi phí
    const llmClient = await this.aiProvider.getActiveClient();
    const systemPrompt = await this.promptService.getActivePrompt('accountant_agent');

    const userMessage = `
Phân tích ngân sách cho kế hoạch thực đơn tuần:

**Ngân sách:**
- Tổng cả tuần: ${context.budget.toLocaleString('vi-VN')}đ
- Mỗi ngày: ${dailyBudget.toLocaleString('vi-VN')}đ
- Mỗi bữa: ${perMealBudget.toLocaleString('vi-VN')}đ
- Số người ăn: ${householdSize} người → ${Math.floor(perMealBudget / householdSize).toLocaleString('vi-VN')}đ/người/bữa

**Nguyên liệu sẵn có (có thể tiết kiệm khi dùng):** ${context.availableIngredients.slice(0, 10).join(', ')}

**Số công thức trong ngân sách tìm được:** ${affordableRecipeIds.length}

Hãy phân tích và trả về JSON theo cấu trúc BudgetReport với savings_opportunities cụ thể.
    `.trim();

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    const response = await llmClient.client.chat.completions.create({
      model: llmClient.modelName,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.2, // Nhiệt độ rất thấp → phân tích tài chính cần chính xác
    });

    const rawJson = response.choices[0]?.message?.content ?? '{}';

    try {
      const aiReport = JSON.parse(stripJsonFences(rawJson));
      const report: BudgetReport = {
        weeklyBudget: context.budget,
        dailyBudget,
        perMealBudget,
        affordableRecipeIds,
        savingsOpportunities: aiReport.savingsOpportunities ?? [],
        budgetWarning: context.budget < 200_000 ? '⚠️ Ngân sách dưới 200.000đ/tuần có thể khó đảm bảo dinh dưỡng đầy đủ' : null,
        recommendations: aiReport.recommendations ?? 'Ưu tiên dùng nguyên liệu sẵn có để tiết kiệm.',
      };

      this.logger.log(
        `✅ [AccountantAgent] Phân tích xong: ${affordableRecipeIds.length} công thức phù hợp | ${report.savingsOpportunities.length} cơ hội tiết kiệm`,
      );

      return report;
    } catch {
      this.logger.warn('⚠️ [AccountantAgent] Không parse được JSON — trả về report cơ bản');
      return {
        weeklyBudget: context.budget,
        dailyBudget,
        perMealBudget,
        affordableRecipeIds,
        savingsOpportunities: context.availableIngredients.length > 0
          ? [`Dùng ${context.availableIngredients[0]} và các nguyên liệu sẵn có để tiết kiệm`]
          : [],
        budgetWarning: context.budget < 200_000 ? '⚠️ Ngân sách thấp' : null,
        recommendations: 'Ưu tiên dùng nguyên liệu sẵn có để tiết kiệm.',
      };
    }
  }
}
