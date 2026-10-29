import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  JWT_ACCESS_EXPIRES_IN,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_EXPIRES_IN,
  JWT_REFRESH_SECRET,
} from 'src/common/constants/app.constant';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { hashToken, verifyToken } from 'src/common/utils/otp.util';
import { v4 as uuid } from 'uuid';

// Hàm chuyển TTL dạng chuỗi (VD: "15m", "7d") sang số giây
function parseTtlToSeconds(ttl: string): number {
  const unit = ttl.slice(-1);
  const value = parseInt(ttl.slice(0, -1), 10);
  const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (map[unit] ?? 1);
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Đọc TTL từ Redis (do AdminSystemConfigService set) → DB → fallback .env
   */
  private async getDynamicTtl(key: string, fallback: string): Promise<string> {
    const cached = await this.redis.get<string>(`sysconfig:${key}`);
    if (cached) return cached;
    const record = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
    return record?.value ?? fallback;
  }

  /**
   * Sinh cặp Access Token + Refresh Token cho user
   * Tự động lưu hash refresh token vào DB
   */
  async generateTokenPair(
    userId: string,
    role: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, role };

    // Đọc TTL động — ưu tiên Redis → DB → fallback .env
    const [accessTtl, refreshTtl] = await Promise.all([
      this.getDynamicTtl('token.accessTtl', JWT_ACCESS_EXPIRES_IN),
      this.getDynamicTtl('token.refreshTtl', JWT_REFRESH_EXPIRES_IN),
    ]);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: JWT_ACCESS_SECRET,
        expiresIn: accessTtl as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: JWT_REFRESH_SECRET,
        expiresIn: refreshTtl as any,
      }),
    ]);

    // Tính expiresAt từ refreshTtl động (không hardcode 7 ngày)
    const tokenHash = await hashToken(refreshToken);
    const expiresAt = new Date(
      Date.now() + parseTtlToSeconds(refreshTtl) * 1000,
    );

    await this.prisma.refreshToken.create({
      data: {
        id: uuid(),
        userId,
        tokenHash,
        deviceInfo: deviceInfo ?? null,
        ipAddress: ipAddress ?? null,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Xác minh refresh token: verify JWT signature + check DB chưa revoked
   * Trả về payload nếu hợp lệ, null nếu không
   */
  async verifyRefreshToken(refreshToken: string): Promise<JwtPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        { secret: JWT_REFRESH_SECRET },
      );

      // Tìm tất cả refresh token chưa bị revoked của user
      const tokens = await this.prisma.refreshToken.findMany({
        where: {
          userId: payload.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          deletedAt: null,
        },
      });

      // So sánh token gửi lên với hash trong DB
      for (const record of tokens) {
        const match = await verifyToken(refreshToken, record.tokenHash);
        if (match) return payload;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Thu hồi refresh token (logout)
   * So sánh hash và set revokedAt
   */
  async revokeRefreshToken(
    refreshToken: string,
    userId: string,
  ): Promise<void> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        deletedAt: null,
      },
    });

    for (const record of tokens) {
      const match = await verifyToken(refreshToken, record.tokenHash);
      if (match) {
        await this.prisma.refreshToken.update({
          where: { id: record.id },
          data: { revokedAt: new Date() },
        });
        break;
      }
    }
  }

  /**
   * Sinh access token mới từ payload (dùng cho /refresh endpoint)
   */
  async refreshAccessToken(payload: JwtPayload): Promise<string> {
    const accessTtl = await this.getDynamicTtl(
      'token.accessTtl',
      JWT_ACCESS_EXPIRES_IN,
    );
    return this.jwtService.signAsync(
      { sub: payload.sub, role: payload.role },
      { secret: JWT_ACCESS_SECRET, expiresIn: accessTtl as any },
    );
  }

  /**
   * Xác minh access token: verify signature + check chưa hết hạn
   * Trả về JwtPayload nếu hợp lệ, null nếu không
   */
  verifyAccessToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: JWT_ACCESS_SECRET,
      });
    } catch {
      return null;
    }
  }
}

