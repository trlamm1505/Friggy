import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { AdminUsersService } from './admin-users.service';
import { ListUsersQueryDto, CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-users.dto';
import {
  PaginatedUsersDto,
  UserDetailDto,
  UserActionResponseDto,
  AdminCreatedUserResponseDto,
  AdminUpdatedUserResponseDto,
} from './dto/admin-users-response.dto';

@ApiTags('Admin / Users')
@ApiBearerAuth('access-token')
@Roles('admin', 'manager')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: '[Admin | Manager] Danh sách users (filter, phân trang)' })
  @ApiResponse({ status: 200, type: PaginatedUsersDto })
  getUsers(@Query() query: ListUsersQueryDto) {
    return this.service.getUsers(query);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({
    summary: '[Chỉ Admin] Thêm người dùng mới với role chỉ định',
    description:
      'Chỉ tài khoản admin mới có quyền tạo user/manager/admin mới. Tự động mã hóa mật khẩu, tạo profile và gán gói Free.',
  })
  @ApiResponse({ status: 201, type: AdminCreatedUserResponseDto })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Email đã tồn tại' })
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.service.createUser(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin | Manager] Chi tiết user kèm profile, subscription, AI usage' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, type: UserDetailDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  getUserDetail(@Param('id') id: string) {
    return this.service.getUserDetail(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '[Admin | Manager] Cập nhật thông tin & vai trò người dùng',
    description:
      'Cho phép cập nhật name, role, status. Không được tự chỉnh sửa tài khoản của chính mình. Manager không thể chỉnh sửa tài khoản Admin hoặc gán role Admin.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, type: AdminUpdatedUserResponseDto })
  @ApiResponse({ status: 400, description: 'Không thể tự chỉnh sửa tài khoản của chính mình' })
  @ApiResponse({ status: 403, description: 'Manager không có quyền chỉnh sửa tài khoản Admin' })
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.service.updateUser(id, dto, currentUser);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: '[Admin | Manager] Khóa tài khoản user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, type: UserActionResponseDto })
  @ApiResponse({ status: 400, description: 'Không thể tự khóa tài khoản của chính mình' })
  @ApiResponse({ status: 403, description: 'Manager không có quyền khóa tài khoản Admin' })
  suspendUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.service.suspendUser(id, currentUser);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: '[Admin | Manager] Mở khóa tài khoản user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, type: UserActionResponseDto })
  @ApiResponse({ status: 400, description: 'Không thể tự thao tác tài khoản của chính mình' })
  @ApiResponse({ status: 403, description: 'Manager không có quyền thao tác tài khoản Admin' })
  activateUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.service.activateUser(id, currentUser);
  }
}
