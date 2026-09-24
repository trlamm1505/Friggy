/**
 * RateLimitService — Dịch vụ kiểm soát hạn mức sử dụng AI
 *
 * Friggy có 2 gói dịch vụ với hạn mức AI khác nhau:
 * - Gói Free:       2 lượt AI mỗi tuần
 * - Gói Individual: Không giới hạn (aiUsagePerWeek = -1)
 *
 * Cơ chế hoạt động:
 * 1. Trước mỗi yêu cầu AI: gọi checkLimit() — nếu hết quota sẽ throw ForbiddenException
 * 2. Sau khi AI xử lý xong: gọi recordUsage() — ghi log vào bảng ai_usage_logs
 * 3. Quota reset mỗi đầu tuần (Thứ 2 lúc 00:00)
 *
 * Lưu ý: recordUsage() không bao giờ throw — thất bại chỉ ghi log cảnh báo,
 * không ảnh hưởng đến response trả về cho người dùng.
 */
import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuid } from 'uuid';

/**
 * Các loại tính năng AI — dùng để phân loại lượt sử dụng trong ai_usage_logs
 */
export type AiFeatureType =
  | 'recipe_suggest' // Gợi ý công thức từ tủ lạnh
  | 'scan'           // Scan ảnh nguyên liệu/barcode bằng AI
  | 'chat'           // Trò chuyện với AI đầu bếp
  | 'meal_plan'      // Lập thực đơn tuần bằng AI
  | 'expiring_plan'  // Gợi ý món ăn từ đồ sắp hết hạn
  | 'slot_regenerate'; // Đổi món AI trong thực đơn

