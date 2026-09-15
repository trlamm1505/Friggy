import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AdminUsersService } from './admin-users.service';
import { ListUsersQueryDto } from './dto/admin-phase12.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles('admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách users (filter, phân trang)' })
  @ApiResponse({ status: 200, description: 'Danh sách users' })
  getUsers(@Query() query: ListUsersQueryDto) {
    return this.service.getUsers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Chi tiết user kèm profile, subscription, AI usage' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Chi tiết user' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  getUserDetail(@Param('id') id: string) {
    return this.service.getUserDetail(id);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: '[Admin] Khóa tài khoản user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Đã khóa tài khoản' })
  suspendUser(@Param('id') id: string) {
    return this.service.suspendUser(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: '[Admin] Mở khóa tài khoản user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Đã mở khóa tài khoản' })
  activateUser(@Param('id') id: string) {
    return this.service.activateUser(id);
  }
}
