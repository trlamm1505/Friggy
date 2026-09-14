/**
 * RabbitMqPublisherService — Service publish message lên RabbitMQ
 *
 * Wrapper tiện lợi cho AmqpConnection của @golevelup/nestjs-rabbitmq.
 * Được inject vào MealPlanningService và AiChatService (Phase 9).
 */
import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { FRIGGY_AI_EXCHANGE } from 'src/common/constant/app.constant';

@Injectable()
export class RabbitMqPublisherService {
  private readonly logger = new Logger(RabbitMqPublisherService.name);

  constructor(private readonly amqp: AmqpConnection) {}

  /**
   * Publish message lên exchange "friggy.ai" với routing key chỉ định.
   * AI Service sẽ consume message này qua queue tương ứng.
   *
   * @param routingKey - Routing key khớp với @RabbitSubscribe trong AI Service
   * @param message    - Payload object (sẽ được JSON.stringify tự động)
   */
  async publish<T>(routingKey: string, message: T): Promise<void> {
    try {
      await this.amqp.publish(FRIGGY_AI_EXCHANGE, routingKey, message);
      this.logger.log(
        `[RabbitMQ] Published: exchange=${FRIGGY_AI_EXCHANGE} | key=${routingKey}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[RabbitMQ] Publish thất bại: key=${routingKey} | ${error.message}`,
      );
      throw error;
    }
  }
}
