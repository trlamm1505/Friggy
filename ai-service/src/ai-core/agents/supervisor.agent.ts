/**
 * SupervisorAgent — Agent điều phối trung tâm
 *
 * Đây là agent đầu tiên nhận yêu cầu từ người dùng.
 * Nhiệm vụ: phân tích yêu cầu và xác định loại công việc cần làm,
 * sau đó truyền thông tin cho các agent chuyên biệt phía sau.
 *
 * Trong flow tạo thực đơn tuần:
 *   SupervisorAgent nhận { userId, weekStartDate, budget, preferences }
 *   → Phân tích ngữ cảnh (sở thích, dị ứng, ngân sách)
 *   → Truyền context đã làm giàu cho NutritionAgent + AccountantAgent
 */
import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../ai-provider.service';
import { PromptService } from '../prompt.service';
import { UserTools } from '../tools/user.tools';
import { FridgeTools } from '../tools/fridge.tools';

// ─────────────────────────────────────────────────────────
// Context được SupervisorAgent thu thập và truyền đi
// ─────────────────────────────────────────────────────────
export interface SupervisorContext {
  userId: string;
  weekStartDate: string;   // ISO date, ví dụ: '2026-09-15'
  budget: number;          // Ngân sách cả tuần (VND)
  userPreferences: {
    dietaryStyle: string | null;
    cookingFrequency: string | null;
    householdSize: number | null;
    primaryGoal: string | null;
  };
  allergies: string[];     // Danh sách tên nguyên liệu dị ứng
  availableIngredients: string[];  // Nguyên liệu hiện có trong tủ
}

@Injectable()
export class SupervisorAgent {
  private readonly logger = new Logger(SupervisorAgent.name);

  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly promptService: PromptService,
    private readonly userTools: UserTools,
    private readonly fridgeTools: FridgeTools,
  ) {}

  // ─────────────────────────────────────────────────────────
  // Thu thập toàn bộ context cần thiết cho việc lập thực đơn
  // Chạy các query song song để giảm latency
  // ─────────────────────────────────────────────────────────
  async gatherContext(params: {
    userId: string;
    weekStartDate: string;
    budget: number;
  }): Promise<SupervisorContext> {
    const { userId, weekStartDate, budget } = params;

    this.logger.log(
      `📋 [Supervisor] Bắt đầu thu thập context: userId=${userId} | tuần=${weekStartDate} | ngân sách=${budget.toLocaleString('vi-VN')}đ`,
    );

    // Lấy thông tin người dùng và tủ lạnh song song để tiết kiệm thời gian
    const [preferences, allergies, availableIngredients] = await Promise.all([
      this.userTools.getUserPreferences(userId),
      this.userTools.getUserAllergies(userId),
      this.fridgeTools.getAvailableIngredients(userId),
    ]);

    const context: SupervisorContext = {
      userId,
      weekStartDate,
      budget,
      userPreferences: {
        dietaryStyle: preferences.dietaryStyle ?? null,
        cookingFrequency: preferences.cookingFrequency ?? null,
        householdSize: preferences.householdSize ?? null,
        primaryGoal: preferences.primaryGoal ?? null,
      },
      allergies,
      availableIngredients,
    };

    this.logger.log(
      `✅ [Supervisor] Context đã sẵn sàng: ${allergies.length} dị ứng | ${availableIngredients.length} nguyên liệu trong tủ`,
    );

    return context;
  }
}
