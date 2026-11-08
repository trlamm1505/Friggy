import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import type { ListSupplierTransactionsDto } from './dto/admin-supplier-payment-transactions.dto';

@Injectable()
export class AdminSupplierPaymentTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: ListSupplierTransactionsDto) {
    const { profileId, status, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (profileId) where.profileId = profileId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.supplierPaymentTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: {
            select: {
              id: true,
              companyName: true,
              user: { select: { id: true, email: true } },
            },
          },
          plan: { select: { id: true, name: true, displayName: true } },
        },
      }),
      this.prisma.supplierPaymentTransaction.count({ where }),
    ]);

    return {
      items: items.map((tx) => ({
        id: tx.id,
        profileId: tx.profileId,
        companyName: tx.profile.companyName,
        supplierEmail: tx.profile.user.email,
        planName: tx.plan.displayName,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        paymentMethod: tx.paymentMethod,
        paymentRef: tx.paymentRef ?? null,
        description: tx.description ?? null,
        checkoutUrl: tx.checkoutUrl ?? null,
        expiredAt: tx.expiredAt?.toISOString() ?? null,
        paidAt: tx.paidAt?.toISOString() ?? null,
        createdAt: tx.createdAt.toISOString(),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}

