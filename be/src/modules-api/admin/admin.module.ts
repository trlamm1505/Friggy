import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';

// ── AI Management (Phase 8) ──────────────────────────────
import { AdminAiController } from './admin-ai.controller';
import { AdminAiService } from './admin-ai.service';

// ── Cron Management (Phase 11) ───────────────────────────
import { AdminCronController } from './admin-cron.controller';
import { AdminCronService } from './admin-cron.service';
import { NotificationsModule } from 'src/modules-api/notifications/notifications.module';

// ── Phase 12: User, Stats, Sponsors ─────────────────────
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminSponsorsController } from './admin-sponsors.controller';
import { AdminSponsorsService } from './admin-sponsors.service';

// ── Phase 14: Plan Management ────────────────────────────
import { AdminPlansController } from './admin-plans.controller';
import { AdminPlansService } from './admin-plans.service';

// ── Payment Transactions ──────────────────────────────────
import { AdminPaymentTransactionsController } from './admin-payment-transactions.controller';
import { PaymentTransactionsModule } from 'src/modules-api/payment-transactions/payment-transactions.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    PaymentTransactionsModule,
  ],
  controllers: [
    AdminAiController,
    AdminCronController,
    AdminUsersController,
    AdminStatsController,
    AdminSponsorsController,
    AdminPlansController,
    AdminPaymentTransactionsController,
  ],
  providers: [
    AdminAiService,
    AdminCronService,
    AdminUsersService,
    AdminStatsService,
    AdminSponsorsService,
    AdminPlansService,
  ],
})
export class AdminModule {}
