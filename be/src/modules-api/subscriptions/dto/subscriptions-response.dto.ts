import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Gói dịch vụ ─────────────────────────────────────────────────────────────

export class SubscriptionPlanResponseDto {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ example: 'free', description: 'Mã gói: free | individual' }) name!: string;
  @ApiProperty({ example: 'Gói Miễn Phí (Basic)', description: 'Tên hiển thị' }) displayName!: string;
  @ApiProperty({ example: 0, description: 'Giá gói (VND)' }) priceVnd!: number;
  @ApiProperty({ example: 'forever', description: 'Chu kỳ thanh toán: forever | monthly' }) billingCycle!: string;
  @ApiProperty({
    type: [String],
    example: ['Tối đa 1 tủ lạnh', 'Nhập thủ công', 'Cảnh báo hết hạn'],
    description: 'Danh sách tính năng của gói',
  })
  features!: string[];
  @ApiProperty({ example: 2, description: 'Số lượt AI/tuần (-1 = không giới hạn)' }) aiUsagePerWeek!: number;
  @ApiProperty() isActive!: boolean;
}

// ─── Gói đang đăng ký của user ───────────────────────────────────────────────

export class UserSubscriptionResponseDto {
  @ApiProperty({ description: 'ID bản ghi subscription' }) id!: string;
  @ApiProperty({ example: 'active', description: 'Trạng thái: active | cancelled | expired' }) status!: string;
  @ApiProperty({ example: '2026-09-01', description: 'Ngày bắt đầu (YYYY-MM-DD)' }) startDate!: string;
  @ApiPropertyOptional({ example: '2026-10-01', description: 'Ngày hết hạn (null = gói free)' }) endDate!: string | null;
  @ApiPropertyOptional({ example: 'FRIGGY-2026-001', description: 'Mã tham chiếu thanh toán' }) paymentRef!: string | null;
  @ApiProperty({ example: true, description: 'false = đã đặt hủy gia hạn, gói hết hạn sẽ về Free' }) autoRenew!: boolean;
  @ApiPropertyOptional({ example: '2026-09-22T...', description: 'Thời điểm yêu cầu hủy gia hạn' }) cancelledAt!: string | null;
  @ApiProperty({ type: SubscriptionPlanResponseDto }) plan!: SubscriptionPlanResponseDto;
  @ApiProperty() createdAt!: string;
}

// ─── Kết quả đăng ký (QR thanh toán) ────────────────────────────────────────

export class SubscribeResponseDto {
  @ApiProperty({ example: 'https://pay.payos.vn/web/abc123', description: 'URL trang thanh toán PayOS (dùng để mở WebView hoặc browser)' }) checkoutUrl!: string;
  @ApiProperty({ example: 'data:image/png;base64,...', description: 'Ảnh QR base64 từ PayOS — dùng để hiển thị trực tiếp trong app' }) qrCode!: string;
  @ApiProperty({ example: 'FRIGGY-1727100000000', description: 'Mã tham chiếu nội bộ dùng để đối soát' }) paymentRef!: string;
  @ApiProperty({ example: 25000, description: 'Số tiền cần thanh toán (VND)' }) amount!: number;
  @ApiProperty({ example: '2026-09-24T02:00:00Z', description: 'Link thanh toán hết hạn sau 15 phút' }) expireAt!: string;
  @ApiProperty({ example: 'pending', description: 'Trạng thái: pending | active | cancelled' }) status!: string;
}

// ─── Kết quả webhook callback ────────────────────────────────────────────────

export class WebhookResponseDto {
  @ApiProperty({ example: true, description: 'Đã nhận và xử lý webhook thành công' }) received!: boolean;
}

// ─── Hủy gia hạn ─────────────────────────────────────────────────────────────

export class CancelRenewalResponseDto {
  @ApiProperty({ example: 'Đã hủy gia hạn tự động. Gói sẽ hết hạn vào 2026-10-22.' }) message!: string;
  @ApiProperty({ example: '2026-10-22', description: 'Ngày hết hạn thực tế' }) endDate!: string | null;
}
