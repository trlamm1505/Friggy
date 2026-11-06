import { Controller, Get, Patch, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
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
  verify(@Param('id') id: string, @Body() dto: VerifySupplierDto, @Req() req: any) {
    return this.service.verify(id, dto, req.user.userId);
  }
}
