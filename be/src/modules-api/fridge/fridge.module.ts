import { Module } from '@nestjs/common';
import { FridgeController } from './fridge.controller';
import { FridgeService } from './fridge.service';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { RabbitMqPublisherModule } from 'src/modules-system/rabbit-mq/rabbit-mq-publisher.module';

@Module({
  imports: [PrismaModule, RabbitMqPublisherModule],
  controllers: [FridgeController],
  providers: [FridgeService],
  exports: [FridgeService],
})
export class FridgeModule {}
