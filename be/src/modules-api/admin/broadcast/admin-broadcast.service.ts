import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { FcmService } from 'src/modules-system/fcm/fcm.service';
import { BroadcastNotificationDto } from './dto/admin-broadcast.dto';

@Injectable()
export class AdminBroadcastService {
  private readonly logger = new Logger(AdminBroadcastService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
  ) {}

  async broadcastNotification(dto: BroadcastNotificationDto, adminId: string) {
    const { title, body, targetGroup = 'all' } = dto;

    // Xác định danh sách userId theo nhóm
    let userIds: string[];

    if (targetGroup === 'all') {
      const users = await this.prisma.user.findMany({
        where: { deletedAt: null, status: 'active' },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    } else if (targetGroup === 'paid_users') {
      const subs = await this.prisma.userSubscription.findMany({
        where: {
          status: 'active',
          deletedAt: null,
          plan: { priceVnd: { gt: 0 } },
        },
        select: { userId: true },
      });
      userIds = subs.map((s) => s.userId);
    } else {
      // free_users: user active không có subscription paid
      const paidIds = await this.prisma.userSubscription.findMany({
        where: { status: 'active', deletedAt: null, plan: { priceVnd: { gt: 0 } } },
        select: { userId: true },
      });
      const paidSet = new Set(paidIds.map((s) => s.userId));
      const allUsers = await this.prisma.user.findMany({
        where: { deletedAt: null, status: 'active' },
        select: { id: true },
      });
      userIds = allUsers.filter((u) => !paidSet.has(u.id)).map((u) => u.id);
    }

    this.logger.log(
      `[Broadcast] Admin ${adminId} gửi thông báo tới ${userIds.length} user (nhóm: ${targetGroup})`,
    );

    // Lưu notification DB + gửi FCM theo batch
    let sentCount = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);

      // Lưu DB
      await this.prisma.notification.createMany({
        data: batch.map((userId) => ({
          userId,
          type: 'system' as const,
          title,
          body,
          metadata: { broadcastBy: adminId, targetGroup },
        })),
      });

      // Gửi FCM cho từng user trong batch
      await Promise.allSettled(
        batch.map((userId) => this.fcm.sendToUser(userId, { title, body })),
      );

      sentCount += batch.length;
    }

    return {
      targetGroup,
      totalUsers: userIds.length,
      sentCount,
      message: `Đã gửi thông báo tới ${sentCount} người dùng (nhóm: ${targetGroup})`,
    };
  }
}
