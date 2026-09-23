import { ApiProperty } from '@nestjs/swagger';

export class PaymentTransactionDto {
  @ApiProperty({ example: 'uuid-xxx' })
  id!: string;

  @ApiProperty({ example: 'FRIGGY-1727100000000' })
  paymentRef!: string | null;

  @ApiProperty({ example: 'subscribe', description: 'subscribe | renew' })
  type!: string;

  @ApiProperty({ example: 'Individual', description: 'Tên gói dịch vụ' })
  planName!: string;

  @ApiProperty({ example: 25000 })
  amount!: number;

  @ApiProperty({ example: 'pending', description: 'pending | paid | failed | cancelled | expired' })
  status!: string;

  @ApiProperty({ example: 'https://pay.payos.vn/web/abc123', nullable: true })
  checkoutUrl!: string | null;

  @ApiProperty({ example: '2026-09-24T02:30:00.000Z', nullable: true })
  expiredAt!: string | null;

  @ApiProperty({ example: '2026-09-24T02:35:00.000Z', nullable: true })
  paidAt!: string | null;

  @ApiProperty({ example: '2026-09-24T02:28:00.000Z' })
  createdAt!: string;
}

export class PaymentTransactionDetailDto extends PaymentTransactionDto {
  @ApiProperty({ example: 'payos' })
  paymentMethod!: string;

  @ApiProperty({ example: 'VQRIU43N5Q', nullable: true, description: 'Reference từ PayOS webhook' })
  payosTransactionRef!: string | null;

  @ApiProperty({ example: 'data:image/png;base64,...', nullable: true, description: 'QR code từ PayOS (null nếu đã hết hạn)' })
  qrCode!: string | null;
}

export class PaymentTransactionListResponseDto {
  @ApiProperty({ type: [PaymentTransactionDto] })
  data!: PaymentTransactionDto[];

  @ApiProperty({ example: 10 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;
}
