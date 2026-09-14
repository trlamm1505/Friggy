/**
 * ChefAgent — Agent chuyên lập thực đơn tuần
 *
 * Nhận output từ NutritionAgent + AccountantAgent (chạy song song trước đó).
 * Nhiệm vụ:
 *   1. Tổng hợp ràng buộc dinh dưỡng + ngân sách
 *   2. Chọn công thức phù hợp cho 7 ngày × 3 bữa (sáng/trưa/tối)
 *   3. Ưu tiên công thức dùng nguyên liệu sắp hết hạn (giảm lãng phí)
 *   4. Lưu thực đơn vào DB qua save_weekly_plan tool
 *   5. Output: WeeklyPlanResult để EvaluatorAgent kiểm tra
 */
import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../ai-provider.service';
import { PromptService } from '../prompt.service';
import { RecipeTools } from '../tools/recipe.tools';
import { FridgeTools } from '../tools/fridge.tools';
import { MealPlanTools } from '../tools/meal-plan.tools';
import type { SupervisorContext } from './supervisor.agent';
import type { NutritionReport } from './nutrition.agent';
import type { BudgetReport } from './accountant.agent';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { stripJsonFences } from '../utils/json.utils';

// ─────────────────────────────────────────────────────────
// Một meal slot trong thực đơn tuần
// ─────────────────────────────────────────────────────────
export interface MealSlot {
  dayOfWeek: number;    // 0=CN, 1=T2, ..., 6=T7
  mealType: 'breakfast' | 'lunch' | 'dinner';
  recipeId: string | null;
  recipeName: string;   // Tên món (để EvaluatorAgent đọc dễ hơn)
  estimatedCost: number; // Chi phí ước tính (VND)
  servings: number;
}

// ─────────────────────────────────────────────────────────
// Kết quả thực đơn tuần — truyền cho EvaluatorAgent
// ─────────────────────────────────────────────────────────
export interface WeeklyPlanResult {
  weeklyPlanId: string | null;  // null nếu chưa lưu DB (dùng khi retry)
  weekStartDate: string;
  slots: MealSlot[];
  totalEstimatedCost: number;
  summary: string;  // Mô tả ngắn thực đơn cho EvaluatorAgent đánh giá
}

