import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AdminActivityLogsService } from './admin-activity-logs.service';
import { ListActivityLogsQueryDto } from './dto/admin-activity-logs.dto';

@ApiTags('Admin / Activity Logs')
@ApiBearerAuth('access-token')
@Roles('admin')
@Controller('admin/activity-logs')
export class AdminActivityLogsController {
  constructor(private readonly service: AdminActivityLogsService) {}

  @Get()
  @ApiOperation({
    summary: '[Chỉ Admin] Danh sách log hoạt động của Admin/Manager',
    description:
      'Xem lịch sử thao tác của tất cả admin và manager. Hỗ trợ filter theo `adminId`, `action`, `targetEntity`, khoảng ngày và phân trang.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách log có phân trang' })
  getLogs(@Query() query: ListActivityLogsQueryDto) {
    return this.service.getLogs(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '[Chỉ Admin] Chi tiết 1 bản ghi log',
    description: 'Xem đầy đủ thông tin log kèm `oldValue` và `newValue` để audit.',
  })
  @ApiParam({ name: 'id', description: 'Activity Log ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Chi tiết bản ghi log' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy log' })
  async getLogDetail(@Param('id') id: string) {
    const log = await this.service.getLogDetail(id);
    if (!log) throw new NotFoundException('Không tìm thấy bản ghi log');
    return log;
  }
}
