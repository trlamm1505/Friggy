import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { v4 as uuid } from 'uuid';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { UpdateSupplierProfileDto } from './dto/supplier-profile.dto';
import type {
  SupplierProfileResponseDto,
  SupplierPlanResponseDto,
  SupplierSubscriptionResponseDto,
  SupplierSubscribeResponseDto,
} from './dto/supplier-response.dto';
import type { SupplierSubscribeDto } from './dto/supplier-subscription.dto';
import { PayOsService } from 'src/modules-system/payos/payos.service';

@Injectable()
export class SupplierProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payOsService: PayOsService,
  ) {}

  // ── Get my profile ────────────────────────────────────────────────────────

  async getMyProfile(userId: string): Promise<SupplierProfileResponseDto> {
    const profile = await this.prisma.supplierProfile.findUnique({
      where: { userId },
    });
    if (!profile || profile.deletedAt) {
      throw new NotFoundException('Không tìm thấy hồ sơ nhà cung cấp');
    }
    return this.mapProfile(profile);
  }

  // ── Update profile ────────────────────────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateSupplierProfileDto): Promise<SupplierProfileResponseDto> {
    const profile = await this.prisma.supplierProfile.findUnique({ where: { userId } });
    if (!profile || profile.deletedAt) {
      throw new NotFoundException('Không tìm thấy hồ sơ nhà cung cấp');
    }

    const updated = await this.prisma.supplierProfile.update({
      where: { userId },
      data: {
        ...(dto.companyName && { companyName: dto.companyName.trim() }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone?.trim() ?? null }),
        ...(dto.address !== undefined && { address: dto.address?.trim() ?? null }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
      },
    });

    return this.mapProfile(updated);
  }

  // ── Upload logo ───────────────────────────────────────────────────────────

  async uploadLogo(userId: string, file: Express.Multer.File): Promise<SupplierProfileResponseDto> {
    const profile = await this.prisma.supplierProfile.findUnique({ where: { userId } });
    if (!profile || profile.deletedAt) {
      throw new NotFoundException('Không tìm thấy hồ sơ nhà cung cấp');
    }

    // Xóa logo cũ nếu có
    if (profile.logoPath) {
      const oldFile = join(process.cwd(), 'public', profile.logoPath);
      if (existsSync(oldFile)) unlinkSync(oldFile);
    }

    const logoPath = `/suppliers/${file.filename}`;
    const updated = await this.prisma.supplierProfile.update({
      where: { userId },
      data: { logoPath },
    });

    return this.mapProfile(updated);
  }

  // ── Get supplier plans ────────────────────────────────────────────────────

  async getPlans(): Promise<SupplierPlanResponseDto[]> {
    const plans = await this.prisma.supplierPlan.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { priceVnd: 'asc' },
    });
    return plans.map(this.mapPlan);
  }

  // ── Get my subscription ───────────────────────────────────────────────────

  async getMySubscription(userId: string): Promise<SupplierSubscriptionResponseDto> {
    const profile = await this.prisma.supplierProfile.findUnique({
      where: { userId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!profile || profile.deletedAt) {
      throw new NotFoundException('Không tìm thấy hồ sơ nhà cung cấp');
    }
    if (!profile.subscription) {
      throw new NotFoundException('Chưa có gói cước nào đang hoạt động');
    }
    return this.mapSubscription(profile.subscription);
  }

  // ── Subscribe ─────────────────────────────────────────────────────────────

  async subscribe(userId: string, dto: SupplierSubscribeDto): Promise<SupplierSubscribeResponseDto> {
    const profile = await this.prisma.supplierProfile.findUnique({
      where: { userId },
      include: { subscription: true },
    });
    if (!profile || profile.deletedAt) {
      throw new NotFoundException('Bạn chưa đăng ký làm nhà cung cấp. Vui lòng đăng ký trước.');
    }

    const plan = await this.prisma.supplierPlan.findFirst({
      where: { id: dto.planId, isActive: true, deletedAt: null },
    });
    if (!plan) throw new NotFoundException('Gói cước không tồn tại hoặc đã ngừng hoạt động');

    // Chặn pending tx còn trong 15 phút
    const PAYMENT_EXPIRE_MS = 15 * 60 * 1000;
    const pendingTx = await this.prisma.supplierPaymentTransaction.findFirst({
      where: { profileId: profile.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    if (pendingTx) {
      const elapsed = Date.now() - new Date(pendingTx.createdAt).getTime();
      if (elapsed < PAYMENT_EXPIRE_MS) {
        const remainingSec = Math.ceil((PAYMENT_EXPIRE_MS - elapsed) / 1000);
        throw new ConflictException(
          `Đã có giao dịch đang chờ thanh toán. Thử lại sau ${remainingSec} giây hoặc hoàn tất thanh toán.`,
        );
      }
    }

    const orderCode = Date.now() % 9007199254740991;
    const paymentRef = `FRIGGY-SUP-${orderCode}`;
    const expiredAt = new Date(Date.now() + PAYMENT_EXPIRE_MS);

    const payosResponse = await this.payOsService.createPaymentLink({
      orderCode,
      amount: plan.priceVnd,
      description: `Gói NCC ${plan.displayName}`,
      planName: plan.displayName,
    });

    await this.prisma.supplierPaymentTransaction.create({
      data: {
        id: uuid(),
        profileId: profile.id,
        planId: plan.id,
        type: 'subscribe',
        amount: plan.priceVnd,
        status: 'pending',
        paymentRef,
        description: `Gói NCC ${plan.displayName}`,
        payosOrderCode: BigInt(orderCode),
        payosPaymentLinkId: payosResponse.paymentLinkId,
        checkoutUrl: payosResponse.checkoutUrl,
        qrCode: payosResponse.qrCode,
        expiredAt,
      },
    });

    return {
      checkoutUrl: payosResponse.checkoutUrl,
      qrCode: payosResponse.qrCode,
      paymentRef,
      amount: plan.priceVnd,
      expireAt: expiredAt.toISOString(),
      status: 'pending',
    };
  }

  // ── Cancel auto-renewal ───────────────────────────────────────────────────

  async cancelAutoRenewal(userId: string): Promise<{ message: string }> {
    const profile = await this.prisma.supplierProfile.findUnique({
      where: { userId },
      include: { subscription: true },
    });
    if (!profile?.subscription) {
      throw new NotFoundException('Không có gói cước để hủy gia hạn');
    }
    if (profile.subscription.status !== 'active') {
      throw new BadRequestException('Gói cước không ở trạng thái active');
    }

    await this.prisma.supplierSubscription.update({
      where: { profileId: profile.id },
      data: { autoRenew: false, cancelledAt: new Date() },
    });

    return { message: 'Đã hủy tự động gia hạn. Gói sẽ hết hạn vào ngày đã đăng ký.' };
  }

  // ── Mappers ───────────────────────────────────────────────────────────────

  private mapProfile(p: any): SupplierProfileResponseDto {
    return {
      id: p.id,
      userId: p.userId,
      companyName: p.companyName,
      contactPhone: p.contactPhone ?? null,
      address: p.address ?? null,
      logoPath: p.logoPath ?? null,
      description: p.description ?? null,
      isVerified: p.isVerified,
      createdAt: p.createdAt.toISOString(),
    };
  }

  private mapPlan(p: any): SupplierPlanResponseDto {
    return {
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      priceVnd: p.priceVnd,
      billingCycle: p.billingCycle,
      maxIngredients: p.maxIngredients,
      features: Array.isArray(p.features) ? p.features : [],
      isActive: p.isActive,
    };
  }

  private mapSubscription(s: any): SupplierSubscriptionResponseDto {
    return {
      id: s.id,
      status: s.status,
      startDate: s.startDate instanceof Date ? s.startDate.toISOString().split('T')[0] : s.startDate,
      endDate: s.endDate instanceof Date ? s.endDate.toISOString().split('T')[0] : s.endDate,
      autoRenew: s.autoRenew,
      cancelledAt: s.cancelledAt?.toISOString() ?? null,
      plan: this.mapPlan(s.plan),
    };
  }
}

