import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { PayOsModule } from 'src/modules-system/payos/payos.module';
import { PaymentTransactionsModule } from '../payment-transactions/payment-transactions.module';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [PrismaModule, PayOsModule, PaymentTransactionsModule, FamilyModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
