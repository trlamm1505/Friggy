import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TokenConfigResponseDto {
  @ApiProperty({ example: '15m', description: 'TTL access token hiện tại' })
  accessTokenTtl!: string;

  @ApiProperty({ example: '7d', description: 'TTL refresh token hiện tại' })
  refreshTokenTtl!: string;
}

export class OtpConfigResponseDto {
  @ApiProperty({ example: 300, description: 'Thời gian sống OTP (giây)' })
  ttlSeconds!: number;

  @ApiProperty({ example: 5, description: 'Số lần thử OTP sai tối đa' })
  maxAttempts!: number;
}

export class MaintenanceResponseDto {
  @ApiProperty({ example: false, description: 'Chế độ bảo trì đang bật hay không' })
  isEnabled!: boolean;

  @ApiPropertyOptional({ example: 'Hệ thống đang bảo trì...', nullable: true })
  message!: string | null;

  @ApiPropertyOptional({ type: Date, nullable: true, description: 'Thời gian dự kiến kết thúc bảo trì' })
  estimatedEndAt!: Date | null;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', description: 'Trạng thái kết nối Database (ok | error | unknown)' })
  database!: string;

  @ApiProperty({ example: 'ok', description: 'Trạng thái kết nối Redis (ok | error | unknown)' })
  redis!: string;

  @ApiProperty({ example: 'ok (gemini/gemini-1.5-pro)', description: 'Trạng thái AI provider đang active' })
  aiProvider!: string;
}
