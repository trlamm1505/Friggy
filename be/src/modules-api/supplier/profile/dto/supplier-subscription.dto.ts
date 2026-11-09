import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class SupplierSubscribeDto {
  @ApiProperty({ example: 1, description: 'ID của SupplierPlan' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  planId: number;
}

