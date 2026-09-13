import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

// ─── Input DTOs ───────────────────────────────────────────────────────────────

export class SubscribeDto {
  @ApiProperty({ example: 2, description: 'ID của gói Individual cần đăng ký' })
  @IsInt() @IsPositive() @Type(() => Number)
  planId!: number;
}
