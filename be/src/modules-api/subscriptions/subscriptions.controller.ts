import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto } from './dto/subscriptions.dto';
import {
  SubscriptionPlanResponseDto,
  UserSubscriptionResponseDto,
  SubscribeResponseDto,
  WebhookResponseDto,
  CancelRenewalResponseDto,
} from './dto/subscriptions-response.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // ─────────────────────────────────────────────────────────
  // GET /plans — DS gói (Public — cho Web SEO gọi không cần auth)
  // ─────────────────────────────────────────────────────────

  @Get('plans')
  @Public()
  @ApiOperation({ summary: '[Public] Danh sách gói dịch vụ: Free, Individual, Family' })
  @ApiResponse({ status: 200, type: [SubscriptionPlanResponseDto] })
  getPlans(): Promise<SubscriptionPlanResponseDto[]> {
    return this.subscriptionsService.getPlans();
  }

  // ─────────────────────────────────────────────────────────
  // GET /me — Gói hiện tại
  // ─────────────────────────────────────────────────────────

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Gói dịch vụ hiện tại của user' })
  @ApiResponse({ status: 200, type: UserSubscriptionResponseDto })
  getMySubscription(@CurrentUser() user: JwtPayload): Promise<UserSubscriptionResponseDto> {
    return this.subscriptionsService.getMySubscription(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // POST /subscribe — Đăng ký gói có phí
  // ─────────────────────────────────────────────────────────

  @Post('subscribe')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Đăng ký gói Individual/Family → nhận QR thanh toán (mock)' })
  @ApiResponse({ status: 201, type: SubscribeResponseDto })
  @ApiResponse({ status: 400, description: 'Gói không hợp lệ hoặc đã đăng ký rồi' })
  subscribe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubscribeDto,
  ): Promise<SubscribeResponseDto> {
    return this.subscriptionsService.subscribe(user.sub, dto);
  }

  // ─────────────────────────────────────────────────────────
  // POST /renew — Gia hạn thêm 1 tháng (mock)
  // ─────────────────────────────────────────────────────────

  @Post('renew')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Gia hạn gói thêm 1 tháng (mock — chưa gắn thanh toán)' })
  @ApiResponse({ status: 200, type: SubscribeResponseDto })
  @ApiResponse({ status: 400, description: 'Không thể gia hạn gói Free' })
  renew(@CurrentUser() user: JwtPayload): Promise<SubscribeResponseDto> {
    return this.subscriptionsService.renew(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /me/auto-renewal — Hủy gia hạn tự động (vẫn dùng đến hết endDate)
  // ─────────────────────────────────────────────────────────

  @Delete('me/auto-renewal')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Hủy gia hạn tự động — gói giữ nguyên đến hết endDate rồi về Free',
  })
  @ApiResponse({ status: 200, type: CancelRenewalResponseDto })
  @ApiResponse({ status: 400, description: 'Không thể hủy gia hạn gói Free' })
  cancelRenewal(@CurrentUser() user: JwtPayload): Promise<CancelRenewalResponseDto> {
    return this.subscriptionsService.cancelRenewal(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // POST /webhook — Callback cổng thanh toán (Public)
  // ─────────────────────────────────────────────────────────

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Public] Webhook nhận callback từ cổng QR (VNPay/MoMo)' })
  @ApiResponse({ status: 200, type: WebhookResponseDto })
  handleWebhook(@Body() body: any): Promise<WebhookResponseDto> {
    return this.subscriptionsService.handleWebhook(body);
  }
}
