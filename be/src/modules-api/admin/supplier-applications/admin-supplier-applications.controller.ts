import {
  Controller, Get, Post, Param, Query, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { AdminSupplierApplicationsService } from './admin-supplier-applications.service';
import {
  ListSupplierApplicationsDto,
  ReviewSupplierApplicationDto,
  AdminSupplierApplicationResponseDto,
} from './dto/admin-supplier-applications.dto';

@ApiTags('Admin / Supplier Applications')
@ApiBearerAuth('access-token')
@Roles('admin', 'manager')
@Controller('admin/supplier-applications')
export class AdminSupplierApplicationsController {
  constructor(private readonly service: AdminSupplierApplicationsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin | Manager] Danh sách đơn đăng ký đối tác' })
  findAll(@Query() dto: ListSupplierApplicationsDto) {
    return this.service.findAll(dto);
  }

  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: '[Admin | Manager] Chi tiết 1 đơn đăng ký' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/approve')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: '[Chỉ Admin] Duyệt đơn đăng ký đối tác',
    description: 'Tạo tài khoản User + SupplierProfile và gửi email kèm link đặt mật khẩu cho đối tác.',
  })
  approve(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.approve(id, user.sub);
  }

  @Post(':id/reject')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: '[Admin | Manager] Từ chối đơn đăng ký đối tác',
    description: 'Gửi email thông báo từ chối kèm lý do.',
  })
  reject(
    @Param('id') id: string,
    @Body() dto: ReviewSupplierApplicationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.reject(id, dto, user.sub);
  }
}

