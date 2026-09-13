import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enum ─────────────────────────────────────────────────────────────────────

export enum NotificationTypeEnum {
  expiry_warning = 'expiry_warning',
  budget_alert = 'budget_alert',
  plan_ready = 'plan_ready',
  system = 'system',
  promo = 'promo',
}

// ─── Query / Input DTOs ───────────────────────────────────────────────────────

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Số trang (bắt đầu từ 1)' })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Số bản ghi mỗi trang (tối đa 100)' })
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ example: false, description: 'Lọc theo trạng thái đọc' })
  @IsOptional() @IsBoolean() @Type(() => Boolean)
  isRead?: boolean;
}

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ example: true, description: 'Bật/tắt push notification' })
  @IsOptional() @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Bật/tắt cảnh báo hết hạn nguyên liệu' })
  @IsOptional() @IsBoolean()
  expiryAlert?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Bật/tắt nhắc nhở mua sắm' })
  @IsOptional() @IsBoolean()
  shoppingReminder?: boolean;
}
