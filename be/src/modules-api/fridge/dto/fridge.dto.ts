import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsNumber,
  IsISO8601,
  Min,
  Max,
  MaxLength,
  IsPositive,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum StorageLocationEnum {
  fridge = 'fridge',
  freezer = 'freezer',
  pantry = 'pantry',
}

// ─── Add Fridge Item ─────────────────────────────────────────────────────────

export class AddFridgeItemDto {
  @ApiProperty({ example: 1 })
  @IsInt() @IsPositive() @Type(() => Number)
  ingredientId!: number;

  @ApiProperty({ example: 500 })
  @IsNumber() @Min(0) @Type(() => Number)
  quantity!: number;

  @ApiProperty({ example: 'gram' })
  @IsString() @MaxLength(30)
  unit!: string;

  @ApiPropertyOptional({ example: '2026-09-20', description: 'Ngày mua' })
  @IsOptional() @IsISO8601()
  purchasedAt?: string;

  @ApiPropertyOptional({ example: '2026-09-25', description: 'Ngày hết hạn' })
  @IsOptional() @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional({ enum: StorageLocationEnum, example: 'fridge' })
  @IsOptional() @IsEnum(StorageLocationEnum)
  storageLocation?: StorageLocationEnum;
}

// ─── Update Fridge Item ───────────────────────────────────────────────────────

export class UpdateFridgeItemDto {
  @ApiPropertyOptional({ example: 300 })
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ example: 'gram' })
  @IsOptional() @IsString() @MaxLength(30)
  unit?: string;

  @ApiPropertyOptional({ example: '2026-09-28' })
  @IsOptional() @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional({ enum: StorageLocationEnum })
  @IsOptional() @IsEnum(StorageLocationEnum)
  storageLocation?: StorageLocationEnum;
}

// ─── Query Params ─────────────────────────────────────────────────────────────

export class ListFridgeQueryDto {
  @ApiPropertyOptional({ enum: StorageLocationEnum })
  @IsOptional() @IsEnum(StorageLocationEnum)
  storageLocation?: StorageLocationEnum;

  @ApiPropertyOptional({ example: true, description: 'Chỉ lấy item sắp hết hạn' })
  @IsOptional()
  expiringSoon?: boolean;
}

export class ExpiringQueryDto {
  @ApiPropertyOptional({ example: 3, description: 'Hết hạn trong N ngày (mặc định 3)' })
  @IsOptional() @IsInt() @Min(1) @Max(30) @Type(() => Number)
  days?: number = 3;
}

// ─── Confirm Scan ─────────────────────────────────────────────────────────────

export class ConfirmedScanItemDto {
  @ApiProperty({ example: 1 })
  @IsInt() @IsPositive() @Type(() => Number)
  ingredientId!: number;

  @ApiProperty({ example: 500 })
  @IsNumber() @Min(0) @Type(() => Number)
  quantity!: number;

  @ApiProperty({ example: 'gram' })
  @IsString() @MaxLength(30)
  unit!: string;

  @ApiPropertyOptional({ example: '2026-09-25' })
  @IsOptional() @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional({ enum: StorageLocationEnum })
  @IsOptional() @IsEnum(StorageLocationEnum)
  storageLocation?: StorageLocationEnum;
}

export class ConfirmScanDto {
  @ApiProperty({ type: [ConfirmedScanItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmedScanItemDto)
  items!: ConfirmedScanItemDto[];
}
