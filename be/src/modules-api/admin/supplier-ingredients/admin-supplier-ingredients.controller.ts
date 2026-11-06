import { Controller, Get, Patch, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AdminSupplierIngredientsService } from './admin-supplier-ingredients.service';
import {
  ListSupplierIngredientsDto,
  ApproveSupplierIngredientDto,
  RejectSupplierIngredientDto,
} from './dto/admin-supplier-ingredients.dto';

@ApiTags('Admin / Supplier Ingredients')
@ApiBearerAuth('access-token')
@Roles('admin', 'manager')
@Controller('admin/supplier-ingredients')
export class AdminSupplierIngredientsController {
  constructor(private readonly service: AdminSupplierIngredientsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách nguyên liệu supplier (filter by status/profileId)' })
  findAll(@Query() dto: ListSupplierIngredientsDto, @Req() req: any) {
    return this.service.findAll(dto, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Chi tiết nguyên liệu supplier' })
  @ApiParam({ name: 'id', description: 'Supplier ingredient ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: '[Admin] Duyệt nguyên liệu supplier (optionally merge to global)' })
  @ApiParam({ name: 'id', description: 'Supplier ingredient ID' })
  approve(@Param('id') id: string, @Body() dto: ApproveSupplierIngredientDto, @Req() req: any) {
    return this.service.approve(id, dto, req.user.userId);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: '[Admin] Từ chối nguyên liệu supplier' })
  @ApiParam({ name: 'id', description: 'Supplier ingredient ID' })
  reject(@Param('id') id: string, @Body() dto: RejectSupplierIngredientDto, @Req() req: any) {
    return this.service.reject(id, dto, req.user.userId);
  }
}
