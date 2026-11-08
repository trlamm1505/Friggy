import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { RedisService } from 'src/modules-system/redis/redis.service';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcryptjs';
import type {
  ListSupplierApplicationsDto,
  ReviewSupplierApplicationDto,
} from './dto/admin-supplier-applications.dto';

@Injectable()
export class AdminSupplierApplicationsService {
  private readonly logger = new Logger(AdminSupplierApplicationsService.name);
  private readonly SET_PASSWORD_TTL = 7 * 24 * 60 * 60; // 7 ngày

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject('EMAIL_SERVICE') private readonly emailClient: ClientProxy,
  ) {}

  // ── List ──────────────────────────────────────────────────────────────────

  async findAll(dto: ListSupplierApplicationsDto) {
    const { status, search, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { email: { contains: search } },
        { contactName: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.supplierApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplierApplication.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Detail ────────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const app = await this.prisma.supplierApplication.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, status: true } },
        reviewer: { select: { id: true, email: true } },
      },
    });
    if (!app) throw new NotFoundException('Không tìm thấy đơn đăng ký');
    return app;
  }

  // ── Approve ───────────────────────────────────────────────────────────────

  async approve(id: string, adminId: string) {
    const app = await this.prisma.supplierApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Không tìm thấy đơn đăng ký');
    if (app.status !== 'pending') {
      throw new ConflictException(`Đơn đã được xử lý (trạng thái: ${app.status})`);
    }

    // Check email chưa có User
    const existingUser = await this.prisma.user.findUnique({ where: { email: app.email } });
    if (existingUser) {
      throw new ConflictException('Email này đã tồn tại trong hệ thống');
    }

    // Lấy roleId food_supplier
    const supplierRole = await this.prisma.role.findFirst({
      where: { name: 'food_supplier', deletedAt: null },
    });
    if (!supplierRole) {
      throw new BadRequestException('Role food_supplier chưa được tạo trong hệ thống');
    }

    // Tạo User + SupplierProfile trong 1 transaction
    const tempPasswordHash = await bcrypt.hash(uuid(), 10); // temp password, sẽ bị thay bởi set-password
    const newUserId = uuid();
    const profileId = uuid();

    await this.prisma.$transaction(async (tx) => {
      // 1. Tạo User
      await tx.user.create({
        data: {
          id: newUserId,
          email: app.email,
          passwordHash: tempPasswordHash,
          authProvider: 'email' as any,
          status: 'pending' as any, // sẽ active khi set password
          roleId: supplierRole.id,
          name: app.contactName,
        },
      });

      // 2. Tạo SupplierProfile
      await tx.supplierProfile.create({
        data: {
          id: profileId,
          userId: newUserId,
          companyName: app.companyName,
          contactPhone: app.phone ?? null,
          address: app.address ?? null,
          description: app.description ?? null,
          isVerified: true, // admin đã verify khi approve
        },
      });

      // 3. Cập nhật Application
      await tx.supplierApplication.update({
        where: { id },
        data: {
          status: 'approved',
          userId: newUserId,
          reviewedAt: new Date(),
          reviewedBy: adminId,
        },
      });
    });

    // Tạo set-password token → Redis TTL 7 ngày
    const setPasswordToken = uuid();
    const redisKey = `supplier:set-password:${setPasswordToken}`;
    await this.redis.set(redisKey, newUserId, this.SET_PASSWORD_TTL);

    // Build set-password URL
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const setPasswordUrl = `${frontendUrl}/supplier/set-password?token=${setPasswordToken}`;

    // Ghi AdminActivityLog
    await this.prisma.adminActivityLog.create({
      data: {
        id: uuid(),
        adminId,
        action: 'approve_supplier_application',
        targetEntity: 'supplier_applications',
        targetId: id,
        newValue: { email: app.email, companyName: app.companyName, newUserId },
      },
    });

    // Gửi email duyệt + link set password
    this.emailClient.emit('email.send', {
      type: 'supplier_application_approved',
      to: app.email,
      data: {
        contactName: app.contactName,
        companyName: app.companyName,
        setPasswordUrl,
      },
    });

    this.logger.log(`[Admin] Approved supplier application ${id} → userId: ${newUserId}`);

    return { message: 'Đã duyệt đơn. Tài khoản đã được tạo và email đã được gửi.', userId: newUserId };
  }

  // ── Reject ────────────────────────────────────────────────────────────────

  async reject(id: string, dto: ReviewSupplierApplicationDto, adminId: string) {
    const app = await this.prisma.supplierApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Không tìm thấy đơn đăng ký');
    if (app.status !== 'pending') {
      throw new ConflictException(`Đơn đã được xử lý (trạng thái: ${app.status})`);
    }

    if (!dto.rejectionReason?.trim()) {
      throw new BadRequestException('Vui lòng cung cấp lý do từ chối');
    }

    await this.prisma.supplierApplication.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: dto.rejectionReason.trim(),
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });

    // Ghi AdminActivityLog
    await this.prisma.adminActivityLog.create({
      data: {
        id: uuid(),
        adminId,
        action: 'reject_supplier_application',
        targetEntity: 'supplier_applications',
        targetId: id,
        newValue: { email: app.email, companyName: app.companyName, reason: dto.rejectionReason },
      },
    });

    // Gửi email từ chối
    this.emailClient.emit('email.send', {
      type: 'supplier_application_rejected',
      to: app.email,
      data: {
        contactName: app.contactName,
        companyName: app.companyName,
        reason: dto.rejectionReason.trim(),
      },
    });

    this.logger.log(`[Admin] Rejected supplier application ${id} - ${app.email}`);

    return { message: 'Đã từ chối đơn và gửi email thông báo.' };
  }
}
