import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt, Min, Max, IsBoolean, IsDateString,
} from 'class-validator';

const TTL_PATTERN = /^\d+[smhd]$/;

export class UpdateTokenConfigDto {
  @ApiPropertyOptional({
    example: '30m',
    description: 'TTL access token — số + đơn vị (s/m/h/d). VD: 15m, 1h',
  })
  @IsOptional()
  @IsString()
  @Matches(TTL_PATTERN, { message: 'accessTokenTtl phải có dạng số + đơn vị (s/m/h/d), VD: 15m' })
  accessTokenTtl?: string;

  @ApiPropertyOptional({
    example: '14d',
    description: 'TTL refresh token — số + đơn vị (s/m/h/d). VD: 7d, 30d',
  })
  @IsOptional()
  @IsString()
  @Matches(TTL_PATTERN, { message: 'refreshTokenTtl phải có dạng số + đơn vị (s/m/h/d), VD: 7d' })
  refreshTokenTtl?: string;
}

export class UpdateOtpConfigDto {
  @ApiPropertyOptional({
    example: 300,
    description: 'Thời gian sống OTP (giây). Tối thiểu 60s, tối đa 900s.',
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(900)
  ttlSeconds?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Số lần thử OTP sai tối đa trước khi bị khoá. Từ 3 đến 10.',
  })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  maxAttempts?: number;
}

export class UpdateMaintenanceDto {
  @ApiPropertyOptional({ example: true, description: 'Bật (true) / tắt (false) chế độ bảo trì' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    example: 'Hệ thống đang bảo trì, vui lòng thử lại sau 30 phút.',
    description: 'Thông báo hiển thị cho người dùng khi bảo trì',
  })
  @IsOptional()
  @IsString()
  message?: string | null;

  @ApiPropertyOptional({
    example: '2026-11-01T10:00:00Z',
    description: 'Thời gian dự kiến kết thúc bảo trì (ISO 8601 UTC)',
  })
  @IsOptional()
  @IsDateString()
  estimatedEndAt?: Date | null;
}
