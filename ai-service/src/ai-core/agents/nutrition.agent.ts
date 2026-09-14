/**
 * NutritionAgent — Agent chuyên phân tích dinh dưỡng
 *
 * Chạy song song với AccountantAgent (cả 2 nhận cùng SupervisorContext).
 * Nhiệm vụ:
 *   1. Phân tích nguyên liệu trong tủ → tính giá trị dinh dưỡng hiện có
 *   2. Đánh giá sở thích ăn uống + mục tiêu sức khỏe của user
 *   3. Tính nhu cầu calo/ngày dựa trên thông số cơ thể
 *   4. Output: NutritionReport để ChefAgent dùng khi chọn món
 *
 * Dữ liệu fridge và nutrition được cache bởi RedisService (TTL 5 phút).
 */
import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../ai-provider.service';
import { PromptService } from '../prompt.service';
import { FridgeTools } from '../tools/fridge.tools';
import { RecipeTools } from '../tools/recipe.tools';
import type { SupervisorContext } from './supervisor.agent';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { stripJsonFences } from '../utils/json.utils';

// ─────────────────────────────────────────────────────────
// Kết quả phân tích dinh dưỡng — truyền cho ChefAgent
// ─────────────────────────────────────────────────────────
export interface NutritionReport {
  dailyCaloriesTarget: number;   // Mục tiêu calo/ngày
  macroRatio: {
    protein: number;   // % đạm
    carbs: number;     // % tinh bột
    fat: number;       // % chất béo
  };
  availableNutrition: {         // Dinh dưỡng từ nguyên liệu đang có
    totalCalories: number;
    highlights: string[];        // Ví dụ: ['Giàu vitamin C', 'Thiếu protein']
  };
  allergyWarnings: string[];    // Cảnh báo dị ứng cần tránh
  dietaryConstraints: string[]; // Ràng buộc chế độ ăn (chay, keto, ...)
  recommendations: string;      // Gợi ý ngắn cho ChefAgent
}

@Injectable()
export class NutritionAgent {
  private readonly logger = new Logger(NutritionAgent.name);

  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly promptService: PromptService,
    private readonly fridgeTools: FridgeTools,
    private readonly recipeTools: RecipeTools,
  ) {}

  // ─────────────────────────────────────────────────────────
  // Phân tích dinh dưỡng dựa trên context từ SupervisorAgent
  // ─────────────────────────────────────────────────────────
  async analyze(context: SupervisorContext): Promise<NutritionReport> {
    this.logger.log(
      `🥗 [NutritionAgent] Bắt đầu phân tích dinh dưỡng cho userId=${context.userId}`,
    );

    // Lấy dữ liệu dinh dưỡng của nguyên liệu đang có trong tủ
    // (đã được cache bởi FridgeTools — không gọi DB lại nếu đã cache)
    const nutritionData = await this.recipeTools.getNutritionSummary(
      context.availableIngredients,
    );

    // Dùng AI để phân tích và tổng hợp thành báo cáo dinh dưỡng
    const llmClient = await this.aiProvider.getActiveClient();
    const systemPrompt = await this.promptService.getActivePrompt('nutrition_agent');

    const userMessage = `
Phân tích dinh dưỡng cho kế hoạch thực đơn tuần với thông tin sau:

**Sở thích người dùng:**
- Chế độ ăn: ${context.userPreferences.dietaryStyle ?? 'Không rõ'}
- Mục tiêu sức khỏe: ${context.userPreferences.primaryGoal ?? 'Không rõ'}
- Tần suất nấu: ${context.userPreferences.cookingFrequency ?? 'Không rõ'}
- Số người ăn: ${context.userPreferences.householdSize ?? 1} người

**Dị ứng cần tránh:** ${context.allergies.length > 0 ? context.allergies.join(', ') : 'Không có'}

**Nguyên liệu đang có trong tủ:** ${context.availableIngredients.slice(0, 15).join(', ')}${context.availableIngredients.length > 15 ? '...' : ''}

**Dữ liệu dinh dưỡng hiện có:**
${JSON.stringify(nutritionData, null, 2)}

Hãy trả về JSON theo cấu trúc NutritionReport.
    `.trim();

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    const response = await llmClient.client.chat.completions.create({
      model: llmClient.modelName,
      messages,
      response_format: { type: 'json_object' }, // Bắt AI trả JSON thuần
      temperature: 0.3, // Nhiệt độ thấp → kết quả ổn định, ít sáng tạo
    });

    const rawJson = response.choices[0]?.message?.content ?? '{}';

    try {
      const report = JSON.parse(stripJsonFences(rawJson)) as NutritionReport;
      this.logger.log(
        `✅ [NutritionAgent] Phân tích xong: mục tiêu ${report.dailyCaloriesTarget} kcal/ngày | ${report.allergyWarnings.length} cảnh báo dị ứng`,
      );
      return report;
    } catch {
      this.logger.warn('⚠️ [NutritionAgent] Không parse được JSON — trả về report mặc định');
      // Trả về báo cáo mặc định nếu AI không trả đúng format
      return this.getDefaultReport(context);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Báo cáo mặc định khi AI không trả đúng format
  // ─────────────────────────────────────────────────────────
  private getDefaultReport(context: SupervisorContext): NutritionReport {
    return {
      dailyCaloriesTarget: 2000,
      macroRatio: { protein: 30, carbs: 50, fat: 20 },
      availableNutrition: { totalCalories: 0, highlights: [] },
      allergyWarnings: context.allergies,
      dietaryConstraints: context.userPreferences.dietaryStyle
        ? [context.userPreferences.dietaryStyle]
        : [],
      recommendations: 'Tạo thực đơn cân bằng dinh dưỡng với các nguyên liệu có sẵn.',
    };
  }
}
