import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { NotificationsModule } from 'src/modules-api/notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
