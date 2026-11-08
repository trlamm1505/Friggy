import {
  Controller, Post, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { SupplierApplicationService } from './supplier-application.service';
import { CreateSupplierApplicationDto, SupplierApplicationResponseDto } from './dto/supplier-application.dto';
import { SetSupplierPasswordDto } from './dto/set-supplier-password.dto';

@ApiTags('Supplier')
@Controller('supplier')
export class SupplierApplicationController {
  constructor(private readonly service: SupplierApplicationService) {}

  @Post('apply')
  @Public()
  @ApiOperation({
    summary: '[Public] Nộp đơn đăng ký trở thành đối tác cung cấp thực phẩm',
    description: 'Không cần đăng nhập. Admin sẽ xem xét và gửi email thông báo kết quả.',
  })
  @ApiResponse({ status: 201, type: SupplierApplicationResponseDto })
  apply(@Body() dto: CreateSupplierApplicationDto): Promise<SupplierApplicationResponseDto> {
    return this.service.apply(dto);
  }

  @Post('set-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Public] Đặt mật khẩu lần đầu cho tài khoản đối tác (từ link email)',
    description: 'Token nhận được qua email khi đơn đăng ký được duyệt. Hiệu lực 7 ngày.',
  })
  @ApiResponse({ status: 200, description: 'Đặt mật khẩu thành công' })
  setPassword(@Body() dto: SetSupplierPasswordDto): Promise<{ accessToken: string; message: string }> {
    return this.service.setPassword(dto);
  }
}

