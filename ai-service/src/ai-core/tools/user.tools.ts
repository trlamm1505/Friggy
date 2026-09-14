/**
 * UserTools — Nhóm công cụ AI cho dữ liệu người dùng
 *
 * Bao gồm 2 tools:
 * - get_user_preferences: Lấy sở thích nấu ăn (ngân sách, calo, phong cách ăn...)
 * - get_user_allergies:   Lấy danh sách dị ứng thực phẩm
 *
 * AI dùng thông tin này để cá nhân hóa gợi ý:
 * - Không đề xuất món chứa nguyên liệu gây dị ứng
 * - Tôn trọng ngân sách và phong cách ăn uống (chay, keto, giảm cân...)
 *
 * [Cấp độ 2] Kết quả được cache Redis TTL 15 phút.
 * Cache key: user:{userId}:preferences | user:{userId}:allergies
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';

// TTL cache cho dữ liệu user (15 phút — ít thay đổi hơn fridge)
const USER_CACHE_TTL = 900;

@Injectable()
export class UserTools {
  private readonly logger = new Logger(UserTools.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // Tool: get_user_preferences
  // ─────────────────────────────────────────────────────────

  /**
   * Lấy thông tin sở thích và mục tiêu nấu ăn của người dùng.
   * AI dùng để lọc công thức phù hợp với lifestyle và khẩu vị.
   *
   * Nếu người dùng chưa hoàn thành khảo sát onboarding, trả về giá trị mặc định
   * để AI vẫn có thể đưa ra gợi ý cơ bản.
   *
   * @param userId - ID người dùng cần lấy sở thích
   */
  async getUserPreferences(userId: string): Promise<any> {
    const cacheKey = `user:${userId}:preferences`;

    const cached = await this.redis.get<any>(cacheKey);
    if (cached) {
      this.logger.debug(`💾 [UserTools] Cache HIT: ${cacheKey}`);
      return cached;
    }

    let preferences: any = null;
    try {
      preferences = await this.prisma.userPreference.findUnique({
        where: { userId },
      });
    } catch (err: any) {
      // Xảy ra khi DB có giá trị enum không hợp lệ (vd: dietaryStyle = '')
      // Fallback: dùng raw query, bỏ qua column lỗi
      this.logger.warn(`[UserTools] Prisma enum error, dùng raw query: ${err?.message?.split('\n')[0]}`);
      const rows = await this.prisma.$queryRaw<any[]>`
        SELECT userId, weeklyBudget, dailyCalorieTarget,
               preferSimpleRecipes, maxCookTimeMinutes,
               skillLevel, householdSize, primaryGoal, cookingFrequency
        FROM user_preferences
        WHERE userId = ${userId}
        LIMIT 1
      `;
      preferences = rows[0] ?? null;
    }

    // Chưa có preference → trả về giá trị mặc định thay vì null
    if (!preferences) {
      return {
        weeklyBudget: null,
        dailyCalorieTarget: null,
        dietaryStyle: null,
        preferSimpleRecipes: true,
        maxCookTimeMinutes: null,
        skillLevel: 'beginner',
        householdSize: 1,
        primaryGoal: null,
        cookingFrequency: null,
      };
    }

    const result = {
      weeklyBudget: preferences.weeklyBudget,
      dailyCalorieTarget: preferences.dailyCalorieTarget,
      dietaryStyle: preferences.dietaryStyle ?? null, // null nếu giá trị enum lỗi
      preferSimpleRecipes: preferences.preferSimpleRecipes,
      maxCookTimeMinutes: preferences.maxCookTimeMinutes,
      skillLevel: preferences.skillLevel,
      householdSize: preferences.householdSize,
      primaryGoal: preferences.primaryGoal,
      cookingFrequency: preferences.cookingFrequency,
    };

    await this.redis.set(cacheKey, result, USER_CACHE_TTL);
    return result;
  }

  // ─────────────────────────────────────────────────────────
  // Tool: get_user_allergies
  // ─────────────────────────────────────────────────────────

  /**
   * Lấy danh sách nguyên liệu gây dị ứng của người dùng.
   * AI PHẢI gọi tool này trước khi đề xuất bất kỳ công thức nào để đảm bảo an toàn.
   *
   * @param userId - ID người dùng
   * @returns Mảng tên nguyên liệu cần tránh (ví dụ: ['tôm', 'đậu phộng', 'gluten'])
   */
  async getUserAllergies(userId: string): Promise<string[]> {
    const cacheKey = `user:${userId}:allergies`;

    const cached = await this.redis.get<string[]>(cacheKey);
    if (cached) {
      this.logger.debug(`💾 [UserTools] Cache HIT: ${cacheKey}`);
      return cached;
    }

    const allergies = await this.prisma.userAllergy.findMany({
      where: { userId, deletedAt: null },
      include: { ingredient: true }, // Join để lấy tên nguyên liệu
    });

    // Chỉ trả về tên nguyên liệu — AI không cần biết ID
    const result = allergies.map((allergy) => allergy.ingredient.name);
    await this.redis.set(cacheKey, result, USER_CACHE_TTL);
    return result;
  }
}
