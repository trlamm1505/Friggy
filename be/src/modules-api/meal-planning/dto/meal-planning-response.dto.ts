/**
 * Response DTOs cho Meal Planning Module
 *
 * Định nghĩa cấu trúc response trả về từ các endpoint,
 * dùng @ApiProperty để Swagger tự sinh tài liệu.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─────────────────────────────────────────────────────────
// POST /meal-planning/plans/generate → trả jobId ngay
// ─────────────────────────────────────────────────────────
export class GeneratePlanResponseDto {
  @ApiProperty({ description: 'ID job BullMQ để subscribe SSE', example: 'job-uuid-123' })
  jobId: string;

  @ApiProperty({ description: 'Trạng thái job', example: 'queued' })
  status: string;

  @ApiProperty({ description: 'SSE stream URL để nhận tiến độ', example: '/meal-planning/plans/generate/job-uuid-123/stream' })
  streamUrl: string;

  @ApiProperty({ description: 'Thông báo', example: 'Yêu cầu tạo thực đơn đã được nhận. Kết quả sẽ gửi qua stream.' })
  message: string;
}

// ─────────────────────────────────────────────────────────
// Meal slot trong kế hoạch
// ─────────────────────────────────────────────────────────
export class MealSlotResponseDto {
  @ApiProperty({ example: 'slot-uuid' })
  id: string;

  @ApiProperty({ example: 1, description: '0=CN, 1=T2, ..., 6=T7' })
  dayOfWeek: number;

  @ApiProperty({ enum: ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] })
  mealType: string;

  @ApiPropertyOptional({ example: 'recipe-uuid' })
  recipeId: string | null;

  @ApiPropertyOptional({ description: 'Tên công thức' })
  recipeName: string | null;

  @ApiProperty({ example: 2 })
  servings: number;

  @ApiPropertyOptional({ example: 150000 })
  estimatedCost: number | null;

  @ApiPropertyOptional({ example: 'Nấu thêm gia vị' })
  note: string | null;

  @ApiPropertyOptional({ example: null })
  completedAt: string | null;
}

// ─────────────────────────────────────────────────────────
// Daily plan
// ─────────────────────────────────────────────────────────
export class DailyPlanResponseDto {
  @ApiProperty({ example: 'daily-uuid' })
  id: string;

  @ApiProperty({ example: 1 })
  dayOfWeek: number;

  @ApiProperty({ example: '2026-09-15' })
  date: string;

  @ApiPropertyOptional({ example: 100000 })
  dailyBudget: number | null;

  @ApiProperty({ type: [MealSlotResponseDto] })
  mealSlots: MealSlotResponseDto[];
}

// ─────────────────────────────────────────────────────────
// Weekly plan summary (dùng trong danh sách)
// ─────────────────────────────────────────────────────────
export class WeeklyPlanSummaryResponseDto {
  @ApiProperty({ example: 'plan-uuid' })
  id: string;

  @ApiProperty({ example: '2026-09-15' })
  weekStartDate: string;

  @ApiProperty({ example: 700000 })
  totalBudget: number;

  @ApiPropertyOptional({ example: 650000 })
  actualCost: number | null;

  @ApiProperty({ enum: ['draft', 'confirmed', 'active', 'completed'] })
  status: string;

  @ApiProperty({ example: true })
  generatedByAi: boolean;

  @ApiProperty({ example: '2026-09-14T10:00:00Z' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'true nếu list đã lọc nguyên liệu thiếu theo tủ lạnh', example: true })
  isSmartFiltered?: boolean;
}

// ─────────────────────────────────────────────────────────
// Weekly plan detail (dùng trong GET /:id)
// ─────────────────────────────────────────────────────────
export class WeeklyPlanDetailResponseDto extends WeeklyPlanSummaryResponseDto {
  @ApiProperty({ type: [DailyPlanResponseDto] })
  dailyPlans: DailyPlanResponseDto[];
}

// ─────────────────────────────────────────────────────────
// Shopping list item
// ─────────────────────────────────────────────────────────
export class ShoppingListItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Thịt bò' })
  ingredientName: string;

  @ApiProperty({ example: 500 })
  quantity: number;

  @ApiProperty({ example: 'g' })
  unit: string;

  @ApiPropertyOptional({ example: 120000 })
  estimatedPrice: number | null;

  @ApiProperty({ example: false })
  isPurchased: boolean;

  @ApiPropertyOptional({ example: null })
  purchasedAt: string | null;
}

// ─────────────────────────────────────────────────────────
// Shopping list
// ─────────────────────────────────────────────────────────
export class ShoppingListResponseDto {
  @ApiProperty({ example: 'list-uuid' })
  id: string;

  @ApiProperty({ example: 'Danh sách mua tuần 37' })
  title: string;

  @ApiProperty({ enum: ['draft', 'active', 'completed'] })
  status: string;

  @ApiPropertyOptional({ example: 350000 })
  totalEstimatedCost: number | null;

  @ApiPropertyOptional({ example: 'plan-uuid' })
  weeklyPlanId: string | null;

  @ApiProperty({ type: [ShoppingListItemResponseDto] })
  items: ShoppingListItemResponseDto[];

  @ApiProperty({ example: '2026-09-14T10:00:00Z' })
  createdAt: string;
}

// ─────────────────────────────────────────────────────────
// GET /slots/:id — Chi tiết slot: công thức + fridge analysis
// ─────────────────────────────────────────────────────────

export class RecipeStepDto {
  @ApiProperty({ example: 1 })
  stepNumber: number;

  @ApiProperty({ example: 'Ướp thịt với gia vị 15 phút trước khi nấu' })
  instruction: string;

  @ApiPropertyOptional({ example: 15 })
  durationMinutes: number | null;

  @ApiPropertyOptional({ example: null })
  imagePath: string | null;
}

export class IngredientAvailabilityDto {
  @ApiProperty({ example: 42 })
  ingredientId: number;

  @ApiProperty({ example: 'Thịt bò' })
  name: string;

  @ApiProperty({ example: 200, description: 'Số lượng cần (đã scale theo servings, về base unit)' })
  quantityNeeded: number;

  @ApiProperty({ example: 'g', description: "Base unit sau normalize: 'g', 'ml', hoặc unit gốc" })
  baseUnit: string;

  @ApiProperty({ example: 200, description: 'Số lượng gốc theo đơn vị của công thức' })
  originalQuantity: number;

  @ApiProperty({ example: 'g', description: 'Đơn vị gốc trong công thức' })
  originalUnit: string;

  @ApiProperty({ example: false })
  isOptional: boolean;

  @ApiProperty({ enum: ['have', 'partial', 'missing'] })
  fridgeStatus: 'have' | 'partial' | 'missing';

  @ApiProperty({ example: 150, description: 'Số lượng đang có trong tủ (base unit)' })
  fridgeQuantity: number;

  @ApiProperty({ example: 50, description: 'Số lượng còn thiếu (base unit, 0 nếu have)' })
  missingQuantity: number;
}

export class IngredientSummaryDto {
  @ApiProperty({ example: 8 })
  totalIngredients: number;

  @ApiProperty({ example: 5 })
  haveCount: number;

  @ApiProperty({ example: 1 })
  partialCount: number;

  @ApiProperty({ example: 2 })
  missingCount: number;

  @ApiProperty({ example: 62, description: 'Phần trăm nguyên liệu đã đủ (0-100)' })
  fridgeReadyPercent: number;

  @ApiProperty({ type: [IngredientAvailabilityDto], description: 'Danh sách nguyên liệu thiếu/thiếu một phần' })
  missingItems: IngredientAvailabilityDto[];
}

export class SlotDetailRecipeDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() description: string | null;
  @ApiPropertyOptional() thumbnailPath: string | null;
  @ApiProperty() cookTimeMinutes: number;
  @ApiProperty() difficultyLevel: string;
  @ApiPropertyOptional() estimatedCost: number | null;
  @ApiProperty({ type: [RecipeStepDto] }) steps: RecipeStepDto[];
  @ApiProperty({ type: [IngredientAvailabilityDto] }) ingredients: IngredientAvailabilityDto[];
}

export class SlotDetailResponseDto {
  @ApiProperty({ example: 'slot-uuid' })
  id: string;

  @ApiProperty({ enum: ['breakfast', 'lunch', 'dinner', 'snack'] })
  mealType: string;

  @ApiProperty({ example: 2 })
  servings: number;

  @ApiPropertyOptional({ example: null })
  completedAt: string | null;

  @ApiPropertyOptional({ type: SlotDetailRecipeDto, nullable: true })
  recipe: SlotDetailRecipeDto | null;

  @ApiProperty({ type: IngredientSummaryDto })
  summary: IngredientSummaryDto;
}
