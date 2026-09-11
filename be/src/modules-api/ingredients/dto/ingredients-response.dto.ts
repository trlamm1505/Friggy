import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() iconPath!: string | null;
  @ApiPropertyOptional() parentId!: number | null;
  @ApiPropertyOptional({ type: () => [CategoryResponseDto] }) children?: CategoryResponseDto[];
}

export class PurchaseLinkResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() platform!: string;
  @ApiProperty() productName!: string;
  @ApiProperty() purchaseUrl!: string;
  @ApiPropertyOptional() priceVnd!: number | null;
  @ApiPropertyOptional() unitDescription!: string | null;
  @ApiPropertyOptional() thumbnailPath!: string | null;
  @ApiProperty() priority!: number;
}

export class IngredientResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;
  @ApiProperty() defaultUnit!: string;
  @ApiPropertyOptional() caloriesPer100g!: number | null;
  @ApiPropertyOptional() averagePricePerUnit!: number | null;
  @ApiPropertyOptional() imagePath!: string | null;
  @ApiProperty() isCommon!: boolean;
  @ApiProperty() categoryId!: number;
  @ApiProperty() categoryName!: string;
}

export class PaginatedIngredientsDto {
  @ApiProperty({ type: [IngredientResponseDto] }) data!: IngredientResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}
