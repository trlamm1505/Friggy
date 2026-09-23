import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { FamilyService } from './family.service';
import { FamilyController } from './family.controller';
import { FamilyCron } from './family.cron';
// EMAIL_SERVICE ClientProxy được cung cấp global bởi EmailClientModule (import trong AppModule)

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [FamilyController],
  providers: [FamilyService, FamilyCron],
  exports: [FamilyService],
})
export class FamilyModule {}
