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
import { MEAL_PLAN_ROUTING_KEY, AI_SLOT_REGENERATE_ROUTING_KEY, AI_EXPIRING_MEAL_ROUTING_KEY } from 'src/common/constant/app.constant';
import { RabbitMqPublisherService } from 'src/modules-system/rabbit-mq/rabbit-mq-publisher.service';
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

    return this.prisma.mealSlot.update({
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

    const weekNum = Math.ceil((plan.weekStartDate.getDate()) / 7);
    const title = dto.title ?? `Danh sách mua tuần ${weekNum}`;

    // Tạo shopping list và items trong 1 transaction
    const shoppingList = await this.prisma.shoppingList.create({
      data: {
        userId,
        weeklyPlanId: dto.weeklyPlanId,
        title,
        status: 'draft',
        totalEstimatedCost: Array.from(ingredientMap.entries()).reduce((sum, [id, val]) => {
          return sum + Math.round((val.price ?? 0) * val.quantity / 100);
        }, 0),
        items: {
          create: Array.from(ingredientMap.entries()).map(([ingredientId, val]) => ({
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
      `🛒 [MealPlanning] Tạo shopping list: id=${shoppingList.id} | ${shoppingList.items.length} nguyên liệu`,
    );

    return {
      id: shoppingList.id,
      title: shoppingList.title,
      status: shoppingList.status,
      totalEstimatedCost: shoppingList.totalEstimatedCost,
      weeklyPlanId: shoppingList.weeklyPlanId,
      createdAt: shoppingList.createdAt.toISOString(),
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
}
