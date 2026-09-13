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
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';

@Injectable()
export class UserTools {
  constructor(private readonly prisma: PrismaService) {}

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
    const preferences = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    // Chưa có preference → trả về giá trị mặc định thay vì null
    if (!preferences) {
      return {
        weeklyBudget: null,           // Chưa đặt ngân sách
        dailyCalorieTarget: null,     // Chưa đặt mục tiêu calo
        dietaryStyle: null,           // Chưa chọn phong cách ăn (chay, keto...)
        preferSimpleRecipes: true,    // Mặc định: thích món đơn giản
        maxCookTimeMinutes: null,     // Chưa giới hạn thời gian nấu
        skillLevel: 'beginner',       // Mặc định: mới học nấu ăn
        householdSize: 1,             // Mặc định: 1 người ăn
        primaryGoal: null,            // Chưa đặt mục tiêu (giảm cân, tăng cơ...)
        cookingFrequency: null,       // Chưa cho biết nấu bao nhiêu lần/tuần
      };
    }

    return {
      weeklyBudget: preferences.weeklyBudget,
      dailyCalorieTarget: preferences.dailyCalorieTarget,
      dietaryStyle: preferences.dietaryStyle,
      preferSimpleRecipes: preferences.preferSimpleRecipes,
      maxCookTimeMinutes: preferences.maxCookTimeMinutes,
      skillLevel: preferences.skillLevel,
      householdSize: preferences.householdSize,
      primaryGoal: preferences.primaryGoal,
      cookingFrequency: preferences.cookingFrequency,
    };
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
    const allergies = await this.prisma.userAllergy.findMany({
      where: { userId, deletedAt: null },
      include: { ingredient: true }, // Join để lấy tên nguyên liệu
    });

    // Chỉ trả về tên nguyên liệu — AI không cần biết ID
    return allergies.map((allergy) => allergy.ingredient.name);
  }
}
