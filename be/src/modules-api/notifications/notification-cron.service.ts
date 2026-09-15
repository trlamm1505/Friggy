/**
 * NotificationCronService — Dynamic Cron Job Manager
 *
 * Load cron configs từ DB khi khởi động → đăng ký dynamic jobs via SchedulerRegistry
 * Admin có thể thay đổi schedule / bật tắt / trigger thủ công qua API — không cần restart.
 *
 * Cron Jobs:
 *   - expiry_warning     (default: 0 8 * * *)  — Cảnh báo nguyên liệu sắp hết hạn
 *   - weekly_plan_remind (default: 0 9 * * 0)  — Nhắc lập thực đơn tuần mới
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';

// ─── Tên cron job (phải khớp với seed data trong DB) ──────────────────────
export const CRON_EXPIRY_WARNING = 'expiry_warning';
export const CRON_WEEKLY_REMIND = 'weekly_plan_remind';

// ─── Mặc định nếu DB chưa có seed ─────────────────────────────────────────
const DEFAULT_CRON_CONFIGS = [
  {
    name: CRON_EXPIRY_WARNING,
    cronExpression: '0 8 * * *',
    isEnabled: true,
    description: 'Cảnh báo nguyên liệu sắp hết hạn — hàng ngày 8:00',
  },
  {
    name: CRON_WEEKLY_REMIND,
    cronExpression: '0 9 * * 0',
    isEnabled: true,
    description: 'Nhắc lập thực đơn tuần mới — Chủ Nhật 9:00',
  },
];

@Injectable()
export class NotificationCronService implements OnModuleInit {
  private readonly logger = new Logger(NotificationCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  // ─────────────────────────────────────────────────────────
  // Khởi động: seed defaults + đăng ký tất cả dynamic jobs
  // ─────────────────────────────────────────────────────────
  async onModuleInit() {
    await this.seedDefaultConfigs();
    await this.registerAllJobs();
  }

  /** Seed các config mặc định nếu DB chưa có */
  private async seedDefaultConfigs() {
    for (const config of DEFAULT_CRON_CONFIGS) {
      await this.prisma.cronJobConfig.upsert({
        where: { name: config.name },
        create: config,
        update: {}, // Không ghi đè nếu đã tồn tại (admin có thể đã sửa)
      });
    }
  }

  /** Load tất cả configs từ DB và đăng ký vào SchedulerRegistry */
  private async registerAllJobs() {
    const configs = await this.prisma.cronJobConfig.findMany();

    for (const config of configs) {
      if (config.isEnabled) {
        this.registerJob(config.name, config.cronExpression);
      }
    }

    this.logger.log(
      `✅ Đã đăng ký ${configs.filter((c) => c.isEnabled).length}/${configs.length} cron jobs`,
    );
  }

  // ─────────────────────────────────────────────────────────
  // Public: đăng ký / hủy 1 job (dùng bởi Admin service)
  // ─────────────────────────────────────────────────────────

  registerJob(name: string, cronExpression: string) {
    // Xóa job cũ nếu đang chạy
    try {
      this.schedulerRegistry.deleteCronJob(name);
    } catch { /* chưa có job — bỏ qua */ }

    const handler = this.getHandler(name);
    if (!handler) {
      this.logger.warn(`⚠️ Không có handler cho cron: ${name}`);
      return;
    }

    const job = new CronJob(cronExpression, () => {
      handler().catch((err) =>
        this.logger.error(`❌ Cron [${name}] lỗi: ${err?.message}`),
      );
    });

    this.schedulerRegistry.addCronJob(name, job as any);
    job.start();

    this.logger.log(`⏰ Đã đăng ký cron [${name}] với schedule: ${cronExpression}`);
  }

  unregisterJob(name: string) {
    try {
      this.schedulerRegistry.deleteCronJob(name);
      this.logger.log(`🛑 Đã hủy cron [${name}]`);
    } catch { /* job không tồn tại — bỏ qua */ }
  }

  /** Trigger 1 job thủ công ngay lập tức */
  async triggerJob(name: string): Promise<{ success: boolean; message: string }> {
    const handler = this.getHandler(name);
    if (!handler) {
      return { success: false, message: `Không có handler cho cron: ${name}` };
    }

    try {
      await handler();
      return { success: true, message: `Cron [${name}] đã chạy thủ công thành công` };
    } catch (err: any) {
      return { success: false, message: err?.message ?? 'Lỗi không xác định' };
    }
  }

  // ─────────────────────────────────────────────────────────
  // Map tên job → handler function
  // ─────────────────────────────────────────────────────────
  private getHandler(name: string): (() => Promise<void>) | null {
    switch (name) {
      case CRON_EXPIRY_WARNING:
        return () => this.checkExpiringItems();
      case CRON_WEEKLY_REMIND:
        return () => this.remindWeeklyPlan();
      default:
        return null;
    }
  }

  // ─────────────────────────────────────────────────────────
  // Handler 1: Cảnh báo nguyên liệu sắp hết hạn
  // Default: hàng ngày 8:00 AM
  // ─────────────────────────────────────────────────────────
  async checkExpiringItems(): Promise<void> {
    const jobName = CRON_EXPIRY_WARNING;
    this.logger.log(`🔔 [Cron:${jobName}] Bắt đầu kiểm tra nguyên liệu sắp hết hạn`);

    const withinDays = 3;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + withinDays);

    // Tìm nguyên liệu sắp hết hạn, group theo userId
    const expiringItems = await this.prisma.fridgeItem.findMany({
      where: {
        expiresAt: { lte: thresholdDate, gte: new Date() },
        deletedAt: null,
      },
      select: {
        userId: true,
        ingredient: { select: { name: true } },
        expiresAt: true,
      },
    });

    if (expiringItems.length === 0) {
      this.logger.log(`✅ [Cron:${jobName}] Không có nguyên liệu sắp hết hạn`);
      await this.updateLastRun(jobName, 'success');
      return;
    }

    // Group theo userId
    const byUser = new Map<string, string[]>();
    for (const item of expiringItems) {
      const list = byUser.get(item.userId) ?? [];
      list.push(item.ingredient.name);
      byUser.set(item.userId, list);
    }

    // Ngày hôm nay để check duplicate
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let notifCreated = 0;

    for (const [userId, items] of byUser.entries()) {
      // Tránh duplicate — kiểm tra đã có notification hôm nay chưa
      const alreadySent = await this.prisma.notification.findFirst({
        where: {
          userId,
          type: 'expiry_warning',
          createdAt: { gte: todayStart },
          deletedAt: null,
        },
      });

      if (alreadySent) continue;

      // Tạo notification
      const count = items.length;
      const preview = items.slice(0, 3).join(', ');
      const suffix = count > 3 ? ` và ${count - 3} mặt hàng khác` : '';

      await this.prisma.notification.create({
        data: {
          userId,
          type: 'expiry_warning',
          title: `⚠️ Có ${count} nguyên liệu sắp hết hạn`,
          body: `${preview}${suffix} sẽ hết hạn trong ${withinDays} ngày. Lên thực đơn ngay để tránh lãng phí!`,
          metadata: { items, withinDays },
        },
      });

      notifCreated++;
    }

    this.logger.log(`✅ [Cron:${jobName}] Đã tạo ${notifCreated} notifications`);
    await this.updateLastRun(jobName, 'success');
  }

  // ─────────────────────────────────────────────────────────
  // Handler 2: Nhắc lập thực đơn tuần mới
  // Default: Chủ Nhật 9:00 AM (0 9 * * 0)
  // ─────────────────────────────────────────────────────────
  async remindWeeklyPlan(): Promise<void> {
    const jobName = CRON_WEEKLY_REMIND;
    this.logger.log(`📅 [Cron:${jobName}] Bắt đầu kiểm tra thực đơn tuần`);

    // Tính thứ 2 của tuần tới
    const today = new Date();
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    const weekStartDate = nextMonday.toISOString().split('T')[0];

    // Tìm users active subscription (không phải free — free aiUsagePerWeek = 2)
    const activeUsers = await this.prisma.userSubscription.findMany({
      where: {
        status: 'active',
        endDate: { gte: new Date() },
      },
      select: { userId: true },
    });

    let notifCreated = 0;

    for (const { userId } of activeUsers) {
      // Kiểm tra đã có plan tuần tới chưa
      const hasplan = await this.prisma.weeklyPlan.findFirst({
        where: {
          userId,
          weekStartDate: nextMonday,
          deletedAt: null,
        },
      });

      if (hasplan) continue;

      // Kiểm tra đã nhắc tuần này chưa
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const alreadySent = await this.prisma.notification.findFirst({
        where: {
          userId,
          type: 'plan_ready',
          createdAt: { gte: todayStart },
          deletedAt: null,
        },
      });

      if (alreadySent) continue;

      await this.prisma.notification.create({
        data: {
          userId,
          type: 'plan_ready',
          title: '📅 Tuần mới sắp tới!',
          body: 'Bạn chưa lên thực đơn cho tuần tới. Để Friggy AI lập thực đơn ngay nhé!',
          metadata: { weekStartDate },
        },
      });

      notifCreated++;
    }

    this.logger.log(`✅ [Cron:${jobName}] Đã tạo ${notifCreated} reminders`);
    await this.updateLastRun(jobName, 'success');
  }

  // ─────────────────────────────────────────────────────────
  // Helper: cập nhật lastRunAt + lastRunStatus sau mỗi lần chạy
  // ─────────────────────────────────────────────────────────
  private async updateLastRun(name: string, status: 'success' | 'failed') {
    await this.prisma.cronJobConfig.update({
      where: { name },
      data: { lastRunAt: new Date(), lastRunStatus: status },
    });
  }
}
