import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

// System modules
import { PrismaModule } from './modules-system/prisma/prisma.module';
import { TokensModule } from './modules-system/tokens/tokens.module';

// API modules
import { AuthModule } from './modules-api/auth/auth.module';
import { UsersModule } from './modules-api/users/users.module';
import { IngredientsModule } from './modules-api/ingredients/ingredients.module';
import { RecipesModule } from './modules-api/recipes/recipes.module';
import { FridgeModule } from './modules-api/fridge/fridge.module';
import { NotificationsModule } from './modules-api/notifications/notifications.module';
import { SubscriptionsModule } from './modules-api/subscriptions/subscriptions.module';

// Global guards
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Global interceptors
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseSuccessInterceptor } from './common/interceptors/responese-success.interceptor';

// Global filter
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    PrismaModule,
    TokensModule,
    // JwtModule export từ TokensModule, nhưng cần register tại root
    // để JwtAuthGuard (được inject qua APP_GUARD) có thể dùng
    JwtModule.register({}),

    // ── API Modules ────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    IngredientsModule,
    RecipesModule,
    FridgeModule,
    NotificationsModule,
    SubscriptionsModule,
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
