import { Module } from '@nestjs/common';
import { PublicChatController } from './public-chat.controller';
import { PublicChatService } from './public-chat.service';
import { RabbitMqPublisherModule } from 'src/modules-system/rabbit-mq/rabbit-mq-publisher.module';
import { RedisModule } from 'src/modules-system/redis/redis.module';

@Module({
  imports: [RabbitMqPublisherModule, RedisModule],
  controllers: [PublicChatController],
  providers: [PublicChatService],
})
export class PublicChatModule {}
