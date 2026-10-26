import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { FamilyService } from './family.service';
import { FamilyController } from './family.controller';
import { FamilyCron } from './family.cron';
import { FamilyGateway } from './family.gateway';
// EMAIL_SERVICE ClientProxy được cung cấp global bởi EmailClientModule (import trong AppModule)

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    JwtModule.register({}),  // JwtService dùng bởi FamilyGateway để verify token
  ],
  controllers: [FamilyController],
  providers: [FamilyService, FamilyCron, FamilyGateway],
  exports: [FamilyService, FamilyGateway],
})
export class FamilyModule {}
