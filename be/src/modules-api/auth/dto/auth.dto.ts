import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Matches,
  Length,
} from 'class-validator';

/**
 * DTO gửi OTP về số điện thoại
 */
export class SendOtpDto {
  @ApiProperty({
    example: '+84912345678',
    description: 'Số điện thoại định dạng E.164 (bắt đầu bằng +84)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+84[3-9]\d{8}$/, {
    message: 'Số điện thoại không hợp lệ (cần định dạng +84xxxxxxxxx)',
  })
  phone!: string;
}

/**
 * DTO xác minh OTP
 */
export class VerifyOtpDto {
  @ApiProperty({ example: '+84912345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+84[3-9]\d{8}$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  phone!: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 chữ số' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP phải đúng 6 chữ số' })
  @Matches(/^\d{6}$/, { message: 'OTP chỉ gồm chữ số' })
  otpCode!: string;
}

/**
 * DTO đăng nhập bằng Google
 */
export class GoogleAuthDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIs...',
    description: 'Google ID Token lấy từ Google Sign-In SDK',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}

/**
 * DTO làm mới access token
 */
export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh Token hợp lệ' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

/**
 * DTO đăng xuất
 */
export class LogoutDto {
  @ApiProperty({ description: 'Refresh Token cần thu hồi' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
