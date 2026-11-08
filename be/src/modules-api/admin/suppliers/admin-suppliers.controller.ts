import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { AdminSuppliersService } from './admin-suppliers.service';
import { ListSuppliersDto, VerifySupplierDto } from './dto/admin-suppliers.dto';

@ApiTags('Admin / Suppliers')
@ApiBearerAuth('access-token')
@Roles('admin', 'manager')
@Controller('admin/suppliers')
export class AdminSuppliersController {
  constructor(private readonly service: AdminSuppliersService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách nhà cung cấp' })
  findAll(@Query() dto: ListSuppliersDto) {
    return this.service.findAll(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Chi tiết nhà cung cấp' })
  @ApiParam({ name: 'id', description: 'Supplier profile ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: '[Admin] Xác minh / thu hồi xác minh nhà cung cấp' })
  @ApiParam({ name: 'id', description: 'Supplier profile ID' })
  verify(@Param('id') id: string, @Body() dto: VerifySupplierDto, @CurrentUser() user: JwtPayload) {
    return this.service.verify(id, dto, user.sub);
  }
}
