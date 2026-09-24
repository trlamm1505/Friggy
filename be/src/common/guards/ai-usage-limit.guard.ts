/**
 * AiUsageLimitGuard — Rate limiting cho AI features theo subscription plan
 *
 * Flow:
 * 1. Đọc featureType từ @AiFeature() decorator
 * 2. Lấy userId từ request (đã qua JwtAuthGuard)
 * 3. Query ai_usage_logs: đếm featureType trong 7 ngày gần nhất
 * 4. Lấy limit từ subscription_plans.aiUsagePerWeek của user
 * 5. Nếu count >= limit → throw 429 với X-AI-Remaining: 0
 * 6. Nếu pass → set header X-AI-Remaining: N còn lại
 */
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { AI_FEATURE_KEY } from '../decorators/ai-feature.decorator';

@Injectable()
export class AiUsageLimitGuard implements CanActivate {
  private readonly logger = new Logger(AiUsageLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lấy featureType từ decorator — nếu không có thì bỏ qua guard
    const featureType = this.reflector.getAllAndOverride<string>(AI_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!featureType) return true;

    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.sub;

    if (!userId) return true; // JwtAuthGuard sẽ xử lý nếu không có userId

    // ── Lấy giới hạn từ subscription plan & thông tin gói nâng cấp ──
    const [subscription, individualPlan, freePlan] = await Promise.all([
      this.prisma.userSubscription.findFirst({
        where: { userId, status: 'active', deletedAt: null },
        include: { plan: { select: { aiUsagePerWeek: true, name: true } } },
      }),
      this.prisma.subscriptionPlan.findFirst({
        where: { name: 'individual', isActive: true, deletedAt: null },
        select: { priceVnd: true, displayName: true },
      }),
      this.prisma.subscriptionPlan.findFirst({
        where: { OR: [{ name: 'free' }, { priceVnd: 0 }], isActive: true, deletedAt: null },
        select: { aiUsagePerWeek: true },
      }),
    ]);

    const limit = subscription?.plan?.aiUsagePerWeek ?? freePlan?.aiUsagePerWeek ?? 0;
    const priceText = individualPlan?.priceVnd
      ? `${Math.round(individualPlan.priceVnd / 1000)}k/tháng`
      : '25k/tháng';
    const planDisplayName = individualPlan?.displayName ?? 'Individual';

    // Tính đầu tuần hiện tại (Thứ 2 00:00:00) — reset mỗi tuần
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=CN, 1=T2, ..., 6=T7
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const usedCount = await this.prisma.aiUsageLog.count({
      where: {
        userId,
        usedAt: { gte: startOfWeek },
      },
    });

    const remaining = limit === -1 ? -1 : Math.max(0, limit - usedCount);

    // ── Set header X-AI-Remaining ───────────────────────────
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-AI-Remaining', remaining);
    response.setHeader('X-AI-Limit', limit);

    // ── Kiểm tra giới hạn ───────────────────────────────────
    // limit = -1 → gói không giới hạn → bỏ qua check
    if (limit !== -1 && usedCount >= limit) {
      this.logger.warn(
        `⛔ User ${userId} đã đạt giới hạn AI tổng hợp: ${usedCount}/${limit}/tuần`,
      );
      throw new HttpException(
        {
          statusCode: 429,
          message: `Bạn đã dùng hết ${limit} lượt AI trong tuần này. Nâng cấp lên gói ${planDisplayName} (${priceText}) để sử dụng không giới hạn.`,
          featureType,
          usedCount,
          limit,
          remaining: 0,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.logger.log(`✅ AI usage [${featureType}] user ${userId}: ${usedCount}/${limit}`);
    return true;
  }
}
