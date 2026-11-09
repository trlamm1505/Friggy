import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupplierIngredientResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() categoryId: number;
  @ApiProperty() categoryName: string;
  @ApiProperty() defaultUnit: string;
  @ApiPropertyOptional() caloriesPer100g: number | null;
  @ApiPropertyOptional() averagePricePerUnit: number | null;
  @ApiPropertyOptional() imagePath: string | null;
  @ApiPropertyOptional() brand: string | null;
  @ApiPropertyOptional() barcode: string | null;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty() status: string;
  @ApiPropertyOptional() rejectionReason: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

export class PaginatedSupplierIngredientsDto {
  @ApiProperty({ type: [SupplierIngredientResponseDto] }) data: SupplierIngredientResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

export class ImportResultDto {
  @ApiProperty() total: number;
  @ApiProperty() success: number;
  @ApiProperty() failed: number;
  @ApiProperty({ type: [Object] }) failedRows: { row: number; name: string; reason: string }[];
  @ApiProperty() pendingCount: number;
}

