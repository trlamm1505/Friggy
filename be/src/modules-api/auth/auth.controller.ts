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
import { AuthService } from './auth.service';
import {
  SendOtpDto,
  VerifyOtpDto,
  GoogleAuthDto,
  RefreshTokenDto,
  LogoutDto,
} from './dto/auth.dto';
import {
  AuthResponseDto,
  SendOtpResponseDto,
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
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Google ID Token không hợp lệ' })
  async googleAuth(
    @Body() dto: GoogleAuthDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = (req.headers['x-forwarded-for'] as string) ?? req.ip;
    return this.authService.googleAuth(dto, deviceInfo, ipAddress);
  }

  // ─────────────────────────────────────────────────────────
  // PHONE OTP
  // ─────────────────────────────────────────────────────────

  @Post('phone/send-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi mã OTP 6 chữ số về số điện thoại' })
  @ApiResponse({
    status: 200,
    description: 'OTP đã gửi thành công',
    type: SendOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Vượt quá giới hạn gửi OTP hoặc SĐT không hợp lệ',
  })
  async sendOtp(@Body() dto: SendOtpDto): Promise<SendOtpResponseDto> {
    return this.authService.sendOtp(dto);
  }

  @Post('phone/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xác minh OTP và đăng nhập / đăng ký bằng số điện thoại',
  })
  @ApiResponse({
    status: 200,
    description: 'Xác minh thành công, trả về JWT',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'OTP sai hoặc hết hạn' })
  @ApiResponse({ status: 403, description: 'Tài khoản bị khoá' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = (req.headers['x-forwarded-for'] as string) ?? req.ip;
    return this.authService.verifyOtp(dto, deviceInfo, ipAddress);
  }

  // ─────────────────────────────────────────────────────────
  // REFRESH TOKEN
  // ─────────────────────────────────────────────────────────

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới Access Token bằng Refresh Token' })
  @ApiResponse({
    status: 200,
    description: 'Trả về access token mới',
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token không hợp lệ hoặc đã hết hạn',
  })
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
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async logout(
    @Body() dto: LogoutDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.authService.logout(dto, user.sub);
  }
}
