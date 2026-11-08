import {
  Controller, Get, Post, Patch, Delete,
  Body, UseInterceptors, UploadedFile,
  HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { multerSponsorConfig } from 'src/common/configs/multer.config';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { SupplierProfileService } from './supplier-profile.service';
import { UpdateSupplierProfileDto } from './dto/supplier-profile.dto';
import { SupplierSubscribeDto } from './dto/supplier-subscription.dto';
import type {
  SupplierProfileResponseDto,
  SupplierPlanResponseDto,
  SupplierSubscriptionResponseDto,
  SupplierSubscribeResponseDto,
  SupplierPaymentTransactionDto,
} from './dto/supplier-response.dto';

@ApiTags('Supplier')
@ApiBearerAuth('access-token')
@Controller('supplier')
export class SupplierProfileController {
  constructor(private readonly service: SupplierProfileService) {}

  @Get('me')
  @Roles('food_supplier')
  @ApiOperation({ summary: '[Supplier] Xem profile của mình' })
  @ApiResponse({ status: 200, type: Object })
  getMyProfile(@CurrentUser() user: JwtPayload): Promise<SupplierProfileResponseDto> {
    return this.service.getMyProfile(user.sub);
  }

  @Patch('me')
  @Roles('food_supplier')
  @ApiOperation({ summary: '[Supplier] Cập nhật profile' })
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateSupplierProfileDto,
  ): Promise<SupplierProfileResponseDto> {
    return this.service.updateProfile(user.sub, dto);
  }

  @Post('me/logo')
  @Roles('food_supplier')
  @ApiOperation({ summary: '[Supplier] Upload logo công ty (JPEG/PNG/WEBP, max 5MB)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', multerSponsorConfig))
  uploadLogo(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<SupplierProfileResponseDto> {
    if (!file) throw new BadRequestException('Chưa chọn file');
    return this.service.uploadLogo(user.sub, file);
  }

  @Get('plans')
  @Public()
  @ApiOperation({ summary: '[Public] Danh sách gói cước nhà cung cấp' })
  @ApiResponse({ status: 200, type: [Object] })
  getPlans(): Promise<SupplierPlanResponseDto[]> {
    return this.service.getPlans();
  }

  @Get('subscription')
  @Roles('food_supplier')
  @ApiOperation({ summary: '[Supplier] Thông tin gói cước hiện tại' })
  getMySubscription(@CurrentUser() user: JwtPayload): Promise<SupplierSubscriptionResponseDto> {
    return this.service.getMySubscription(user.sub);
  }

  @Post('subscribe')
  @Roles('food_supplier')
  @ApiOperation({ summary: '[Supplier] Mua gói nhà cung cấp → nhận link thanh toán PayOS' })
  @ApiResponse({ status: 201, type: Object })
  subscribe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SupplierSubscribeDto,
  ): Promise<SupplierSubscribeResponseDto> {
    return this.service.subscribe(user.sub, dto);
  }

  @Delete('subscription/auto-renewal')
  @Roles('food_supplier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Supplier] Hủy tự động gia hạn gói' })
  cancelAutoRenewal(@CurrentUser() user: JwtPayload) {
    return this.service.cancelAutoRenewal(user.sub);
  }

  @Get('payment-history')
  @Roles('food_supplier')
  @ApiOperation({ summary: '[Supplier] Lịch sử giao dịch thanh toán của nhà cung cấp' })
  @ApiResponse({ status: 200, type: [Object] })
  getPaymentHistory(@CurrentUser() user: JwtPayload): Promise<SupplierPaymentTransactionDto[]> {
    return this.service.getPaymentHistory(user.sub);
  }
}