@Injectable()
export class ChefAgent {
  private readonly logger = new Logger(ChefAgent.name);

  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly promptService: PromptService,
    private readonly recipeTools: RecipeTools,
    private readonly fridgeTools: FridgeTools,
    private readonly mealPlanTools: MealPlanTools,
  ) {}

  // ─────────────────────────────────────────────────────────
  // Lập thực đơn tuần từ kết quả NutritionAgent + AccountantAgent
  // ─────────────────────────────────────────────────────────
  async createPlan(params: {
    context: SupervisorContext;
    nutritionReport: NutritionReport;
    budgetReport: BudgetReport;
    saveToDb?: boolean;  // false khi đang retry (tránh tạo bản ghi trùng)
  }): Promise<WeeklyPlanResult> {
    const { context, nutritionReport, budgetReport, saveToDb = true } = params;

    this.logger.log(
      `👨‍🍳 [ChefAgent] Bắt đầu lập thực đơn tuần ${context.weekStartDate} cho userId=${context.userId}`,
    );

    // Lấy công thức gợi ý từ nguyên liệu sắp hết hạn (ưu tiên giảm lãng phí)
    const expiringRecipes = await this.fridgeTools.suggestFromExpiring(context.userId);

    // Dùng AI sinh thực đơn dựa trên tất cả thông tin đã thu thập
    const llmClient = await this.aiProvider.getActiveClient();
    const systemPrompt = await this.promptService.getActivePrompt('chef_agent');

    const householdSize = context.userPreferences.householdSize ?? 1;

    const userMessage = `
Lập thực đơn tuần bắt đầu từ ${context.weekStartDate} với các ràng buộc sau:

**Dinh dưỡng (từ NutritionAgent):**
- Mục tiêu calo/ngày: ${nutritionReport.dailyCaloriesTarget} kcal
- Tỉ lệ macro: ${nutritionReport.macroRatio.protein}% đạm / ${nutritionReport.macroRatio.carbs}% tinh bột / ${nutritionReport.macroRatio.fat}% béo
- Ràng buộc chế độ ăn: ${[nutritionReport.dietaryConstraints].flat().filter(Boolean).join(', ') || 'Không có'}
- Dị ứng cần tránh: ${[nutritionReport.allergyWarnings].flat().filter(Boolean).join(', ') || 'Không có'}
- Gợi ý dinh dưỡng: ${nutritionReport.recommendations}

**Ngân sách (từ AccountantAgent):**
- Mỗi bữa: ${budgetReport.perMealBudget.toLocaleString('vi-VN')}đ (${householdSize} người)
- ID công thức trong ngân sách: ${[budgetReport.affordableRecipeIds].flat().slice(0, 20).join(', ') || 'Chưa có'}
- Gợi ý tiết kiệm: ${budgetReport.recommendations}

**Nguyên liệu trong tủ:** ${context.availableIngredients.slice(0, 15).join(', ')}

**Nguyên liệu sắp hết hạn (ưu tiên dùng):** ${expiringRecipes.map((r: any) => r.name).slice(0, 5).join(', ') || 'Không có'}

Hãy tạo thực đơn 7 ngày (Thứ 2 đến Chủ nhật) với 3 bữa/ngày.
Danh sách recipeId hợp lệ (CHỈ dùng các ID này): ${[budgetReport.affordableRecipeIds].flat().slice(0, 15).join(', ')}

Bắt buộc trả về JSON object với cấu trúc CHÍNH XÁC như sau (không thay đổi tên field):
{
  "slots": [
    { "dayOfWeek": 1, "mealType": "breakfast", "recipeId": "<uuid từ danh sách trên>", "estimatedCost": 30000, "servings": 2 },
    { "dayOfWeek": 1, "mealType": "lunch",     "recipeId": "<uuid>", "estimatedCost": 50000, "servings": 2 },
    { "dayOfWeek": 1, "mealType": "dinner",    "recipeId": "<uuid>", "estimatedCost": 80000, "servings": 2 }
  ]
}
Ghi chú: dayOfWeek: 1=Thứ Hai, 2=Thứ Ba, ..., 7=Chủ Nhật. mealType chỉ dùng: breakfast/lunch/dinner.
    `.trim();

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    const response = await llmClient.client.chat.completions.create({
      model: llmClient.modelName,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.7, // Nhiệt độ vừa phải → sáng tạo nhưng vẫn có cấu trúc
    });

    const rawJson = response.choices[0]?.message?.content ?? '{}';
    let slots: MealSlot[] = [];

    try {
      const parsed = JSON.parse(stripJsonFences(rawJson));

      // Xử lý nhiều format AI có thể trả về
      if (Array.isArray(parsed)) {
        // Format: [{day, meals:[{type, recipe_id}]}] → flatten sang slots[]
        const dayMap: Record<string, number> = {
          'Thứ Hai': 1, 'Thứ Ba': 2, 'Thứ Tư': 3, 'Thứ Năm': 4,
          'Thứ Sáu': 5, 'Thứ Bảy': 6, 'Chủ Nhật': 7,
          'T2': 1, 'T3': 2, 'T4': 3, 'T5': 4, 'T6': 5, 'T7': 6, 'CN': 7,
          'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
          'Friday': 5, 'Saturday': 6, 'Sunday': 7,
        };
        const typeMap: Record<string, string> = {
          'Sáng': 'breakfast', 'Trưa': 'lunch', 'Tối': 'dinner',
          'breakfast': 'breakfast', 'lunch': 'lunch', 'dinner': 'dinner',
          'Snack': 'snack', 'snack': 'snack',
        };
        for (const day of parsed) {
          const dayOfWeek = dayMap[day.day] ?? dayMap[day.name] ?? 1;
          for (const meal of (day.meals ?? [])) {
            slots.push({
              dayOfWeek,
              mealType: typeMap[meal.type] ?? meal.mealType ?? 'lunch',
              recipeId: meal.recipe_id ?? meal.recipeId ?? null,
              recipeName: meal.name ?? meal.recipeName ?? '',
              estimatedCost: meal.estimated_cost ?? meal.estimatedCost ?? 0,
              servings: meal.servings ?? householdSize,
            } as MealSlot);
          }
        }
      } else {
        // Format chuẩn: { slots: [...] }
        slots = (parsed.slots ?? parsed.mealSlots ?? []) as MealSlot[];
      }

      this.logger.log(`[ChefAgent DEBUG] AI trả về ${slots.length} slots | affordableRecipeIds: ${[budgetReport.affordableRecipeIds].flat().length}`);
    } catch {
      this.logger.warn('⚠️ [ChefAgent] Không parse được JSON — dùng thực đơn trống');
      this.logger.warn(`[ChefAgent DEBUG] rawJson: ${rawJson.slice(0, 200)}`);
    }

    // Tính tổng chi phí ước tính
    const totalEstimatedCost = slots.reduce((sum, slot) => sum + (slot.estimatedCost ?? 0), 0);

    this.logger.log(
      `✅ [ChefAgent] Lập xong thực đơn: ${slots.length} bữa | Tổng chi phí: ${totalEstimatedCost.toLocaleString('vi-VN')}đ`,
    );

    let weeklyPlanId: string | null = null;

    // Chỉ lưu DB khi không phải retry (tránh tạo bản ghi trùng)
    if (saveToDb && slots.length > 0) {
      const saveResult = await this.mealPlanTools.saveWeeklyPlan({
        userId: context.userId,
        weekStartDate: context.weekStartDate,
        slots: slots
          .filter((s) => s.recipeId !== null)  // Chỉ lưu slot có công thức
          .map((s) => ({
            dayOfWeek: s.dayOfWeek,
            mealType: s.mealType,
            recipeId: s.recipeId as string,
            servings: s.servings ?? householdSize,
          })),
      });
      weeklyPlanId = saveResult.weeklyPlanId;
      this.logger.log(`💾 [ChefAgent] Đã lưu thực đơn vào DB: weeklyPlanId=${weeklyPlanId}`);
    }

    return {
      weeklyPlanId,
      weekStartDate: context.weekStartDate,
      slots,
      totalEstimatedCost,
      summary: `Thực đơn ${slots.length} bữa cho ${householdSize} người, tổng chi phí ước tính ${totalEstimatedCost.toLocaleString('vi-VN')}đ`,
    };
  }
}
