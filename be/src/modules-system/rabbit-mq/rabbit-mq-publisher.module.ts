/**
 * RabbitMqPublisherModule — Module publish message lên RabbitMQ từ Main BE
 *
 * Main BE chỉ cần publish, không consume.
 * Consumer là AI Service (ai-service/).
 *
 * Exchange: friggy.ai (direct)
 * Routing keys:
 *   - meal.plan.generate  → AI Service xử lý tạo thực đơn
 *   - ai.chat.message     → AI Service xử lý chat (Phase 9)
 */
import { Module, Global } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import {
  RABBIT_MQ_URL,
  FRIGGY_AI_EXCHANGE,
} from 'src/common/constants/app.constant';
import { RabbitMqPublisherService } from './rabbit-mq-publisher.service';

@Global()
@Module({
  imports: [
    RabbitMQModule.forRoot({
      uri: RABBIT_MQ_URL,
      exchanges: [
        {
          name: FRIGGY_AI_EXCHANGE,
          type: 'direct',
        },
      ],
      // Không khai báo queue — BE chỉ publish
      connectionInitOptions: { wait: true, timeout: 10000 },
      // Tên hiển thị trong RabbitMQ Management UI (Connections tab)
      connectionManagerOptions: {
        connectionOptions: {
          clientProperties: {
            connection_name: 'friggy-be-publisher',
          },
        },
      },
    }),
  ],
  providers: [RabbitMqPublisherService],
  exports: [RabbitMqPublisherService],
})
export class RabbitMqPublisherModule {}
