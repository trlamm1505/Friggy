/**
 * SlotRegenerateConsumer — Phase 10.1
 *
 * Nhận job từ RabbitMQ (routing key: ai.slot.regenerate)
 * → Dùng SingleAgentService tìm top 3 món thay thế phù hợp
 * → Publish kết quả lên Redis → FE nhận qua SSE
 */
import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import {
  FRIGGY_AI_EXCHANGE,
  AI_SLOT_REGENERATE_ROUTING_KEY,
  AI_SLOT_REGENERATE_QUEUE_NAME,
} from 'src/common/constant/app.constant';
import { RedisService } from 'src/redis/redis.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SingleAgentService } from 'src/ai-core/single-agent.service';

export interface SlotRegenerateJob {
  jobId: string;
  userId: string;
  slotId: string;
  currentRecipeName: string | null;
  mealType: string; // breakfast | lunch | dinner | snack
  dayOfWeek: number; // 1–7
  budgetRemaining: number;
  reason: string;
}

// Map lý do sang tiếng Việt để đưa vào prompt
const REASON_MAP: Record<string, string> = {
  no_ingredients: 'không có đủ nguyên liệu',
  dislike: 'không thích món này',
  want_different: 'muốn thay đổi khẩu vị',
  too_expensive: 'món quá đắt so với ngân sách',
};

const MEAL_TYPE_MAP: Record<string, string> = {
  breakfast: 'bữa sáng',
  lunch: 'bữa trưa',
  dinner: 'bữa tối',
  snack: 'bữa phụ',
};

@Injectable()
export class SlotRegenerateConsumer {
  private readonly logger = new Logger(SlotRegenerateConsumer.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly singleAgent: SingleAgentService,
  ) {}

  @RabbitSubscribe({
    exchange: FRIGGY_AI_EXCHANGE,
    routingKey: AI_SLOT_REGENERATE_ROUTING_KEY,
    queue: AI_SLOT_REGENERATE_QUEUE_NAME,
    queueOptions: { durable: true },
  })
  async handle(data: SlotRegenerateJob): Promise<void | Nack> {
    const {
      jobId,
      userId,
      slotId,
      currentRecipeName,
      mealType,
      dayOfWeek,
      budgetRemaining,
      reason,
    } = data;
    const channel = `slot_regenerate:${jobId}:result`;

    this.logger.log(
      `🔄 [SlotRegenerate] Nhận job: slotId=${slotId} | userId=${userId} | reason=${reason}`,
    );

    const publisher = this.redis;

    const emit = async (event: string, payload: object) => {
      await publisher.publish(channel, JSON.stringify({ event, ...payload }));
    };

    try {
      await emit('thinking', { message: 'AI đang tìm món phù hợp...' });

      const reasonText = REASON_MAP[reason] ?? reason;
      const mealTypeText = MEAL_TYPE_MAP[mealType] ?? mealType;
      const currentText = currentRecipeName
        ? `Món hiện tại là "${currentRecipeName}".`
        : 'Slot chưa có món.';

      const prompt = [
        `Hãy gợi ý đúng 3 món thay thế cho ${mealTypeText} (ngày ${dayOfWeek} trong tuần).`,
        currentText,
        `Lý do đổi: ${reasonText}.`,
        `Ngân sách còn lại: ${budgetRemaining.toLocaleString('vi-VN')}đ.`,
        `Yêu cầu:`,
        `- Dùng tool get_fridge_items để kiểm tra nguyên liệu có sẵn`,
        `- Dùng tool get_user_allergies để tránh dị ứng`,
        `- Dùng tool search_recipes lọc theo mealType="${mealType}" và maxCost phù hợp`,
        `- Trả về đúng 3 gợi ý, mỗi gợi ý gồm: tên món, mô tả ngắn 1 câu, chi phí ước tính`,
        `- Format: danh sách đánh số 1. 2. 3.`,
      ].join('\n');

      // Dùng SingleAgent để tìm gợi ý
      let suggestions = '';
      const stream$ = this.singleAgent.run({
        userId,
        featureType: 'chat',
        message: prompt,
      });

      await new Promise<void>((resolve, reject) => {
        stream$.subscribe({
          next: (event) => {
            if (event.event === 'chunk') {
              suggestions += event.data;
            }
          },
          error: reject,
          complete: resolve,
        });
      });

      await emit('done', {
        slotId,
        suggestions,
        message: 'AI đã tìm được 3 gợi ý món thay thế',
      });

      // Ghi log AI usage (fix bug: guard chỉ check nhưng không INSERT)
      await this.prisma.aiUsageLog.create({
        data: { userId, featureType: 'slot_regenerate', usedAt: new Date() },
      });

      this.logger.log(`[SlotRegenerate] Done: jobId=${jobId}`);
    } catch (err: any) {
      this.logger.error(`❌ [SlotRegenerate] Lỗi: ${err?.message}`);
      await emit('error', { message: err?.message ?? 'Đã xảy ra lỗi' });
    }
  }
}
