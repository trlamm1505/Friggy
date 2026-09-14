/**
 * MealPlanConsumer — Consumer xử lý job tạo thực đơn từ Main BE
 *
 * Lắng nghe RabbitMQ exchange "friggy.ai" với routing key "meal.plan.generate".
 * Khi nhận message → chạy MealPlanGraphService (Multi-Agent pipeline).
 * Progress sẽ được publish lên Redis channel "meal_plan:{jobId}:progress"
 * để Main BE SSE endpoint forward về FE.
 *
 * Message format nhận vào:
 * {
 *   jobId: string;        — ID duy nhất để track trên Redis pub/sub
 *   userId: string;       — ID người dùng (để lấy data từ DB)
 *   weekStartDate: string — YYYY-MM-DD
 *   budget: number        — VND
 * }
 */
import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  FRIGGY_AI_EXCHANGE,
  MEAL_PLAN_ROUTING_KEY,
  MEAL_PLAN_QUEUE_NAME,
} from 'src/common/constant/app.constant';
import { MealPlanGraphService } from 'src/ai-core/meal-plan-graph.service';
import type { MealPlanJobData } from 'src/ai-core/meal-plan-graph.service';

@Injectable()
export class MealPlanConsumer {
  private readonly logger = new Logger(MealPlanConsumer.name);

  constructor(private readonly mealPlanGraph: MealPlanGraphService) {}

  /**
   * Subscribe queue "meal-plan-generate-queue" trên exchange "friggy.ai"
   * với routing key "meal.plan.generate".
   * @golevelup/nestjs-rabbitmq tự động tạo queue và binding khi service start.
   */
  @RabbitSubscribe({
    exchange: FRIGGY_AI_EXCHANGE,
    routingKey: MEAL_PLAN_ROUTING_KEY,
    queue: MEAL_PLAN_QUEUE_NAME,
    queueOptions: {
      durable: true,          // Queue tồn tại sau khi restart broker
      arguments: {
        'x-message-ttl': 30 * 60 * 1000, // Message TTL 30 phút
      },
    },
  })
  async handleMealPlanGenerate(message: MealPlanJobData): Promise<void> {
    this.logger.log(
      `📥 [MealPlanConsumer] Nhận job: jobId=${message.jobId} | userId=${message.userId} | tuần=${message.weekStartDate}`,
    );

    try {
      await this.mealPlanGraph.run(message);
      this.logger.log(`✅ [MealPlanConsumer] Hoàn thành job: jobId=${message.jobId}`);
    } catch (error: any) {
      this.logger.error(
        `❌ [MealPlanConsumer] Lỗi xử lý job: jobId=${message.jobId} | ${error.message}`,
        error.stack,
      );
      // Lỗi đã được xử lý trong MealPlanGraphService (emit "failed" event lên Redis)
    }
  }
}
