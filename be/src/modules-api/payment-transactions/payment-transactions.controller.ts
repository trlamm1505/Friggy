import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentTransactionsService } from './payment-transactions.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import {
  PaymentTransactionDetailDto,
  PaymentTransactionListResponseDto,
} from './dto/payment-transaction.dto';

@ApiTags('Payment Transactions')
@ApiBearerAuth('access-token')
@Controller('payment-transactions')
export class PaymentTransactionsController {
  constructor(private readonly service: PaymentTransactionsService) {}

  // ─────────────────────────────────────────────────────────
  // GET /payment-transactions/me — Lịch sử giao dịch
  // ─────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({
    summary: 'Lịch sử giao dịch thanh toán của user (paginated)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Trang (mặc định: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Số bản ghi/trang (mặc định: 10)',
  })
  @ApiResponse({ status: 200, type: PaymentTransactionListResponseDto })
  getMyTransactions(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ): Promise<PaymentTransactionListResponseDto> {
    return this.service.getMyTransactions(
      user.sub,
      Number(page),
      Number(limit),
    );
  }

  // ─────────────────────────────────────────────────────────
  // GET /payment-transactions/me/:paymentRef — Polling trạng thái
  // ─────────────────────────────────────────────────────────

  @Get('me/:paymentRef')
  @ApiOperation({
    summary:
      'Tra cứu trạng thái giao dịch theo paymentRef — dùng để FE polling',
  })
  @ApiResponse({ status: 200, type: PaymentTransactionDetailDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  getByPaymentRef(
    @CurrentUser() user: JwtPayload,
    @Param('paymentRef') paymentRef: string,
  ): Promise<PaymentTransactionDetailDto> {
    return this.service.findByPaymentRef(user.sub, paymentRef);
  }
}
