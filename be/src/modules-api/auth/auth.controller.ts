import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import {
  EmailRegisterDto,
  EmailLoginDto,
  VerifyEmailOtpDto,
  VerifyEmailOtpFullDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  GoogleAuthDto,
  RefreshTokenDto,
  LogoutDto,
} from './dto/auth.dto';
import {
  AuthResponseDto,
  OtpSentResponseDto,
  MessageResponseDto,
  RefreshResponseDto,
} from './dto/auth-response.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─────────────────────────────────────────────────────────
  // GOOGLE AUTH
  // ─────────────────────────────────────────────────────────

  @Post('google')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng Google ID Token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Google ID Token không hợp lệ' })
  async googleAuth(@Body() dto: GoogleAuthDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.googleAuth(
      dto,
      req.headers['user-agent'],
      (req.headers['x-forwarded-for'] as string) ?? req.ip,
    );
  }

  // ─────────────────────────────────────────────────────────
  // EMAIL REGISTER
  // ─────────────────────────────────────────────────────────

  @Post('email/register')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bước 1: Đăng ký bằng email — gửi OTP xác nhận' })
  @ApiResponse({ status: 200, type: OtpSentResponseDto })
  @ApiResponse({ status: 409, description: 'Email đã được đăng ký' })
  async emailRegister(@Body() dto: EmailRegisterDto): Promise<OtpSentResponseDto> {
    return this.authService.emailRegister(dto);
  }

  @Post('email/verify-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bước 2: Xác nhận OTP → kích hoạt tài khoản và nhận JWT' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'OTP sai hoặc hết hạn' })
  async verifyEmailOtp(
    @Body() dto: VerifyEmailOtpFullDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.authService.verifyEmailOtp(
      dto,
      passwordHash,
      dto.name,
      req.headers['user-agent'],
      (req.headers['x-forwarded-for'] as string) ?? req.ip,
    );
  }

  // ─────────────────────────────────────────────────────────
  // EMAIL LOGIN
  // ─────────────────────────────────────────────────────────

  @Post('email/login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng email + mật khẩu' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không chính xác' })
  async emailLogin(@Body() dto: EmailLoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.emailLogin(
      dto,
      req.headers['user-agent'],
      (req.headers['x-forwarded-for'] as string) ?? req.ip,
    );
  }

  // ─────────────────────────────────────────────────────────
  // FORGOT / RESET PASSWORD
  // ─────────────────────────────────────────────────────────

  @Post('email/forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi OTP đặt lại mật khẩu về email' })
  @ApiResponse({ status: 200, type: OtpSentResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<OtpSentResponseDto> {
    return this.authService.forgotPassword(dto);
  }

  @Post('email/reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng OTP' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'OTP sai hoặc hết hạn' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    return this.authService.resetPassword(dto);
  }

  // ─────────────────────────────────────────────────────────
  // CHANGE PASSWORD (cần JWT)
  // ─────────────────────────────────────────────────────────

  @Post('email/change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Đổi mật khẩu (yêu cầu đăng nhập)' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Mật khẩu hiện tại không đúng' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MessageResponseDto> {
    return this.authService.changePassword(user.sub, dto);
  }

  // ─────────────────────────────────────────────────────────
  // REFRESH TOKEN
  // ─────────────────────────────────────────────────────────

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới Access Token bằng Refresh Token' })
  @ApiResponse({ status: 200, type: RefreshResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc đã hết hạn' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<RefreshResponseDto> {
    return this.authService.refresh(dto);
  }

  // ─────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Đăng xuất — thu hồi Refresh Token' })
  @ApiResponse({ status: 204, description: 'Đăng xuất thành công' })
  async logout(@Body() dto: LogoutDto, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.authService.logout(dto, user.sub);
  }
}
