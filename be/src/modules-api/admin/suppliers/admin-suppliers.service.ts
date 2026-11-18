import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { ListSuppliersDto, VerifySupplierDto } from './dto/admin-suppliers.dto';

@Injectable()
export class AdminSuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: ListSuppliersDto) {
    const { search, isVerified, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (typeof isVerified === 'boolean') where.isVerified = isVerified;
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { taxCode: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.supplierProfile.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true } },
          subscription: { select: { status: true, startDate: true, endDate: true } },
          _count: { select: { ingredients: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplierProfile.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const profile = await this.prisma.supplierProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
        subscription: { include: { plan: true } },
        ingredients: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        paymentTransactions: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!profile) throw new NotFoundException('Supplier profile not found');
    return profile;
  }

  async verify(id: string, dto: VerifySupplierDto, adminId: string) {
    const profile = await this.prisma.supplierProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Supplier profile not found');

    return this.prisma.supplierProfile.update({
      where: { id },
      data: { isVerified: dto.isVerified },
    });
  }
}
