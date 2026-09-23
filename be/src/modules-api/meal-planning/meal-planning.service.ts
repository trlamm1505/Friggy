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
} from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { MEAL_PLAN_ROUTING_KEY, AI_SLOT_REGENERATE_ROUTING_KEY, AI_EXPIRING_MEAL_ROUTING_KEY } from 'src/common/constants/app.constant';
import { RabbitMqPublisherService } from 'src/modules-system/rabbit-mq/rabbit-mq-publisher.service';
import { normalizeToBaseUnit, canCompare } from 'src/common/utils/unit.util';
import type {
  GenerateMealPlanDto,
  UpdateMealPlanDto,
  UpdateMealSlotDto,
  CreateShoppingListDto,
  RegenerateSlotDto,
  GenerateFromExpiringDto,
} from './dto/meal-planning.dto';

@Injectable()
export class MealPlanningService {
  private readonly logger = new Logger(MealPlanningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMq: RabbitMqPublisherService,
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

  // ─────────────────────────────────────────────────────────
  // GET /plans — Danh sách kế hoạch tuần
  // ─────────────────────────────────────────────────────────
  async getPlans(userId: string) {
    const plans = await this.prisma.weeklyPlan.findMany({
      where: { userId, deletedAt: null },
      orderBy: { weekStartDate: 'desc' },
      select: {
        id: true,
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
  // GET /plans/:id — Chi tiết kế hoạch tuần (kèm daily + slots)
  // ─────────────────────────────────────────────────────────
  async getPlanDetail(userId: string, planId: string) {
    const plan = await this.prisma.weeklyPlan.findFirst({
      where: { id: planId, userId, deletedAt: null },
      include: {
        dailyPlans: {
          where: { deletedAt: null },
          orderBy: { dayOfWeek: 'asc' },
          include: {
            mealSlots: {
              where: { deletedAt: null },
              orderBy: { mealType: 'asc' },
              include: {
                recipe: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });

    if (!plan) throw new NotFoundException('Không tìm thấy kế hoạch');

    return {
      id: plan.id,
      weekStartDate: plan.weekStartDate.toISOString().split('T')[0],
      totalBudget: plan.totalBudget,
      actualCost: plan.actualCost,
      status: plan.status,
      generatedByAi: plan.generatedByAi,
      createdAt: plan.createdAt.toISOString(),
      dailyPlans: plan.dailyPlans.map((d) => ({
        id: d.id,
        dayOfWeek: d.dayOfWeek,
        date: d.date.toISOString().split('T')[0],
        dailyBudget: d.dailyBudget,
        mealSlots: d.mealSlots.map((s) => ({
          id: s.id,
          mealType: s.mealType,
          recipeId: s.recipeId,
          recipeName: s.recipe?.title ?? null,
          servings: s.servings,
          estimatedCost: s.estimatedCost,
          note: s.note,
          completedAt: s.completedAt?.toISOString() ?? null,
        })),
      })),
    };
  }

  // ─────────────────────────────────────────────────────────
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
    if (dto.completed === true && !slot.completedAt && slot.recipeId) {
      await this.consumeIngredientsForSlot(userId, slotId, slot.recipeId, slot.servings);
    }

    return updated;
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
          include: { ingredient: { select: { name: true } } },
        },
      },
    });

    return lists.map((list) => ({
      id: list.id,
      title: list.title,
      status: list.status,
      totalEstimatedCost: list.totalEstimatedCost,
      weeklyPlanId: list.weeklyPlanId,
      createdAt: list.createdAt.toISOString(),
      items: list.items.map((item) => ({
        id: item.id,
        ingredientName: item.ingredient.name,
        quantity: item.quantity,
        unit: item.unit,
        estimatedPrice: item.estimatedPrice,
        isPurchased: item.isPurchased,
        purchasedAt: item.purchasedAt?.toISOString() ?? null,
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
          return sum + Math.round((val.price ?? 0) * val.quantity / 100);
        }, 0),
        items: {
          create: Array.from(filteredMap.entries()).map(([ingredientId, val]) => ({
            ingredientId,
            quantity: Math.round(val.quantity * 10) / 10,
            unit: val.unit,
            estimatedPrice: val.price ? Math.round(val.price * val.quantity / 100) : null,
          })),
        },
      },
      include: {
        items: {
          include: { ingredient: { select: { name: true } } },
        },
      },
    });

    this.logger.log(
      `🛒 [MealPlanning] Tạo smart shopping list: id=${shoppingList.id} | ${shoppingList.items.length} ng.liệu (filter: ${isSmartFiltered})`,
    );

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
        ingredientName: item.ingredient.name,
        quantity: item.quantity,
        unit: item.unit,
        estimatedPrice: item.estimatedPrice,
        isPurchased: item.isPurchased,
        purchasedAt: null,
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
    });

    if (!item) throw new NotFoundException('Không tìm thấy mặt hàng');

    const newPurchased = !item.isPurchased;

    // Khi tick ĐÃ MUA → tự động thêm vào tủ lạnh
    // Khi bỏ tick (undo) → KHÔNG rollback FridgeItem (an toàn hơn)
    if (newPurchased) {
      await this.prisma.fridgeItem.create({
        data: {
          id: uuidv4(),
          userId,
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unit: item.unit,
          addedBy: 'manual',
          storageLocation: 'fridge',
        },
      });
      this.logger.log(
        `🛒→🧤 [MealPlanning] Auto-add fridge: ingredientId=${item.ingredientId} qty=${item.quantity}${item.unit}`,
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
  // Private: Build Map<ingredientId, { quantity, baseUnit }>
  // Tổng hợp FridgeItem còn hạn và chưa tiêu thụ
  // ─────────────────────────────────────────────────────────
  private async buildFridgeMap(
    userId: string,
  ): Promise<Map<number, { quantity: number; baseUnit: string }>> {
    const items = await this.prisma.fridgeItem.findMany({
      where: {
        userId,
        deletedAt: null,
        consumedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
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
  // Private: FIFO consume nguyên liệu khi nấu xong
  // ─────────────────────────────────────────────────────────
  private async consumeIngredientsForSlot(
    userId: string,
    slotId: string,
    recipeId: string,
    servings: number,
  ): Promise<void> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: { where: { deletedAt: null, isOptional: false } },
      },
    });
    if (!recipe) return;

    const scale = servings / (recipe.servings || 1);

    for (const ri of recipe.ingredients) {
      const scaledQty = ri.quantity * scale;
      const { quantity: neededNorm, baseUnit: neededUnit } = normalizeToBaseUnit(scaledQty, ri.unit);

      const fridgeItems = await this.prisma.fridgeItem.findMany({
        where: {
          userId,
          ingredientId: ri.ingredientId,
          deletedAt: null,
          consumedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
      });

      let remaining = neededNorm;

      for (const fridgeItem of fridgeItems) {
        if (remaining <= 0) break;

        const { quantity: availNorm, baseUnit: availUnit } = normalizeToBaseUnit(
          fridgeItem.quantity, fridgeItem.unit,
        );
        if (!canCompare(availUnit, neededUnit)) continue;

        if (availNorm <= remaining) {
          await this.prisma.fridgeItem.update({
            where: { id: fridgeItem.id },
            data: { consumedAt: new Date() },
          });
          remaining -= availNorm;
        } else {
          const leftNorm = availNorm - remaining;
          const { quantity: factor } = normalizeToBaseUnit(1, fridgeItem.unit);
          const leftOriginal = factor > 0 ? leftNorm / factor : leftNorm;
          await this.prisma.fridgeItem.update({
            where: { id: fridgeItem.id },
            data: { quantity: Math.max(0, Math.round(leftOriginal * 100) / 100) },
          });
          remaining = 0;
        }
      }

      if (remaining > 0) {
        this.logger.warn(
          `[MealPlanning] Tủ lạnh thiếu ${remaining.toFixed(1)}${neededUnit} ingredientId=${ri.ingredientId} khi nấu slotId=${slotId}`,
        );
      }
    }

    this.logger.log(`[MealPlanning] Đã trừ ng.liệu (FIFO) cho slotId=${slotId}`);
  }
}
