import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { v4 as uuid } from 'uuid';
import type { SubscribeDto } from './dto/subscriptions.dto';
import type {
  SubscriptionPlanResponseDto,
  UserSubscriptionResponseDto,
  SubscribeResponseDto,
  WebhookResponseDto,
} from './dto/subscriptions-response.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────
  // GET /plans — Danh sách gói
  // ─────────────────────────────────────────────────────────

  async getPlans(): Promise<SubscriptionPlanResponseDto[]> {
    await this.seedDefaultPlans();

    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { priceVnd: 'asc' },
    });

    return plans.map(this.mapPlan);
  }

  // ─────────────────────────────────────────────────────────
  // GET /me — Gói hiện tại của user
  // ─────────────────────────────────────────────────────────

  async getMySubscription(userId: string): Promise<UserSubscriptionResponseDto> {
    let sub = await this.prisma.userSubscription.findFirst({
      where: { userId, deletedAt: null, status: 'active' },
      include: { plan: true },
    });

    // User mới chưa có sub → tự tạo Free plan
    if (!sub) {
      sub = await this.assignFreePlan(userId);
    }

    return this.mapSubscription(sub);
  }

  // ─────────────────────────────────────────────────────────
  // POST /subscribe — Đăng ký gói Individual
  // ─────────────────────────────────────────────────────────

  async subscribe(userId: string, dto: SubscribeDto): Promise<SubscribeResponseDto> {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id: dto.planId, isActive: true, deletedAt: null },
    });
    if (!plan) throw new NotFoundException('Gói dịch vụ không tồn tại');

    if (plan.name === 'free') {
      throw new BadRequestException('Gói Free không cần thanh toán — được áp dụng tự động');
    }

    // Kiểm tra sub hiện tại
    const existingSub = await this.prisma.userSubscription.findFirst({
      where: { userId, status: 'active', deletedAt: null },
      include: { plan: true },
    });
    if (existingSub && existingSub.plan.id === plan.id) {
      throw new BadRequestException('Bạn đang sử dụng gói này — không cần đăng ký lại');
    }

    // Tạo paymentRef & QR mock
    const paymentRef = `FRIGGY-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const expireAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    // Tạo sub với status pending (chờ webhook confirm)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.userSubscription.upsert({
      where: { userId },
      create: {
        id: uuid(),
        userId,
        planId: plan.id,
        startDate: today,
        endDate: null,
        status: 'pending',
        paymentRef,
      },
      update: {
        planId: plan.id,
        startDate: today,
        endDate: null,
        status: 'pending',
        paymentRef,
        deletedAt: null,
      },
    });

    this.logger.log(`[Subscribe] userId=${userId} plan=${plan.name} ref=${paymentRef}`);

    // Mock QR URL — Phase 9 tích hợp VNPay/MoMo thực
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
      `FRIGGY|${paymentRef}|${plan.priceVnd}|Friggy Individual`,
    )}`;

    return {
      qrCodeUrl,
      paymentRef,
      amount: plan.priceVnd,
      expireAt: expireAt.toISOString(),
      status: 'pending',
    };
  }

  // ─────────────────────────────────────────────────────────
  // POST /webhook — Callback từ cổng thanh toán
  // ─────────────────────────────────────────────────────────

  async handleWebhook(body: any): Promise<WebhookResponseDto> {
    const { paymentRef, status } = body ?? {};
    this.logger.log(`[Webhook] ref=${paymentRef} status=${status}`);

    if (!paymentRef) return { received: false };

    const sub = await this.prisma.userSubscription.findFirst({
      where: { paymentRef, deletedAt: null },
    });
    if (!sub) return { received: false };

    if (status === 'success') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 1);

      await this.prisma.userSubscription.update({
        where: { id: sub.id },
        data: { status: 'active', startDate: today, endDate },
      });

      this.logger.log(`[Webhook] Sub ${sub.id} activated for user ${sub.userId}`);
    } else if (status === 'failed') {
      await this.prisma.userSubscription.update({
        where: { id: sub.id },
        data: { status: 'cancelled' },
      });
    }

    return { received: true };
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /me — Hủy gói
  // ─────────────────────────────────────────────────────────

  async cancelSubscription(userId: string): Promise<void> {
    const sub = await this.prisma.userSubscription.findFirst({
      where: { userId, status: 'active', deletedAt: null },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('Không có gói đang hoạt động');
    if (sub.plan.name === 'free') {
      throw new BadRequestException('Không thể hủy gói Free');
    }

    await this.prisma.userSubscription.update({
      where: { id: sub.id },
      data: { status: 'cancelled' },
    });

    // Auto-assign lại Free plan
    await this.assignFreePlan(userId);
  }

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────

  private async assignFreePlan(userId: string) {
    // Đảm bảo Free plan tồn tại
    await this.seedDefaultPlans();

    const freePlan = await this.prisma.subscriptionPlan.findFirst({
      where: { name: 'free' },
    });
    if (!freePlan) throw new Error('Free plan seed missing');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.userSubscription.upsert({
      where: { userId },
      create: {
        id: uuid(),
        userId,
        planId: freePlan.id,
        startDate: today,
        status: 'active',
      },
      update: {
        planId: freePlan.id,
        status: 'active',
        startDate: today,
        endDate: null,
        deletedAt: null,
      },
      include: { plan: true },
    });
  }

  private async seedDefaultPlans(): Promise<void> {
    const count = await this.prisma.subscriptionPlan.count({ where: { deletedAt: null } });
    if (count >= 3) return;

    await this.prisma.subscriptionPlan.upsert({
      where: { name: 'free' },
      create: {
        name: 'free',
        displayName: 'Gói Miễn Phí (Basic)',
        priceVnd: 0,
        billingCycle: 'forever',
        features: [
          'Tối đa 1 tủ lạnh',
          'Nhập thực phẩm thủ công',
          'Cảnh báo hết hạn tiêu chuẩn',
          'Gợi ý công thức cơ bản',
          '2 lượt AI / tuần',
        ],
        aiUsagePerWeek: 2,
        isActive: true,
      },
      update: {},
    });

    await this.prisma.subscriptionPlan.upsert({
      where: { name: 'individual' },
      create: {
        name: 'individual',
        displayName: 'Individual (25k/tháng)',
        priceVnd: 25000,
        billingCycle: 'monthly',
        features: [
          'Không giới hạn tủ lạnh',
          'Scan AI (ảnh, barcode, hóa đơn)',
          'Gợi ý công thức từ tủ lạnh',
          'Lập thực đơn AI theo tuần',
          'AI không giới hạn',
          'Cảnh báo thông minh',
        ],
        aiUsagePerWeek: -1,
        isActive: true,
      },
      update: {},
    });

    await this.prisma.subscriptionPlan.upsert({
      where: { name: 'family' },
      create: {
        name: 'family',
        displayName: 'Gói Gia Đình',
        priceVnd: 149000,
        billingCycle: 'monthly',
        features: [
          'Tất cả tính năng của gói Cá Nhân',
          'Tối đa 5 thành viên dùng chung tủ lạnh',
          'Quản lý nhiều tủ lạnh gia đình',
          'Lập thực đơn AI tuần không giới hạn',
          'Scan ảnh, mã vạch & hóa đơn không giới hạn',
        ],
        aiUsagePerWeek: -1,
        isActive: true,
      },
      update: {
        priceVnd: 149000,
        displayName: 'Gói Gia Đình',
      },
    });
  }

  private mapPlan(p: any): SubscriptionPlanResponseDto {
    return {
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      priceVnd: p.priceVnd,
      billingCycle: p.billingCycle,
      features: Array.isArray(p.features) ? p.features : [],
      aiUsagePerWeek: p.aiUsagePerWeek,
      isActive: p.isActive,
    };
  }

  private mapSubscription(s: any): UserSubscriptionResponseDto {
    return {
      id: s.id,
      status: s.status,
      startDate: s.startDate instanceof Date ? s.startDate.toISOString().split('T')[0] : s.startDate,
      endDate: s.endDate ? (s.endDate instanceof Date ? s.endDate.toISOString().split('T')[0] : s.endDate) : null,
      paymentRef: s.paymentRef ?? null,
      plan: this.mapPlan(s.plan),
      createdAt: s.createdAt.toISOString(),
    };
  }
}
