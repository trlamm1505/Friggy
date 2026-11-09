import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AdminSupplierPlansService } from './admin-supplier-plans.service';
import { CreateSupplierPlanDto, UpdateSupplierPlanDto } from './dto/admin-supplier-plans.dto';

@ApiTags('Admin / Supplier Plans')
@ApiBearerAuth('access-token')
@Roles('admin')
@Controller('admin/supplier-plans')
export class AdminSupplierPlansController {
  constructor(private readonly service: AdminSupplierPlansService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách gói cước supplier' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: '[Admin] Tạo gói cước supplier mới' })
  create(@Body() dto: CreateSupplierPlanDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Cập nhật gói cước supplier' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplierPlanDto) {
    return this.service.update(id, dto);
  }
}
