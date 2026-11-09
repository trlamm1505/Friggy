/**
 * SupplierPaymentCron — Chạy mỗi phút để cleanup expired supplier payment transactions
 *
 * Logic:
 *   Tìm tất cả supplier_payment_transactions có status='pending' và expiredAt < now
 *   → set status='cancelled'
 *   (Không rollback subscription vì supplier chưa thanh toán thì subscription chưa được tạo/gia hạn)
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';

@Injectable()
export class SupplierPaymentCron {
  private readonly logger = new Logger(SupplierPaymentCron.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mỗi phút: tìm supplier_payment_transactions pending đã quá expiredAt
   * → set status='cancelled'
   */
  @Cron('* * * * *')
  async cleanupExpiredSupplierTransactions(): Promise<void> {
    try {
      const now = new Date();

      const { count } = await this.prisma.supplierPaymentTransaction.updateMany({
        where: {
          status: 'pending',
          expiredAt: { lt: now },
        },
        data: { status: 'cancelled' },
      });

      if (count > 0) {
        this.logger.log(`[Cron] Cancelled ${count} expired supplier payment transaction(s)`);
      }
    } catch (err) {
      this.logger.error(`[Cron] Failed to cleanup expired supplier transactions: ${err}`);
    }
  }
}

