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

export enum NotificationTypeEnum {
  expiry_warning = 'expiry_warning',
  budget_alert = 'budget_alert',
  plan_ready = 'plan_ready',
  system = 'system',
  promo = 'promo',
}

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ example: false, description: 'Lọc theo trạng thái đọc' })
  @IsOptional() @IsBoolean() @Type(() => Boolean)
  isRead?: boolean;
}

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  expiryAlert?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  shoppingReminder?: boolean;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export class NotificationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: NotificationTypeEnum }) type!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty() isRead!: boolean;
  @ApiPropertyOptional() readAt!: string | null;
  @ApiPropertyOptional() metadata!: any;
  @ApiProperty() createdAt!: string;
}

export class PaginatedNotificationsDto {
  @ApiProperty({ type: [NotificationResponseDto] }) data!: NotificationResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() unreadCount!: number;
}

export class UnreadCountDto {
  @ApiProperty({ example: 3 }) count!: number;
}

export class NotificationSettingsDto {
  @ApiProperty() pushNotifications!: boolean;
  @ApiProperty() expiryAlert!: boolean;
  @ApiProperty() shoppingReminder!: boolean;
}
