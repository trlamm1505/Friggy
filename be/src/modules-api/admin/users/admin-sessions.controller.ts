import {
  Controller, Get, Delete, Patch, Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AdminSessionsService } from './admin-sessions.service';
import { UpdateAiQuotaDto } from './dto/admin-ai-quota.dto';

@ApiTags('Admin / Sessions & AI Quota')
@ApiBearerAuth('access-token')
@Roles('admin')
@Controller('admin')
export class AdminSessionsController {
  constructor(private readonly service: AdminSessionsService) {}

  // ─── Sessions ──────────────────────────────────────────────────────────────

  @Get('users/:id/sessions')
  @ApiOperation({
    summary: '[Chỉ Admin] Xem tất cả phiên đăng nhập đang hoạt động của user',
    description: 'Trả về danh sách refresh token còn hiệu lực (chưa hết hạn, chưa bị thu hồi) kèm thông tin thiết bị và IP.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Danh sách phiên đăng nhập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  getUserSessions(@Param('id') id: string) {
    return this.service.getUserSessions(id);
  }

  @Delete('users/:id/sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Chỉ Admin] Thu hồi toàn bộ phiên đăng nhập của user',
    description: 'Kick user ra khỏi tất cả thiết bị bằng cách thu hồi toàn bộ refresh token.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Số phiên đã thu hồi' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  revokeAllUserSessions(@Param('id') id: string) {
    return this.service.revokeAllUserSessions(id);
  }

  @Delete('users/:id/sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Chỉ Admin] Thu hồi 1 phiên đăng nhập cụ thể của user',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'sessionId', description: 'Refresh Token ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Phiên đã bị thu hồi' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phiên hoặc đã thu hồi' })
  revokeOneSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.revokeOneSession(id, sessionId);
  }

  @Delete('sessions/expired')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Chỉ Admin] Dọn dẹp toàn bộ refresh token đã hết hạn trong DB',
    description: 'Xoá cứng các record refresh token đã hết hạn trên toàn hệ thống để giữ DB gọn.',
  })
  @ApiResponse({ status: 200, description: 'Số record đã xoá' })
  cleanupExpiredSessions() {
    return this.service.cleanupExpiredSessions();
  }

  // ─── AI Quota ──────────────────────────────────────────────────────────────

  @Get('users/:id/ai-quota')
  @ApiOperation({
    summary: '[Chỉ Admin] Xem quota AI và lượt đã dùng trong tuần của user',
    description: 'Trả về quota từ plan, quota override (nếu có), số lượt đã dùng tuần này và số lượt còn lại.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Thông tin quota AI' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  getUserAiQuota(@Param('id') id: string) {
    return this.service.getUserAiQuota(id);
  }

  @Patch('users/:id/ai-quota')
  @ApiOperation({
    summary: '[Chỉ Admin] Ghi đè quota AI cho user',
    description:
      'Cho phép tặng thêm lượt (VD: `aiQuotaOverride: 20`) hoặc khoá AI về 0. ' +
      'Đặt `aiQuotaOverride: null` để trả về quota mặc định từ SubscriptionPlan.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Quota đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  updateUserAiQuota(
    @Param('id') id: string,
    @Body() dto: UpdateAiQuotaDto,
  ) {
    return this.service.updateUserAiQuota(id, dto);
  }

  @Delete('users/:id/ai-quota/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Chỉ Admin] Reset quota và lượt dùng AI tuần này của user về 0',
    description: 'Xoá override và xoá log AI trong tuần hiện tại của user.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Đã reset' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  resetUserAiUsage(@Param('id') id: string) {
    return this.service.resetUserAiUsage(id);
  }
}
