/**
 * RecipeTools — Nhóm công cụ AI cho dữ liệu công thức nấu ăn
 *
 * Bao gồm 6 tools:
 * - search_recipes:        Tìm công thức theo nguyên liệu và điều kiện
 * - get_recipe_detail:     Lấy chi tiết 1 công thức (nguyên liệu, bước nấu)
 * - calculate_recipe_cost: Tính chi phí theo số khẩu phần
 * - calculate_match_score: Tính % nguyên liệu có sẵn trong tủ
 * - suggest_from_expiring: Gợi ý công thức dùng đồ sắp hết hạn
 * - get_nutrition_summary:  Tính tóm tắt dinh dưỡng của danh sách nguyên liệu
 * - create_recipe:         Tạo công thức mới do AI tự nghĩ (isAiGenerated=true)
 *
 * Lưu ý về tên trường trong schema:
 * - Recipe.title (không phải name)
 * - Recipe.ingredients (không phải recipeIngredients)
 * - Recipe.status = 'published' (không phải isPublished boolean)
 *
 * [Cấp độ 2] Kết quả search và cost được cache Redis TTL 10 phút.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';

// TTL cache cho dữ liệu công thức (10 phút — ít thay đổi hơn fridge)
const RECIPE_CACHE_TTL = 600;

@Injectable()
export class RecipeTools {
  private readonly logger = new Logger(RecipeTools.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // Tool: search_recipes
  // ─────────────────────────────────────────────────────────

  /**
   * Tìm kiếm công thức phù hợp với nguyên liệu và điều kiện của người dùng.
   * Kết quả bao gồm điểm matchScore để AI sắp xếp ưu tiên.
   *
   * @param params.ingredientNames - Danh sách nguyên liệu muốn sử dụng
   * @param params.mealType        - Loại bữa ăn (breakfast/lunch/dinner/snack)
   * @param params.maxCost         - Chi phí tối đa (VND)
   * @param params.limit           - Số lượng kết quả tối đa (mặc định 10)
   */
  async searchRecipes(params: {
    ingredientNames: string[];
    mealType?: string;
    maxCost?: number;
    maxCostPerServing?: number;  // Tính theo giá/khẩu phần (dùng bởi AccountantAgent)
    limit?: number;
  }): Promise<any[]> {
    // Tạo cache key từ hash của params để tránh key quá dài
    const paramsHash = crypto
      .createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex')
      .slice(0, 12);
    const cacheKey = `recipe:search:${paramsHash}`;

    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) {
      this.logger.debug(`💾 [RecipeTools] Cache HIT: ${cacheKey}`);
      return cached;
    }

    const where: any = {
      status: 'published', // Chỉ lấy công thức đã được duyệt
      deletedAt: null,
    };

    // Thêm điều kiện lọc tùy chọn
    if (params.mealType) where.mealType = params.mealType;
    if (params.maxCost) where.estimatedCost = { lte: params.maxCost };
    if (params.maxCostPerServing) where.estimatedCost = { lte: params.maxCostPerServing };

    const recipes = await this.prisma.recipe.findMany({
      where,
      include: {
        ingredients: { include: { ingredient: true } }, // Danh sách nguyên liệu
        steps: { orderBy: { stepNumber: 'asc' }, take: 3 }, // Chỉ lấy 3 bước đầu
        tags: { include: { tag: true } },                   // Tags (healthy, quick, ...)
      },
      take: params.limit ?? 10,
    });

    // Tính matchScore cho từng công thức với nguyên liệu AI đang tìm
    const result = recipes.map((recipe) => this.mapRecipe(recipe, params.ingredientNames));

    // Lưu cache kết quả
    await this.redis.set(cacheKey, result, RECIPE_CACHE_TTL);
    return result;
  }

  // ─────────────────────────────────────────────────────────
  // Tool: get_recipe_detail
  // ─────────────────────────────────────────────────────────

  /**
   * Lấy thông tin chi tiết đầy đủ của 1 công thức.
   * AI gọi sau search_recipes để lấy đủ thông tin trước khi đề xuất cho người dùng.
   *
   * @param recipeId - ID công thức cần lấy chi tiết
   */
  async getRecipeDetail(recipeId: string): Promise<any> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, deletedAt: null },
      include: {
        ingredients: { include: { ingredient: true } }, // Tất cả nguyên liệu
        steps: { orderBy: { stepNumber: 'asc' } },      // Đầy đủ các bước nấu
        tags: { include: { tag: true } },
      },
    });

    if (!recipe) return null;
    return this.mapRecipe(recipe, []);
  }

  // ─────────────────────────────────────────────────────────
  // Tool: calculate_recipe_cost
  // ─────────────────────────────────────────────────────────

  /**
   * Tính chi phí ước tính của công thức theo số khẩu phần.
   * Dùng công thức tỉ lệ: chi phí gốc / servings gốc * servings yêu cầu.
   *
   * @param recipeId - ID công thức
   * @param servings - Số người ăn mong muốn
   */
  async calculateRecipeCost(recipeId: string, servings: number): Promise<{
    totalCost: number;
    perServing: number;
  }> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, deletedAt: null },
    });

    if (!recipe || !recipe.estimatedCost) {
      return { totalCost: 0, perServing: 0 };
    }

    // Tính tỉ lệ: (chi phí gốc / số người gốc) * số người yêu cầu
    const defaultServings = recipe.servings ?? 1;
    const totalCost = Math.round((recipe.estimatedCost / defaultServings) * servings);

    return {
      totalCost,
      perServing: Math.round(totalCost / servings),
    };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: calculate_match_score
  // ─────────────────────────────────────────────────────────

  /**
   * Tính điểm phù hợp giữa công thức và tủ lạnh hiện tại.
   * Score 100% = có đủ mọi nguyên liệu, 0% = không có gì.
   * AI dùng để sắp xếp công thức theo thứ tự ưu tiên.
   *
   * @param recipeId - ID công thức cần kiểm tra
   * @param userId   - ID người dùng (để lấy nguyên liệu trong tủ của họ)
   */
  async calculateMatchScore(recipeId: string, userId: string): Promise<{
    score: number;       // Phần trăm nguyên liệu có sẵn (0-100)
    missing: string[];   // Nguyên liệu còn thiếu (cần mua thêm)
    available: string[]; // Nguyên liệu đã có trong tủ
  }> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, deletedAt: null },
      include: { ingredients: { include: { ingredient: true } } },
    });

    if (!recipe) return { score: 0, missing: [], available: [] };

    // Lấy danh sách ID nguyên liệu đang có trong tủ của user
    const fridgeItems = await this.prisma.fridgeItem.findMany({
      where: { userId, deletedAt: null, consumedAt: null },
      include: { ingredient: true },
    });
    const fridgeIngredientIds = new Set(fridgeItems.map((item) => item.ingredientId));

    // Phân loại nguyên liệu: có sẵn vs còn thiếu
    const required = recipe.ingredients;
    const available = required
      .filter((ri) => fridgeIngredientIds.has(ri.ingredientId))
      .map((ri) => ri.ingredient.name);
    const missing = required
      .filter((ri) => !fridgeIngredientIds.has(ri.ingredientId))
      .map((ri) => ri.ingredient.name);

    // Tính score: tỷ lệ nguyên liệu có sẵn / tổng nguyên liệu cần
    const score = required.length > 0
      ? Math.round((available.length / required.length) * 100)
      : 0;

    return { score, missing, available };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: suggest_from_expiring
  // ─────────────────────────────────────────────────────────

  /**
   * Gợi ý công thức ưu tiên sử dụng nguyên liệu sắp hết hạn trong 3 ngày tới.
   * Mục tiêu: giúp người dùng giảm lãng phí thực phẩm.
   *
   * Logic:
   * 1. Tìm nguyên liệu hết hạn trong 3 ngày
   * 2. Tìm công thức sử dụng ít nhất 1 trong các nguyên liệu đó
   * 3. Tính matchScore và trả về top 5
   *
   * @param userId - ID người dùng
   */
  async suggestFromExpiring(userId: string): Promise<any[]> {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 3); // Ngưỡng "sắp hết hạn" = 3 ngày

    // Bước 1: Lấy danh sách nguyên liệu sắp hết hạn
    const expiringItems = await this.prisma.fridgeItem.findMany({
      where: {
        userId,
        deletedAt: null,
        consumedAt: null,
        expiresAt: { lte: deadline },
      },
      include: { ingredient: true },
    });

    // Không có gì sắp hết hạn → trả về danh sách rỗng
    if (expiringItems.length === 0) return [];

    const expiringIngredientIds = expiringItems.map((item) => item.ingredientId);
    const expiringIngredientNames = expiringItems.map((item) => item.ingredient.name);

    // Bước 2: Tìm công thức sử dụng ít nhất 1 nguyên liệu sắp hết hạn
    const recipes = await this.prisma.recipe.findMany({
      where: {
        status: 'published',
        deletedAt: null,
        ingredients: {
          some: { ingredientId: { in: expiringIngredientIds } },
        },
      },
      include: {
        ingredients: { include: { ingredient: true } },
        steps: { take: 1, orderBy: { stepNumber: 'asc' } },
        tags: { include: { tag: true } },
      },
      take: 5, // Chỉ lấy top 5 gợi ý
    });

    // Bước 3: Tính matchScore với danh sách nguyên liệu sắp hết hạn
    return recipes.map((recipe) => this.mapRecipe(recipe, expiringIngredientNames));
  }

  // ─────────────────────────────────────────────────────────
  // Hàm nội bộ: Chuyển đổi định dạng recipe
  // ─────────────────────────────────────────────────────────

  /**
   * Chuyển đổi bản ghi Recipe từ Prisma sang định dạng gọn nhẹ cho AI xử lý.
   * Đồng thời tính matchScore so với danh sách nguyên liệu được cung cấp.
   *
   * @param recipe              - Bản ghi Recipe từ Prisma (có include ingredients, tags)
   * @param availableIngredients - Danh sách nguyên liệu để so khớp (tính matchScore)
   */
  private mapRecipe(recipe: any, availableIngredients: string[]): any {
    const ingredientNames: string[] = recipe.ingredients?.map(
      (ri: any) => ri.ingredient.name,
    ) ?? [];

    // Đếm số nguyên liệu có trong danh sách available (không phân biệt hoa thường)
    const matchCount = ingredientNames.filter((name) =>
      availableIngredients.some(
        (available) => available.toLowerCase() === name.toLowerCase(),
      ),
    ).length;

    const matchScore = ingredientNames.length > 0
      ? Math.round((matchCount / ingredientNames.length) * 100)
      : 0;

    return {
      id: recipe.id,
      name: recipe.title,          // Schema dùng trường `title`, map thành `name` cho AI dễ hiểu
      description: recipe.description,
      mealType: recipe.mealType,
      cookTimeMinutes: recipe.cookTimeMinutes,
      servings: recipe.servings,
      estimatedCost: recipe.estimatedCost,
      matchScore,                  // % nguyên liệu có sẵn (0-100)
      ingredients: ingredientNames,
      tags: recipe.tags?.map((t: any) => t.tag.name) ?? [],
    };
  }

  // ─────────────────────────────────────────────────────────
  // Tool: get_nutrition_summary (Cấp độ 2 — dùng bởi NutritionAgent)
  // ─────────────────────────────────────────────────────────

  /**
   * Tính tóm tắt dinh dưỡng từ danh sách tên nguyên liệu.
   * NutritionAgent dùng để đánh giá tình trạng dinh dưỡng hiện tại của tủ lạnh.
   * Kết quả được cache Redis TTL 10 phút.
   *
   * @param ingredientNames - Danh sách tên nguyên liệu cần tính dinh dưỡng
   * @returns Tóm tắt tổng calo và macro (đạm/tinh bột/béo)
   */
  async getNutritionSummary(ingredientNames: string[]): Promise<{
    totalCalories: number;
    protein: number;   // gram đạm
    carbs: number;     // gram tinh bột
    fat: number;       // gram chất béo
    topIngredients: string[];  // Nguyên liệu giàu dinh dưỡng nhất
    highlights: string[];      // Nhận xét nhanh (ví dụ: 'Giàu protein', 'Thiếu rau xanh')
  }> {
    if (ingredientNames.length === 0) {
      return { totalCalories: 0, protein: 0, carbs: 0, fat: 0, topIngredients: [], highlights: ['Tủ lạnh đang trống'] };
    }

    const cacheKey = `recipe:nutrition:${crypto.createHash('md5').update(ingredientNames.sort().join(',')).digest('hex').slice(0, 12)}`;

    const cached = await this.redis.get<any>(cacheKey);
    if (cached) {
      this.logger.debug(`💾 [RecipeTools] Cache HIT: ${cacheKey}`);
      return cached;
    }

    // Lấy thông tin dinh dưỡng của các nguyên liệu từ DB
    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        name: { in: ingredientNames },
        deletedAt: null,
      },
      select: {
        name: true,
        caloriesPer100g: true,  // Chỉ có trường này trong schema
      },
    });

    // Tính tổng dinh dưỡng (giả sử 100g mỗi loại để có tương đối)
    let totalCalories = 0;
    const topIngredients: string[] = [];

    for (const ing of ingredients) {
      totalCalories += ing.caloriesPer100g ?? 0;
      if ((ing.caloriesPer100g ?? 0) > 100) topIngredients.push(ing.name);
    }

    // Phân tích và đưa ra nhận xét dựa trên calo
    const highlights: string[] = [];
    if (totalCalories < 1000) highlights.push('Năng lượng trong tủ khá thấp — nên đi chợ thêm');
    if (ingredients.length < 5) highlights.push('Tủ lạnh ít đồ — nên đi chợ thêm');
    if (topIngredients.length > 0) highlights.push(`Giàu năng lượng: ${topIngredients.slice(0, 3).join(', ')}`);
    if (highlights.length === 0) highlights.push('Tủ lạnh đang ở mức bình thường');

    const result = {
      totalCalories: Math.round(totalCalories),
      // Mạc định macro — DB chưa có phân tích chi tiết
      protein: 0,
      carbs: 0,
      fat: 0,
      topIngredients: topIngredients.slice(0, 5),
      highlights,
    };

    await this.redis.set(cacheKey, result, RECIPE_CACHE_TTL);
    return result;
  }

  // ─────────────────────────────────────────────────────────
  // Tool: create_recipe
  // ─────────────────────────────────────────────────────────

  /**
   * Tạo công thức mới do AI tự nghĩ khi kho công thức không đủ đa dạng.
   * Công thức được lưu với isAiGenerated=true, status='published' để dùng ngay.
   *
   * Gọi khi: ChefAgent trả về slot có recipeId=null (AI muốn tự nghĩ món mới).
   *
   * @param params.ingredients - Danh sách nguyên liệu (AI dùng tên, hệ thống resolve sang ID)
   * @param params.steps       - Các bước nấu theo thứ tự
   */
  async createRecipe(params: {
    title: string;
    description: string;
    mealType: 'breakfast' | 'lunch' | 'dinner';
    cookingTime: number;
    servings: number;
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedCost: number;
    ingredients?: Array<{
      ingredientName: string;
      quantity: number;
      unit: string;
      isOptional?: boolean;
      note?: string;
    }>;
    steps?: Array<{
      stepNumber: number;
      instruction: string;
      durationMinutes?: number;
    }>;
  }): Promise<{ recipeId: string }> {
    // 1. Resolve ingredientName → ingredientId (skip nếu không tìm thấy trong DB)
    const validIngredients: Array<{
      ingredientId: number;
      quantity: number;
      unit: string;
      isOptional: boolean;
      note: string | null;
    }> = [];

    for (const ing of params.ingredients ?? []) {
      const found = await this.prisma.ingredient.findFirst({
        where: { name: { contains: ing.ingredientName }, deletedAt: null },
        select: { id: true },
      });
      if (found) {
        validIngredients.push({
          ingredientId: found.id,
          quantity: ing.quantity,
          unit: ing.unit,
          isOptional: ing.isOptional ?? false,
          note: ing.note ?? null,
        });
      } else {
        this.logger.warn(
          `[RecipeTools] Không tìm thấy nguyên liệu: "${ing.ingredientName}" — bỏ qua`,
        );
      }
    }

    // 2. Tạo Recipe + Steps + Ingredients trong 1 nested create
    const recipe = await this.prisma.recipe.create({
      data: {
        id: uuid(),
        title: params.title,
        description: params.description,
        mealType: params.mealType as any,
        cookTimeMinutes: params.cookingTime,
        servings: params.servings,
        difficultyLevel: params.difficulty as any,
        estimatedCost: params.estimatedCost,
        isAiGenerated: true,
        status: 'published' as any,
        ...(params.steps?.length
          ? {
              steps: {
                create: params.steps.map((s) => ({
                  stepNumber: s.stepNumber,
                  instruction: s.instruction,
                  durationMinutes: s.durationMinutes ?? null,
                })),
              },
            }
          : {}),
        ...(validIngredients.length
          ? {
              ingredients: {
                create: validIngredients.map((ing) => ({
                  ingredientId: ing.ingredientId,
                  quantity: ing.quantity,
                  unit: ing.unit,
                  isOptional: ing.isOptional,
                  note: ing.note,
                })),
              },
            }
          : {}),
      },
    });

    this.logger.log(
      `🤖 [RecipeTools] Tạo AI recipe: "${recipe.title}" | ${validIngredients.length} ingredients | ${params.steps?.length ?? 0} steps (id=${recipe.id})`,
    );

    return { recipeId: recipe.id };
  }
}
