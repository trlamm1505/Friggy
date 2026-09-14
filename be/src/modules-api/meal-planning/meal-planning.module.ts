/**
 * MealPlanningModule — Module tính năng Lập kế hoạch bữa ăn
 *
 * Sau khi tách AI ra microservice:
 * - Controller/Service vẫn ở Main BE (nhận request HTTP)
 * - Không còn BullMQ / Worker — đã chuyển sang AI Service
 * - Publish message lên RabbitMQ qua RabbitMqPublisherModule (global)
 * - SSE stream vẫn dùng Redis pub/sub (subscribe channel do AI Service publish)
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { RedisModule } from 'src/modules-system/redis/redis.module';
import { MealPlanningController } from './meal-planning.controller';
import { MealPlanningService } from './meal-planning.service';

// RabbitMqPublisherModule là Global (đăng ký ở AppModule) — inject trực tiếp service

@Module({
  imports: [
    PrismaModule,
    RedisModule, // Cần RedisService cho SSE pub/sub trong controller
  ],
  controllers: [MealPlanningController],
  providers: [MealPlanningService],
})
export class MealPlanningModule {}
