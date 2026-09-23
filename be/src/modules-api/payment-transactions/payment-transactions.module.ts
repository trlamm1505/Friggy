import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { PaymentTransactionsService } from './payment-transactions.service';
import { PaymentTransactionsController } from './payment-transactions.controller';
import { PaymentTransactionsCron } from './payment-transactions.cron';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [PaymentTransactionsController],
  providers: [PaymentTransactionsService, PaymentTransactionsCron],
  exports: [PaymentTransactionsService],
})
export class PaymentTransactionsModule {}
