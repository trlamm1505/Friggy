import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { AdminAiController } from './admin-ai.controller';
import { AdminAiService } from './admin-ai.service';
import { AdminCronController } from './admin-cron.controller';
import { AdminCronService } from './admin-cron.service';
import { NotificationsModule } from 'src/modules-api/notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule, // Export NotificationCronService cần cho AdminCronService
  ],
  controllers: [AdminAiController, AdminCronController],
  providers: [AdminAiService, AdminCronService],
})
export class AdminModule {}
