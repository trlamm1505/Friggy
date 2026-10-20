import { IsInt, Min, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAiQuotaDto {
  @ApiPropertyOptional({
    example: 20,
    description: 'Ghi đè quota AI cho user. Đặt về null để dùng quota mặc định từ SubscriptionPlan.',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  aiQuotaOverride?: number | null;
}
