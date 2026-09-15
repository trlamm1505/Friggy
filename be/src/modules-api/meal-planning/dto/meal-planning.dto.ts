/**
 * DTOs Input cho Meal Planning Module
 *
 * Gồm các class validate request body và query params
 * cho các endpoint: generate plan, update plan, update slot, shopping list.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─────────────────────────────────────────────────────────
// POST /meal-planning/plans/generate
// ─────────────────────────────────────────────────────────
export class GenerateMealPlanDto {
  @ApiProperty({
    description: 'Ngày bắt đầu tuần (phải là ngày Thứ 2) — định dạng YYYY-MM-DD',
    example: '2026-09-15',
  })
  @IsDateString()
  weekStartDate: string;

  @ApiProperty({
    description: 'Ngân sách cả tuần tính bằng VND',
    example: 700000,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  budget: number;
}

// ─────────────────────────────────────────────────────────
// GET /meal-planning/plans/generate/:jobId/stream
// PATCH /meal-planning/plans/:id
// ─────────────────────────────────────────────────────────
export class UpdateMealPlanDto {
  @ApiPropertyOptional({
    description: 'Trạng thái mới của kế hoạch',
    enum: ['draft', 'confirmed', 'active', 'completed'],
    example: 'confirmed',
  })
  @IsOptional()
  @IsEnum(['draft', 'confirmed', 'active', 'completed'])
  status?: string;
}

// ─────────────────────────────────────────────────────────
// PATCH /meal-planning/slots/:id
// ─────────────────────────────────────────────────────────
export class UpdateMealSlotDto {
  @ApiPropertyOptional({
    description: 'ID công thức mới (null để xóa)',
    example: 'abc123',
  })
  @IsOptional()
  @IsString()
  recipeId?: string | null;

  @ApiPropertyOptional({
    description: 'Số khẩu phần',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  servings?: number;

  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Nấu thêm gia vị',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Đánh dấu đã nấu xong',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

// ─────────────────────────────────────────────────────────
// POST /meal-planning/shopping-lists
// ─────────────────────────────────────────────────────────
export class CreateShoppingListDto {
  @ApiProperty({
    description: 'ID kế hoạch tuần để tạo danh sách mua',
    example: 'abc123',
  })
  @IsString()
  weeklyPlanId: string;

  @ApiPropertyOptional({
    description: 'Tiêu đề danh sách mua',
    example: 'Danh sách mua tuần 37',
  })
  @IsOptional()
  @IsString()
  title?: string;
}

// ─────────────────────────────────────────────────────────
// POST /meal-planning/slots/:id/regenerate  (Phase 10.1)
// ─────────────────────────────────────────────────────────
export class RegenerateSlotDto {
  @ApiPropertyOptional({
    description: 'Lý do muốn đổi món — AI sẽ tính đến khi gợi ý',
    enum: ['no_ingredients', 'dislike', 'want_different', 'too_expensive'],
    example: 'no_ingredients',
  })
  @IsOptional()
  @IsEnum(['no_ingredients', 'dislike', 'want_different', 'too_expensive'])
  reason?: string;
}

// ─────────────────────────────────────────────────────────
// POST /meal-planning/plans/generate-from-expiring  (Phase 10.2)
// ─────────────────────────────────────────────────────────
export class GenerateFromExpiringDto {
  @ApiPropertyOptional({
    description: 'Nguyên liệu hết hạn trong N ngày tới (default: 3)',
    example: 3,
    minimum: 1,
    maximum: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  @Type(() => Number)
  withinDays?: number;

  @ApiPropertyOptional({
    description: 'Lập thực đơn cho N ngày (default: 2, max: 3)',
    example: 2,
    minimum: 1,
    maximum: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  @Type(() => Number)
  days?: number;
}
