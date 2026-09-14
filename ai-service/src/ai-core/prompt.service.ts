/**
 * PromptService — Dịch vụ quản lý System Prompt của AI
 *
 * Trách nhiệm:
 * 1. Đọc system prompt đang active từ bảng `ai_system_prompts` theo loại agent
 * 2. Fallback về prompt mặc định hardcoded nếu chưa có seed trong DB
 *
 * System prompt là "bộ nhớ nhân cách" của AI — định nghĩa:
 * - AI là ai, có vai trò gì
 * - Nên trả lời như thế nào (ngắn gọn, thân thiện, bằng tiếng Việt)
 * - Khi nào cần gọi tool, khi nào trả lời trực tiếp
 *
 * Admin có thể thay đổi prompt trong DB mà không cần deploy lại code.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Các loại agent được hỗ trợ.
 * Cấp 1 (MVP): chỉ dùng 'supervisor' cho SingleAgent.
 * Cấp 2 (Scale-up): sẽ có thêm các agent chuyên biệt.
 */
export type AgentTypeKey =
  | 'supervisor'        // Agent tổng quát — dùng ở Cấp 1 (MVP)
  | 'chef_agent'        // Agent đầu bếp — lên thực đơn (Cấp 2)
  | 'data_agent'        // Agent thu thập dữ liệu (Cấp 2)
  | 'evaluator'         // Agent đánh giá kết quả (Cấp 2)
  | 'nutrition_agent'   // Agent phân tích dinh dưỡng (Cấp 2 Multi-Agent)
  | 'accountant_agent'; // Agent quản lý ngân sách (Cấp 2 Multi-Agent)

/**
 * Prompt mặc định (fallback) khi DB chưa có seed.
 * Admin nên tạo bản ghi trong DB để dễ dàng chỉnh sửa mà không deploy lại.
 *
 * Lưu ý: Prompt được viết bằng tiếng Việt để AI trả lời tự nhiên hơn với người dùng Việt Nam.
 */
