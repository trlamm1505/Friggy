/**
 * MealPlanningService — Business logic cho Meal Planning Module
 *
 * Xử lý các nghiệp vụ:
 * 1. Publish job lên RabbitMQ (generate plan) → trả jobId ngay, không chờ AI
 * 2. CRUD kế hoạch tuần, daily plan, meal slot
 * 3. CRUD shopping list và danh sách mua
 *
 * Điểm mấu chốt:
 *   POST /plans/generate → KHÔNG chạy AI trực tiếp
 *   → Publish job lên RabbitMQ → ai-service consumer xử lý background
 *   → FE subscribe SSE endpoint để nhận tiến độ
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { MEAL_PLAN_ROUTING_KEY, AI_SLOT_REGENERATE_ROUTING_KEY, AI_EXPIRING_MEAL_ROUTING_KEY } from 'src/common/constants/app.constant';
import { RabbitMqPublisherService } from 'src/modules-system/rabbit-mq/rabbit-mq-publisher.service';
import { normalizeToBaseUnit, canCompare } from 'src/common/utils/unit.util';
import { estimateExpiryDate } from 'src/common/utils/expiry-estimator.util';
import { SocketService } from 'src/modules-system/socket/socket.service';
import { RedisService } from 'src/modules-system/redis/redis.service';

import type {
  GenerateMealPlanDto,
  UpdateMealPlanDto,
  UpdateMealSlotDto,
  CreateShoppingListDto,
  AddShoppingListItemDto,
  UpdateShoppingListItemDto,
  RegenerateSlotDto,
  GenerateFromExpiringDto,
} from './dto/meal-planning.dto';

@Injectable()
export class MealPlanningService {
  private readonly logger = new Logger(MealPlanningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMq: RabbitMqPublisherService,
    @Optional() private readonly socketService: SocketService,
    @Optional() private readonly redisService: RedisService,
  ) { }

  // ─────────────────────────────────────────────────────────
  // POST /plans/generate — Đẩy job AI vào queue, trả jobId ngay
  // ─────────────────────────────────────────────────────────

  /**
   * Nhận yêu cầu tạo thực đơn → push job vào BullMQ queue → trả về jobId ngay lập tức.
   * AI sẽ xử lý background, FE dùng jobId để subscribe SSE nhận tiến độ.
   */
  async generatePlan(userId: string, dto: GenerateMealPlanDto) {
    const jobId = uuidv4();

    this.logger.log(
      `📋 [MealPlanning] Publish job tạo thực đơn lên RabbitMQ: jobId=${jobId} | userId=${userId}`,
    );

    // Publish message lên RabbitMQ → AI Service sẽ consume và xử lý
    await this.rabbitMq.publish(MEAL_PLAN_ROUTING_KEY, {
      jobId,
      userId,
      weekStartDate: dto.weekStartDate,
      budget: dto.budget,
    });

    return {
      jobId,
      status: 'queued',
      streamUrl: `/meal-planning/plans/generate/${jobId}/stream`,
      message: 'Yêu cầu tạo thực đơn đã được gửi đến AI Service. Kết nối vào streamUrl để nhận tiến độ.',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: Enrich shopping list items với supplier suggestions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Với danh sách ingredientId (hệ thống), tìm tất cả supplier_ingredients
   * đang active (approved + supplier còn hạn gói) có linkedIngredientId khớp.
   * Trả về Map<ingredientId, SupplierSuggestion[]>
   */
  private async enrichWithSuppliers(ingredientIds: number[]): Promise<
    Map<number, { supplierIngredientId: string; name: string; companyName: string; price: number | null; imagePath: string | null }[]>
  > {
    if (!ingredientIds.length) return new Map();

    const now = new Date();
    const rows = await this.prisma.supplierIngredient.findMany({
      where: {
        linkedIngredientId: { in: ingredientIds },
        status: 'approved',
        deletedAt: null,
        profile: {
          deletedAt: null,
          subscription: {
            status: 'active',
            endDate: { gt: now },
          },
        },
      },
      select: {
        id: true,
        name: true,
        linkedIngredientId: true,
        averagePricePerUnit: true,
        imagePath: true,
        profile: { select: { companyName: true } },
      },
    });

    const result = new Map<number, { supplierIngredientId: string; name: string; companyName: string; price: number | null; imagePath: string | null }[]>();
    for (const row of rows) {
      if (!row.linkedIngredientId) continue;
      const list = result.get(row.linkedIngredientId) ?? [];
      list.push({
        supplierIngredientId: row.id,
        name: row.name,
        companyName: row.profile.companyName,
        price: row.averagePricePerUnit ?? null,
        imagePath: row.imagePath ?? null,
      });
      result.set(row.linkedIngredientId, list);
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────
  // GET /plans — Danh sách kế hoạch tuần
  // ─────────────────────────────────────────────────────────
  async getPlans(userId: string) {
    const familyGroupId = await this.resolveFamilyGroupId(userId);

    const where: any = familyGroupId
      ? { familyGroupId, deletedAt: null }
      : { userId, familyGroupId: null, deletedAt: null };

    const plans = await this.prisma.weeklyPlan.findMany({
      where,
      orderBy: { weekStartDate: 'desc' },
      select: {
        id: true,
        userId: true,
        familyGroupId: true,
        weekStartDate: true,
        totalBudget: true,
        actualCost: true,
        status: true,
        generatedByAi: true,
        createdAt: true,
      },
    });

    return plans.map((p) => ({
      ...p,
      weekStartDate: p.weekStartDate.toISOString().split('T')[0],
      createdAt: p.createdAt.toISOString(),
    }));
  }

  // ─────────────────────────────────────────────────────────
  // GET /plans/:id - Chi tiet ke hoach
  async getPlanDetail(userId: string, planId: string) {
    const familyGroupId = await this.resolveFamilyGroupId(userId);
    const where: any = familyGroupId
      ? { id: planId, familyGroupId, deletedAt: null }
      : { id: planId, userId, deletedAt: null };

    const plan = await this.prisma.weeklyPlan.findFirst({
      where,
      include: {
        dailyPlans: {
          orderBy: { dayOfWeek: 'asc' },
          include: {
            mealSlots: {
              orderBy: { mealType: 'asc' },
            },
          },
        },
      },
    });

    if (!plan) throw new NotFoundException('Khong tim thay ke hoach');
    return plan;
  }

  // PATCH /plans/:id — Cập nhật trạng thái kế hoạch
  // ─────────────────────────────────────────────────────────
  async updatePlan(userId: string, planId: string, dto: UpdateMealPlanDto) {
    const plan = await this.prisma.weeklyPlan.findFirst({
      where: { id: planId, userId, deletedAt: null },
    });

    if (!plan) throw new NotFoundException('Không tìm thấy kế hoạch');

    return this.prisma.weeklyPlan.update({
      where: { id: planId },
      data: { status: dto.status as any },
      select: { id: true, status: true, updatedAt: true },
    });
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /plans/:id — Xóa mềm kế hoạch
  // ─────────────────────────────────────────────────────────
  async deletePlan(userId: string, planId: string) {
    const plan = await this.prisma.weeklyPlan.findFirst({
      where: { id: planId, userId, deletedAt: null },
    });

    if (!plan) throw new NotFoundException('Không tìm thấy kế hoạch');

    await this.prisma.weeklyPlan.update({
      where: { id: planId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`🗑️ [MealPlanning] Đã xóa kế hoạch: planId=${planId} | userId=${userId}`);
    return { message: 'Đã xóa kế hoạch' };
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /slots/:id — Cập nhật meal slot (đổi món / tick đã nấu)
  // ─────────────────────────────────────────────────────────
  async updateSlot(userId: string, slotId: string, dto: UpdateMealSlotDto) {
    // Verify slot thuộc về user qua join
    const slot = await this.prisma.mealSlot.findFirst({
      where: {
        id: slotId,
        deletedAt: null,
        dailyPlan: {
          weeklyPlan: { userId, deletedAt: null },
        },
      },
    });

    if (!slot) throw new NotFoundException('Không tìm thấy meal slot');

    const data: any = {};
    if (dto.recipeId !== undefined) data.recipeId = dto.recipeId;
    if (dto.servings !== undefined) data.servings = dto.servings;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.completed !== undefined) {
      data.completedAt = dto.completed ? new Date() : null;
    }

    const updated = await this.prisma.mealSlot.update({
      where: { id: slotId },
      data,
      select: {
        id: true,
        mealType: true,
        recipeId: true,
        servings: true,
        note: true,
        completedAt: true,
      },
    });

    // Idempotent guard: chỉ trừ nguyên liệu lần đầu tiên đánh dấu hoàn thành
    // slot.completedAt === null = chưa nấu, dto.completed === true = mới tick xong
    const targetRecipeId = dto.recipeId !== undefined ? dto.recipeId : slot.recipeId;
    const targetServings = dto.servings !== undefined ? dto.servings : slot.servings;

    // Nguyên liệu đã trừ — trả về cho FE để hiển thị "Đã trừ X khỏi tủ lạnh".
    let consumedIngredients: Array<{ name: string; quantity: number; unit: string }> = [];

    if (dto.completed === true && !slot.completedAt && targetRecipeId) {
      // Resolve familyGroupId để truy vấn tủ lạnh đúng scope
      const familyGroupId = await this.resolveFamilyGroupId(userId);
      consumedIngredients = await this.consumeIngredientsForSlot(
        userId,
        familyGroupId,
        slotId,
        targetRecipeId,
        targetServings,
      );

      // Broadcast Socket.IO event nếu thuộc gia đình
      if (familyGroupId && this.socketService) {
        const userProfile = await this.prisma.userProfile.findUnique({
          where: { userId },
          select: { displayName: true },
        });
        const recipe = await this.prisma.recipe.findUnique({
          where: { id: targetRecipeId },
          select: { title: true },
        });
        this.socketService.emitMealSlotCompleted(
          familyGroupId,
          slotId,
          recipe?.title ?? 'Bữa ăn',
          consumedIngredients,
          userProfile?.displayName ?? 'Thành viên',
        );
      }
    }

    // ⚠️ Trả kèm `consumedIngredients` để FE hiển thị cho user biết đã trừ
    //    bao nhiêu nguyên liệu khỏi tủ lạnh (nút "Bắt đầu nấu").
    //    Trước đây BE chỉ trả `updated` -> FE không có gì để báo.
    return { ...updated, consumedIngredients };
  }

  // ─────────────────────────────────────────────────────────
  // GET /shopping-lists — Danh sách shopping list
  // ─────────────────────────────────────────────────────────
  async getShoppingLists(userId: string) {
    const lists = await this.prisma.shoppingList.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          where: { deletedAt: null },
          include: { ingredient: { select: { id: true, name: true } } },
        },
      },
    });

    // Collect tất cả ingredientId để lookup supplier một lần duy nhất
    const allIngredientIds = [...new Set(lists.flatMap((l) => l.items.map((i) => i.ingredientId)))];
    const supplierMap = await this.enrichWithSuppliers(allIngredientIds);

    return lists.map((list) => ({
      id: list.id,
      title: list.title,
      status: list.status,
      totalEstimatedCost: list.totalEstimatedCost,
      weeklyPlanId: list.weeklyPlanId,
      createdAt: list.createdAt.toISOString(),
      items: list.items.map((item) => ({
        id: item.id,
        ingredientId: item.ingredientId,
        ingredientName: item.ingredient.name,
        quantity: item.quantity,
        unit: item.unit,
        estimatedPrice: item.estimatedPrice,
        isPurchased: item.isPurchased,
        purchasedAt: item.purchasedAt?.toISOString() ?? null,
        supplierSuggestions: supplierMap.get(item.ingredientId) ?? [],
      })),
    }));
  }

  // ─────────────────────────────────────────────────────────
  // POST /shopping-lists — Tạo shopping list từ kế hoạch tuần
  // ─────────────────────────────────────────────────────────
  async createShoppingList(userId: string, dto: CreateShoppingListDto) {
    // Verify plan thuộc về user
    const plan = await this.prisma.weeklyPlan.findFirst({
      where: { id: dto.weeklyPlanId, userId, deletedAt: null },
      include: {
        dailyPlans: {
          include: {
            mealSlots: {
              where: { deletedAt: null, recipeId: { not: null } },
              include: {
                recipe: {
                  include: {
                    ingredients: {
                      include: {
                        ingredient: { select: { name: true, averagePricePerUnit: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!plan) throw new NotFoundException('Không tìm thấy kế hoạch');

    // Tổng hợp nguyên liệu cần mua từ tất cả công thức trong kế hoạch
    const ingredientMap = new Map<number, { quantity: number; unit: string; price: number | null }>();

    for (const daily of plan.dailyPlans) {
      for (const slot of daily.mealSlots) {
        if (!slot.recipe) continue;
        for (const ri of slot.recipe.ingredients) {
          const existing = ingredientMap.get(ri.ingredientId);
          const qty = (ri.quantity ?? 0) * (slot.servings / (slot.recipe.servings ?? 1));
          if (existing) {
            existing.quantity += qty;
          } else {
            ingredientMap.set(ri.ingredientId, {
              quantity: qty,
              unit: ri.unit ?? 'g',
              price: ri.ingredient.averagePricePerUnit ?? null,
            });
          }
        }
      }
    }

    // Smart filter: chỉ giữ nguyên liệu thực sự thiếu (không đủ trong tủ lạnh)
    const fridgeMap = await this.buildFridgeMap(userId);
    const filteredMap = new Map<number, { quantity: number; unit: string; price: number | null }>();

    for (const [ingredientId, needed] of ingredientMap) {
      const { quantity: neededNorm, baseUnit: neededUnit } = normalizeToBaseUnit(needed.quantity, needed.unit);
      const inFridge = fridgeMap.get(ingredientId);

      let missingNorm = neededNorm;
      if (inFridge && canCompare(inFridge.baseUnit, neededUnit)) {
        missingNorm = Math.max(0, neededNorm - inFridge.quantity);
      }

      if (missingNorm > 0) {
        const factor = normalizeToBaseUnit(1, needed.unit).quantity || 1;
        filteredMap.set(ingredientId, {
          quantity: Math.round((missingNorm / factor) * 10) / 10,
          unit: needed.unit,
          price: needed.price,
        });
      }
    }

    const isSmartFiltered = filteredMap.size < ingredientMap.size;
    const weekNum = Math.ceil((plan.weekStartDate.getDate()) / 7);
    const title = dto.title ?? `Danh sách mua tuần ${weekNum}`;

    // Tạo shopping list với chỉ các nguyên liệu còn thiếu
    const shoppingList = await this.prisma.shoppingList.create({
      data: {
        userId,
        weeklyPlanId: dto.weeklyPlanId,
        title,
        status: 'draft',
        totalEstimatedCost: Array.from(filteredMap.entries()).reduce((sum, [_id, val]) => {
          return sum + Math.round((val.price ?? 0) * val.quantity);
        }, 0),
        items: {
          create: Array.from(filteredMap.entries()).map(([ingredientId, val]) => ({
            ingredientId,
            quantity: Math.round(val.quantity * 10) / 10,
            unit: val.unit,
            estimatedPrice: val.price ? Math.round(val.price * val.quantity) : null,
          })),
        },
      },
      include: {
        items: {
          include: { ingredient: { select: { id: true, name: true } } },
        },
      },
    });

    this.logger.log(
      `🛒 [MealPlanning] Tạo smart shopping list: id=${shoppingList.id} | ${shoppingList.items.length} ng.liệu (filter: ${isSmartFiltered})`,
    );

    // Enrich supplier suggestions
    const createdIngredientIds = shoppingList.items.map((i) => i.ingredientId);
    const supplierMap = await this.enrichWithSuppliers(createdIngredientIds);

    return {
      id: shoppingList.id,
      title: shoppingList.title,
      status: shoppingList.status,
      totalEstimatedCost: shoppingList.totalEstimatedCost,
      weeklyPlanId: shoppingList.weeklyPlanId,
      createdAt: shoppingList.createdAt.toISOString(),
      isSmartFiltered,
      items: shoppingList.items.map((item) => ({
        id: item.id,
        ingredientId: item.ingredientId,
        ingredientName: item.ingredient.name,
        quantity: item.quantity,
        unit: item.unit,
        estimatedPrice: item.estimatedPrice,
        isPurchased: item.isPurchased,
        purchasedAt: null,
        supplierSuggestions: supplierMap.get(item.ingredientId) ?? [],
      })),
    };
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /shopping-lists/:listId/items/:itemId — Tick đã mua
  // ─────────────────────────────────────────────────────────
  async toggleShoppingItem(userId: string, listId: string, itemId: number) {
    // Verify list thuộc về user
    const list = await this.prisma.shoppingList.findFirst({
      where: { id: listId, userId, deletedAt: null },
    });

    if (!list) throw new NotFoundException('Không tìm thấy danh sách mua');

    const item = await this.prisma.shoppingListItem.findFirst({
      where: { id: itemId, shoppingListId: listId, deletedAt: null },
      include: {
        ingredient: {
          include: { category: true },
        },
      },
    });

    if (!item) throw new NotFoundException('Không tìm thấy mặt hàng');

    const newPurchased = !item.isPurchased;

    // Khi tick ĐÃ MUA → tự động thêm vào tủ lạnh (kèm tính HSD theo category + location)
    // Shopping list luôn add vào ngăn mát (fridge) theo mặc định
    if (newPurchased) {
      const expiresAt = estimateExpiryDate(
        item.ingredient?.category,
        item.ingredient?.name ?? '',
        'fridge',
      );

      await this.prisma.fridgeItem.create({
        data: {
          id: uuidv4(),
          userId,
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unit: item.unit,
          addedBy: 'manual',
          storageLocation: 'fridge',
          expiresAt,
        },
      });
      this.logger.log(
        `🛒→🧤 [MealPlanning] Auto-add fridge: ingredientId=${item.ingredientId} qty=${item.quantity}${item.unit} expiresAt=${expiresAt.toISOString().split('T')[0]}`,
      );
    }

    return this.prisma.shoppingListItem.update({
      where: { id: itemId },
      data: {
        isPurchased: newPurchased,
        purchasedAt: newPurchased ? new Date() : null,
      },
      select: { id: true, isPurchased: true, purchasedAt: true },
    });
  }

  // ─────────────────────────────────────────────────────────
  // POST /shopping-lists/:id/items — Thêm 1 mặt hàng vào danh sách mua
  // ─────────────────────────────────────────────────────────
  //
  // ⚠️ Trước đây BE KHÔNG có endpoint này -> nút "+ Thêm vào DS" ở màn công thức
  //    chỉ hiện toast giả, không lưu gì cả. Giờ đã có để RN gọi thật.
  async addShoppingListItem(userId: string, listId: string, dto: AddShoppingListItemDto) {
    const list = await this.prisma.shoppingList.findFirst({
      where: { id: listId, userId, deletedAt: null },
    });
    if (!list) throw new NotFoundException('Không tìm thấy danh sách mua');

    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id: dto.ingredientId, deletedAt: null },
    });
    if (!ingredient) throw new NotFoundException('Không tìm thấy nguyên liệu');

    // Nếu đã có mặt hàng cùng nguyên liệu trong list -> gộp lượng thay vì tạo dòng mới.
    const existing = await this.prisma.shoppingListItem.findFirst({
      where: { shoppingListId: listId, ingredientId: dto.ingredientId, deletedAt: null },
    });

    const quantity = dto.quantity ?? 1;
    const unit = dto.unit ?? ingredient.defaultUnit ?? 'g';

    if (existing) {
      const merged = await this.prisma.shoppingListItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity, unit },
        include: { ingredient: { select: { name: true } } },
      });
      return {
        id: merged.id,
        ingredientId: merged.ingredientId,
        ingredientName: merged.ingredient.name,
        quantity: merged.quantity,
        unit: merged.unit,
        estimatedPrice: merged.estimatedPrice,
        isPurchased: merged.isPurchased,
        purchasedAt: merged.purchasedAt?.toISOString() ?? null,
        merged: true,
      };
    }

    const created = await this.prisma.shoppingListItem.create({
      data: {
        shoppingListId: listId,
        ingredientId: dto.ingredientId,
        quantity,
        unit,
      },
      include: { ingredient: { select: { name: true } } },
    });

    this.logger.log(
      `🛒 [MealPlanning] Thêm mặt hàng: listId=${listId} | ingredientId=${dto.ingredientId} | ${quantity}${unit}`,
    );

    return {
      id: created.id,
      ingredientId: created.ingredientId,
      ingredientName: created.ingredient.name,
      quantity: created.quantity,
      unit: created.unit,
      estimatedPrice: created.estimatedPrice,
      isPurchased: created.isPurchased,
      purchasedAt: created.purchasedAt?.toISOString() ?? null,
      merged: false,
    };
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /shopping-lists/:listId/items/:itemId — Sửa lượng / trạng thái
  // ─────────────────────────────────────────────────────────
  async updateShoppingListItem(
    userId: string,
    listId: string,
    itemId: number,
    dto: UpdateShoppingListItemDto,
  ) {
    const list = await this.prisma.shoppingList.findFirst({
      where: { id: listId, userId, deletedAt: null },
    });
    if (!list) throw new NotFoundException('Không tìm thấy danh sách mua');

    const item = await this.prisma.shoppingListItem.findFirst({
      where: { id: itemId, shoppingListId: listId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Không tìm thấy mặt hàng');

    // `isPurchased` được xử lý qua `toggleShoppingItem` (tự thêm vào tủ lạnh).
    // Ở đây chỉ cho sửa lượng, và hỗ trợ set trạng thái nếu DTO có truyền.
    const data: any = {};
    if (dto.quantity !== undefined) data.quantity = dto.quantity;

    if (dto.isPurchased !== undefined && dto.isPurchased !== item.isPurchased) {
      data.isPurchased = dto.isPurchased;
      data.purchasedAt = dto.isPurchased ? new Date() : null;
    }

    if (Object.keys(data).length === 0) {
      return {
        id: item.id,
        quantity: item.quantity,
        unit: item.unit,
        isPurchased: item.isPurchased,
      };
    }

    const updated = await this.prisma.shoppingListItem.update({
      where: { id: itemId },
      data,
      include: { ingredient: { select: { name: true } } },
    });

    return {
      id: updated.id,
      ingredientId: updated.ingredientId,
      ingredientName: updated.ingredient.name,
      quantity: updated.quantity,
      unit: updated.unit,
      estimatedPrice: updated.estimatedPrice,
      isPurchased: updated.isPurchased,
      purchasedAt: updated.purchasedAt?.toISOString() ?? null,
    };
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /shopping-lists/:listId/items/:itemId — Xoá 1 mặt hàng
  // ─────────────────────────────────────────────────────────
  async removeShoppingListItem(userId: string, listId: string, itemId: number) {
    const list = await this.prisma.shoppingList.findFirst({
      where: { id: listId, userId, deletedAt: null },
    });
    if (!list) throw new NotFoundException('Không tìm thấy danh sách mua');

    const item = await this.prisma.shoppingListItem.findFirst({
      where: { id: itemId, shoppingListId: listId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Không tìm thấy mặt hàng');

    await this.prisma.shoppingListItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`🛒 [MealPlanning] Xoá mặt hàng: listId=${listId} | itemId=${itemId}`);

    return { id: itemId, deleted: true };
  }

  // ─────────────────────────────────────────────────────────
  // GET /shopping-lists/active — Lấy (hoặc tạo) list đang dùng
  // ─────────────────────────────────────────────────────────
  //
  // ⚠️ Nút "+ Thêm vào DS" ở màn công thức cần 1 list để thêm vào, nhưng user
  //    có thể chưa tạo list nào. Endpoint này trả list active hiện có, nếu
  //    chưa có thì tạo 1 list rỗng (weeklyPlanId = null) để dùng làm "giỏ" mặc định.
  async getOrCreateActiveShoppingList(userId: string) {
    const existing = await this.prisma.shoppingList.findFirst({
      where: { userId, deletedAt: null, status: { in: ['draft', 'active'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          where: { deletedAt: null },
          include: { ingredient: { select: { name: true } } },
        },
      },
    });

    if (existing) {
      return {
        id: existing.id,
        title: existing.title,
        status: existing.status,
        totalEstimatedCost: existing.totalEstimatedCost,
        weeklyPlanId: existing.weeklyPlanId,
        createdAt: existing.createdAt.toISOString(),
        items: existing.items.map((item) => ({
          id: item.id,
          ingredientId: item.ingredientId,
          ingredientName: item.ingredient.name,
          quantity: item.quantity,
          unit: item.unit,
          estimatedPrice: item.estimatedPrice,
          isPurchased: item.isPurchased,
          purchasedAt: item.purchasedAt?.toISOString() ?? null,
        })),
      };
    }

    const created = await this.prisma.shoppingList.create({
      data: {
        id: uuidv4(),
        userId,
        title: 'Danh sách mua',
        status: 'active',
      },
    });

    this.logger.log(`🛒 [MealPlanning] Tạo list mua mặc định: id=${created.id}`);

    return {
      id: created.id,
      title: created.title,
      status: created.status,
      totalEstimatedCost: created.totalEstimatedCost,
      weeklyPlanId: created.weeklyPlanId,
      createdAt: created.createdAt.toISOString(),
      items: [],
    };
  }

  // ─────────────────────────────────────────────────────────
  // POST /meal-planning/slots/:id/missing-to-shopping-list
  // Thêm nguyên liệu CÒN THIẾU của 1 slot vào danh sách mua
  // ─────────────────────────────────────────────────────────
  //
  // ⚠️ Đây là endpoint cho nút "+ Thêm vào DS" ở màn chi tiết công thức:
  //    user bấm -> mọi nguyên liệu thiếu trong tủ lạnh được ghi vào list mua.
  async addSlotMissingToShoppingList(userId: string, slotId: string) {
    const slot = await this.prisma.mealSlot.findFirst({
      where: {
        id: slotId,
        deletedAt: null,
        dailyPlan: { weeklyPlan: { userId, deletedAt: null } },
      },
      include: {
        recipe: {
          include: {
            ingredients: {
              where: { deletedAt: null },
              include: { ingredient: { select: { id: true, name: true, defaultUnit: true } } },
            },
          },
        },
      },
    });
    if (!slot) throw new NotFoundException('Không tìm thấy meal slot');
    if (!slot.recipe) throw new NotFoundException('Slot chưa có công thức');

    const detail = await this.getSlotDetail(userId, slotId);
    const missing = detail.summary.missingItems ?? [];

    if (missing.length === 0) {
      return { listId: null, addedCount: 0, addedItems: [] };
    }

    const list = await this.getOrCreateActiveShoppingList(userId);

    const addedItems: any[] = [];
    for (const item of missing) {
      const ingredientId = item.ingredientId;
      if (!ingredientId) continue;

      const existing = await this.prisma.shoppingListItem.findFirst({
        where: { shoppingListId: list.id, ingredientId, deletedAt: null },
      });

      const quantity = item.missingQuantity && item.missingQuantity > 0
        ? Math.round(item.missingQuantity * 100) / 100
        : 1;
      // ⚠️ `missingQuantity` đã được CHUẨN HOÁ về base unit (g/ml/kg) trong
      //   `getSlotDetail` -> phải dùng `baseUnit` làm đơn vị.
      //   Dùng `originalUnit` (vd "kg") với số lượng đã chuẩn hoá sẽ ra
      //   "0.5 kg" trong khi thực tế là 500g -> user mua sai lượng.
      const unit = item.baseUnit ?? item.originalUnit ?? 'g';

      if (existing) {
        const merged = await this.prisma.shoppingListItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity, unit },
        });
        // Vẫn tính vào `addedItems` — món này ĐÃ được gộp lượng, tức là
        // giỏ mua vừa được cập nhật. Nếu không tính, `addedCount` sẽ báo
        // "0 món" dù thực tế đã thêm lượng -> user tưởng nút bị lỗi.
        addedItems.push({
          id: merged.id,
          ingredientId,
          name: item.name,
          quantity: merged.quantity,
          unit,
          merged: true,
        });
      } else {
        const created = await this.prisma.shoppingListItem.create({
          data: {
            shoppingListId: list.id,
            ingredientId,
            quantity,
            unit,
          },
        });
        addedItems.push({
          id: created.id,
          ingredientId,
          name: item.name,
          quantity,
          unit,
        });
      }
    }

    this.logger.log(
      `🛒 [MealPlanning] Thêm ng.liệu thiếu của slot ${slotId} vào list ${list.id}: ${addedItems.length} món`,
    );

    return { listId: list.id, addedCount: addedItems.length, addedItems };
  }

  // ─────────────────────────────────────────────────────────
  // Phase 10.1 — POST /slots/:id/regenerate
  // AI gợi ý top 3 món thay thế cho 1 slot
  // ─────────────────────────────────────────────────────────

  async regenerateSlot(userId: string, slotId: string, dto: RegenerateSlotDto) {
    // Validate slot ownership qua plan — dùng include thay vì select để có relation
    const slot = await this.prisma.mealSlot.findFirst({
      where: {
        id: slotId,
        deletedAt: null,
        dailyPlan: { weeklyPlan: { userId, deletedAt: null } },
      },
      include: {
        recipe: true,
        dailyPlan: {
          include: {
            weeklyPlan: {
              select: { totalBudget: true, actualCost: true },
            },
          },
        },
      },
    });
    if (!slot) throw new NotFoundException('Không tìm thấy meal slot');

    const jobId = uuidv4();
    const budgetRemaining =
      (slot.dailyPlan.weeklyPlan.totalBudget ?? 0) -
      (slot.dailyPlan.weeklyPlan.actualCost ?? 0);

    this.logger.log(
      `🔄 [MealPlanning] Regenerate slot: slotId=${slotId} | userId=${userId} | jobId=${jobId}`,
    );

    await this.rabbitMq.publish(AI_SLOT_REGENERATE_ROUTING_KEY, {
      jobId,
      userId,
      slotId,
      currentRecipeName: slot.recipe?.title ?? null,
      mealType: slot.mealType,
      dayOfWeek: slot.dailyPlan.dayOfWeek, // dayOfWeek thuộc DailyPlan
      budgetRemaining,
      reason: dto.reason ?? 'want_different',
    });

    return {
      jobId,
      status: 'queued',
      streamUrl: `/api/v1/meal-planning/slots/${slotId}/regenerate/${jobId}/stream`,
      message: 'AI đang tìm món thay thế phù hợp...',
    };
  }

  // ─────────────────────────────────────────────────────────
  // Phase 10.2 — POST /plans/generate-from-expiring
  // AI lập thực đơn N ngày từ nguyên liệu sắp hết hạn
  // ─────────────────────────────────────────────────────────

  async generateFromExpiring(userId: string, dto: GenerateFromExpiringDto) {
    const jobId = uuidv4();
    const withinDays = dto.withinDays ?? 3;
    const days = dto.days ?? 2;

    this.logger.log(
      `⏰ [MealPlanning] Generate from expiring: userId=${userId} | withinDays=${withinDays} | days=${days} | jobId=${jobId}`,
    );

    await this.rabbitMq.publish(AI_EXPIRING_MEAL_ROUTING_KEY, {
      jobId,
      userId,
      withinDays,
      days,
    });

    return {
      jobId,
      status: 'queued',
      streamUrl: `/api/v1/meal-planning/plans/generate-from-expiring/${jobId}/stream`,
      message: `AI đang phân tích ${withinDays} ngày tới lập thực đơn ${days} ngày...`,
    };
  }

  // ─────────────────────────────────────────────────────────
  // GET /slots/:id — Chi tiết slot: công thức + fridge analysis
  // ─────────────────────────────────────────────────────────
  async getSlotDetail(userId: string, slotId: string) {
    const HAVE_THRESHOLD = 0.9; // 90%: tủ có >= 90% lượng cần → coi là 'have'

    const slot = await this.prisma.mealSlot.findFirst({
      where: {
        id: slotId,
        deletedAt: null,
        dailyPlan: { weeklyPlan: { userId, deletedAt: null } },
      },
      include: {
        recipe: {
          include: {
            steps: { where: { deletedAt: null }, orderBy: { stepNumber: 'asc' } },
            ingredients: {
              where: { deletedAt: null },
              include: { ingredient: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    if (!slot) throw new NotFoundException('Không tìm thấy meal slot');

    const emptySummary = {
      totalIngredients: 0, haveCount: 0, partialCount: 0,
      missingCount: 0, fridgeReadyPercent: 0, missingItems: [] as any[],
    };

    if (!slot.recipe) {
      return {
        id: slot.id,
        mealType: slot.mealType,
        servings: slot.servings,
        completedAt: slot.completedAt?.toISOString() ?? null,
        recipe: null,
        summary: emptySummary,
      };
    }

    const fridgeMap = await this.buildFridgeMap(userId);
    const scale = slot.servings / (slot.recipe.servings || 1);
    const ingredients: any[] = [];

    for (const ri of slot.recipe.ingredients) {
      const scaledQty = ri.quantity * scale;
      const { quantity: neededNorm, baseUnit: neededUnit } = normalizeToBaseUnit(scaledQty, ri.unit);
      const inFridge = fridgeMap.get(ri.ingredientId);

      let fridgeStatus: 'have' | 'partial' | 'missing';
      let fridgeQuantity = 0;
      let missingQuantity = neededNorm;

      if (inFridge && canCompare(inFridge.baseUnit, neededUnit)) {
        fridgeQuantity = inFridge.quantity;
        if (fridgeQuantity >= neededNorm * HAVE_THRESHOLD) {
          fridgeStatus = 'have';
          missingQuantity = 0;
        } else if (fridgeQuantity > 0) {
          fridgeStatus = 'partial';
          missingQuantity = Math.max(0, neededNorm - fridgeQuantity);
        } else {
          fridgeStatus = 'missing';
        }
      } else {
        fridgeStatus = 'missing';
      }

      ingredients.push({
        ingredientId: ri.ingredientId,
        name: ri.ingredient.name,
        quantityNeeded: Math.round(neededNorm * 100) / 100,
        baseUnit: neededUnit,
        originalQuantity: Math.round(scaledQty * 100) / 100,
        originalUnit: ri.unit,
        isOptional: ri.isOptional,
        fridgeStatus,
        fridgeQuantity: Math.round(fridgeQuantity * 100) / 100,
        missingQuantity: Math.round(missingQuantity * 100) / 100,
      });
    }

    const haveCount = ingredients.filter((i) => i.fridgeStatus === 'have').length;
    const partialCount = ingredients.filter((i) => i.fridgeStatus === 'partial').length;
    const missingCount = ingredients.filter((i) => i.fridgeStatus === 'missing').length;
    const total = ingredients.length;

    return {
      id: slot.id,
      mealType: slot.mealType,
      servings: slot.servings,
      completedAt: slot.completedAt?.toISOString() ?? null,
      recipe: {
        id: slot.recipe.id,
        title: slot.recipe.title,
        description: slot.recipe.description,
        thumbnailPath: slot.recipe.thumbnailPath,
        cookTimeMinutes: slot.recipe.cookTimeMinutes,
        difficultyLevel: slot.recipe.difficultyLevel,
        estimatedCost: slot.recipe.estimatedCost,
        steps: slot.recipe.steps.map((s) => ({
          stepNumber: s.stepNumber,
          instruction: s.instruction,
          durationMinutes: s.durationMinutes,
          imagePath: s.imagePath,
        })),
        ingredients,
      },
      summary: {
        totalIngredients: total,
        haveCount,
        partialCount,
        missingCount,
        fridgeReadyPercent: total > 0 ? Math.round((haveCount / total) * 100) : 0,
        missingItems: ingredients.filter((i) => i.fridgeStatus !== 'have'),
      },
    };
  }

  // ─────────────────────────────────────────────────────────
  // DataScopeHelper — giống FridgeService
  // ─────────────────────────────────────────────────────────
  private async resolveFamilyGroupId(userId: string): Promise<string | null> {
    const ownedGroup = await this.prisma.familyGroup.findUnique({
      where: { ownerId: userId },
      select: { id: true, status: true },
    });
    if (ownedGroup?.status === 'active') return ownedGroup.id;

    const membership = await this.prisma.familyMember.findFirst({
      where: { userId, status: 'active' },
      select: { familyGroupId: true },
    });
    return membership?.familyGroupId ?? null;
  }


  // ─────────────────────────────────────────────────────────
  // Private: Build Map<ingredientId, { quantity, baseUnit }>
  // Tổng hợp FridgeItem còn trong tủ và chưa tiêu thụ
  // ─────────────────────────────────────────────────────────
  private async buildFridgeMap(
    userId: string,
    familyGroupId?: string | null,
  ): Promise<Map<number, { quantity: number; baseUnit: string }>> {
    const where: any = familyGroupId
      ? { familyGroupId, deletedAt: null, consumedAt: null, quantity: { gt: 0 } }
      : { userId, familyGroupId: null, deletedAt: null, consumedAt: null, quantity: { gt: 0 } };

    const items = await this.prisma.fridgeItem.findMany({
      where,
      select: { ingredientId: true, quantity: true, unit: true },
    });

    const map = new Map<number, { quantity: number; baseUnit: string }>();
    for (const item of items) {
      const { quantity: normQty, baseUnit } = normalizeToBaseUnit(item.quantity, item.unit);
      const existing = map.get(item.ingredientId);
      if (!existing) {
        map.set(item.ingredientId, { quantity: normQty, baseUnit });
      } else if (canCompare(existing.baseUnit, baseUnit)) {
        existing.quantity += normQty;
      }
    }
    return map;
  }

  // ─────────────────────────────────────────────────────────
  // Private: FIFO consume nguyên liệu khi nấu xong (hỗ trợ family scope + transaction)
  // ─────────────────────────────────────────────────────────
  private async consumeIngredientsForSlot(
    userId: string,
    familyGroupId: string | null,
    slotId: string,
    recipeId: string,
    servings: number,
  ): Promise<Array<{ name: string; quantity: number; unit: string }>> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          where: { deletedAt: null },
          include: { ingredient: { select: { name: true } } },
        },
      },
    });
    if (!recipe) return [];

    const baseServings = Math.max(1, recipe.servings || 1);
    const actualServings = Math.max(1, servings || baseServings);
    const scale = actualServings / baseServings;

    const consumed: Array<{ name: string; quantity: number; unit: string }> = [];

    // Chạy trong transaction — Pessimistic locking: tránh 2 người cùng nấu lúc cùng trừ âm kho
    await this.prisma.$transaction(async (tx) => {
      for (const ri of recipe.ingredients) {
        const scaledQty = ri.quantity * scale;
        const { quantity: neededNorm, baseUnit: neededUnit } = normalizeToBaseUnit(scaledQty, ri.unit);
        if (neededNorm <= 0) continue;

        // Query FIFO: tủ lạnh chung nếu family, riêng nếu cá nhân
        const fridgeWhere: any = familyGroupId
          ? { familyGroupId, ingredientId: ri.ingredientId, deletedAt: null, consumedAt: null, quantity: { gt: 0 } }
          : { userId, familyGroupId: null, ingredientId: ri.ingredientId, deletedAt: null, consumedAt: null, quantity: { gt: 0 } };

        const fridgeItems = await tx.fridgeItem.findMany({
          where: fridgeWhere,
          orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
        });

        let remaining = neededNorm;

        for (const fridgeItem of fridgeItems) {
          if (remaining <= 0) break;

          const { quantity: availNorm, baseUnit: availUnit } = normalizeToBaseUnit(
            fridgeItem.quantity,
            fridgeItem.unit,
          );
          if (!canCompare(availUnit, neededUnit)) continue;

          if (availNorm <= remaining) {
            await tx.fridgeItem.update({
              where: { id: fridgeItem.id },
              data: { consumedAt: new Date(), quantity: 0, version: { increment: 1 } },
            });
            remaining -= availNorm;
          } else {
            const leftNorm = availNorm - remaining;
            const { quantity: factor } = normalizeToBaseUnit(1, fridgeItem.unit);
            const leftOriginal = factor > 0 ? leftNorm / factor : leftNorm;
            const roundedLeft = Math.round(leftOriginal * 100) / 100;

            if (roundedLeft <= 0) {
              await tx.fridgeItem.update({
                where: { id: fridgeItem.id },
                data: { consumedAt: new Date(), quantity: 0, version: { increment: 1 } },
              });
            } else {
              await tx.fridgeItem.update({
                where: { id: fridgeItem.id },
                data: { quantity: roundedLeft, version: { increment: 1 } },
              });
            }
            remaining = 0;
          }
        }

        const usedQty = neededNorm - remaining;
        if (usedQty > 0) {
          consumed.push({
            name: (ri as any).ingredient?.name ?? `ingredient#${ri.ingredientId}`,
            quantity: Math.round(scaledQty * 100) / 100,
            unit: ri.unit,
          });
        }

        if (remaining > 0 && !ri.isOptional) {
          this.logger.warn(
            `[MealPlanning] Tủ lạnh thiếu ${remaining.toFixed(1)}${neededUnit} ingredientId=${ri.ingredientId} khi nấu slotId=${slotId}`,
          );
        }
      }
    });

    this.logger.log(`[MealPlanning] Đã trừ ng.liệu (FIFO+TX) cho slotId=${slotId} recipeId=${recipeId}`);
    return consumed;
  }
}
