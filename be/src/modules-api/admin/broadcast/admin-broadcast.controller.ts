import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { AdminBroadcastService } from './admin-broadcast.service';
import { BroadcastNotificationDto } from './dto/admin-broadcast.dto';

@ApiTags('Admin / Broadcast')
@ApiBearerAuth('access-token')
@Roles('admin')
@Controller('admin/notifications')
export class AdminBroadcastController {
  constructor(private readonly service: AdminBroadcastService) {}

  @Post('broadcast')
  @ApiOperation({
    summary: '[Chỉ Admin] Gửi thông báo đẩy hàng loạt',
    description:
      'Gửi push notification FCM tới một nhóm user (`all`, `free_users`, `paid_users`). ' +
      'Thông báo được lưu vào DB và gửi FCM theo batch 100 user mỗi lần để tránh timeout.',
  })
  @ApiResponse({
    status: 201,
    description: 'Thông báo đã được gửi, trả về số lượng user nhận được.',
  })
  broadcastNotification(
    @Body() dto: BroadcastNotificationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.broadcastNotification(dto, user.sub);
  }
}
