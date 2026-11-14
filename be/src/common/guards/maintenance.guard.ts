import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { RedisService } from 'src/modules-system/redis/redis.service';
import { TokensService } from 'src/modules-system/tokens/tokens.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { CONFIG_KEYS } from 'src/modules-api/admin/system-config/admin-system-config.service';

const CACHE_TTL = 60 * 60; // 1 giờ

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly tokensService: TokensService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.originalUrl ?? request.url ?? '';

    // 1. Cho phép route đăng nhập / refresh token để Admin có thể lấy token khi hệ thống bảo trì,
    //    và cho phép webhook thanh toán PayOS để không mất callback giao dịch
    if (
      path.includes('/auth/login') ||
      path.includes('/auth/refresh') ||
      path.includes('/webhook')
    ) {
      return true;
    }

    // 2. Lấy thông tin user (đã gắn bởi JwtAuthGuard, hoặc tự parse nếu route @Public có gửi kèm token)
    let user = (request as any).user as JwtPayload | undefined;
    if (!user) {
      const [type, token] = request.headers.authorization?.split(' ') ?? [];
      if (type === 'Bearer' && token) {
        user = this.tokensService.verifyAccessToken(token) ?? undefined;
      }
    }

    // Admin luôn được phép truy cập mọi API trong lúc bảo trì
    if (user?.role === 'admin') {
      return true;
    }

    // 3. Kiểm tra cờ bảo trì từ Redis (fallback DB)
    const isEnabled = await this.getConfigValue(CONFIG_KEYS.MAINTENANCE_ENABLED, 'false');
    if (isEnabled !== 'true') {
      return true;
    }

    // 4. Đang bảo trì → chặn tất cả role khác với 503 Service Unavailable
    const [message, estimatedEndAt] = await Promise.all([
      this.getConfigValue(CONFIG_KEYS.MAINTENANCE_MESSAGE, ''),
      this.getConfigValue(CONFIG_KEYS.MAINTENANCE_END_AT, ''),
    ]);

    const baseMsg = message || 'Hệ thống đang bảo trì, vui lòng quay lại sau.';
    const fullMsg = estimatedEndAt
      ? `${baseMsg} (Dự kiến hoàn tất: ${estimatedEndAt})`
      : baseMsg;

    throw new ServiceUnavailableException(fullMsg);
  }

  private async getConfigValue(key: string, fallback: string): Promise<string> {
    const cached = await this.redis.get<string>(`sysconfig:${key}`);
    if (cached !== null && cached !== undefined) return cached;

    const record = await this.prisma.systemConfig.findUnique({ where: { key } });
    if (record) {
      await this.redis.set(`sysconfig:${key}`, record.value, CACHE_TTL);
      return record.value;
    }

    return fallback;
  }
}

