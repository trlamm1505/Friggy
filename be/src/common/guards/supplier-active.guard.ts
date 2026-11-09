import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { RedisService } from 'src/modules-system/redis/redis.service';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class SupplierActiveGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = context.switchToHttp().getRequest().user as JwtPayload;

    if (user.role !== 'food_supplier') {
      throw new ForbiddenException('Chỉ nhà cung cấp thực phẩm mới có quyền này');
    }

    // Kiểm tra Redis cache trước (TTL 5 phút)
    const cacheKey = `supplier:sub:active:${user.sub}`;
    const cached = await this.redis.get<string>(cacheKey);
    if (cached === 'true') return true;
    if (cached === 'false') {
      throw new ForbiddenException('Gói cước nhà cung cấp đã hết hạn hoặc chưa kích hoạt');
    }

    const profile = await this.prisma.supplierProfile.findUnique({
      where: { userId: user.sub },
      include: { subscription: true },
    });

    const now = new Date();
    const isActive =
      !!profile &&
      !profile.deletedAt &&
      !!profile.subscription &&
      profile.subscription.status === 'active' &&
      profile.subscription.endDate > now;

    // Cache kết quả 5 phút
    await this.redis.set(cacheKey, String(isActive), 300);

    if (!isActive) {
      throw new ForbiddenException('Gói cước nhà cung cấp đã hết hạn hoặc chưa kích hoạt');
    }

    return true;
  }
}
