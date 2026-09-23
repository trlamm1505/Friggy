import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

// System modules
import { PrismaModule } from './modules-system/prisma/prisma.module';
import { TokensModule } from './modules-system/tokens/tokens.module';
import { RedisModule } from './modules-system/redis/redis.module';
import { RabbitMqPublisherModule } from './modules-system/rabbit-mq/rabbit-mq-publisher.module';

// API modules
import { AuthModule } from './modules-api/auth/auth.module';
import { UsersModule } from './modules-api/users/users.module';
import { IngredientsModule } from './modules-api/ingredients/ingredients.module';
import { RecipesModule } from './modules-api/recipes/recipes.module';
import { FridgeModule } from './modules-api/fridge/fridge.module';
import { NotificationsModule } from './modules-api/notifications/notifications.module';
import { SubscriptionsModule } from './modules-api/subscriptions/subscriptions.module';
import { AdminModule } from './modules-api/admin/admin.module';
import { MealPlanningModule } from './modules-api/meal-planning/meal-planning.module';
import { AiChatModule } from './modules-api/ai-chat/ai-chat.module';
import { PublicChatModule } from './modules-api/public-chat/public-chat.module';
import { PaymentTransactionsModule } from './modules-api/payment-transactions/payment-transactions.module';
import { FamilyModule } from './modules-api/family/family.module';
import { EmailClientModule } from './modules-system/email-client/email-client.module';

// Global guards
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Global interceptors
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseSuccessInterceptor } from './common/interceptors/response-success.interceptor';

// Global filter
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    PrismaModule,
    TokensModule,
    // JwtModule export từ TokensModule, nhưng cần register tại root
    // để JwtAuthGuard (được inject qua APP_GUARD) có thể dùng
    JwtModule.register({}),

    // ── System Modules (Global) ────────────────────────────────────────
    RedisModule,              // Redis cache + SSE pub/sub (global)
    RabbitMqPublisherModule,  // Publish jobs lên AI Service qua RabbitMQ (global)

    // ── API Modules ────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    IngredientsModule,
    RecipesModule,
    FridgeModule,
    NotificationsModule,
    SubscriptionsModule,
    AdminModule,
    // AiCoreModule sẽ được bỏ ở Phase 9 khi AI Chat cũng chuyển sang AI Service
    MealPlanningModule,
    AiChatModule,
    PublicChatModule,
    PaymentTransactionsModule,
    FamilyModule,
    EmailClientModule,
  ],
  controllers: [],
  providers: [
    // ── Global Exception Filter ────────────────────────────────────────
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // ── Global Interceptors (thứ tự quan trọng: Logging trước) ────────
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseSuccessInterceptor,
    },

    // ── Global Guards ─────────────────────────────────────────────────
    // JwtAuthGuard chạy trước RolesGuard (thứ tự khai báo)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
