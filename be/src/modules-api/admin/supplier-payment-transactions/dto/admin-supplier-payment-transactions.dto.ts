import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListSupplierTransactionsDto {
  @ApiPropertyOptional({ description: 'Lọc theo SupplierProfile ID' })
  @IsOptional()
  @IsString()
  profileId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái giao dịch', enum: ['pending', 'completed', 'cancelled'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

