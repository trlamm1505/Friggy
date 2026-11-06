import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ListSupplierIngredientsDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: ['pending', 'approved', 'rejected', 'archived'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by profileId (supplier)' })
  @IsOptional()
  @IsString()
  profileId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class ApproveSupplierIngredientDto {
  @ApiPropertyOptional({ description: 'If true, also create a global ingredient record from this supplier ingredient' })
  @IsOptional()
  @IsBoolean()
  mergeToGlobal?: boolean;
}

export class RejectSupplierIngredientDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  reason: string;
}
