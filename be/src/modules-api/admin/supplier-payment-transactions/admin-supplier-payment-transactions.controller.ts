import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AdminSupplierPaymentTransactionsService } from './admin-supplier-payment-transactions.service';
import { ListSupplierTransactionsDto } from './dto/admin-supplier-payment-transactions.dto';

@ApiTags('Admin / Supplier Payment Transactions')
@ApiBearerAuth('access-token')
@Roles('admin', 'manager')
@Controller('admin/supplier-payment-transactions')
export class AdminSupplierPaymentTransactionsController {
  constructor(private readonly service: AdminSupplierPaymentTransactionsService) {}

  @Get()
  @ApiOperation({
    summary: '[Admin | Manager] Danh sách toàn bộ giao dịch thanh toán của nhà cung cấp',
    description: 'Hỗ trợ filter theo `profileId` và `status`. Trả về thông tin công ty, email supplier, tên gói, trạng thái giao dịch.',
  })
  findAll(@Query() dto: ListSupplierTransactionsDto) {
    return this.service.findAll(dto);
  }
}

