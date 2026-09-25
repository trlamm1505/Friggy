import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { PayOsService } from 'src/modules-system/payos/payos.service';
import { PaymentTransactionsService } from '../payment-transactions/payment-transactions.service';
import { FamilyService } from '../family/family.service';
import { InvalidSignatureError } from '@payos/node';
import { v4 as uuid } from 'uuid';
import type { SubscribeDto } from './dto/subscriptions.dto';
import type {
  SubscriptionPlanResponseDto,
  UserSubscriptionResponseDto,
  SubscribeResponseDto,
  WebhookResponseDto,
  CancelRenewalResponseDto,
} from './dto/subscriptions-response.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payOsService: PayOsService,
    private readonly paymentTxService: PaymentTransactionsService,
    private readonly familyService: FamilyService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // GET /plans — Danh sách gói
  // ─────────────────────────────────────────────────────────

  async getPlans(): Promise<SubscriptionPlanResponseDto[]> {
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
    // Tìm sub active trước
    let sub = await this.prisma.userSubscription.findFirst({
      where: { userId, deletedAt: null, status: 'active' },
      include: { plan: true },
    });

    if (sub) return this.mapSubscription(sub);

    // Nếu đang pending (đang chờ thanh toán) → KHÔNG tạo free plan
    // vì sẽ ghi đè row đang pending và làm mất thông tin PayOS
    const pendingSub = await this.prisma.userSubscription.findFirst({
      where: { userId, deletedAt: null, status: 'pending' },
      include: { plan: true },
    });
    if (pendingSub) return this.mapSubscription(pendingSub);

    // Không có sub nào → tạo free plan mặc định
    sub = await this.assignFreePlan(userId);
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

    // Kiểm tra pending trùng — chặn nếu còn trong cửa sổ 15 phút
    // Sau 15 phút (link PayOS hết hạn) → cho phép tạo lại
    const PAYMENT_EXPIRE_MS = 15 * 60 * 1000;
    const pendingTx = await this.prisma.paymentTransaction.findFirst({
      where: { userId, status: 'pending' },
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
      this.logger.log(`[Subscribe] Payment link hết hạn cho userId=${userId} — tạo lại`);
    }

    // orderCode: số nguyên unique
    const orderCode = Date.now() % 9007199254740991;
    const paymentRef = `FRIGGY-${orderCode}`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiredAt = new Date(Date.now() + 15 * 60 * 1000);

    // Tạo payment link PayOS TRƯỚC — nếu lỗi thì sub không bị ảnh hưởng
    const payosResponse = await this.payOsService.createPaymentLink({
      orderCode,
      amount: plan.priceVnd,
      description: `Friggy ${plan.displayName}`,
      planName: plan.displayName,
    });

    // PayOS thành công → mới update subscription + tạo transaction
    await this.prisma.userSubscription.upsert({
      where: { userId },
      create: {
        id: uuid(),
        userId,
        planId: plan.id,
        pendingPlanId: plan.id,
        startDate: today,
        endDate: null,
        status: 'pending',
      },
      update: {
        pendingPlanId: plan.id,
        status: 'pending',
        deletedAt: null,
      },
    });

    // Lưu transaction vào bảng payment_transactions
    await this.paymentTxService.createPending({
      userId,
      planId: plan.id,
      type: 'subscribe',
      amount: plan.priceVnd,
      paymentRef,
      description: `Friggy ${plan.displayName}`,
      payosOrderCode: BigInt(orderCode),
      payosPaymentLinkId: payosResponse.paymentLinkId,
      checkoutUrl: payosResponse.checkoutUrl,
      qrCode: payosResponse.qrCode,
      expiredAt,
    });

    this.logger.log(
      `[Subscribe] userId=${userId} plan=${plan.name} orderCode=${orderCode} ref=${paymentRef}`,
    );

    return {
      checkoutUrl: payosResponse.checkoutUrl,
      qrCode: payosResponse.qrCode,
      paymentRef,
      amount: plan.priceVnd,
      expireAt: expiredAt.toISOString(),
      status: 'pending',
    };
  }

  // ─────────────────────────────────────────────────────────
  // POST /webhook — Callback từ cổng thanh toán
  // ─────────────────────────────────────────────────────────

  async handleWebhook(body: any): Promise<WebhookResponseDto> {
    // Xác thực signature PayOS — throw nếu bị giả mạo
    let webhookData: Awaited<ReturnType<typeof this.payOsService.verifyWebhook>>;
    try {
      webhookData = await this.payOsService.verifyWebhook(body);
    } catch (err) {
      if (err instanceof InvalidSignatureError) {
        this.logger.warn(`[Webhook] Signature không hợp lệ — bỏ qua`);
        return { received: false };
      }
      throw err;
    }

    const { orderCode, code } = webhookData;
    this.logger.log(`[Webhook] orderCode=${orderCode} code=${code}`);

    // Tìm transaction theo payosOrderCode
    const tx = await this.paymentTxService.findByOrderCode(BigInt(orderCode));
    if (!tx) {
      this.logger.warn(`[Webhook] Không tìm thấy transaction với orderCode=${orderCode}`);
      return { received: false };
    }

    // Tìm subscription của user
    const sub = await this.prisma.userSubscription.findFirst({
      where: { userId: tx.userId, deletedAt: null },
    });
    if (!sub) {
      this.logger.warn(`[Webhook] Không tìm thấy subscription cho userId=${tx.userId}`);
      return { received: false };
    }

    if (code === '00') {
      // Thanh toán thành công
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // endDate = ngày hiện tại + 1 tháng
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 1);

      const newPlanId = sub.pendingPlanId ?? tx.planId;
      await this.prisma.userSubscription.update({
        where: { id: sub.id },
        data: {
          planId: newPlanId,
          pendingPlanId: null,
          status: 'active',
          startDate: today,
          endDate,
          quotaResetAt: new Date(), // Reset quota ngay khi kích hoạt gói mới
        },
      });

      // Đánh dấu transaction paid
      await this.paymentTxService.markPaid(tx.id, (webhookData as any).reference);

      // Nếu là gói Family → tự động tạo FamilyGroup cho owner
      const activatedPlan = await this.prisma.subscriptionPlan.findUnique({ where: { id: newPlanId } });
      if (activatedPlan?.name === 'family') {
        await this.familyService.createGroupForOwner(tx.userId).catch((err) => {
          this.logger.warn(`[Webhook] Failed to create FamilyGroup for ${tx.userId}: ${err}`);
        });
      }

      this.logger.log(
        `[Webhook] Sub activated planId=${newPlanId} endDate=${endDate.toISOString().split('T')[0]} user=${tx.userId}`,
      );
    } else {
      // Thanh toán thất bại / huỷ
      await this.prisma.userSubscription.update({
        where: { id: sub.id },
        data: { status: 'cancelled', pendingPlanId: null },
      });
      await this.paymentTxService.markCancelled(tx.id);
      this.logger.log(`[Webhook] Transaction ${tx.id} cancelled (code=${code})`);
    }

    return { received: true };
  }

  // ─────────────────────────────────────────────────────────
  // POST /cancel-renewal — Hủy gia hạn tự động
  // ─────────────────────────────────────────────────────────

  async cancelRenewal(userId: string): Promise<CancelRenewalResponseDto> {
    const sub = await this.prisma.userSubscription.findFirst({
      where: { userId, status: 'active', deletedAt: null },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('Không có gói đang hoạt động');
    if (sub.plan.name === 'free') {
      throw new BadRequestException('Không thể hủy gia hạn gói Free');
    }
    if (!sub.autoRenew) {
      throw new BadRequestException('Gói đã được đặt hủy gia hạn trước đó rồi');
    }

    await this.prisma.userSubscription.update({
      where: { id: sub.id },
      data: { autoRenew: false, cancelledAt: new Date() },
    });

    const endDateStr = sub.endDate
      ? (sub.endDate instanceof Date ? sub.endDate.toISOString().split('T')[0] : sub.endDate)
      : null;

    this.logger.log(`[CancelRenewal] userId=${userId} — gói hết hạn vào ${endDateStr}`);

    return {
      message: `Đã hủy gia hạn tự động. Gói sẽ hết hạn vào ${endDateStr ?? 'không xác định'}.`,
      endDate: endDateStr,
    };
  }

  // ─────────────────────────────────────────────────────────
  // POST /renew — Gia hạn thêm 1 tháng (mock)
  // ─────────────────────────────────────────────────────────

  async renew(userId: string): Promise<SubscribeResponseDto> {
    const sub = await this.prisma.userSubscription.findFirst({
      where: { userId, status: 'active', deletedAt: null },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('Không có gói đang hoạt động');
    if (sub.plan.name === 'free') {
      throw new BadRequestException('Không thể gia hạn gói Free');
    }

    // Kiểm tra pending trùng — chặn nếu còn trong cửa sổ 15 phút (giống subscribe)
    const PAYMENT_EXPIRE_MS = 15 * 60 * 1000;
    const pendingTx = await this.prisma.paymentTransaction.findFirst({
      where: { userId, status: 'pending' },
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
      this.logger.log(`[Renew] Payment link hết hạn cho userId=${userId} — tạo lại`);
    }

    const orderCode = Date.now() % 9007199254740991;
    const paymentRef = `FRIGGY-RENEW-${orderCode}`;
    const expiredAt = new Date(Date.now() + 15 * 60 * 1000);

    // Tạo payment link PayOS TRƯỚC — nếu lỗi thì sub không bị ảnh hưởng
    const payosResponse = await this.payOsService.createPaymentLink({
      orderCode,
      amount: sub.plan.priceVnd,
      description: `GH Friggy ${sub.plan.displayName}`,
      planName: `Gia hạn ${sub.plan.displayName}`,
    });

    // PayOS thành công → mới cập nhật subscription + tạo transaction
    await this.prisma.userSubscription.update({
      where: { id: sub.id },
      data: {
        pendingPlanId: sub.plan.id,
        status: 'pending',
      },
    });

    // Lưu transaction
    await this.paymentTxService.createPending({
      userId,
      planId: sub.plan.id,
      type: 'renew',
      amount: sub.plan.priceVnd,
      paymentRef,
      description: `Gia hạn Friggy ${sub.plan.displayName}`,
      payosOrderCode: BigInt(orderCode),
      payosPaymentLinkId: payosResponse.paymentLinkId,
      checkoutUrl: payosResponse.checkoutUrl,
      qrCode: payosResponse.qrCode,
      expiredAt,
    });

    this.logger.log(
      `[Renew] userId=${userId} orderCode=${orderCode} ref=${paymentRef}`,
    );

    return {
      checkoutUrl: payosResponse.checkoutUrl,
      qrCode: payosResponse.qrCode,
      paymentRef,
      amount: sub.plan.priceVnd,
      expireAt: expiredAt.toISOString(),
      status: 'pending',
    };
  }

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────

  private async assignFreePlan(userId: string) {
    const freePlan = await this.prisma.subscriptionPlan.findFirst({
      where: { name: 'free' },
    });
    if (!freePlan) throw new Error('Free plan not found — run seed.sql first');

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
      autoRenew: s.autoRenew ?? true,
      cancelledAt: s.cancelledAt ? s.cancelledAt.toISOString() : null,
      plan: this.mapPlan(s.plan),
      createdAt: s.createdAt.toISOString(),
    };
  }
}
