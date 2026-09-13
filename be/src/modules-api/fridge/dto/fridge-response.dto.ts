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
