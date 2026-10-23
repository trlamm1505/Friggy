/**
 * AdminUsersService — User Management
 */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import type { CreateAdminUserDto, ListUsersQueryDto, UpdateAdminUserDto } from './dto/admin-users.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────
  // GET /admin/users — Danh sách users
  // ─────────────────────────────────────────────────────────
  async getUsers(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q } },
        { email: { contains: query.q } },
        { googleEmail: { contains: query.q } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          googleEmail: true,
          authProvider: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          role: { select: { name: true } },
          subscription: {
            select: {
              status: true,
              plan: { select: { name: true, displayName: true } },
              endDate: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        ...u,
        role: u.role?.name,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────────────────
  // GET /admin/users/:id — Chi tiết user
  // ─────────────────────────────────────────────────────────
  async getUserDetail(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        googleEmail: true,
        authProvider: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        isOnboardingCompleted: true,
        role: { select: { name: true } },
        profile: true,
        preferences: {
          select: {
            dietaryStyle: true,
            skillLevel: true,
            householdSize: true,
            weeklyBudget: true,
          },
        },
        subscription: {
          select: {
            status: true,
            startDate: true,
            endDate: true,
            plan: { select: { name: true, displayName: true, priceVnd: true, aiUsagePerWeek: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Không tìm thấy user');

    // Lấy AI usage 7 ngày
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const aiUsageCount = await this.prisma.aiUsageLog.count({
      where: { userId: id, usedAt: { gte: weekAgo } },
    });

    return {
      ...user,
      role: user.role?.name,
      aiUsageThisWeek: aiUsageCount,
    };
  }

  // ─────────────────────────────────────────────────────────
  // POST /admin/users — [Chỉ Admin] Thêm user với role chỉ định
  // ─────────────────────────────────────────────────────────
  async createUser(dto: CreateAdminUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { googleEmail: dto.email },
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Email này đã được sử dụng trong hệ thống');
    }

    const role = await this.prisma.role.findFirst({
      where: { name: dto.role, deletedAt: null },
    });

    if (!role) {
      throw new NotFoundException(`Role "${dto.role}" không tồn tại trong hệ thống`);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const userId = uuid();

    const newUser = await this.prisma.user.create({
      data: {
        id: userId,
        email: dto.email,
        passwordHash,
        name: dto.name?.trim() || null,
        authProvider: 'email',
        status: dto.status ?? 'active',
        roleId: role.id,
        isOnboardingCompleted: true,
      },
      include: {
        role: { select: { name: true } },
      },
    });

    if (dto.name?.trim()) {
      await this.prisma.userProfile.create({
        data: {
          id: uuid(),
          userId,
          displayName: dto.name.trim(),
        },
      });
    }

    // Gán gói Free mặc định
    await this.assignFreePlan(userId);

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role.name,
      status: newUser.status,
      authProvider: newUser.authProvider,
      createdAt: newUser.createdAt,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Helper: Kiểm tra quyền chỉnh sửa người dùng
  // ─────────────────────────────────────────────────────────
  private validateUserEditPermission(
    targetUser: { id: string; role?: { name: string } | null },
    currentUser: JwtPayload,
    newRole?: string,
  ) {
    // 1. Không cho phép tự thao tác trên tài khoản của chính mình
    if (targetUser.id === currentUser.sub) {
      throw new BadRequestException(
        'Không thể tự chỉnh sửa hoặc thao tác trên tài khoản của chính mình',
      );
    }

    // 2. Nếu người thực hiện là manager:
    if (currentUser.role === 'manager') {
      // 2a. Không thể chỉnh sửa tài khoản Admin
      if (targetUser.role?.name === 'admin') {
        throw new ForbiddenException(
          'Manager không có quyền chỉnh sửa hoặc thao tác trên tài khoản Admin',
        );
      }

      // 2b. Không thể nâng cấp / gán vai trò Admin
      if (newRole === 'admin') {
        throw new ForbiddenException('Manager không có quyền cấp vai trò Admin');
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /admin/users/:id — Cập nhật thông tin & vai trò user
  // ─────────────────────────────────────────────────────────
  async updateUser(
    id: string,
    dto: UpdateAdminUserDto,
    currentUser: JwtPayload,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true, profile: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    this.validateUserEditPermission(user, currentUser, dto.role);

    let roleId: number | undefined;
    if (dto.role) {
      const role = await this.prisma.role.findFirst({
        where: { name: dto.role, deletedAt: null },
      });
      if (!role) throw new NotFoundException(`Role "${dto.role}" không tồn tại`);
      roleId = role.id;
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      if (dto.name !== undefined) {
        const trimmedName = dto.name.trim();
        if (trimmedName) {
          if (user.profile) {
            await tx.userProfile.update({
              where: { userId: user.id },
              data: { displayName: trimmedName },
            });
          } else {
            await tx.userProfile.create({
              data: {
                id: uuid(),
                userId: user.id,
                displayName: trimmedName,
              },
            });
          }
        }
      }

      return tx.user.update({
        where: { id },
        data: {
          name: dto.name !== undefined ? (dto.name.trim() || null) : undefined,
          status: dto.status,
          roleId,
        },
        include: { role: { select: { name: true } } },
      });
    });

    return {
      message: 'Cập nhật thông tin người dùng thành công',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role.name,
        status: updatedUser.status,
      },
    };
  }


  // ─────────────────────────────────────────────────────────
  // PATCH /admin/users/:id/suspend
  // ─────────────────────────────────────────────────────────
  async suspendUser(id: string, currentUser: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy user');

    this.validateUserEditPermission(user, currentUser);

    await this.prisma.user.update({
      where: { id },
      data: { status: 'suspended' },
    });

    return { message: `Đã khóa tài khoản user ${id}` };
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /admin/users/:id/activate
  // ─────────────────────────────────────────────────────────
  async activateUser(id: string, currentUser: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy user');

    this.validateUserEditPermission(user, currentUser);

    await this.prisma.user.update({
      where: { id },
      data: { status: 'active' },
    });

    return { message: `Đã mở khóa tài khoản user ${id}` };
  }

  // ─────────────────────────────────────────────────────────
  // Private Helper: Khởi tạo gói Free
  // ─────────────────────────────────────────────────────────
  private async assignFreePlan(userId: string): Promise<void> {
    const freePlan = await this.prisma.subscriptionPlan.findFirst({
      where: { name: 'free', isActive: true },
    });
    if (!freePlan) return;

    const existing = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });
    if (existing) return;

    await this.prisma.userSubscription.create({
      data: {
        id: uuid(),
        userId,
        planId: freePlan.id,
        startDate: new Date(),
        endDate: null,
        status: 'active',
        autoRenew: false,
      },
    });
  }
}
