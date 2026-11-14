import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { RedisService } from 'src/modules-system/redis/redis.service';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcryptjs';
import type { CreateSupplierApplicationDto, SupplierApplicationResponseDto } from './dto/supplier-application.dto';
import type { SetSupplierPasswordDto } from './dto/set-supplier-password.dto';

@Injectable()
export class SupplierApplicationService {
  private readonly logger = new Logger(SupplierApplicationService.name);
  private readonly SET_PASSWORD_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject('EMAIL_SERVICE') private readonly emailClient: ClientProxy,
  ) {}

  // ── Submit Application (Public) ───────────────────────────────────────────

  async apply(dto: CreateSupplierApplicationDto): Promise<SupplierApplicationResponseDto> {
    const email = dto.email.toLowerCase().trim();

    // Check email not already a registered user
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email này đã được đăng ký làm tài khoản người dùng');
    }

    // Check no pending/approved application for this email
    const existingApp = await this.prisma.supplierApplication.findFirst({
      where: { email, status: { in: ['pending', 'approved'] }, deletedAt: null },
    });
    if (existingApp) {
      if (existingApp.status === 'approved') {
        throw new ConflictException('Email này đã được phê duyệt làm đối tác. Vui lòng kiểm tra hộp thư để nhận tài khoản.');
      }
      throw new ConflictException('Đã có đơn đăng ký đang chờ duyệt với email này. Vui lòng chờ phản hồi từ chúng tôi.');
    }

    // Check no pending/approved application for this taxCode
    const taxCode = dto.taxCode.trim();
    const existingTaxApp = await this.prisma.supplierApplication.findFirst({
      where: { taxCode, status: { in: ['pending', 'approved'] }, deletedAt: null },
    });
    if (existingTaxApp) {
      throw new ConflictException('Mã số thuế này đã được đăng ký hoặc đang chờ xét duyệt.');
    }

    const application = await this.prisma.supplierApplication.create({
      data: {
        id: uuid(),
        companyName: dto.companyName.trim(),
        taxCode,
        contactName: dto.contactName.trim(),
        email,
        phone: dto.phone?.trim() ?? null,
        address: dto.address?.trim() ?? null,
        description: dto.description?.trim() ?? null,
        website: dto.website?.trim() ?? null,
        status: 'pending',
      },
    });

    // Send confirmation email
    this.emailClient.emit('email.send', {
      type: 'supplier_application_received',
      to: email,
      data: { companyName: dto.companyName.trim(), contactName: dto.contactName.trim() },
    });

    this.logger.log(`[Supplier] New application submitted: ${email} - ${dto.companyName}`);

    return this.mapApplication(application);
  }

  // ── Set Password (from email link) ───────────────────────────────────────

  async setPassword(dto: SetSupplierPasswordDto): Promise<{ accessToken: string; message: string }> {
    const redisKey = `supplier:set-password:${dto.token}`;
    const userId = await this.redis.get<string>(redisKey);

    if (!userId) {
      throw new BadRequestException('Link đặt mật khẩu không hợp lệ hoặc đã hết hạn (7 ngày).');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        status: 'active',
        isOnboardingCompleted: false,
      },
    });

    // Invalidate token
    await this.redis.del(redisKey);

    this.logger.log(`[Supplier] Password set for user ${userId}`);

    // Return simple success — client will redirect to login
    return {
      accessToken: '',
      message: 'Mật khẩu đã được đặt thành công. Vui lòng đăng nhập bằng email và mật khẩu vừa tạo.',
    };
  }

  // ── Mapper ────────────────────────────────────────────────────────────────

  private mapApplication(a: any): SupplierApplicationResponseDto {
    return {
      id: a.id,
      companyName: a.companyName,
      taxCode: a.taxCode ?? null,
      contactName: a.contactName,
      email: a.email,
      phone: a.phone ?? null,
      address: a.address ?? null,
      description: a.description ?? null,
      website: a.website ?? null,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    };
  }
}
