import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: 'uuid-...' })
  id!: string;

  @ApiProperty({ example: 'Nguyễn Văn A', nullable: true })
  name!: string | null;

  @ApiProperty({ example: '+84912345678', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: 'user@gmail.com', nullable: true })
  googleEmail!: string | null;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ example: 'user' })
  role!: string;

  @ApiProperty({ example: false })
  isOnboardingCompleted!: boolean;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  refreshToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ example: true, description: 'true nếu user mới đăng ký lần đầu' })
  isNewUser!: boolean;
}

export class SendOtpResponseDto {
  @ApiProperty({ example: 'OTP đã được gửi đến +84912345678' })
  message!: string;

  @ApiProperty({ example: 300, description: 'Thời gian hiệu lực (giây)' })
  expiresIn!: number;
}

export class RefreshResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken!: string;
}
