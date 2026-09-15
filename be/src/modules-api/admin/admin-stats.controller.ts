import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AdminStatsService } from './admin-stats.service';
import { ListStatsQueryDto } from './dto/admin-phase12.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles('admin')
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly service: AdminStatsService) {}

  @Get('overview')
  @ApiOperation({ summary: '[Admin] Tổng quan: user, revenue, subscription' })
  @ApiResponse({ status: 200, description: 'Stats tổng quan' })
  getOverview() {
    return this.service.getOverview();
  }

  @Get('ai-usage')
  @ApiOperation({ summary: '[Admin] AI usage breakdown theo featureType' })
  @ApiQuery({ name: 'days', required: false, description: 'Số ngày nhìn lại (mặc định 7)' })
  @ApiResponse({ status: 200, description: 'AI usage stats' })
  getAiUsage(@Query() query: ListStatsQueryDto) {
    return this.service.getAiUsage(query.days ?? 7);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: '[Admin] Phân bố subscription plans' })
  @ApiResponse({ status: 200, description: 'Subscription breakdown' })
  getSubscriptionBreakdown() {
    return this.service.getSubscriptionBreakdown();
  }
}
