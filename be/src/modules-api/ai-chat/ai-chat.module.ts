import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { RabbitMqPublisherModule } from 'src/modules-system/rabbit-mq/rabbit-mq-publisher.module';
import { RedisModule } from 'src/modules-system/redis/redis.module';

@Module({
  imports: [PrismaModule, RabbitMqPublisherModule, RedisModule],
  controllers: [AiChatController],
  providers: [AiChatService],
})
export class AiChatModule {}
