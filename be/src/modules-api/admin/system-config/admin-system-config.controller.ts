import {
  Controller, Get, Patch, Body,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { AdminSystemConfigService } from './admin-system-config.service';
import {
  UpdateTokenConfigDto,
  UpdateOtpConfigDto,
  UpdateMaintenanceDto,
} from './dto/admin-system-config.dto';
import {
  TokenConfigResponseDto,
  OtpConfigResponseDto,
  MaintenanceResponseDto,
  HealthResponseDto,
} from './dto/admin-system-config-response.dto';

@ApiTags('Admin / System Config')
@ApiBearerAuth('access-token')
@Roles('admin')
@Controller('admin/system-config')
export class AdminSystemConfigController {
  constructor(private readonly service: AdminSystemConfigService) {}

  // ─── Token TTL ─────────────────────────────────────────────────────────────

  @Get('token')
  @ApiOperation({
    summary: '[Chỉ Admin] Xem cấu hình TTL của access token và refresh token',
    description: 'Trả về TTL hiện tại đang được áp dụng (từ DB/Redis hoặc fallback .env).',
  })
  @ApiResponse({ status: 200, type: TokenConfigResponseDto })
  getTokenConfig(): Promise<TokenConfigResponseDto> {
    return this.service.getTokenConfig();
  }

  @Patch('token')
  @ApiOperation({
    summary: '[Chỉ Admin] Cập nhật TTL token tại runtime',
    description:
      'Thay đổi có hiệu lực ngay với token mới sinh. Token cũ đã ký vẫn giữ TTL cũ.\n\n' +
      '**Định dạng TTL:** số + đơn vị (s/m/h/d). VD: `15m`, `1h`, `7d`, `30d`.',
  })
  @ApiResponse({ status: 200, type: TokenConfigResponseDto })
  updateTokenConfig(
    @Body() dto: UpdateTokenConfigDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TokenConfigResponseDto> {
    return this.service.updateTokenConfig(dto, user.sub);
  }

  // ─── OTP Config ────────────────────────────────────────────────────────────

  @Get('otp')
  @ApiOperation({
    summary: '[Chỉ Admin] Xem cấu hình OTP',
    description: 'Thời gian sống OTP (giây) và số lần thử tối đa.',
  })
  @ApiResponse({ status: 200, type: OtpConfigResponseDto })
  getOtpConfig(): Promise<OtpConfigResponseDto> {
    return this.service.getOtpConfig();
  }

  @Patch('otp')
  @ApiOperation({
    summary: '[Chỉ Admin] Cập nhật cấu hình OTP',
    description: 'Thay đổi thời gian sống OTP và giới hạn số lần thử sai. Có hiệu lực với OTP mới tạo.',
  })
  @ApiResponse({ status: 200, type: OtpConfigResponseDto })
  updateOtpConfig(
    @Body() dto: UpdateOtpConfigDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OtpConfigResponseDto> {
    return this.service.updateOtpConfig(dto, user.sub);
  }

  // ─── Maintenance ───────────────────────────────────────────────────────────

  @Get('maintenance')
  @ApiOperation({
    summary: '[Chỉ Admin] Xem trạng thái chế độ bảo trì',
  })
  @ApiResponse({ status: 200, type: MaintenanceResponseDto })
  getMaintenanceConfig(): Promise<MaintenanceResponseDto> {
    return this.service.getMaintenanceConfig();
  }

  @Patch('maintenance')
  @ApiOperation({
    summary: '[Chỉ Admin] Bật/tắt chế độ bảo trì hệ thống',
    description:
      'Khi bật (`isEnabled: true`), mọi request từ user thông thường nhận `503 Service Unavailable`. ' +
      'Admin vẫn truy cập bình thường. Cờ được cache trong Redis để kiểm tra nhanh ở middleware.',
  })
  @ApiResponse({ status: 200, type: MaintenanceResponseDto })
  updateMaintenanceConfig(
    @Body() dto: UpdateMaintenanceDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MaintenanceResponseDto> {
    return this.service.updateMaintenanceConfig(dto, user.sub);
  }

  // ─── Health ────────────────────────────────────────────────────────────────

  @Get('health')
  @ApiOperation({
    summary: '[Chỉ Admin] Kiểm tra sức khoẻ hệ thống',
    description: 'Kiểm tra kết nối Database, Redis, và AI provider đang active.',
  })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  getHealth(): Promise<HealthResponseDto> {
    return this.service.getHealth();
  }
}
