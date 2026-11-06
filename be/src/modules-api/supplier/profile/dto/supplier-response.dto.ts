import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

