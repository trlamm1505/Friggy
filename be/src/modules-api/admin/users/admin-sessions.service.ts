import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { UpdateAiQuotaDto } from './dto/admin-ai-quota.dto';

@Injectable()
export class AdminSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Sessions ──────────────────────────────────────────────────────────────

  async getUserSessions(userId: string) {
    await this.ensureUserExists(userId);
    const sessions = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, deletedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    return { total: sessions.length, sessions };
  }

  async revokeAllUserSessions(userId: string) {
    await this.ensureUserExists(userId);
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null, deletedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revokedCount: result.count, message: `Đã thu hồi ${result.count} phiên đăng nhập của user ${userId}` };
  }

  async revokeOneSession(userId: string, sessionId: string) {
    const token = await this.prisma.refreshToken.findFirst({
      where: { id: sessionId, userId, revokedAt: null, deletedAt: null },
    });
    if (!token) throw new NotFoundException('Phiên đăng nhập không tồn tại hoặc đã bị thu hồi');
    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    return { message: `Đã thu hồi phiên đăng nhập ${sessionId}` };
  }

  async cleanupExpiredSessions() {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return { deletedCount: result.count, message: `Đã xoá ${result.count} refresh token hết hạn` };
  }

  // ─── AI Quota ──────────────────────────────────────────────────────────────

  async getUserAiQuota(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        aiQuotaOverride: true,
        subscription: {
          select: { plan: { select: { aiUsagePerWeek: true, displayName: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // Đếm số lần đã dùng AI trong tuần hiện tại
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const usedThisWeek = await this.prisma.aiUsageLog.count({
      where: { userId, usedAt: { gte: weekStart } },
    });

    const planQuota = user.subscription?.plan?.aiUsagePerWeek ?? 0;
    const effectiveQuota = user.aiQuotaOverride ?? planQuota;

    return {
      userId,
      planQuota,
      planName: user.subscription?.plan?.displayName ?? 'Không có gói',
      aiQuotaOverride: user.aiQuotaOverride,
      effectiveQuota,
      usedThisWeek,
      remaining: Math.max(0, effectiveQuota - usedThisWeek),
    };
  }

  async updateUserAiQuota(userId: string, dto: UpdateAiQuotaDto) {
    await this.ensureUserExists(userId);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { aiQuotaOverride: dto.aiQuotaOverride ?? null },
      select: { id: true, aiQuotaOverride: true },
    });
    return {
      userId: updated.id,
      aiQuotaOverride: updated.aiQuotaOverride,
      message: updated.aiQuotaOverride !== null
        ? `Đã ghi đè quota AI: ${updated.aiQuotaOverride} lượt/tuần`
        : 'Đã xoá override, trả về quota từ SubscriptionPlan',
    };
  }

  async resetUserAiUsage(userId: string) {
    await this.ensureUserExists(userId);
    // Xoá override và xoá log AI tuần này
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [, deleted] = await Promise.all([
      this.prisma.user.update({
        where: { id: userId },
        data: { aiQuotaOverride: null },
      }),
      this.prisma.aiUsageLog.deleteMany({
        where: { userId, usedAt: { gte: weekStart } },
      }),
    ]);

    return {
      message: `Đã reset ${deleted.count} lượt AI dùng tuần này của user ${userId} và xoá override quota`,
    };
  }

  // ─── Helper ────────────────────────────────────────────────────────────────

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
  }
}
