import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

// ─── Input ───────────────────────────────────────────────────────────────────

export class SubscribeDto {
  @ApiProperty({ example: 2, description: 'ID của gói Individual' })
  @IsInt() @IsPositive() @Type(() => Number)
  planId!: number;
}

// ─── Response ────────────────────────────────────────────────────────────────

export class SubscriptionPlanResponseDto {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ example: 'free' }) name!: string;
  @ApiProperty({ example: 'Gói Miễn Phí (Basic)' }) displayName!: string;
  @ApiProperty({ example: 0, description: 'Giá (VND)' }) priceVnd!: number;
  @ApiProperty({ example: 'forever' }) billingCycle!: string;
  @ApiProperty({ type: [String], example: ['Tối đa 1 tủ lạnh', 'Nhập thủ công', 'Cảnh báo hết hạn'] })
  features!: string[];
  @ApiProperty({ example: 2, description: '-1 = không giới hạn' }) aiUsagePerWeek!: number;
  @ApiProperty() isActive!: boolean;
}

export class UserSubscriptionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'active' }) status!: string;
  @ApiProperty() startDate!: string;
  @ApiPropertyOptional() endDate!: string | null;
  @ApiPropertyOptional() paymentRef!: string | null;
  @ApiProperty() plan!: SubscriptionPlanResponseDto;
  @ApiProperty() createdAt!: string;
}

export class SubscribeResponseDto {
  @ApiProperty({ example: 'https://qr.mock.vn/abc123', description: 'URL QR thanh toán (mock)' })
  qrCodeUrl!: string;
  @ApiProperty({ example: 'FRIGGY-2026-001' }) paymentRef!: string;
  @ApiProperty({ example: 25000 }) amount!: number;
  @ApiProperty({ description: 'QR hết hạn sau 15 phút' }) expireAt!: string;
  @ApiProperty({ example: 'pending' }) status!: string;
}
