import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AdminRolesService } from './admin-roles.service';
import { CreateRoleDto, UpdateRoleDescriptionDto } from './dto/admin-roles.dto';
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

  // ─── POST /admin/roles ─────────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: '[Chỉ Admin] Tạo vai trò (role) mới trong hệ thống',
    description:
      'Chỉ tài khoản admin mới có quyền tạo role mới. Tên role chỉ được chứa chữ thường, số, dấu gạch dưới hoặc gạch ngang.',
  })
  @ApiResponse({ status: 201, type: RoleItemDto })
  @ApiResponse({ status: 400, description: 'Tên role không đúng định dạng' })
  @ApiResponse({ status: 409, description: 'Role đã tồn tại trong hệ thống' })
  createRole(@Body() dto: CreateRoleDto): Promise<RoleItemDto> {
    return this.service.createRole(dto);
  }

  // ─── PATCH /admin/roles/:name ──────────────────────────────────────────────

  @Patch(':name')
  @ApiOperation({
    summary: '[Chỉ Admin] Cập nhật mô tả của role',
    description: 'Cập nhật mô tả (`description`) cho role chỉ định.',
  })
  @ApiParam({
    name: 'name',
    description: 'Tên role',
    example: 'manager',
  })
  @ApiResponse({ status: 200, type: RoleItemDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy role' })
  updateRoleDescription(
    @Param('name') name: string,
    @Body() dto: UpdateRoleDescriptionDto,
  ): Promise<RoleItemDto> {
    return this.service.updateRoleDescription(name, dto);
  }
}
