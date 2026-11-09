import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { FcmService } from 'src/modules-system/fcm/fcm.service';
import { randomUUID } from 'crypto';
import {
  ListSupplierIngredientsDto,
  ApproveSupplierIngredientDto,
  RejectSupplierIngredientDto,
} from './dto/admin-supplier-ingredients.dto';

@Injectable()
export class AdminSupplierIngredientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
  ) {}

  async findAll(dto: ListSupplierIngredientsDto, adminId: string) {
    const { status, profileId, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (profileId) where.profileId = profileId;

    const [items, total] = await Promise.all([
      this.prisma.supplierIngredient.findMany({
        where,
        skip,
        take: limit,
        include: {
          profile: { select: { companyName: true, userId: true } },
          category: { select: { name: true } },
          reviewer: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplierIngredient.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const ingredient = await this.prisma.supplierIngredient.findUnique({
      where: { id },
      include: {
        profile: { include: { user: { select: { id: true, email: true } } } },
        category: true,
        reviewer: { select: { id: true, email: true } },
        linkedIngredient: true,
      },
    });
    if (!ingredient) throw new NotFoundException('Supplier ingredient not found');
    return ingredient;
  }

  async approve(id: string, dto: ApproveSupplierIngredientDto, adminId: string) {
    const ingredient = await this.prisma.supplierIngredient.findUnique({
      where: { id },
      include: { profile: { include: { user: { select: { id: true } } } } },
    });
    if (!ingredient) throw new NotFoundException('Supplier ingredient not found');
    if (ingredient.status !== 'pending') throw new ConflictException('Ingredient is not in pending state');

    let linkedIngredientId: number | null = ingredient.linkedIngredientId;

    // If mergeToGlobal is true, try to create a global ingredient
    if (dto.mergeToGlobal) {
      const existing = await this.prisma.ingredient.findUnique({ where: { name: ingredient.name } });
      if (!existing) {
        const newGlobal = await this.prisma.ingredient.create({
          data: {
            name: ingredient.name,
            categoryId: ingredient.categoryId,
            defaultUnit: ingredient.defaultUnit,
            caloriesPer100g: ingredient.caloriesPer100g,
            averagePricePerUnit: ingredient.averagePricePerUnit,
            imagePath: ingredient.imagePath,
          },
        });
        linkedIngredientId = newGlobal.id;
      } else {
        linkedIngredientId = existing.id;
      }
    }

    const updated = await this.prisma.supplierIngredient.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        linkedIngredientId,
        rejectionReason: null,
      },
    });

    // Log admin activity
    await this.prisma.adminActivityLog.create({
      data: {
        id: randomUUID(),
        adminId,
        action: 'approve_supplier_ingredient',
        targetEntity: 'supplier_ingredients',
        targetId: id,
        newValue: { ingredientName: ingredient.name, mergeToGlobal: dto.mergeToGlobal ?? false },
      },
    });

    // Send notification to supplier
    const userId = ingredient.profile.user.id;
    await Promise.all([
      this.prisma.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: 'ingredient_approved',
          title: 'Nguyên liệu đã được duyệt',
          body: `Nguyên liệu "${ingredient.name}" đã được admin duyệt và hiển thị cho người dùng.`,
          metadata: JSON.stringify({ ingredientId: id, ingredientName: ingredient.name }),
        },
      }),
      this.fcmService.sendToUser(userId, {
        title: 'Nguyên liệu đã được duyệt',
        body: `Nguyên liệu "${ingredient.name}" đã được duyệt thành công.`,
      }),
    ]);

    return updated;
  }

  async reject(id: string, dto: RejectSupplierIngredientDto, adminId: string) {
    const ingredient = await this.prisma.supplierIngredient.findUnique({
      where: { id },
      include: { profile: { include: { user: { select: { id: true } } } } },
    });
    if (!ingredient) throw new NotFoundException('Supplier ingredient not found');
    if (ingredient.status !== 'pending') throw new ConflictException('Ingredient is not in pending state');

    const updated = await this.prisma.supplierIngredient.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: dto.reason,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Log admin activity
    await this.prisma.adminActivityLog.create({
      data: {
        id: randomUUID(),
        adminId,
        action: 'reject_supplier_ingredient',
        targetEntity: 'supplier_ingredients',
        targetId: id,
        newValue: { ingredientName: ingredient.name, reason: dto.reason },
      },
    });

    // Send notification
    const userId = ingredient.profile.user.id;
    await Promise.all([
      this.prisma.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: 'ingredient_rejected',
          title: 'Nguyên liệu bị từ chối',
          body: `Nguyên liệu "${ingredient.name}" đã bị từ chối. Lý do: ${dto.reason}`,
          metadata: JSON.stringify({ ingredientId: id, ingredientName: ingredient.name, reason: dto.reason }),
        },
      }),
      this.fcmService.sendToUser(userId, {
        title: 'Nguyên liệu bị từ chối',
        body: `Nguyên liệu "${ingredient.name}" bị từ chối. Lý do: ${dto.reason}`,
      }),
    ]);

    return updated;
  }
}
