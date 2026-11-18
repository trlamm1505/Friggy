import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── GET /admin/stats/overview ────────────────────────────────────────────────

export class UserStatsDto {
  @ApiProperty({ example: 1200, description: 'Tổng user (không tính supplier)' }) total!: number;
  @ApiProperty({ example: 1100 }) active!: number;
  @ApiProperty({ example: 50 }) suspended!: number;
  @ApiProperty({ example: 80, description: 'User mới trong tháng này' }) newThisMonth!: number;
  @ApiProperty({ example: 350 }) activeSubscriptions!: number;
  @ApiProperty({ example: 5800000, description: 'Doanh thu từ user tháng này (VND)' }) revenueThisMonthVnd!: number;
  @ApiProperty({ example: 48000000, description: 'Tổng doanh thu từ user (VND)' }) totalRevenueVnd!: number;
}

export class SupplierStatsDto {
  @ApiProperty({ example: 30, description: 'Tổng supplier profile' }) total!: number;
  @ApiProperty({ example: 20, description: 'Supplier đã được xác minh' }) verified!: number;
  @ApiProperty({ example: 18, description: 'Supplier đang có gói cước active' }) activeSubscriptions!: number;
  @ApiProperty({ example: 5, description: 'Đơn đăng ký đối tác đang chờ duyệt' }) pendingApplications!: number;
  @ApiProperty({ example: 12, description: 'Nguyên liệu supplier đang chờ duyệt' }) pendingIngredients!: number;
  @ApiProperty({ example: 1200000, description: 'Doanh thu từ supplier tháng này (VND)' }) revenueThisMonthVnd!: number;
  @ApiProperty({ example: 9600000, description: 'Tổng doanh thu từ supplier (VND)' }) totalRevenueVnd!: number;
}

export class CombinedRevenueDto {
  @ApiProperty({ example: 7000000, description: 'Tổng doanh thu (user + supplier) tháng này (VND)' }) revenueThisMonthVnd!: number;
  @ApiProperty({ example: 57600000, description: 'Tổng doanh thu toàn thời gian (VND)' }) totalRevenueVnd!: number;
}

export class StatsOverviewDto {
  @ApiProperty({ type: UserStatsDto }) users!: UserStatsDto;
  @ApiProperty({ type: SupplierStatsDto }) suppliers!: SupplierStatsDto;
  @ApiProperty({ type: CombinedRevenueDto }) combined!: CombinedRevenueDto;
}

// ─── GET /admin/stats/ai-usage ────────────────────────────────────────────────

export class AiUsageBreakdownItemDto {
  @ApiProperty({ example: 'recipe_suggestion' }) featureType!: string;
  @ApiProperty({ example: 420 }) count!: number;
}

export class AiUsageDto {
  @ApiProperty({ example: '7 ngày gần nhất' }) period!: string;
  @ApiProperty({ example: 1500 }) totalCalls!: number;
  @ApiProperty({ type: [AiUsageBreakdownItemDto] }) breakdown!: AiUsageBreakdownItemDto[];
}

// ─── GET /admin/stats/subscriptions ──────────────────────────────────────────

export class UserPlanInfoDto {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ example: 'individual_pro' }) name!: string;
  @ApiPropertyOptional({ example: 'Individual Pro' }) displayName?: string | null;
}

export class SupplierPlanInfoDto {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ example: 'basic' }) name!: string;
}

export class SubscriptionBreakdownItemDto {
  @ApiProperty({ type: UserPlanInfoDto }) plan!: UserPlanInfoDto;
  @ApiProperty({ example: 120 }) activeSubscribers!: number;
}

export class SupplierSubscriptionBreakdownItemDto {
  @ApiProperty({ type: SupplierPlanInfoDto }) plan!: SupplierPlanInfoDto;
  @ApiProperty({ example: 10 }) activeSubscribers!: number;
}

export class SubscriptionBreakdownDto {
  @ApiProperty({ type: [SubscriptionBreakdownItemDto], description: 'Phân bố gói subscription của user' })
  users!: SubscriptionBreakdownItemDto[];

  @ApiProperty({ type: [SupplierSubscriptionBreakdownItemDto], description: 'Phân bố gói cước của supplier' })
  suppliers!: SupplierSubscriptionBreakdownItemDto[];
}
