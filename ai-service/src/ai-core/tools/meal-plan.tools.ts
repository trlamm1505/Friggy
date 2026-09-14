/**
 * MealPlanTools — Nhóm công cụ AI cho tính năng lập thực đơn tuần
 *
 * Bao gồm 5 tools:
 * - get_weekly_plan:      Lấy thực đơn tuần đã lưu
 * - save_weekly_plan:     Lưu thực đơn tuần AI vừa lập vào DB
 * - validate_plan_budget: Kiểm tra tổng chi phí có trong ngân sách không
 * - check_allergy_conflict: Kiểm tra thực đơn có gây dị ứng không
 * - get_nutrition_summary:  Ước tính tổng calo (MVP — tích hợp DB dinh dưỡng sau)
 *
 * Lưu ý về schema:
 * - DailyPlan yêu cầu trường `date` bắt buộc (ngoài `dayOfWeek`)
 * - MealSlot không có trường `isCooked` — dùng `completedAt` thay thế
 * - Recipe dùng trường `title` (không phải `name`)
 * - Recipe dùng relation `ingredients` (không phải `recipeIngredients`)
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class MealPlanTools {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────
  // Tool: get_weekly_plan
  // ─────────────────────────────────────────────────────────

  /**
   * Lấy thực đơn tuần đã được lưu trong DB.
   * AI gọi tool này khi người dùng hỏi về thực đơn tuần hiện tại hoặc tuần trước.
   *
   * @param userId        - ID người dùng
   * @param weekStartDate - Ngày Thứ 2 đầu tuần theo định dạng YYYY-MM-DD
   */
  async getWeeklyPlan(userId: string, weekStartDate: string): Promise<any | null> {
    const plan = await this.prisma.weeklyPlan.findFirst({
      where: {
        userId,
        weekStartDate: new Date(weekStartDate),
        deletedAt: null,
      },
      include: {
        dailyPlans: {
          include: {
            // Lấy cả công thức để hiển thị tên món cho AI
            mealSlots: { include: { recipe: true } },
          },
          orderBy: { dayOfWeek: 'asc' }, // Thứ tự từ Thứ 2 đến Chủ nhật
        },
      },
    });

    if (!plan) return null;

    return {
      id: plan.id,
      weekStartDate: plan.weekStartDate.toISOString().split('T')[0],
      status: plan.status,
      totalBudget: plan.totalBudget,
      days: plan.dailyPlans.map((dailyPlan) => ({
        dayOfWeek: dailyPlan.dayOfWeek, // 1=Thứ 2, ..., 7=Chủ nhật
        date: dailyPlan.date.toISOString().split('T')[0],
        meals: dailyPlan.mealSlots.map((slot) => ({
          slotId: slot.id,
          mealType: slot.mealType,
          recipeId: slot.recipeId,
          recipeName: slot.recipe?.title ?? null, // Schema dùng `title` không phải `name`
          isCooked: !!slot.completedAt,           // Schema dùng `completedAt`, convert sang boolean
        })),
      })),
    };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: save_weekly_plan
  // ─────────────────────────────────────────────────────────

  /**
   * Lưu thực đơn tuần AI vừa lập vào database.
   * Nếu đã có kế hoạch tuần này thì cập nhật lại (upsert).
   * Với mỗi ngày: xóa slot cũ và tạo slot mới để tránh trùng lặp.
   *
   * @param params.userId         - ID người dùng
   * @param params.weekStartDate  - Ngày Thứ 2 đầu tuần YYYY-MM-DD
   * @param params.totalBudget    - Ngân sách tuần (VND, tùy chọn)
   * @param params.slots          - Danh sách bữa ăn: dayOfWeek + mealType + recipeId
   */
  async saveWeeklyPlan(params: {
    userId: string;
    weekStartDate: string;
    totalBudget?: number;
    slots: Array<{
      dayOfWeek: number; // 1 = Thứ 2, 2 = Thứ 3, ..., 7 = Chủ nhật
      mealType: string;  // breakfast | lunch | dinner | snack
      recipeId: string;
    }>;
  }): Promise<{ weeklyPlanId: string }> {
    const weekStart = new Date(params.weekStartDate);

    // Tìm kế hoạch tuần đã tồn tại (nếu có) để cập nhật thay vì tạo mới
    let weeklyPlan = await this.prisma.weeklyPlan.findFirst({
      where: { userId: params.userId, weekStartDate: weekStart, deletedAt: null },
    });

    if (!weeklyPlan) {
      // Chưa có → tạo kế hoạch tuần mới với trạng thái 'draft'
      weeklyPlan = await this.prisma.weeklyPlan.create({
        data: {
          id: uuid(),
          userId: params.userId,
          weekStartDate: weekStart,
          totalBudget: params.totalBudget ?? 0,
          status: 'draft',
        } as any,
      });
    }

    // Nhóm các slot theo ngày trong tuần để xử lý từng ngày
    const slotsByDay = new Map<number, typeof params.slots>();
    for (const slot of params.slots) {
      if (!slotsByDay.has(slot.dayOfWeek)) slotsByDay.set(slot.dayOfWeek, []);
      slotsByDay.get(slot.dayOfWeek)!.push(slot);
    }

    // Xử lý từng ngày trong tuần
    for (const [dayOfWeek, daySlots] of slotsByDay.entries()) {
      // Tính ngày cụ thể: weekStart + (dayOfWeek - 1) ngày
      // Ví dụ: Thứ 2 = weekStart + 0, Thứ 3 = weekStart + 1, ...
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + dayOfWeek - 1);

      // Tìm hoặc tạo DailyPlan cho ngày này
      let dailyPlan = await this.prisma.dailyPlan.findFirst({
        where: { weeklyPlanId: weeklyPlan.id, dayOfWeek },
      });

      if (!dailyPlan) {
        dailyPlan = await this.prisma.dailyPlan.create({
          data: {
            id: uuid(),
            weeklyPlanId: weeklyPlan.id,
            dayOfWeek,
            date, // Bắt buộc trong schema — tính từ weekStartDate + dayOfWeek
          },
        });
      }

      // Xóa toàn bộ slot cũ của ngày này trước khi tạo mới
      // (để tránh trùng lặp khi AI cập nhật thực đơn)
      await this.prisma.mealSlot.deleteMany({
        where: { dailyPlanId: dailyPlan.id },
      });

      // Tạo các slot bữa ăn mới cho ngày này
      await this.prisma.mealSlot.createMany({
        data: daySlots.map((slot) => ({
          id: uuid(),
          dailyPlanId: dailyPlan!.id,
          mealType: slot.mealType as any,
          recipeId: slot.recipeId,
          // completedAt: null — chưa nấu (trường dùng thay cho isCooked)
        })),
      });
    }

    return { weeklyPlanId: weeklyPlan.id };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: validate_plan_budget
  // ─────────────────────────────────────────────────────────

  /**
   * Kiểm tra tổng chi phí của thực đơn tuần có vượt ngân sách không.
   * AI gọi sau khi lập xong thực đơn để xác nhận trước khi trình bày cho user.
   *
   * @param params.slots  - Danh sách slot bữa ăn trong thực đơn
   * @param params.budget - Ngân sách tối đa (VND)
   */
  async validatePlanBudget(params: {
    slots: Array<{ recipeId: string; servings?: number }>;
    budget: number;
  }): Promise<{
    isValid: boolean;   // true = trong ngân sách, false = vượt ngân sách
    totalCost: number;  // Tổng chi phí ước tính (VND)
    overBy?: number;    // Vượt bao nhiêu so với ngân sách (chỉ có khi isValid = false)
  }> {
    let totalCost = 0;

    for (const slot of params.slots) {
      const recipe = await this.prisma.recipe.findFirst({
        where: { id: slot.recipeId, deletedAt: null },
      });

      if (recipe?.estimatedCost) {
        // Tính chi phí theo số người ăn (tỉ lệ với servings gốc của công thức)
        const servings = slot.servings ?? recipe.servings ?? 1;
        totalCost += Math.round(
          (recipe.estimatedCost / (recipe.servings ?? 1)) * servings,
        );
      }
    }

    const isValid = totalCost <= params.budget;
    return {
      isValid,
      totalCost,
      // Chỉ trả về overBy khi thực sự vượt ngân sách
      ...(isValid ? {} : { overBy: totalCost - params.budget }),
    };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: check_allergy_conflict
  // ─────────────────────────────────────────────────────────

  /**
   * Kiểm tra xem thực đơn có chứa nguyên liệu gây dị ứng không.
   * AI BẮT BUỘC gọi tool này trước khi lưu thực đơn để đảm bảo an toàn.
   *
   * @param params.slots     - Danh sách slot bữa ăn cần kiểm tra
   * @param params.allergies - Danh sách tên nguyên liệu gây dị ứng (từ get_user_allergies)
   */
  async checkAllergyConflict(params: {
    slots: Array<{ recipeId: string }>;
    allergies: string[];
  }): Promise<{
    hasConflict: boolean; // true = có nguyên liệu gây dị ứng
    conflicts: Array<{ recipeName: string; allergen: string }>; // Chi tiết xung đột
  }> {
    // Không có dị ứng → an toàn ngay
    if (params.allergies.length === 0) {
      return { hasConflict: false, conflicts: [] };
    }

    const conflicts: Array<{ recipeName: string; allergen: string }> = [];

    for (const slot of params.slots) {
      const recipe = await this.prisma.recipe.findFirst({
        where: { id: slot.recipeId, deletedAt: null },
        include: { ingredients: { include: { ingredient: true } } },
      });

      if (!recipe) continue;

      // So khớp từng nguyên liệu trong công thức với danh sách dị ứng
      for (const ri of recipe.ingredients) {
        const ingredientName = ri.ingredient.name.toLowerCase();
        for (const allergen of params.allergies) {
          // Kiểm tra chứa (partial match) — ví dụ: "bột mì" chứa "mì"
          if (ingredientName.includes(allergen.toLowerCase())) {
            conflicts.push({
              recipeName: recipe.title, // Schema dùng `title` không phải `name`
              allergen,
            });
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: get_nutrition_summary
  // ─────────────────────────────────────────────────────────

  /**
   * Ước tính tổng lượng calo từ danh sách nguyên liệu.
   *
   * LƯU Ý QUAN TRỌNG (MVP Phase 7):
   * Hiện tại chỉ tính ước tính đơn giản (~80 kcal/nguyên liệu).
   * Phase 8+ sẽ tích hợp database dinh dưỡng thực tế (FatSecret API, USDA, hoặc
   * bảng nutrition riêng trong DB) để có con số chính xác.
   *
   * @param ingredientNames - Danh sách tên nguyên liệu cần tính
   */
  async getNutritionSummary(ingredientNames: string[]): Promise<{
    totalCalories: number;
    note: string;
  }> {
    // Ước tính thô: mỗi nguyên liệu trung bình ~80 kcal
    // (không chính xác nhưng đủ để AI đưa ra nhận xét cơ bản)
    return {
      totalCalories: ingredientNames.length * 80,
      note: 'Đây là ước tính sơ bộ. Tích hợp cơ sở dữ liệu dinh dưỡng chi tiết sẽ có ở phiên bản sau.',
    };
  }
}