/** Hạn mức mặc định khi không tìm được thông tin subscription trong DB */
const DEFAULT_WEEKLY_LIMIT = 2;

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(private readonly prisma: PrismaService) { }

  // ─────────────────────────────────────────────────────────
  // Kiểm tra hạn mức trước khi cho phép dùng AI
  // ─────────────────────────────────────────────────────────

  /**
   * Kiểm tra xem người dùng còn đủ hạn mức để dùng AI không.
   * Gọi hàm này TRƯỚC khi khởi chạy AI để tiết kiệm token.
   *
   * @param userId - ID người dùng cần kiểm tra
   * @param featureType - Loại tính năng AI đang dùng
   * @throws ForbiddenException nếu người dùng đã hết quota tuần này
   */
  async checkLimit(userId: string, featureType: AiFeatureType): Promise<void> {
    const weeklyLimit = await this.getWeeklyLimit(userId);

    // Giá trị -1 nghĩa là không giới hạn (gói Individual)
    if (weeklyLimit === -1) {
      this.logger.log(`✅ Người dùng ${userId} dùng gói Individual — không giới hạn AI`);
      return;
    }

    // Đếm số lần đã dùng AI trong tuần hiện tại
    const weekStart = this.getWeekStart();
    const usedCount = await this.prisma.aiUsageLog.count({
      where: {
        userId,
        usedAt: { gte: weekStart },
      },
    });

    this.logger.log(
      `📊 Kiểm tra hạn mức: userId=${userId} | tính năng=${featureType} | đã dùng=${usedCount}/${weeklyLimit}`,
    );

    // Hết hạn mức → từ chối và thông báo nâng cấp gói
    if (usedCount >= weeklyLimit) {
      const individualPlan = await this.prisma.subscriptionPlan.findFirst({
        where: { name: 'individual', isActive: true, deletedAt: null },
        select: { priceVnd: true, displayName: true },
      });
      const priceText = individualPlan?.priceVnd
        ? `${Math.round(individualPlan.priceVnd / 1000)}k/tháng`
        : '25k/tháng';
      const planName = individualPlan?.displayName ?? 'Individual';

      throw new ForbiddenException(
        `Bạn đã dùng hết ${weeklyLimit} lượt AI trong tuần này. ` +
        `Nâng cấp lên gói ${planName} (${priceText}) để sử dụng không giới hạn.`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────
  // Ghi nhận lượt sử dụng sau khi AI hoàn thành
  // ─────────────────────────────────────────────────────────

  /**
   * Ghi nhận 1 lượt sử dụng AI vào bảng ai_usage_logs.
   * Gọi hàm này SAU khi AI đã xử lý xong và trả về kết quả.
   *
   * Hàm này KHÔNG throw exception — lỗi chỉ được log, không ảnh hưởng response.
   *
   * @param userId - ID người dùng
   * @param featureType - Loại tính năng đã dùng
   * @param tokensUsed - Số token đã tiêu thụ (lấy từ response của LLM)
   */
  async recordUsage(
    userId: string,
    featureType: AiFeatureType,
    tokensUsed = 0,
  ): Promise<void> {
    try {
      await this.prisma.aiUsageLog.create({
        data: {
          id: uuid(),
          userId,
          featureType,
          tokensUsed,
        },
      });
      this.logger.log(
        `📝 Đã ghi nhận lượt dùng AI: userId=${userId} | tính năng=${featureType} | token=${tokensUsed}`,
      );
    } catch (err) {
      // Không throw — tránh làm hỏng response khi ghi log thất bại
      this.logger.error(
        `❌ Không thể ghi nhận lượt dùng AI (userId=${userId}): ${err}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────
  // Tổng hợp thống kê — dùng cho endpoint GET /me/ai-usage
  // ─────────────────────────────────────────────────────────

  /**
   * Lấy thống kê sử dụng AI của người dùng trong tuần hiện tại.
   * Dùng cho endpoint GET /users/me/ai-usage để hiển thị badge hạn mức trên app.
   *
   * @param userId - ID người dùng
   * @returns Thống kê: số lần đã dùng, giới hạn, còn lại, thời gian reset
   */
  async getUsageSummary(userId: string): Promise<{
    used: number;
    limit: number;
    isUnlimited: boolean;
    resetAt: string;
  }> {
    const weeklyLimit = await this.getWeeklyLimit(userId);
    const weekStart = this.getWeekStart();

    // Đếm tổng lượt dùng trong tuần này (không phân biệt tính năng)
    const used = await this.prisma.aiUsageLog.count({
      where: { userId, usedAt: { gte: weekStart } },
    });

    // Tính ngày reset quota: Thứ 2 tuần sau lúc 00:00
    const nextMonday = new Date(weekStart);
    nextMonday.setDate(nextMonday.getDate() + 7);

    return {
      used,
      limit: weeklyLimit === -1 ? 999 : weeklyLimit, // 999 đại diện "không giới hạn" khi hiển thị trên UI
      isUnlimited: weeklyLimit === -1,
      resetAt: nextMonday.toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────
  // Các hàm nội bộ (private)
  // ─────────────────────────────────────────────────────────

  /**
   * Lấy giới hạn AI theo tuần từ gói dịch vụ của người dùng.
   * Đọc từ bảng user_subscriptions → subscription_plans → aiUsagePerWeek.
   *
   * @returns Giới hạn tuần (-1 = không giới hạn, số dương = có giới hạn cụ thể)
   */
  private async getWeeklyLimit(userId: string): Promise<number> {
    try {
      const subscription = await this.prisma.userSubscription.findFirst({
        where: { userId, status: 'active', deletedAt: null },
        include: { plan: true },
      });
      if (subscription) return subscription.plan.aiUsagePerWeek;

      const freePlan = await this.prisma.subscriptionPlan.findFirst({
        where: { OR: [{ name: 'free' }, { priceVnd: 0 }], isActive: true, deletedAt: null },
        select: { aiUsagePerWeek: true },
      });
      if (freePlan) return freePlan.aiUsagePerWeek;
    } catch (err) {
      this.logger.warn(`Lỗi khi lấy weekly limit từ DB: ${err}`);
    }
    return 0;
  }

  /**
   * Lấy ngày đầu tuần (Thứ 2) của tuần hiện tại lúc 00:00:00.
   * Dùng để đếm lượt dùng AI trong phạm vi tuần này.
   */
  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
    // Tính số ngày cần lùi để về Thứ 2 đầu tuần
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
}
