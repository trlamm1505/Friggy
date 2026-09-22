import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsBoolean, Min, IsArray } from 'class-validator';

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 29000, description: 'Giá gói (VND)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceVnd?: number;

  @ApiPropertyOptional({ example: 5, description: 'Số lượt AI/tuần (-1 = không giới hạn)' })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  aiUsagePerWeek?: number;

  @ApiPropertyOptional({ example: 'Individual Pro' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ type: [String], example: ['Tính năng A', 'Tính năng B'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
