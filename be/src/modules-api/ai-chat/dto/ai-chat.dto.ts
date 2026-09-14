/**
 * AI Chat DTOs — Request & Response types
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Request DTOs ──────────────────────────────────────────────────────────────

export class CreateSessionDto {
  @ApiPropertyOptional({ example: 'Hỏi về thực đơn tuần', description: 'Tiêu đề phiên chat' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;
}

export class SendMessageDto {
  @ApiProperty({ example: 'Tủ tớ có trứng và rau cải, nấu gì ngon vậy?', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

export class ListSessionsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt() @Min(1) @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt() @Min(1) @Max(50) @Type(() => Number)
  limit?: number = 20;
}
