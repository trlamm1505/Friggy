import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsArray } from 'class-validator';

export class CreateSupplierPlanDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  displayName: string;

  @ApiProperty()
  @IsNumber()
  priceVnd: number;

  @ApiProperty({ enum: ['monthly', 'yearly'] })
  @IsString()
  billingCycle: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsNumber()
  maxIngredients?: number;

  @ApiProperty({ description: 'List of feature descriptions' })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSupplierPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priceVnd?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxIngredients?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
