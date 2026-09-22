/**
 * RabbitMqModule — Consumer module cho AI Service
 *
 * Kết nối tới RabbitMQ broker, khai báo exchange và các queue:
 * - meal-plan-generate-queue: nhận job tạo thực đơn từ Main BE
 * - ai-chat-message-queue: nhận message chat từ Main BE
 *
 * Flow tổng quát:
 *   Main BE publish → RabbitMQ Exchange "friggy.ai" → Queue → Consumer xử lý
 *   → AI pipeline → Redis PUBLISH progress → Main BE SSE → FE
 */
import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import {
  RABBIT_MQ_URL,
  FRIGGY_AI_EXCHANGE,
} from 'src/common/constant/app.constant';

import { AiCoreModule } from 'src/ai-core/ai-core.module';
import { MealPlanConsumer } from './meal-plan.consumer';
import { FridgeScanConsumer } from './fridge-scan.consumer';
import { AiChatConsumer } from './ai-chat.consumer';
import { SlotRegenerateConsumer } from './slot-regenerate.consumer';
import { ExpiringMealPlanConsumer } from './expiring-meal.consumer';
import { PublicChatConsumer } from './public-chat.consumer';

@Module({
  imports: [
    RabbitMQModule.forRoot({
      uri: RABBIT_MQ_URL,
      exchanges: [
        {
          name: FRIGGY_AI_EXCHANGE,
          type: 'direct', // Direct exchange — routing key khớp chính xác
        },
      ],
      // Tự động kết nối lại khi mất kết nối
      connectionInitOptions: { wait: true, timeout: 10000 },
      // Tên hiển thị trong RabbitMQ Management UI (Connections tab)
      connectionManagerOptions: {
        connectionOptions: {
          clientProperties: {
            connection_name: 'friggy-ai-service-consumer',
          },
        },
      },
    }),
    AiCoreModule,
  ],
  providers: [MealPlanConsumer, FridgeScanConsumer, AiChatConsumer, SlotRegenerateConsumer, ExpiringMealPlanConsumer, PublicChatConsumer],
  exports: [RabbitMQModule],
})
export class RabbitMqConsumerModule {}
