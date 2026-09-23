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
import { AiProviderService } from '../../ai-provider.service';
import { PromptService } from '../../prompt.service';
import { RecipeTools } from '../../tools/recipe.tools';
import { FridgeTools } from '../../tools/fridge.tools';
import { MealPlanTools } from '../../tools/meal-plan.tools';
import type { SupervisorContext } from './supervisor.agent';
import type { NutritionReport } from './nutrition.agent';
import type { BudgetReport } from './accountant.agent';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { stripJsonFences } from '../../utils/json.utils';

// ─────────────────────────────────────────────────────────
// Một meal slot trong thực đơn tuần
// ─────────────────────────────────────────────────────────
export interface MealSlot {
  dayOfWeek: number; // 0=CN, 1=T2, ..., 6=T7
  mealType: 'breakfast' | 'lunch' | 'dinner';
  recipeId: string | null; // null = AI muốn tự nghĩ món mới
  recipeName: string;      // Tên món (luôn có dù tự chọn hay tự nghĩ)
  description?: string;    // Mô tả món — bắt buộc điền khi recipeId=null
  cookingTime?: number;    // Thời gian nấu (phút) — bắt buộc điền khi recipeId=null
  estimatedCost: number;   // Chi phí ước tính (VND)
  servings: number;
  // Khi recipeId=null: AI cung cấp để lưu vào DB
  ingredients?: Array<{
    ingredientName: string;
    quantity: number;
    unit: string;
    isOptional?: boolean;
  }>;
  steps?: Array<{
    stepNumber: number;
    instruction: string;
    durationMinutes?: number;
  }>;
}

