/**
 * PaymentTransactionsCron — Chạy mỗi phút để cleanup expired pending transactions
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentTransactionsService } from './payment-transactions.service';

@Injectable()
export class PaymentTransactionsCron {
  private readonly logger = new Logger(PaymentTransactionsCron.name);

  constructor(private readonly paymentTxService: PaymentTransactionsService) {}

  /**
   * Mỗi phút: tìm tất cả PaymentTransaction có status=pending và expiredAt < now
   * → set status='expired'
   * → cleanup UserSubscription tương ứng (pendingPlanId=null, status='cancelled')
   */
  @Cron('* * * * *')
  async cleanupExpiredTransactions() {
    try {
      const count = await this.paymentTxService.cleanupExpired();
      if (count > 0) {
        this.logger.log(`[Cron] Cleaned up ${count} expired payment transaction(s)`);
      }
    } catch (err) {
      this.logger.error(`[Cron] Failed to cleanup expired transactions: ${err}`);
    }
  }
}
