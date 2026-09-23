/**
 * PaymentTransactionsService
 *
 * Trách nhiệm:
 * 1. Tạo transaction khi user bắt đầu thanh toán (createPending)
 * 2. Cập nhật trạng thái sau webhook PayOS (markPaid, markCancelled)
 * 3. Cleanup expired (dùng bởi Cron)
 * 4. Tra cứu giao dịch cho user & admin
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { v4 as uuid } from 'uuid';
import type {
  PaymentTransactionDto,
  PaymentTransactionDetailDto,
  PaymentTransactionListResponseDto,
} from './dto/payment-transaction.dto';

@Injectable()
export class PaymentTransactionsService {
  private readonly logger = new Logger(PaymentTransactionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────
  // Tạo transaction pending khi bắt đầu thanh toán
  // ─────────────────────────────────────────────────────────

  async createPending(params: {
    userId: string;
    planId: number;
    type: 'subscribe' | 'renew';
    amount: number;
    paymentRef: string;
    description: string;
    payosOrderCode: bigint;
    payosPaymentLinkId: string;
    checkoutUrl: string;
    qrCode: string;       // QR code từ PayOS
    expiredAt: Date;
  }) {
    return this.prisma.paymentTransaction.create({
      data: {
        id: uuid(),
        userId: params.userId,
        planId: params.planId,
        type: params.type,
        amount: params.amount,
        status: 'pending',
        paymentRef: params.paymentRef,
        description: params.description,
        payosOrderCode: params.payosOrderCode,
        payosPaymentLinkId: params.payosPaymentLinkId,
        checkoutUrl: params.checkoutUrl,
        qrCode: params.qrCode,
        expiredAt: params.expiredAt,
        updatedAt: new Date(),
      },
    });
  }

  // ─────────────────────────────────────────────────────────
  // Cập nhật trạng thái sau webhook
  // ─────────────────────────────────────────────────────────

  async findByOrderCode(orderCode: bigint) {
    return this.prisma.paymentTransaction.findFirst({
      where: { payosOrderCode: orderCode },
      include: { plan: true },
    });
  }

  async markPaid(id: string, payosTransactionRef?: string) {
    return this.prisma.paymentTransaction.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        payosTransactionRef: payosTransactionRef ?? null,
      },
    });
  }

  async markCancelled(id: string) {
    return this.prisma.paymentTransaction.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  // ─────────────────────────────────────────────────────────
  // Cleanup expired (gọi từ Cron)
  // ─────────────────────────────────────────────────────────

  async cleanupExpired(): Promise<number> {
    const now = new Date();

    // Lấy tất cả transaction pending đã quá hạn
    const expired = await this.prisma.paymentTransaction.findMany({
      where: { status: 'pending', expiredAt: { lt: now } },
      select: { id: true, userId: true },
    });

    if (expired.length === 0) return 0;

    // Batch update transactions → expired
    await this.prisma.paymentTransaction.updateMany({
      where: { status: 'pending', expiredAt: { lt: now } },
      data: { status: 'expired' },
    });

    // Cleanup UserSubscription: xóa pendingPlanId cho những user không còn pending transaction nào
    const userIds = [...new Set(expired.map((t) => t.userId))];
    for (const userId of userIds) {
      // Kiểm tra xem còn pending transaction nào khác không
      const stillPending = await this.prisma.paymentTransaction.count({
        where: { userId, status: 'pending' },
      });
      if (stillPending === 0) {
        // Reset subscription pending state
        await this.prisma.userSubscription.updateMany({
          where: { userId, status: 'pending', deletedAt: null },
          data: { status: 'cancelled', pendingPlanId: null },
        });
      }
    }

    this.logger.log(`[Cron] Cleanup ${expired.length} expired payment transactions`);
    return expired.length;
  }

  // ─────────────────────────────────────────────────────────
  // Tra cứu theo paymentRef (FE polling)
  // ─────────────────────────────────────────────────────────

  async findByPaymentRef(
    userId: string,
    paymentRef: string,
  ): Promise<PaymentTransactionDetailDto> {
    const tx = await this.prisma.paymentTransaction.findFirst({
      where: { paymentRef, userId },
      include: { plan: true },
    });
    if (!tx) throw new NotFoundException('Không tìm thấy giao dịch');

    return {
      id: tx.id,
      paymentRef: tx.paymentRef,
      type: tx.type,
      planName: tx.plan.displayName,
      amount: tx.amount,
      status: tx.status,
      paymentMethod: tx.paymentMethod,
      // Chỉ trả checkoutUrl + qrCode nếu còn hạn
      checkoutUrl: tx.expiredAt && tx.expiredAt > new Date() ? tx.checkoutUrl : null,
      qrCode: tx.expiredAt && tx.expiredAt > new Date() ? tx.qrCode : null,
      expiredAt: tx.expiredAt?.toISOString() ?? null,
      paidAt: tx.paidAt?.toISOString() ?? null,
      createdAt: tx.createdAt.toISOString(),
      payosTransactionRef: tx.payosTransactionRef,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Lịch sử giao dịch của user (paginated)
  // ─────────────────────────────────────────────────────────

  async getMyTransactions(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaymentTransactionListResponseDto> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.paymentTransaction.count({ where: { userId } }),
    ]);

    return {
      data: data.map((tx) => ({
        id: tx.id,
        paymentRef: tx.paymentRef,
        type: tx.type,
        planName: tx.plan.displayName,
        amount: tx.amount,
        status: tx.status,
        checkoutUrl: tx.expiredAt && tx.expiredAt > new Date() ? tx.checkoutUrl : null,
        expiredAt: tx.expiredAt?.toISOString() ?? null,
        paidAt: tx.paidAt?.toISOString() ?? null,
        createdAt: tx.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Giao dịch gần nhất
  // ─────────────────────────────────────────────────────────

  async getLatestTransaction(userId: string): Promise<PaymentTransactionDto | null> {
    const tx = await this.prisma.paymentTransaction.findFirst({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!tx) return null;

    return {
      id: tx.id,
      paymentRef: tx.paymentRef,
      type: tx.type,
      planName: tx.plan.displayName,
      amount: tx.amount,
      status: tx.status,
      checkoutUrl: tx.expiredAt && tx.expiredAt > new Date() ? tx.checkoutUrl : null,
      expiredAt: tx.expiredAt?.toISOString() ?? null,
      paidAt: tx.paidAt?.toISOString() ?? null,
      createdAt: tx.createdAt.toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────
  // Admin — tất cả giao dịch
  // ─────────────────────────────────────────────────────────

  async getAllTransactions(params: {
    userId?: string;
    status?: string;
    page: number;
    limit: number;
  }): Promise<PaymentTransactionListResponseDto> {
    const skip = (params.page - 1) * params.limit;
    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where,
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: params.limit,
      }),
      this.prisma.paymentTransaction.count({ where }),
    ]);

    return {
      data: data.map((tx) => ({
        id: tx.id,
        paymentRef: tx.paymentRef,
        type: tx.type,
        planName: tx.plan.displayName,
        amount: tx.amount,
        status: tx.status,
        checkoutUrl: tx.checkoutUrl,
        expiredAt: tx.expiredAt?.toISOString() ?? null,
        paidAt: tx.paidAt?.toISOString() ?? null,
        createdAt: tx.createdAt.toISOString(),
      })),
      total,
      page: params.page,
      limit: params.limit,
    };
  }
}
