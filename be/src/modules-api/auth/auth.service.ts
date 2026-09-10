import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { TokensService } from 'src/modules-system/tokens/tokens.service';
import { SpeedSmsService } from 'src/modules-system/sms/speed-sms.service';
import { generateOtp, hashOtp, verifyOtp } from 'src/common/helpers/otp.helper';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuid } from 'uuid';
import {
  SendOtpDto,
  VerifyOtpDto,
  GoogleAuthDto,
  RefreshTokenDto,
  LogoutDto,
} from './dto/auth.dto';
import { AuthResponseDto, SendOtpResponseDto, RefreshResponseDto } from './dto/auth-response.dto';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const OTP_TTL_SECONDS = 300; // 5 phút
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_LIMIT_WINDOW_MINUTES = 10;
const OTP_RATE_LIMIT_MAX = 3;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensService: TokensService,
    private readonly smsService: SpeedSmsService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // GOOGLE AUTH
  // ─────────────────────────────────────────────────────────

  async googleAuth(
    dto: GoogleAuthDto,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    // 1. Verify Google ID Token
    let googlePayload: { sub: string; email?: string; name?: string };
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: GOOGLE_CLIENT_ID || undefined,
      });
      const p = ticket.getPayload();
      if (!p?.sub) throw new Error('No sub in Google payload');
      googlePayload = { sub: p.sub, email: p.email, name: p.name };
    } catch (err) {
      this.logger.warn(`Google verify failed: ${err}`);
      throw new UnauthorizedException('Google ID Token không hợp lệ');
    }

    // 2. Lấy role USER mặc định
    const userRole = await this.prisma.role.findFirst({ where: { name: 'user' } });
    if (!userRole) throw new InternalServerErrorException('Cấu hình role không tồn tại');

    // 3. Upsert user
    let isNewUser = false;
    let user = await this.prisma.user.findUnique({
      where: { googleId: googlePayload.sub },
      include: { role: true },
    });

    if (!user) {
      isNewUser = true;
      user = await this.prisma.user.create({
        data: {
          id: uuid(),
          googleId: googlePayload.sub,
          googleEmail: googlePayload.email ?? null,
          name: googlePayload.name ?? null,
          authProvider: 'google',
          status: 'active',
          roleId: userRole.id,
          isOnboardingCompleted: false,
          lastLoginAt: new Date(),
        },
        include: { role: true },
      });

      // Tự động tạo UserProfile với displayName từ Google
      if (googlePayload.name) {
        await this.prisma.userProfile.create({
          data: {
            id: uuid(),
            userId: user.id,
            displayName: googlePayload.name,
          },
        });
      }
    } else {
      // Cập nhật lastLoginAt, và name nếu chưa có
      const updateData: any = { lastLoginAt: new Date() };
      if (!user.name && googlePayload.name) {
        updateData.name = googlePayload.name;
      }
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
        include: { role: true },
      });

      // Tạo UserProfile nếu chưa có
      if (googlePayload.name) {
        const existingProfile = await this.prisma.userProfile.findUnique({
          where: { userId: user.id },
        });
        if (!existingProfile) {
          await this.prisma.userProfile.create({
            data: { id: uuid(), userId: user.id, displayName: googlePayload.name },
          });
        }
      }
    }

    if (user.status === 'suspended') {
      throw new ForbiddenException('Tài khoản của bạn đã bị khoá');
    }

    // 4. Sinh token pair
    const tokens = await this.tokensService.generateTokenPair(
      user.id,
      user.role.name,
      deviceInfo,
      ipAddress,
    );

    return {
      ...tokens,
      isNewUser,
      user: {
        id: user.id,
        name: user.name ?? null,
        phone: user.phone,
        googleEmail: user.googleEmail,
        status: user.status,
        role: user.role.name,
        isOnboardingCompleted: user.isOnboardingCompleted,
      },
    };
  }

  // ─────────────────────────────────────────────────────────
  // PHONE OTP
  // ─────────────────────────────────────────────────────────

  async sendOtp(dto: SendOtpDto): Promise<SendOtpResponseDto> {
    const { phone } = dto;

    // 1. Rate limit: không quá 3 OTP trong 10 phút
    const windowStart = new Date(Date.now() - OTP_RATE_LIMIT_WINDOW_MINUTES * 60_000);
    const recentCount = await this.prisma.otpVerification.count({
      where: {
        phone,
        createdAt: { gt: windowStart },
      },
    });
    if (recentCount >= OTP_RATE_LIMIT_MAX) {
      throw new BadRequestException(
        `Bạn đã gửi quá ${OTP_RATE_LIMIT_MAX} lần OTP. Vui lòng thử lại sau ${OTP_RATE_LIMIT_WINDOW_MINUTES} phút.`,
      );
    }

    // 2. Sinh OTP + hash
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    // 3. Lưu vào DB
    await this.prisma.otpVerification.create({
      data: {
        id: uuid(),
        phone,
        otpHash,
        purpose: 'login',
        expiresAt,
      },
    });

    // Gửi OTP qua SpeedSMS (DEV: log console | PROD: gửi SMS thật)
    await this.smsService.sendOtp(phone, otp);

    return {
      message: `OTP đã được gửi đến ${phone}`,
      expiresIn: OTP_TTL_SECONDS,
    };
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const { phone, otpCode } = dto;

    // 1. Tìm OTP còn hiệu lực
    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        phone,
        purpose: 'login',
        expiresAt: { gt: new Date() },
        verifiedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('OTP không tồn tại hoặc đã hết hạn');
    }

    // 2. Kiểm tra số lần thử
    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { verifiedAt: new Date() }, // invalidate
      });
      throw new BadRequestException('OTP đã vượt quá số lần thử. Vui lòng yêu cầu OTP mới.');
    }

    // 3. Verify OTP
    const isValid = await verifyOtp(otpCode, otpRecord.otpHash);
    if (!isValid) {
      await this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });
      throw new BadRequestException('OTP không chính xác');
    }

    // 4. Đánh dấu đã xác minh
    await this.prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verifiedAt: new Date() },
    });

    // 5. Lấy role USER
    const userRole = await this.prisma.role.findFirst({ where: { name: 'user' } });
    if (!userRole) throw new InternalServerErrorException('Cấu hình role không tồn tại');

    // 6. Upsert user
    let isNewUser = false;
    let user = await this.prisma.user.findUnique({
      where: { phone },
      include: { role: true },
    });

    if (!user) {
      isNewUser = true;
      user = await this.prisma.user.create({
        data: {
          id: uuid(),
          phone,
          authProvider: 'phone',
          status: 'active',
          roleId: userRole.id,
          isOnboardingCompleted: false,
          lastLoginAt: new Date(),
        },
        include: { role: true },
      });
    } else {
      if (user.status === 'suspended') {
        throw new ForbiddenException('Tài khoản của bạn đã bị khoá');
      }
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
        include: { role: true },
      });
    }

    // 7. Sinh token pair
    const tokens = await this.tokensService.generateTokenPair(
      user.id,
      user.role.name,
      deviceInfo,
      ipAddress,
    );

    return {
      ...tokens,
      isNewUser,
      user: {
        id: user.id,
        name: user.name ?? null,
        phone: user.phone,
        googleEmail: user.googleEmail,
        status: user.status,
        role: user.role.name,
        isOnboardingCompleted: user.isOnboardingCompleted,
      },
    };
  }

  // ─────────────────────────────────────────────────────────
  // REFRESH TOKEN
  // ─────────────────────────────────────────────────────────

  async refresh(dto: RefreshTokenDto): Promise<RefreshResponseDto> {
    const payload = await this.tokensService.verifyRefreshToken(dto.refreshToken);
    if (!payload) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const accessToken = await this.tokensService.refreshAccessToken(payload);
    return { accessToken };
  }

  // ─────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────

  async logout(dto: LogoutDto, userId: string): Promise<void> {
    await this.tokensService.revokeRefreshToken(dto.refreshToken, userId);
  }
}
