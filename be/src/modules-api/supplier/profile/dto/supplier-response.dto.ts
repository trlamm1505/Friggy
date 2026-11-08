import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupplierPaymentTransactionDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'subscribe | renewal' }) type!: string;
  @ApiProperty() amount!: number;
  @ApiProperty({ description: 'pending | paid | failed | cancelled' }) status!: string;
  @ApiProperty() paymentRef!: string;
  @ApiPropertyOptional() description!: string | null;
  @ApiPropertyOptional() checkoutUrl!: string | null;
  @ApiPropertyOptional() paidAt!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ description: 'Tên gói cước' }) planName!: string;
}

export class SupplierProfileResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() companyName: string;
  @ApiPropertyOptional() contactPhone: string | null;
  @ApiPropertyOptional() address: string | null;
  @ApiPropertyOptional() logoPath: string | null;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty() isVerified: boolean;
  @ApiProperty() createdAt: string;
}

export class SupplierPlanResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() displayName: string;
  @ApiProperty() priceVnd: number;
  @ApiProperty() billingCycle: string;
  @ApiProperty() maxIngredients: number;
  @ApiProperty({ type: [String] }) features: string[];
  @ApiProperty() isActive: boolean;
}

export class SupplierSubscriptionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() status: string;
  @ApiProperty() startDate: string;
  @ApiProperty() endDate: string;
  @ApiProperty() autoRenew: boolean;
  @ApiPropertyOptional() cancelledAt: string | null;
  @ApiProperty({ type: SupplierPlanResponseDto }) plan: SupplierPlanResponseDto;
}

export class SupplierSubscribeResponseDto {
  @ApiProperty() checkoutUrl: string;
  @ApiProperty() qrCode: string;
  @ApiProperty() paymentRef: string;
  @ApiProperty() amount: number;
  @ApiProperty() expireAt: string;
  @ApiProperty() status: string;
}

