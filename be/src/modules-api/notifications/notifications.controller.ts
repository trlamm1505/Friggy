import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  ListNotificationsQueryDto,
  UpdateNotificationSettingsDto,
  NotificationResponseDto,
  PaginatedNotificationsDto,
  UnreadCountDto,
  NotificationSettingsDto,
} from './dto/notifications.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ─────────────────────────────────────────────────────────
  // GET /unread-count (trước /:id)
  // ─────────────────────────────────────────────────────────

  @Get('unread-count')
  @ApiOperation({ summary: 'Số thông báo chưa đọc' })
  @ApiResponse({ status: 200, type: UnreadCountDto })
  getUnreadCount(@CurrentUser() user: JwtPayload): Promise<UnreadCountDto> {
    return this.notificationsService.getUnreadCount(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /read-all (trước /:id)
  // ─────────────────────────────────────────────────────────

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  @ApiResponse({ status: 200, schema: { example: { updated: 3 } } })
  markAllRead(@CurrentUser() user: JwtPayload): Promise<{ updated: number }> {
    return this.notificationsService.markAllRead(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // GET / — Danh sách
  // ─────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo (phân trang, lọc isRead)' })
  @ApiResponse({ status: 200, type: PaginatedNotificationsDto })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<PaginatedNotificationsDto> {
    return this.notificationsService.findAll(user.sub, query);
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /:id/read
  // ─────────────────────────────────────────────────────────

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu 1 thông báo đã đọc' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  markOneRead(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markOneRead(user.sub, id);
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /:id
  // ─────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa thông báo (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.notificationsService.remove(user.sub, id);
  }
}

// ─── Notification Settings (separate controller under /me) ───────────────────
// NOTE: Endpoint GET|PATCH /me/notification-settings được đặt trong UsersController
// xem users.controller.ts để tích hợp
