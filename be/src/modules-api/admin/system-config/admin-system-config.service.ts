import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { RedisService } from 'src/modules-system/redis/redis.service';
import {
  UpdateTokenConfigDto,
  UpdateOtpConfigDto,
  UpdateMaintenanceDto,
} from './dto/admin-system-config.dto';
import {
  TokenConfigResponseDto,
  OtpConfigResponseDto,
  MaintenanceResponseDto,
  HealthResponseDto,
} from './dto/admin-system-config-response.dto';
import {
  JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
} from 'src/common/constants/app.constant';

export const CONFIG_KEYS = {
  TOKEN_ACCESS_TTL:    'token.accessTtl',
  TOKEN_REFRESH_TTL:   'token.refreshTtl',
  OTP_TTL_SECONDS:     'otp.ttlSeconds',
  OTP_MAX_ATTEMPTS:    'otp.maxAttempts',
  MAINTENANCE_ENABLED: 'maintenance.isEnabled',
  MAINTENANCE_MESSAGE: 'maintenance.message',
  MAINTENANCE_END_AT:  'maintenance.estimatedEndAt',
} as const;

const CACHE_TTL = 60 * 60; // 1 giờ

@Injectable()
export class AdminSystemConfigService {
  private readonly logger = new Logger(AdminSystemConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Helper: đọc từ Redis → DB → fallback ─────────────────────────────────

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

  private async setConfigValue(
    key: string,
    value: string,
    description: string,
    adminId: string,
  ): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value, updatedBy: adminId },
      create: { key, value, description, updatedBy: adminId },
    });
    await this.redis.set(`sysconfig:${key}`, value, CACHE_TTL);
    this.logger.log(`[SystemConfig] ${key} = "${value}" (by admin ${adminId})`);
  }

  // ─── Token TTL ─────────────────────────────────────────────────────────────

  async getTokenConfig(): Promise<TokenConfigResponseDto> {
    const [accessTtl, refreshTtl] = await Promise.all([
      this.getConfigValue(CONFIG_KEYS.TOKEN_ACCESS_TTL, JWT_ACCESS_EXPIRES_IN),
      this.getConfigValue(CONFIG_KEYS.TOKEN_REFRESH_TTL, JWT_REFRESH_EXPIRES_IN),
    ]);
    return { accessTokenTtl: accessTtl, refreshTokenTtl: refreshTtl };
  }

  async updateTokenConfig(dto: UpdateTokenConfigDto, adminId: string): Promise<TokenConfigResponseDto> {
    const updates: Promise<void>[] = [];
    if (dto.accessTokenTtl !== undefined) {
      updates.push(this.setConfigValue(
        CONFIG_KEYS.TOKEN_ACCESS_TTL, dto.accessTokenTtl,
        'Thời gian sống access token JWT (VD: 15m, 1h)', adminId,
      ));
    }
    if (dto.refreshTokenTtl !== undefined) {
      updates.push(this.setConfigValue(
        CONFIG_KEYS.TOKEN_REFRESH_TTL, dto.refreshTokenTtl,
        'Thời gian sống refresh token JWT (VD: 7d, 30d)', adminId,
      ));
    }
    await Promise.all(updates);
    return this.getTokenConfig();
  }

  // ─── OTP Config ────────────────────────────────────────────────────────────

  async getOtpConfig(): Promise<OtpConfigResponseDto> {
    const [ttlSeconds, maxAttempts] = await Promise.all([
      this.getConfigValue(CONFIG_KEYS.OTP_TTL_SECONDS, '300'),
      this.getConfigValue(CONFIG_KEYS.OTP_MAX_ATTEMPTS, '5'),
    ]);
    return {
      ttlSeconds: parseInt(ttlSeconds, 10),
      maxAttempts: parseInt(maxAttempts, 10),
    };
  }

  async updateOtpConfig(dto: UpdateOtpConfigDto, adminId: string): Promise<OtpConfigResponseDto> {
    const updates: Promise<void>[] = [];
    if (dto.ttlSeconds !== undefined) {
      updates.push(this.setConfigValue(
        CONFIG_KEYS.OTP_TTL_SECONDS, String(dto.ttlSeconds),
        'Thời gian sống OTP (giây)', adminId,
      ));
    }
    if (dto.maxAttempts !== undefined) {
      updates.push(this.setConfigValue(
        CONFIG_KEYS.OTP_MAX_ATTEMPTS, String(dto.maxAttempts),
        'Số lần thử OTP sai tối đa', adminId,
      ));
    }
    await Promise.all(updates);
    return this.getOtpConfig();
  }

  // ─── Maintenance ───────────────────────────────────────────────────────────

  async getMaintenanceConfig(): Promise<MaintenanceResponseDto> {
    const [isEnabledStr, message, estimatedEndAt] = await Promise.all([
      this.getConfigValue(CONFIG_KEYS.MAINTENANCE_ENABLED, 'false'),
      this.getConfigValue(CONFIG_KEYS.MAINTENANCE_MESSAGE, ''),
      this.getConfigValue(CONFIG_KEYS.MAINTENANCE_END_AT, ''),
    ]);
    return {
      isEnabled: isEnabledStr === 'true',
      message: message || null,
      estimatedEndAt: estimatedEndAt ? new Date(estimatedEndAt) : null,
    };
  }

  async updateMaintenanceConfig(dto: UpdateMaintenanceDto, adminId: string): Promise<MaintenanceResponseDto> {
    const updates: Promise<void>[] = [];
    if (dto.isEnabled !== undefined) {
      updates.push(this.setConfigValue(
        CONFIG_KEYS.MAINTENANCE_ENABLED, String(dto.isEnabled),
        'Bật/tắt chế độ bảo trì hệ thống', adminId,
      ));
    }
    if (dto.message !== undefined) {
      updates.push(this.setConfigValue(
        CONFIG_KEYS.MAINTENANCE_MESSAGE, dto.message ?? '',
        'Thông báo bảo trì hiển thị cho người dùng', adminId,
      ));
    }
    if (dto.estimatedEndAt !== undefined) {
      updates.push(this.setConfigValue(
        CONFIG_KEYS.MAINTENANCE_END_AT,
        dto.estimatedEndAt ? new Date(dto.estimatedEndAt).toISOString() : '',
        'Thời gian dự kiến kết thúc bảo trì (ISO 8601)', adminId,
      ));
    }
    await Promise.all(updates);
    return this.getMaintenanceConfig();
  }

  // ─── Health ────────────────────────────────────────────────────────────────

  async getHealth(): Promise<HealthResponseDto> {
    const result: HealthResponseDto = {
      database: 'unknown',
      redis: 'unknown',
      aiProvider: 'unknown',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      result.database = 'ok';
    } catch {
      result.database = 'error';
    }

    try {
      await this.redis.set('health:ping', 'pong', 5);
      const pong = await this.redis.get<string>('health:ping');
      result.redis = pong === 'pong' ? 'ok' : 'error';
    } catch {
      result.redis = 'error';
    }

    try {
      const activeProvider = await this.prisma.aiProviderConfig.findFirst({
        where: { isActive: true, deletedAt: null },
        select: { provider: true, modelName: true },
      });
      result.aiProvider = activeProvider
        ? `ok (${activeProvider.provider}/${activeProvider.modelName})`
        : 'none_active';
    } catch {
      result.aiProvider = 'error';
    }

    return result;
  }
}
