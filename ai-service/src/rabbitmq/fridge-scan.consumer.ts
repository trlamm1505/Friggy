/**
 * FridgeScanConsumer — RabbitMQ Consumer cho Fridge Scan jobs
 *
 * Nhận job từ Main BE (sau khi user upload ảnh scan).
 * Delegate xử lý sang FridgeScanGraphService.
 */
import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import {
  FRIGGY_AI_EXCHANGE,
  FRIDGE_SCAN_ROUTING_KEY,
  FRIDGE_SCAN_QUEUE_NAME,
} from 'src/common/constant/app.constant';
import { FridgeScanGraphService, type FridgeScanJob } from 'src/ai-core/fridge-scan-graph.service';

@Injectable()
export class FridgeScanConsumer {
  private readonly logger = new Logger(FridgeScanConsumer.name);

  constructor(private readonly fridgeScanGraph: FridgeScanGraphService) {}

  @RabbitSubscribe({
    exchange: FRIGGY_AI_EXCHANGE,
    routingKey: FRIDGE_SCAN_ROUTING_KEY,
    queue: FRIDGE_SCAN_QUEUE_NAME,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': `${FRIGGY_AI_EXCHANGE}.dlx`,
      },
    },
  })
  async handleFridgeScan(job: FridgeScanJob): Promise<void | Nack> {
    this.logger.log(
      `📷 [FridgeScanConsumer] Nhận job: scanId=${job.scanId} | type=${job.scanType} | userId=${job.userId}`,
    );

    try {
      await this.fridgeScanGraph.run(job);
      this.logger.log(`✅ [FridgeScanConsumer] Hoàn thành: scanId=${job.scanId}`);
    } catch (error: any) {
      this.logger.error(
        `❌ [FridgeScanConsumer] Lỗi xử lý job: scanId=${job.scanId} | ${error?.message}`,
      );
      // Nack để RabbitMQ không requeue (tránh loop lỗi)
      return new Nack(false);
    }
  }
}
