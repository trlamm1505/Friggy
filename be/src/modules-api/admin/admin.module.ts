import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { FcmModule } from 'src/modules-system/fcm/fcm.module';

// ── AI ────────────────────────────────────────────────────
import { AdminAiController } from './ai/admin-ai.controller';
import { AdminAiService } from './ai/admin-ai.service';

// ── Cron ─────────────────────────────────────────────────
import { AdminCronController } from './cron/admin-cron.controller';
import { AdminCronService } from './cron/admin-cron.service';
import { NotificationsModule } from 'src/modules-api/notifications/notifications.module';

// ── Users ─────────────────────────────────────────────────
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';

// ── Stats ─────────────────────────────────────────────────
import { AdminStatsController } from './stats/admin-stats.controller';
import { AdminStatsService } from './stats/admin-stats.service';

// ── Sponsors ──────────────────────────────────────────────
import { AdminSponsorsController } from './sponsors/admin-sponsors.controller';
import { AdminSponsorsService } from './sponsors/admin-sponsors.service';

// ── Plans ─────────────────────────────────────────────────
import { AdminPlansController } from './plans/admin-plans.controller';
import { AdminPlansService } from './plans/admin-plans.service';

// ── Payment Transactions ──────────────────────────────────
import { AdminPaymentTransactionsController } from './payment-transactions/admin-payment-transactions.controller';
import { AdminPaymentTransactionsService } from './payment-transactions/admin-payment-transactions.service';

// ── Ingredients ───────────────────────────────────────────
import { AdminIngredientsController } from './ingredients/admin-ingredients.controller';
import { AdminIngredientsService } from './ingredients/admin-ingredients.service';

// ── Recipes ───────────────────────────────────────────────
import { AdminRecipesController } from './recipes/admin-recipes.controller';
import { AdminRecipesService } from './recipes/admin-recipes.service';

// ── System Config ─────────────────────────────────────────
import { AdminSystemConfigController } from './system-config/admin-system-config.controller';
import { AdminSystemConfigService } from './system-config/admin-system-config.service';

// ── Sessions & AI Quota ───────────────────────────────────
import { AdminSessionsController } from './users/admin-sessions.controller';
import { AdminSessionsService } from './users/admin-sessions.service';

// ── Activity Logs ─────────────────────────────────────────
import { AdminActivityLogsController } from './activity-logs/admin-activity-logs.controller';
import { AdminActivityLogsService } from './activity-logs/admin-activity-logs.service';

// ── Broadcast ─────────────────────────────────────────────
import { AdminBroadcastController } from './broadcast/admin-broadcast.controller';
import { AdminBroadcastService } from './broadcast/admin-broadcast.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    FcmModule,
  ],
  controllers: [
    AdminAiController,
    AdminCronController,
    AdminUsersController,
    AdminStatsController,
    AdminSponsorsController,
    AdminPlansController,
    AdminPaymentTransactionsController,
    AdminIngredientsController,
    AdminRecipesController,
    // Mới
    AdminSystemConfigController,
    AdminSessionsController,
    AdminActivityLogsController,
    AdminBroadcastController,
  ],
  providers: [
    AdminAiService,
    AdminCronService,
    AdminUsersService,
    AdminStatsService,
    AdminSponsorsService,
    AdminPlansService,
    AdminPaymentTransactionsService,
    AdminIngredientsService,
    AdminRecipesService,
    // Mới
    AdminSystemConfigService,
    AdminSessionsService,
    AdminActivityLogsService,
    AdminBroadcastService,
  ],
})
export class AdminModule {}
