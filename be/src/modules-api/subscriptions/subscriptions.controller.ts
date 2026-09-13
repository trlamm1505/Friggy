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
import {
  SubscribeDto,
  SubscriptionPlanResponseDto,
  UserSubscriptionResponseDto,
  SubscribeResponseDto,
} from './dto/subscriptions.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth('access-token')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // ─────────────────────────────────────────────────────────
  // GET /plans — DS gói (Public có thể xem, nhưng yêu cầu JWT theo plan)
  // ─────────────────────────────────────────────────────────

  @Get('plans')
  @ApiOperation({ summary: 'Danh sách 2 gói dịch vụ: Free & Individual' })
  @ApiResponse({ status: 200, type: [SubscriptionPlanResponseDto] })
  getPlans(): Promise<SubscriptionPlanResponseDto[]> {
    return this.subscriptionsService.getPlans();
  }

  // ─────────────────────────────────────────────────────────
  // GET /me — Gói hiện tại
  // ─────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Gói dịch vụ hiện tại của user (tự tạo Free nếu chưa có)' })
  @ApiResponse({ status: 200, type: UserSubscriptionResponseDto })
  getMySubscription(
    @CurrentUser() user: JwtPayload,
  ): Promise<UserSubscriptionResponseDto> {
    return this.subscriptionsService.getMySubscription(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // POST /subscribe — Đăng ký Individual
  // ─────────────────────────────────────────────────────────

  @Post('subscribe')
  @ApiOperation({ summary: 'Đăng ký gói Individual → nhận QR thanh toán (mock)' })
  @ApiResponse({ status: 201, type: SubscribeResponseDto })
  @ApiResponse({ status: 400, description: 'Gói không hợp lệ hoặc đã đăng ký rồi' })
  subscribe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubscribeDto,
  ): Promise<SubscribeResponseDto> {
    return this.subscriptionsService.subscribe(user.sub, dto);
  }

  // ─────────────────────────────────────────────────────────
  // POST /webhook — Callback cổng thanh toán (Public)
  // ─────────────────────────────────────────────────────────

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Public] Webhook nhận callback từ cổng QR (VNPay/MoMo)' })
  @ApiResponse({ status: 200, schema: { example: { received: true } } })
  handleWebhook(@Body() body: any): Promise<{ received: boolean }> {
    return this.subscriptionsService.handleWebhook(body);
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /me — Hủy gói
  // ─────────────────────────────────────────────────────────

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hủy gói Individual → tự động chuyển về Free' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: 'Không thể hủy gói Free' })
  cancelSubscription(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.subscriptionsService.cancelSubscription(user.sub);
  }
}
