/**
 * FridgeTools — Nhóm công cụ AI cho dữ liệu tủ lạnh
 *
 * Bao gồm 4 tools:
 * - get_fridge_items:          Lấy toàn bộ nguyên liệu đang có
 * - get_expiring_items:        Lấy nguyên liệu sắp hết hạn
 * - get_available_ingredients: Lấy tên nguyên liệu (dùng để search recipe)
 * - get_fridge_stats:          Thống kê tổng quan tủ lạnh
 *
 * Tất cả query đều filter theo userId để đảm bảo mỗi user chỉ thấy tủ lạnh của mình.
 * Luôn bỏ qua các item đã bị xóa (deletedAt != null) hoặc đã tiêu thụ (consumedAt != null).
 *
 * [Cấp độ 2] Toàn bộ kết quả được cache trong Redis (TTL 5 phút).
 * Cache key: fridge:{userId}:{toolName}
 * Khi user thêm/xóa/cập nhật đồ: gọi invalidateFridgeCache(userId) để xóa cache.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';

// TTL cache cho dữ liệu tủ lạnh (5 phút = 300 giây)
const FRIDGE_CACHE_TTL = 300;

@Injectable()
export class FridgeTools {
  private readonly logger = new Logger(FridgeTools.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // Tool: get_fridge_items
  // ─────────────────────────────────────────────────────────

  /**
   * Lấy danh sách nguyên liệu đang có trong tủ lạnh.
   * Kết quả được sắp xếp theo ngày hết hạn gần nhất trước (để AI ưu tiên dùng đồ cũ).
   * [Cấp độ 2] Kết quả được cache Redis TTL 5 phút.
   *
   * @param userId   - ID người dùng (chủ tủ lạnh)
   * @param location - Lọc theo vị trí: 'freezer' | 'fridge' | 'pantry' (bỏ trống = tất cả)
   */
  async getFridgeItems(userId: string, location?: string): Promise<any[]> {
    // Tạo cache key theo userId + location để tránh trùng
    const cacheKey = `fridge:${userId}:items:${location ?? 'all'}`;

    // Thử lấy từ cache trước
    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) {
      this.logger.debug(`💾 [FridgeTools] Cache HIT: ${cacheKey}`);
      return cached;
    }

    const where: any = {
      userId,
      deletedAt: null,
      consumedAt: null, // Chỉ lấy đồ chưa dùng hết
    };

    // Nếu AI yêu cầu lọc theo vị trí cụ thể
    if (location) where.storageLocation = location;

    const items = await this.prisma.fridgeItem.findMany({
      where,
      include: { ingredient: true }, // Join để lấy tên nguyên liệu
      orderBy: { expiresAt: 'asc' }, // Đồ hết hạn sớm nhất lên đầu
    });

    // Chuyển đổi sang định dạng đơn giản cho AI xử lý
    const result = items.map((item) => ({
      id: item.id,
      name: item.ingredient.name,
      quantity: item.quantity,
      unit: item.unit,
      location: item.storageLocation,
      expiresAt: item.expiresAt?.toISOString().split('T')[0] ?? null, // Chỉ lấy phần ngày YYYY-MM-DD
      // Tính số ngày còn lại đến hết hạn (âm = đã hết hạn)
      daysUntilExpiry: item.expiresAt
        ? Math.ceil((item.expiresAt.getTime() - Date.now()) / 86400000)
        : null,
    }));

    // Lưu cache
    await this.redis.set(cacheKey, result, FRIDGE_CACHE_TTL);
    this.logger.debug(`💾 [FridgeTools] Cache SET: ${cacheKey} (${result.length} items)`);

    return result;
  }

  // ─────────────────────────────────────────────────────────
  // Tool: get_expiring_items
  // ─────────────────────────────────────────────────────────

  /**
   * Lấy danh sách nguyên liệu sắp hết hạn trong N ngày tới.
   * AI dùng tool này để gợi ý món ăn sử dụng đồ sắp hết trước khi bị lãng phí.
   * [Cấp độ 2] Kết quả được cache Redis TTL 5 phút.
   *
   * @param userId     - ID người dùng
   * @param withinDays - Số ngày để xác định "sắp hết hạn" (thường là 3 ngày)
   */
  async getExpiringItems(userId: string, withinDays: number): Promise<any[]> {
    const cacheKey = `fridge:${userId}:expiring:${withinDays}`;

    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) {
      this.logger.debug(`💾 [FridgeTools] Cache HIT: ${cacheKey}`);
      return cached;
    }

    // Tính ngày deadline: từ bây giờ đến withinDays ngày nữa
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + withinDays);

    const items = await this.prisma.fridgeItem.findMany({
      where: {
        userId,
        deletedAt: null,
        consumedAt: null,
        expiresAt: {
          not: null,
          lte: deadline, // Hết hạn trước deadline
        },
      },
      include: { ingredient: true },
      orderBy: { expiresAt: 'asc' }, // Hết hạn sớm nhất lên đầu
    });

    const result = items.map((item) => ({
      id: item.id,
      name: item.ingredient.name,
      quantity: item.quantity,
      unit: item.unit,
      expiresAt: item.expiresAt?.toISOString().split('T')[0] ?? null,
      daysUntilExpiry: item.expiresAt
        ? Math.ceil((item.expiresAt.getTime() - Date.now()) / 86400000)
        : null,
    }));

    await this.redis.set(cacheKey, result, FRIDGE_CACHE_TTL);

    return result;
  }

  // ─────────────────────────────────────────────────────────
  // Tool: get_available_ingredients
  // ─────────────────────────────────────────────────────────

  /**
   * Lấy danh sách tên nguyên liệu đang có trong tủ (không trùng lặp).
   * AI dùng danh sách này để tìm kiếm công thức phù hợp qua tool search_recipes.
   * [Cấp độ 2] Kết quả được cache Redis TTL 5 phút.
   *
   * @param userId - ID người dùng
   * @returns Mảng tên nguyên liệu không trùng lặp
   */
  async getAvailableIngredients(userId: string): Promise<string[]> {
    const cacheKey = `fridge:${userId}:ingredients`;

    const cached = await this.redis.get<string[]>(cacheKey);
    if (cached) {
      this.logger.debug(`💾 [FridgeTools] Cache HIT: ${cacheKey}`);
      return cached;
    }

    const items = await this.prisma.fridgeItem.findMany({
      where: { userId, deletedAt: null, consumedAt: null },
      include: { ingredient: true },
    });

    // Dùng Set để loại bỏ trùng lặp (1 nguyên liệu có thể có nhiều item)
    const result = [...new Set(items.map((item) => item.ingredient.name))];

    await this.redis.set(cacheKey, result, FRIDGE_CACHE_TTL);

    return result;
  }

  // ─────────────────────────────────────────────────────────
  // Tool: get_fridge_stats
  // ─────────────────────────────────────────────────────────

  /**
   * Lấy thống kê tổng quan về tủ lạnh.
   * AI dùng để đưa ra nhận xét về tình trạng tủ lạnh khi người dùng hỏi.
   * [Cấp độ 2] Kết quả được cache Redis TTL 5 phút.
   *
   * @param userId - ID người dùng
   * @returns Tổng số items, số đồ sắp hết hạn trong 3 ngày, tỷ lệ lãng phí (%)
   */
  async getFridgeStats(userId: string): Promise<{
    totalItems: number;
    expiringSoon: number;
    wastePercent: number;
  }> {
    const cacheKey = `fridge:${userId}:stats`;

    const cached = await this.redis.get<{ totalItems: number; expiringSoon: number; wastePercent: number }>(cacheKey);
    if (cached) {
      this.logger.debug(`💾 [FridgeTools] Cache HIT: ${cacheKey}`);
      return cached;
    }

    const now = new Date();
    const soonDeadline = new Date(now);
    soonDeadline.setDate(now.getDate() + 3); // "Sắp hết hạn" = trong 3 ngày tới

    // Chạy song song 4 query để tối ưu hiệu năng
    const [total, expiringSoon, expiredCount, totalWithExpiry] = await Promise.all([
      // Tổng số items hiện có trong tủ
      this.prisma.fridgeItem.count({
        where: { userId, deletedAt: null, consumedAt: null },
      }),
      // Items sắp hết hạn trong 3 ngày tới (chưa hết hạn)
      this.prisma.fridgeItem.count({
        where: {
          userId, deletedAt: null, consumedAt: null,
          expiresAt: { gte: now, lte: soonDeadline },
        },
      }),
      // Items đã hết hạn mà vẫn còn trong tủ (lãng phí)
      this.prisma.fridgeItem.count({
        where: { userId, deletedAt: null, consumedAt: null, expiresAt: { lt: now } },
      }),
      // Tổng items có ngày hết hạn (để tính tỷ lệ)
      this.prisma.fridgeItem.count({
        where: { userId, deletedAt: null, expiresAt: { not: null } },
      }),
    ]);

    // Tỷ lệ lãng phí = số items đã hết hạn / tổng items có ngày hết hạn * 100%
    const wastePercent = totalWithExpiry > 0
      ? Math.round((expiredCount / totalWithExpiry) * 1000) / 10 // Làm tròn 1 chữ số thập phân
      : 0;

    const result = { totalItems: total, expiringSoon, wastePercent };
    await this.redis.set(cacheKey, result, FRIDGE_CACHE_TTL);

    return result;
  }

  // ─────────────────────────────────────────────────────────
  // Tool: suggest_from_expiring
  // ─────────────────────────────────────────────────────────

  /**
   * Gợi ý công thức từ nguyên liệu sắp hết hạn.
   * Dùng trong ChefAgent để ưu tiên nguyên liệu cần dùng trước.
   *
   * @param userId - ID người dùng
   * @returns Danh sách công thức có thể nấu từ đồ sắp hết hạn
   */
  async suggestFromExpiring(userId: string): Promise<any[]> {
    const cacheKey = `fridge:${userId}:suggest_expiring`;

    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) return cached;

    // Lấy nguyên liệu sắp hết hạn trong 5 ngày
    const expiringItems = await this.getExpiringItems(userId, 5);
    if (expiringItems.length === 0) return [];

    // Tìm công thức có dùng ít nhất 1 nguyên liệu sắp hết hạn
    const ingredientNames = expiringItems.map((i) => i.name);
    const recipes = await this.prisma.recipe.findMany({
      where: {
        deletedAt: null,
        ingredients: {
          some: {
            ingredient: { name: { in: ingredientNames } },
          },
        },
      },
      select: { id: true, title: true, cookTimeMinutes: true, difficultyLevel: true },
      take: 10, // Giới hạn 10 công thức
    });

    await this.redis.set(cacheKey, recipes, FRIDGE_CACHE_TTL);
    return recipes;
  }

  // ─────────────────────────────────────────────────────────
  // Invalidate toàn bộ cache tủ lạnh của user
  // Gọi khi user thêm / xóa / cập nhật đồ trong tủ
  // ─────────────────────────────────────────────────────────
  async invalidateFridgeCache(userId: string): Promise<void> {
    const deletedCount = await this.redis.invalidatePattern(`fridge:${userId}:*`);
    this.logger.log(`🗑️ [FridgeTools] Đã xóa ${deletedCount} cache key của userId=${userId}`);
  }
}
