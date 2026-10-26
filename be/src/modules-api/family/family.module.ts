import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FamilyService } from './family.service';
import { FamilyController } from './family.controller';
import { FamilyCron } from './family.cron';
// EMAIL_SERVICE ClientProxy được cung cấp global bởi EmailClientModule (import trong AppModule)

@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  controllers: [FamilyController],
  providers: [FamilyService, FamilyCron],
  exports: [FamilyService],
})
export class FamilyModule {}
