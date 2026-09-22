import { Controller, Get, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminPlansService } from './admin-plans.service';
import { UpdatePlanDto } from './dto/admin-plan.dto';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles('admin')
@Controller('admin/plans')
export class AdminPlansController {
  constructor(private readonly adminPlansService: AdminPlansService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách tất cả gói dịch vụ' })
  @ApiResponse({ status: 200, description: 'Danh sách gói' })
  getPlans() {
    return this.adminPlansService.getPlans();
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Cập nhật giá, rate limit, tên, tính năng gói' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Gói không tồn tại' })
  updatePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.adminPlansService.updatePlan(id, dto);
  }
}
