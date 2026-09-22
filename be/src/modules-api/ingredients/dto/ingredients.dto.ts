import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Query Params ─────────────────────────────────────────────────────────────

export class ListIngredientsQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Số item mỗi trang (tối đa 100)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'thịt bò', description: 'Tìm theo tên' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Lọc theo categoryId' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({ example: true, description: 'Chỉ lấy nguyên liệu phổ biến' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isCommon?: boolean;
}

// ─── Create / Update (Admin) ─────────────────────────────────────────────────

export class CreateIngredientDto {
  @ApiProperty({ example: 'Thịt bò', maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 1, description: 'ID danh mục' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  categoryId!: number;

  @ApiProperty({ example: 'gram', description: 'Đơn vị mặc định' })
  @IsString()
  @MaxLength(30)
  defaultUnit!: string;

  @ApiPropertyOptional({ example: 250, description: 'Calo trên 100g' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  caloriesPer100g?: number;

  @ApiPropertyOptional({ example: 150000, description: 'Giá trung bình (VND/đơn vị)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  averagePricePerUnit?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isCommon?: boolean;
}

export class UpdateIngredientDto {
  @ApiPropertyOptional({ example: 'Thịt bò Úc', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({ example: 'kg' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  defaultUnit?: string;

  @ApiPropertyOptional({ example: 250 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  caloriesPer100g?: number;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  averagePricePerUnit?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isCommon?: boolean;
}

// ─── Category CRUD (Admin) ────────────────────────────────────────────────────

export class CreateCategoryDto {
  @ApiProperty({ example: 'Rau củ quả', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: '/public/icons/cat_vegetables.png' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  iconPath?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID danh mục cha (null = root)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  parentId?: number;

  @ApiPropertyOptional({ example: 7, description: 'Số ngày bảo quản mặc định' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  defaultShelfLifeDays?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Rau lá xanh', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '/public/icons/cat_leafy.png' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  iconPath?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID danh mục cha (null = root)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  parentId?: number;

  @ApiPropertyOptional({ example: 5, description: 'Số ngày bảo quản mặc định' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  defaultShelfLifeDays?: number;
}
