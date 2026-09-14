import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FridgeItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() ingredientId!: number;
  @ApiProperty() ingredientName!: string;
  @ApiPropertyOptional() ingredientImagePath!: string | null;
  @ApiProperty() quantity!: number;
  @ApiProperty() unit!: string;
  @ApiPropertyOptional() purchasedAt!: string | null;
  @ApiPropertyOptional() expiresAt!: string | null;
  @ApiProperty() storageLocation!: string;
  @ApiProperty() addedBy!: string;
  @ApiPropertyOptional() consumedAt!: string | null;
  @ApiProperty({ description: 'Số ngày còn đến hạn (âm = đã quá hạn)' })
  daysUntilExpiry!: number | null;
  @ApiProperty() createdAt!: string;
}

export class FridgeStatsResponseDto {
  @ApiProperty({ example: 850000, description: 'Tổng chi tiêu tháng hiện tại (VND)' })
  totalSpentThisMonth!: number;
  @ApiProperty({ example: 12.5, description: '% nguyên liệu hết hạn chưa dùng' })
  wastePercent!: number;
  @ApiProperty({ example: 5, description: 'Số bữa đã nấu tuần này' })
  mealsCooked!: number;
  @ApiProperty({ example: 3, description: 'Số nguyên liệu sắp hết hạn (≤3 ngày)' })
  expiringSoonCount!: number;
  @ApiProperty({ example: 12, description: 'Tổng số nguyên liệu trong tủ' })
  totalItems!: number;
}

export class DetectedScanItemDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional() ingredientId!: number | null;
  @ApiProperty() quantity!: number;
  @ApiProperty() unit!: string;
  @ApiPropertyOptional() confidence!: number | null;
}

export class ScanResponseDto {
  @ApiProperty() scanId!: string;
  @ApiProperty() scanType!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ type: [DetectedScanItemDto] }) detectedItems!: DetectedScanItemDto[];
}

export class ScanHistoryItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() scanType!: string;
  @ApiProperty() status!: string;
  @ApiProperty() detectedCount!: number;
  @ApiPropertyOptional() confirmedCount!: number | null;
  @ApiProperty() createdAt!: string;
}

export class FridgeStatsChartResponseDto {
  @ApiProperty({ example: 'week' }) period!: string;
  @ApiProperty({ type: [String], example: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] }) labels!: string[];
  @ApiProperty({ type: [Number], example: [120000, 0, 85000] }) spending!: number[];
  @ApiProperty({ type: [Number], example: [0, 1, 0] }) wasteItems!: number[];
}

export class DetectedItemResultDto {
  @ApiPropertyOptional() ingredientId!: number | null;
  @ApiProperty() name!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unit!: string;
  @ApiPropertyOptional() estimatedExpiryDays!: number | null;
  @ApiProperty({ example: 0.92 }) confidence!: number;
  @ApiProperty({ description: 'true nếu cần user xác nhận (confidence thấp / không match DB)' })
  needsConfirm!: boolean;
  @ApiProperty({ description: 'true nếu nguyên liệu này có trong danh sách dị ứng của user' })
  allergyWarning!: boolean;
}

export class ScanStatusResponseDto {
  @ApiProperty() scanId!: string;
  @ApiProperty() scanType!: string;
  @ApiProperty({ enum: ['pending', 'success', 'failed'] }) status!: string;
  @ApiProperty({ type: [DetectedItemResultDto] }) detectedItems!: DetectedItemResultDto[];
  @ApiPropertyOptional() errorMessage!: string | null;
  @ApiProperty() createdAt!: string;
}
