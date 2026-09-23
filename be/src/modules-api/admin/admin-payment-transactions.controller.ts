import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaymentTransactionsService } from '../payment-transactions/payment-transactions.service';
import { PaymentTransactionListResponseDto } from '../payment-transactions/dto/payment-transaction.dto';

@ApiTags('Admin — Payment Transactions')
@ApiBearerAuth('access-token')
@Roles('admin')
@Controller('admin/payment-transactions')
export class AdminPaymentTransactionsController {
  constructor(private readonly service: PaymentTransactionsService) {}

  // ─────────────────────────────────────────────────────────
  // GET /admin/payment-transactions — Tất cả giao dịch
  // ─────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: '[Admin] Toàn bộ lịch sử giao dịch thanh toán',
    description:
      'Lấy tất cả giao dịch với hỗ trợ filter theo `userId` và `status`.\n\n' +
      '**Filter status:** `pending` | `paid` | `expired` | `cancelled`',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter theo userId cụ thể' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'paid', 'expired', 'cancelled'],
    description: 'Filter theo trạng thái',
  })
  @ApiResponse({ status: 200, type: PaymentTransactionListResponseDto })
  getAllTransactions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ): Promise<PaymentTransactionListResponseDto> {
    return this.service.getAllTransactions({
      page: Number(page),
      limit: Number(limit),
      userId,
      status,
    });
  }
}