// ─────────────────────────────────────────────────────────
// Kết quả thực đơn tuần — truyền cho EvaluatorAgent
// ─────────────────────────────────────────────────────────
export interface WeeklyPlanResult {
  weeklyPlanId: string | null; // null nếu chưa lưu DB (dùng khi retry)
  weekStartDate: string;
  slots: MealSlot[];
  totalEstimatedCost: number;
  summary: string; // Mô tả ngắn thực đơn cho EvaluatorAgent đánh giá
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
    saveToDb?: boolean; // false khi đang retry (tránh tạo bản ghi trùng)
  }): Promise<WeeklyPlanResult> {
    const { context, nutritionReport, budgetReport, saveToDb = true } = params;

    this.logger.log(
      `👨‍🍳 [ChefAgent] Bắt đầu lập thực đơn tuần ${context.weekStartDate} cho userId=${context.userId}`,
    );

    // Lấy công thức gợi ý từ nguyên liệu sắp hết hạn (ưu tiên giảm lãng phí)
    const expiringRecipes = await this.fridgeTools.suggestFromExpiring(
      context.userId,
    );

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
- ID công thức có sẵn trong ngân sách: ${[budgetReport.affordableRecipeIds].flat().slice(0, 20).join(', ') || 'Chưa có'}
- Gợi ý tiết kiệm: ${budgetReport.recommendations}

**Nguyên liệu trong tủ:** ${context.availableIngredients.slice(0, 15).join(', ')}

**Nguyên liệu sắp hết hạn (ưu tiên dùng):** ${
      expiringRecipes
        .map((r: any) => r.name)
        .slice(0, 5)
        .join(', ') || 'Không có'
    }

Hãy tạo thực đơn 7 ngày (Thứ 2 đến Chủ nhật) với 3 bữa/ngày.

**Hướng dẫn chọn món (quan trọng):**
- ƯU TIÊN: Dùng recipeId có sẵn từ danh sách: ${[budgetReport.affordableRecipeIds].flat().slice(0, 15).join(', ')}
- DỰ PHÒNG: Nếu không tìm được món phù hợp, tự nghĩ món mới: đặt recipeId: null và điền đầy đủ recipeName, description, cookingTime, ingredients, steps.
- Mỗi ngày nên có tối thiểu 1 món tự nghĩ để thực đơn đa dạng hơn.

Bắt buộc trả về JSON object với cấu trúc CHÍNH XÁC như sau (không thay đổi tên field):
{
  "slots": [
    {
      "dayOfWeek": 1,
      "mealType": "breakfast",
      "recipeId": "<uuid từ danh sách trên, hoặc null nếu tự nghĩ>",
      "recipeName": "Tên món",
      "description": "Mô tả ngắn (bắt buộc khi recipeId=null)",
      "cookingTime": 20,
      "estimatedCost": 30000,
      "servings": 2,
      "ingredients": [
        { "ingredientName": "Thịt bò", "quantity": 200, "unit": "g", "isOptional": false },
        { "ingredientName": "Hành tây", "quantity": 1, "unit": "củ", "isOptional": false }
      ],
      "steps": [
        { "stepNumber": 1, "instruction": "Ướp thịt với gia vị 15 phút", "durationMinutes": 15 },
        { "stepNumber": 2, "instruction": "Xào thịt với hành trên lửa lớn", "durationMinutes": 10 }
      ]
    }
  ]
}
Ghi chú: dayOfWeek: 1=Thứ Hai, 2=Thứ Ba, ..., 7=Chủ Nhật. mealType chỉ dùng: breakfast/lunch/dinner.
Khi recipeId không null (dùng từ kho): ingredients và steps CÓ THỂ để rỗng ([]).
Khi recipeId=null (tự nghĩ): BẮT BUỘC điền ingredients và steps đầy đủ.
    `.trim();

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        // Luôn override system prompt bằng instruction JSON-only cứng
        // để AI không nói chuyện / thêm preamble trước JSON
        content: [
          systemPrompt,
          '\n\n[QUAN TRỌNG] Bạn CHỈ được phép trả về JSON object thuần túy.',
          'KHÔNG được thêm bất kỳ text giải thích nào trước hoặc sau JSON.',
          'KHÔNG dùng markdown code fence (```json).',
          'Response đầu tiên phải bắt đầu bằng ký tự { và kết thúc bằng }.',
        ].join(' '),
      },
      { role: 'user', content: userMessage },
    ];

    const response = await llmClient.client.chat.completions.create({
      model: llmClient.modelName,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.5, // Giảm nhiệt độ → ít hallucinate, JSON ổn định hơn
    });

    const rawJson = response.choices[0]?.message?.content ?? '{}';
    let slots: MealSlot[] = [];

    try {
      const parsed = JSON.parse(stripJsonFences(rawJson));

      // Xử lý nhiều format AI có thể trả về
      if (Array.isArray(parsed)) {
        // Format: [{day, meals:[{type, recipe_id}]}] → flatten sang slots[]
        const dayMap: Record<string, number> = {
          'Thứ Hai': 1,
          'Thứ Ba': 2,
          'Thứ Tư': 3,
          'Thứ Năm': 4,
          'Thứ Sáu': 5,
          'Thứ Bảy': 6,
          'Chủ Nhật': 7,
          T2: 1,
          T3: 2,
          T4: 3,
          T5: 4,
          T6: 5,
          T7: 6,
          CN: 7,
          Monday: 1,
          Tuesday: 2,
          Wednesday: 3,
          Thursday: 4,
          Friday: 5,
          Saturday: 6,
          Sunday: 7,
        };
        const typeMap: Record<string, string> = {
          Sáng: 'breakfast',
          Trưa: 'lunch',
          Tối: 'dinner',
          breakfast: 'breakfast',
          lunch: 'lunch',
          dinner: 'dinner',
          Snack: 'snack',
          snack: 'snack',
        };
        for (const day of parsed) {
          const dayOfWeek = dayMap[day.day] ?? dayMap[day.name] ?? 1;
          for (const meal of day.meals ?? []) {
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

      this.logger.log(
        `[ChefAgent DEBUG] AI trả về ${slots.length} slots | affordableRecipeIds: ${[budgetReport.affordableRecipeIds].flat().length}`,
      );
    } catch {
      this.logger.warn(
        '⚠️ [ChefAgent] Không parse được JSON — dùng thực đơn trống',
      );
      this.logger.warn(`[ChefAgent DEBUG] rawJson: ${rawJson.slice(0, 200)}`);
    }

    // ─────────────────────────────────────────────────────────
    // Hybrid fallback: tạo recipe mới cho slot AI tự nghĩ (recipeId=null)
    // ─────────────────────────────────────────────────────────
    const newRecipeCount = slots.filter((s) => !s.recipeId).length;
    if (newRecipeCount > 0) {
      this.logger.log(
        `🤖 [ChefAgent] AI tự nghĩ ${newRecipeCount} món mới — đang tạo vào DB...`,
      );
    }

    for (const slot of slots) {
      if (!slot.recipeId && slot.recipeName) {
        // AI không chọn được món từ kho → tự tạo recipe mới
        try {
          const { recipeId } = await this.recipeTools.createRecipe({
            title: slot.recipeName,
            description: slot.description ?? `Món ${slot.recipeName} do AI gợi ý`,
            mealType: slot.mealType,
            cookingTime: slot.cookingTime ?? 30,
            servings: slot.servings ?? householdSize,
            difficulty: 'medium',
            estimatedCost: slot.estimatedCost ?? budgetReport.perMealBudget,
            // Truyền ingredients và steps nếu AI cung cấp
            ingredients: slot.ingredients ?? [],
            steps: slot.steps ?? [],
          });
          slot.recipeId = recipeId;
        } catch (err) {
          this.logger.error(
            `❌ [ChefAgent] Không tạo được recipe cho slot "${slot.recipeName}": ${err}`,
          );
          // Giữ recipeId=null — slot sẽ bị bỏ qua khi lưu DB
        }
      }
    }

    // Tính tổng chi phí ước tính
    const totalEstimatedCost = slots.reduce(
      (sum, slot) => sum + (slot.estimatedCost ?? 0),
      0,
    );

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
          .filter((s) => s.recipeId !== null) // Chỉ lưu slot có công thức
          .map((s) => ({
            dayOfWeek: s.dayOfWeek,
            mealType: s.mealType,
            recipeId: s.recipeId as string,
            servings: s.servings ?? householdSize,
          })),
      });
      weeklyPlanId = saveResult.weeklyPlanId;
      this.logger.log(
        `💾 [ChefAgent] Đã lưu thực đơn vào DB: weeklyPlanId=${weeklyPlanId}`,
      );
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
