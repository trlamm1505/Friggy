/**
 * AiCoreModule — Module hệ thống AI, không expose API trực tiếp
 *
 * Module này là nền tảng cho toàn bộ tính năng AI của Friggy.
 * Được import bởi Phase 8 (Meal Planning) và Phase 9 (AI Chat).
 *
 * Các thành phần chính:
 * - AiProviderService: Quản lý kết nối tới nhà cung cấp AI (đọc từ DB, mã hóa key)
 * - PromptService: Lấy system prompt phù hợp cho từng loại agent
 * - RateLimitService: Kiểm tra và ghi nhận quota sử dụng AI
 * - SingleAgentService: Lõi chính — chạy AI với Function Calling và stream SSE
 * - Các Tool Services: 16 công cụ để AI gọi khi cần dữ liệu thực tế
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';

import { AiProviderService } from './ai-provider.service';
import { PromptService } from './prompt.service';
import { RateLimitService } from './rate-limit.service';
import { SingleAgentService } from './single-agent.service';

// Nhóm các Tool: mỗi tool là một hành động AI có thể thực hiện để lấy dữ liệu
import { FridgeTools } from './tools/fridge.tools';
import { UserTools } from './tools/user.tools';
import { RecipeTools } from './tools/recipe.tools';
import { MealPlanTools } from './tools/meal-plan.tools';

const TOOLS = [FridgeTools, UserTools, RecipeTools, MealPlanTools];

@Module({
  imports: [PrismaModule],
  providers: [
    // Hạ tầng AI
    AiProviderService,
    PromptService,
    RateLimitService,
    SingleAgentService,
    // Các công cụ AI (Function Calling)
    ...TOOLS,
  ],
  exports: [
    // Export để các module khác (Phase 8, 9) sử dụng
    AiProviderService,
    PromptService,
    RateLimitService,
    SingleAgentService,
  ],
})
export class AiCoreModule {}
