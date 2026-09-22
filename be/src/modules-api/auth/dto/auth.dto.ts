import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  Length,
  Matches,
  IsOptional,
} from 'class-validator';

// ─────────────────────────────────────────────────────────
// Email + Password Auth
// ─────────────────────────────────────────────────────────

export class EmailRegisterDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;
}

export class EmailLoginDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiProperty({ example: 'MyPassword123!' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class VerifyEmailOtpDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 chữ số' })
  @IsString()
  @Length(6, 6, { message: 'OTP phải đúng 6 chữ số' })
  @Matches(/^\d{6}$/, { message: 'OTP chỉ gồm chữ số' })
  otpCode!: string;
}

/** DTO đầy đủ cho POST /auth/email/verify-otp — Swagger hiển thị đúng payload */
export class VerifyEmailOtpFullDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 chữ số gửi về email' })
  @IsString()
  @Length(6, 6, { message: 'OTP phải đúng 6 chữ số' })
  @Matches(/^\d{6}$/, { message: 'OTP chỉ gồm chữ số' })
  otpCode!: string;

  @ApiProperty({ example: 'MyPassword123!', minLength: 8, description: 'Mật khẩu cho tài khoản' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(64)
  password!: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A', description: 'Tên hiển thị (tùy chọn)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otpCode!: string;

  @ApiProperty({ example: 'NewPassword123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới tối thiểu 8 ký tự' })
  @MaxLength(64)
  newPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ example: 'NewPassword123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới tối thiểu 8 ký tự' })
  @MaxLength(64)
  newPassword!: string;
}

// ─────────────────────────────────────────────────────────
// Google Auth (giữ nguyên)
// ─────────────────────────────────────────────────────────

export class GoogleAuthDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIs...',
    description: 'Google ID Token lấy từ Google Sign-In SDK',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}

// ─────────────────────────────────────────────────────────
// Token management (giữ nguyên)
// ─────────────────────────────────────────────────────────

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh Token hợp lệ' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty({ description: 'Refresh Token cần thu hồi' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
