import { Module } from '@nestjs/common';
import { SupplierProfileController } from './profile/supplier-profile.controller';
import { SupplierProfileService } from './profile/supplier-profile.service';
import { SupplierIngredientsController } from './ingredients/supplier-ingredients.controller';
import { SupplierIngredientsService } from './ingredients/supplier-ingredients.service';
import { SupplierApplicationController } from './application/supplier-application.controller';
import { SupplierApplicationService } from './application/supplier-application.service';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { FcmModule } from 'src/modules-system/fcm/fcm.module';
import { RedisModule } from 'src/modules-system/redis/redis.module';
import { PayOsModule } from 'src/modules-system/payos/payos.module';
import { SupplierActiveGuard } from 'src/common/guards/supplier-active.guard';

@Module({
  imports: [PrismaModule, FcmModule, RedisModule, PayOsModule],
  controllers: [
    SupplierApplicationController,
    SupplierProfileController,
    SupplierIngredientsController,
  ],
  providers: [
    SupplierApplicationService,
    SupplierProfileService,
    SupplierIngredientsService,
    SupplierActiveGuard,
  ],
  exports: [SupplierIngredientsService],
})
export class SupplierModule {}
