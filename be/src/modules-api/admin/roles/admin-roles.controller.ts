import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AdminRolesService } from './admin-roles.service';
import { UpdateRoleDto } from './dto/admin-roles.dto';
import { RoleItemDto } from './dto/admin-roles-response.dto';

@ApiTags('Admin / Roles')
@ApiBearerAuth('access-token')
@Roles('admin')
@Controller('admin/roles')
export class AdminRolesController {
  constructor(private readonly service: AdminRolesService) {}

  // ─── GET /admin/roles ──────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: '[Chỉ Admin] Danh sách tất cả role trong hệ thống',
    description:
      'Trả về danh sách tất cả các role trong hệ thống kèm mô tả và số lượng user đang có role đó.',
  })
  @ApiResponse({ status: 200, type: [RoleItemDto] })
  getRoles(): Promise<RoleItemDto[]> {
    return this.service.getRoles();
  }

  // ─── PATCH /admin/roles/:name ──────────────────────────────────────────────

  @Patch(':name')
  @ApiOperation({
    summary: '[Chỉ Admin] Cập nhật name / description của role',
    description: 'Cập nhật tên (`name`) hoặc mô tả (`description`) cho role chỉ định. Các field đều optional — chỉ truyền field cần thay đổi.',
  })
  @ApiParam({
    name: 'name',
    description: 'Tên role hiện tại (dùng để định danh)',
    example: 'manager',
  })
  @ApiResponse({ status: 200, type: RoleItemDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy role' })
  @ApiResponse({ status: 409, description: 'Tên role mới đã tồn tại' })
  updateRole(
    @Param('name') name: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleItemDto> {
    return this.service.updateRole(name, dto);
  }
}
