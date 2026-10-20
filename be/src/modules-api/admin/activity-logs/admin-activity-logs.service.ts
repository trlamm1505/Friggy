import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { ListActivityLogsQueryDto } from './dto/admin-activity-logs.dto';

@Injectable()
export class AdminActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(query: ListActivityLogsQueryDto) {
    const { adminId, action, targetEntity, from, to, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (adminId) where['adminId'] = adminId;
    if (action) where['action'] = { contains: action };
    if (targetEntity) where['targetEntity'] = { contains: targetEntity };
    if (from || to) {
      where['createdAt'] = {};
      if (from) (where['createdAt'] as Record<string, unknown>)['gte'] = new Date(from);
      if (to) (where['createdAt'] as Record<string, unknown>)['lte'] = new Date(to);
    }

    const [total, logs] = await Promise.all([
      this.prisma.adminActivityLog.count({ where }),
      this.prisma.adminActivityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          targetEntity: true,
          targetId: true,
          ipAddress: true,
          createdAt: true,
          admin: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: logs,
    };
  }

  async getLogDetail(id: string) {
    const log = await this.prisma.adminActivityLog.findUnique({
      where: { id },
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    });
    if (!log) return null;
    return log;
  }
}
