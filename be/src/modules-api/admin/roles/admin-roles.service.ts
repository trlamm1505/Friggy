import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDescriptionDto } from './dto/admin-roles.dto';
import { RoleItemDto } from './dto/admin-roles-response.dto';

@Injectable()
export class AdminRolesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Danh sách tất cả role kèm số user ────────────────────────────────────

  async getRoles(): Promise<RoleItemDto[]> {
    const roles = await this.prisma.role.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { users: { where: { deletedAt: null } } },
        },
      },
      orderBy: { id: 'asc' },
    });

    return roles.map((r) => ({
      id:          r.id,
      name:        r.name,
      description: r.description,
      userCount:   r._count.users,
      createdAt:   r.createdAt,
    }));
  }

  // ─── Thêm role mới ────────────────────────────────────────────────────────

  async createRole(dto: CreateRoleDto): Promise<RoleItemDto> {
    const normalizedName = dto.name.trim().toLowerCase();

    const existing = await this.prisma.role.findFirst({
      where: { name: normalizedName, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException(`Role "${normalizedName}" đã tồn tại trong hệ thống`);
    }

    const newRole = await this.prisma.role.create({
      data: {
        name: normalizedName,
        description: dto.description?.trim() || null,
      },
    });

    return {
      id:          newRole.id,
      name:        newRole.name,
      description: newRole.description,
      userCount:   0,
      createdAt:   newRole.createdAt,
    };
  }

  // ─── Cập nhật mô tả role ───────────────────────────────────────────────────

  async updateRoleDescription(
    name: string,
    dto: UpdateRoleDescriptionDto,
  ): Promise<RoleItemDto> {
    const normalizedName = name.trim().toLowerCase();
    const role = await this.prisma.role.findFirst({
      where: { name: normalizedName, deletedAt: null },
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy role "${name}"`);
    }

    const updated = await this.prisma.role.update({
      where: { id: role.id },
      data:  { description: dto.description },
      include: {
        _count: {
          select: { users: { where: { deletedAt: null } } },
        },
      },
    });

    return {
      id:          updated.id,
      name:        updated.name,
      description: updated.description,
      userCount:   updated._count.users,
      createdAt:   updated.createdAt,
    };
  }
}
