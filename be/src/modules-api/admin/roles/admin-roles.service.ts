import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { UpdateRoleDto } from './dto/admin-roles.dto';
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

  // ─── Cập nhật name / description role ─────────────────────────────────────

  async updateRole(
    currentName: string,
    dto: UpdateRoleDto,
  ): Promise<RoleItemDto> {
    const normalizedCurrent = currentName.trim().toLowerCase();
    const role = await this.prisma.role.findFirst({
      where: { name: normalizedCurrent, deletedAt: null },
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy role "${currentName}"`);
    }

    // Nếu đổi name → kiểm tra trùng
    if (dto.name) {
      const newName = dto.name.trim().toLowerCase();
      if (newName !== normalizedCurrent) {
        const conflict = await this.prisma.role.findFirst({
          where: { name: newName, deletedAt: null },
        });
        if (conflict) {
          throw new ConflictException(`Tên role "${newName}" đã tồn tại trong hệ thống`);
        }
      }
    }

    const updateData: { name?: string; description?: string } = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim().toLowerCase();
    if (dto.description !== undefined) updateData.description = dto.description;

    const updated = await this.prisma.role.update({
      where: { id: role.id },
      data: updateData,
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
