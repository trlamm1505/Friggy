import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationTypeEnum } from './notifications.dto';

// ─── Single Notification ─────────────────────────────────────────────────────

export class NotificationResponseDto {
  @ApiProperty({ description: 'ID thông báo' }) id!: string;
  @ApiProperty({ enum: NotificationTypeEnum, description: 'Loại thông báo' }) type!: string;
  @ApiProperty({ description: 'Tiêu đề thông báo' }) title!: string;
  @ApiProperty({ description: 'Nội dung thông báo' }) body!: string;
  @ApiProperty({ description: 'Đã đọc chưa' }) isRead!: boolean;
  @ApiPropertyOptional({ description: 'Thời điểm đọc (null nếu chưa đọc)' }) readAt!: string | null;
  @ApiPropertyOptional({ description: 'Dữ liệu bổ sung (deeplink, recipeId...)' }) metadata!: any;
  @ApiProperty({ description: 'Thời điểm tạo' }) createdAt!: string;
}

// ─── Danh sách thông báo (phân trang) ────────────────────────────────────────

export class PaginatedNotificationsDto {
  @ApiProperty({ type: [NotificationResponseDto] }) data!: NotificationResponseDto[];
  @ApiProperty({ example: 50, description: 'Tổng số thông báo' }) total!: number;
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) limit!: number;
  @ApiProperty({ example: 3, description: 'Tổng số trang' }) totalPages!: number;
  @ApiProperty({ example: 5, description: 'Số thông báo chưa đọc' }) unreadCount!: number;
}

// ─── Số thông báo chưa đọc ───────────────────────────────────────────────────

export class UnreadCountResponseDto {
  @ApiProperty({ example: 3, description: 'Số thông báo chưa đọc' }) count!: number;
}

// ─── Đánh dấu tất cả đã đọc ─────────────────────────────────────────────────

export class MarkAllReadResponseDto {
  @ApiProperty({ example: 3, description: 'Số thông báo đã được đánh dấu đọc' }) updated!: number;
}

// ─── Cài đặt thông báo ───────────────────────────────────────────────────────

export class NotificationSettingsResponseDto {
  @ApiProperty({ example: true, description: 'Bật/tắt push notification' }) pushNotifications!: boolean;
  @ApiProperty({ example: true, description: 'Bật/tắt cảnh báo hết hạn nguyên liệu' }) expiryAlert!: boolean;
  @ApiProperty({ example: false, description: 'Bật/tắt nhắc nhở mua sắm' }) shoppingReminder!: boolean;
}