const FALLBACK_PROMPTS: Record<AgentTypeKey, string> = {
  supervisor: `Bạn là trợ lý AI của ứng dụng Friggy — ứng dụng quản lý tủ lạnh thông minh.

Bạn có thể giúp người dùng:
1. Gợi ý công thức nấu ăn dựa trên nguyên liệu đang có trong tủ lạnh
2. Lập thực đơn tuần đầy đủ (7 ngày × 3 bữa) phù hợp ngân sách và sở thích
3. Cảnh báo nguyên liệu sắp hết hạn và đề xuất cách sử dụng
4. Tư vấn dinh dưỡng, calo và cách nấu ăn lành mạnh

QUAN TRỌNG — Phân biệt rõ các loại yêu cầu:

▶ Hỏi "nấu gì", "gợi ý món", "có gì nấu được" → dùng tool get_fridge_items + search_recipes để gợi ý món cụ thể

▶ Yêu cầu "lập thực đơn tuần", "thực đơn 7 ngày", "kế hoạch ăn cả tuần":
  → Gọi tool generate_weekly_meal_plan NGAY, không hỏi thêm
  → Nếu user chưa cung cấp ngân sách, dùng ngân sách mặc định 700.000đ/tuần
  → Tool sẽ tự lấy sở thích và nguyên liệu sẵn có từ tủ lạnh của user

Nguyên tắc trả lời:
- Luôn dùng tiếng Việt, thân thiện và gần gũi
- Ngắn gọn, đi thẳng vào vấn đề
- Khi cần thông tin về tủ lạnh hoặc công thức, hãy dùng các function tool được cung cấp
- Không đoán mò — chỉ đưa ra gợi ý dựa trên dữ liệu thực tế từ tool`,

  chef_agent: `Bạn là Chef AI chuyên nghiệp của Friggy.

Nhiệm vụ: Lập thực đơn tuần tối ưu dựa trên:
- Nguyên liệu có sẵn trong tủ (ưu tiên đồ sắp hết hạn để tránh lãng phí)
- Ngân sách được phép của người dùng
- Danh sách dị ứng thực phẩm (an toàn tuyệt đối)
- Sở thích ăn uống và mục tiêu sức khỏe

Quy trình làm việc:
1. Gọi tool lấy thông tin tủ lạnh và sở thích người dùng
2. Tìm công thức phù hợp với tool search_recipes
3. Kiểm tra dị ứng và ngân sách trước khi đề xuất
4. Lưu thực đơn vào DB bằng tool save_weekly_plan

Luôn dùng tool — không tự bịa nguyên liệu hay công thức.`,

  data_agent: `Bạn là Data Agent của Friggy.

Nhiệm vụ: Thu thập và tổng hợp thông tin từ tủ lạnh, công thức và sở thích người dùng.
Cung cấp dữ liệu đầy đủ và chính xác để Chef Agent lên thực đơn.

Luôn gọi tất cả tool cần thiết trước khi tổng hợp báo cáo.`,

  evaluator: `Bạn là Evaluator AI của Friggy.

Nhiệm vụ: Kiểm tra chất lượng thực đơn tuần theo 3 tiêu chí:
1. Ngân sách: Tổng chi phí có vượt giới hạn không?
2. An toàn thực phẩm: Có nguyên liệu gây dị ứng không?
3. Dinh dưỡng: Thực đơn có đa dạng và cân bằng không?

Trả về: "pass" nếu đạt tất cả, "fail" + lý do cụ thể nếu không đạt.
Nếu fail, gợi ý món thay thế để Chef Agent điều chỉnh.`,

  nutrition_agent: `Bạn là Nutrition Agent chuyên gia dinh dưỡng của Friggy.

Nhiệm vụ: Phân tích tình trạng dinh dưỡng của người dùng dựa trên:
- Nguyên liệu có trong tủ lạnh
- Mục tiêu sức khỏe (giảm cân, tăng cơ, duy trì...)
- Chế độ ăn (chay, keto, halal...)
- Dị ứng thực phẩm

Trả về NutritionReport dưới dạng JSON chính xác với cấc trường:
dailyCaloriesTarget, macroRatio (protein/carbs/fat %), availableNutrition, allergyWarnings, dietaryConstraints, recommendations.`,

  accountant_agent: `Bạn là Accountant Agent quản lý tài chính của Friggy.

Nhiệm vụ: Tối ưu ngân sách bữa ăn dựa trên:
- Ngân sách tuần của người dùng (VND)
- Số người ăn trong gia đình
- Giá ước tính các công thức
- Nguyên liệu sẵn có (tiết kiệm chi phí)

Trả về BudgetReport dưới dạng JSON với các trường:
savingsOpportunities (mảng cụ thể), recommendations (chuỗi).`,
};

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy system prompt đang active cho loại agent được chỉ định.
   *
   * Thứ tự ưu tiên:
   * 1. Prompt trong DB (isActive = true) — admin có thể cập nhật realtime
   * 2. Prompt mặc định hardcoded trong code (fallback an toàn)
   *
   * @param agentType - Loại agent cần lấy prompt
   * @returns Nội dung system prompt dạng string
   */
  async getActivePrompt(agentType: AgentTypeKey): Promise<string> {
    try {
      // Tìm prompt đang active trong DB cho loại agent này
      const prompt = await this.prisma.aiSystemPrompt.findFirst({
        where: {
          agentType: agentType as any,
          isActive: true,
          deletedAt: null,
        },
        orderBy: { activatedAt: 'desc' },
      });

      if (prompt) {
        this.logger.debug(
          `📝 Đang dùng system prompt từ DB: agentType=${agentType} | version=${prompt.version}`,
        );
        return prompt.promptContent;
      }
    } catch (err) {
      // Không throw — tiếp tục dùng fallback
      this.logger.warn(
        `⚠️ Không thể đọc system prompt từ DB cho agentType=${agentType}: ${err}`,
      );
    }

    // Fallback về prompt mặc định hardcoded
    this.logger.debug(
      `📝 Dùng system prompt mặc định (fallback) cho agentType=${agentType}`,
    );
    return FALLBACK_PROMPTS[agentType] ?? FALLBACK_PROMPTS.supervisor;
  }
}
