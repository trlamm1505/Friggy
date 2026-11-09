import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { CreateSupplierPlanDto, UpdateSupplierPlanDto } from './dto/admin-supplier-plans.dto';

@Injectable()
export class AdminSupplierPlansService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.supplierPlan.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
    });
  }

  async create(dto: CreateSupplierPlanDto) {
    return this.prisma.supplierPlan.create({
      data: {
        name: dto.name,
        displayName: dto.displayName,
        priceVnd: dto.priceVnd,
        billingCycle: dto.billingCycle,
        maxIngredients: dto.maxIngredients ?? 50,
        features: dto.features,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateSupplierPlanDto) {
    const plan = await this.prisma.supplierPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Supplier plan not found');
    return this.prisma.supplierPlan.update({
      where: { id },
      data: {
        ...(dto.displayName && { displayName: dto.displayName }),
        ...(dto.priceVnd !== undefined && { priceVnd: dto.priceVnd }),
        ...(dto.maxIngredients !== undefined && { maxIngredients: dto.maxIngredients }),
        ...(dto.features && { features: dto.features }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }
}
