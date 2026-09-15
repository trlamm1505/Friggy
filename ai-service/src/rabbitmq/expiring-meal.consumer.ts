/**
 * ExpiringMealPlanConsumer — Phase 10.2
 *
 * Nhận job từ RabbitMQ (routing key: ai.expiring.meal.plan)
 * → Dùng SingleAgentService lập thực đơn N ngày từ nguyên liệu sắp hết hạn
 * → Publish progress lên Redis → FE nhận qua SSE
 *
 * Khác thực đơn tuần: KHÔNG dùng Multi-Agent pipeline (nhanh hơn ~5-10s)
 * SingleAgent tự gọi get_expiring_items + search_recipes + save_weekly_plan
 */
import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import {
  FRIGGY_AI_EXCHANGE,
  AI_EXPIRING_MEAL_ROUTING_KEY,
  AI_EXPIRING_MEAL_QUEUE_NAME,
} from 'src/common/constant/app.constant';
import { RedisService } from 'src/redis/redis.service';
import { SingleAgentService } from 'src/ai-core/single-agent.service';

export interface ExpiringMealJob {
  jobId: string;
  userId: string;
  withinDays: number; // Nguyên liệu hết hạn trong N ngày tới
  days: number;       // Lập thực đơn cho N ngày
}

@Injectable()
export class ExpiringMealPlanConsumer {
  private readonly logger = new Logger(ExpiringMealPlanConsumer.name);

  constructor(
    private readonly redis: RedisService,
    private readonly singleAgent: SingleAgentService,
  ) {}

  @RabbitSubscribe({
    exchange: FRIGGY_AI_EXCHANGE,
    routingKey: AI_EXPIRING_MEAL_ROUTING_KEY,
    queue: AI_EXPIRING_MEAL_QUEUE_NAME,
    queueOptions: { durable: true },
  })
  async handle(data: ExpiringMealJob): Promise<void | Nack> {
    const { jobId, userId, withinDays, days } = data;
    const channel = `expiring_meal:${jobId}:progress`;

    this.logger.log(
      `⏰ [ExpiringMeal] Nhận job: userId=${userId} | withinDays=${withinDays} | days=${days}`,
    );

    const emit = async (event: string, payload: object) => {
      await this.redis.publish(channel, JSON.stringify({ event, ...payload }));
    };

    try {
      await emit('started', {
        message: `AI đang scan tủ lạnh tìm đồ hết hạn trong ${withinDays} ngày...`,
      });

      // Tính ngày bắt đầu (hôm nay)
      const today = new Date().toISOString().split('T')[0];

      const prompt = [
        `Lập thực đơn ${days} ngày bắt đầu từ hôm nay (${today}) nhằm ưu tiên sử dụng nguyên liệu sắp hết hạn trong tủ lạnh.`,
        ``,
        `Các bước thực hiện:`,
        `1. Dùng tool get_expiring_items(withinDays=${withinDays}) để xem nguyên liệu sắp hết hạn`,
        `2. Dùng tool get_user_allergies để biết dị ứng của user`,
        `3. Với mỗi ngày (${days} ngày), lập 3 bữa (sáng/trưa/tối):`,
        `   - Dùng tool search_recipes lọc theo các nguyên liệu sắp hết hạn`,
        `   - Ưu tiên công thức dùng nhiều nguyên liệu sắp hết nhất`,
        `4. Dùng tool save_weekly_plan để lưu thực đơn vào DB`,
        ``,
        `Khi trả lời:`,
        `- Liệt kê thực đơn ${days} ngày theo format ngày/bữa`,
        `- Nêu rõ nguyên liệu sắp hết hạn nào được dùng`,
        `- Ước tính tổng chi phí`,
        `- Kết thúc bằng lời khuyến khích tiết kiệm`,
      ].join('\n');

      await emit('scanning', {
        message: 'AI đang tìm nguyên liệu phù hợp...',
      });

      let result = '';
      const stream$ = this.singleAgent.run({
        userId,
        featureType: 'chat',
        message: prompt,
      });

      await new Promise<void>((resolve, reject) => {
        stream$.subscribe({
          next: (event) => {
            if (event.event === 'chunk') {
              result += event.data;
            } else if (event.event === 'tool_call') {
              // Emit progress khi AI gọi tool
              this.redis
                .publish(channel, JSON.stringify({
                  event: 'tool_running',
                  tool: event.data,
                  message: `AI đang chạy: ${event.data}`,
                }))
                .catch(() => {});
            }
          },
          error: reject,
          complete: resolve,
        });
      });

      await emit('completed', {
        message: '✅ Thực đơn từ nguyên liệu sắp hết hạn đã sẵn sàng!',
        summary: result,
        withinDays,
        days,
      });

      this.logger.log(`✅ [ExpiringMeal] Done: jobId=${jobId}`);
    } catch (err: any) {
      this.logger.error(`❌ [ExpiringMeal] Lỗi: ${err?.message}`);
      await emit('failed', { message: err?.message ?? 'Đã xảy ra lỗi' });
    }
  }
}
