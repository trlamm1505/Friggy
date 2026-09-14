/**
 * AppModule của AI Service
 *
 * Service này chỉ làm một việc: xử lý AI request.
 * Không có HTTP controller (chỉ internal), nhận việc qua RabbitMQ,
 * kết quả trả về qua Redis pub/sub.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AiCoreModule } from './ai-core/ai-core.module';
import { RabbitMqConsumerModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [
    PrismaModule,           // DB connection (Global)
    RedisModule,            // Redis cache + pub/sub (Global)
    AiCoreModule,           // Toàn bộ logic AI
    RabbitMqConsumerModule, // Lắng nghe message từ Main BE
  ],
})
export class AppModule {}
