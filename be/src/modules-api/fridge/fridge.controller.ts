import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerScanConfig } from 'src/common/configs/multer.config';
import { FridgeService } from './fridge.service';
import {
  AddFridgeItemDto,
  UpdateFridgeItemDto,
  ListFridgeQueryDto,
  ExpiringQueryDto,
  ConfirmScanDto,
  StatsChartQueryDto,
} from './dto/fridge.dto';
import {
  FridgeItemResponseDto,
  FridgeStatsResponseDto,
  ScanResponseDto,
  ScanHistoryItemDto,
  FridgeStatsChartResponseDto,
  ScanStatusResponseDto,
} from './dto/fridge-response.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';

@ApiTags('Fridge')
@ApiBearerAuth('access-token')
@Controller('fridge')
export class FridgeController {
  constructor(private readonly fridgeService: FridgeService) {}

  // ─────────────────────────────────────────────────────────
  // GET /scan/history  (phải trước /scan/:scanId/confirm)
  // ─────────────────────────────────────────────────────────

  @Get('scan/history')
  @ApiOperation({ summary: 'Lịch sử các lần scan nguyên liệu' })
  @ApiResponse({ status: 200, type: [ScanHistoryItemDto] })
  getScanHistory(
    @CurrentUser() user: JwtPayload,
  ): Promise<ScanHistoryItemDto[]> {
    return this.fridgeService.getScanHistory(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // GET /scan/:scanId — Trạng thái + kết quả scan (FE poll)
  // ─────────────────────────────────────────────────────────

  @Get('scan/:scanId')
  @ApiOperation({
    summary: 'Trạng thái scan — FE poll mỗi 2s đến khi status=done',
  })
  @ApiResponse({ status: 200, type: ScanStatusResponseDto })
  getScanStatus(
    @CurrentUser() user: JwtPayload,
    @Param('scanId') scanId: string,
  ): Promise<ScanStatusResponseDto> {
    return this.fridgeService.getScanStatus(user.sub, scanId);
  }

  // ─────────────────────────────────────────────────────────
  // GET /stats/chart — Chart data biểu đồ
  // ─────────────────────────────────────────────────────────

  @Get('stats/chart')
  @ApiOperation({
    summary: 'Chart data chi tiêu + lãng phí theo ngày (week/month)',
  })
  @ApiResponse({ status: 200, type: FridgeStatsChartResponseDto })
  getStatsChart(
    @CurrentUser() user: JwtPayload,
    @Query() query: StatsChartQueryDto,
  ): Promise<FridgeStatsChartResponseDto> {
    return this.fridgeService.getStatsChart(user.sub, query);
  }

  // ─────────────────────────────────────────────────────────
  // GET /stats
  // ─────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({
    summary: 'Thống kê tủ lạnh: chi tiêu tháng, % lãng phí, số bữa nấu',
  })
  @ApiResponse({ status: 200, type: FridgeStatsResponseDto })
  getStats(@CurrentUser() user: JwtPayload): Promise<FridgeStatsResponseDto> {
    return this.fridgeService.getStats(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // GET /expiring
  // ─────────────────────────────────────────────────────────

  @Get('expiring')
  @ApiOperation({
    summary: 'Nguyên liệu sắp hết hạn trong N ngày (mặc định 3)',
  })
  @ApiResponse({ status: 200, type: [FridgeItemResponseDto] })
  getExpiring(
    @CurrentUser() user: JwtPayload,
    @Query() query: ExpiringQueryDto,
  ): Promise<FridgeItemResponseDto[]> {
    return this.fridgeService.getExpiring(user.sub, query);
  }

  // ─────────────────────────────────────────────────────────
  // GET /
  // ─────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Danh sách nguyên liệu trong tủ (filter: location)',
  })
  @ApiResponse({ status: 200, type: [FridgeItemResponseDto] })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListFridgeQueryDto,
  ): Promise<FridgeItemResponseDto[]> {
    return this.fridgeService.findAll(user.sub, query);
  }

  // ─────────────────────────────────────────────────────────
  // POST /items — Thêm nguyên liệu
  // ─────────────────────────────────────────────────────────

  @Post('items')
  @ApiOperation({ summary: 'Thêm nguyên liệu vào tủ thủ công' })
  @ApiResponse({ status: 201, type: FridgeItemResponseDto })
  addItem(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddFridgeItemDto,
  ): Promise<FridgeItemResponseDto> {
    return this.fridgeService.addItem(user.sub, dto);
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /items/:id
  // ─────────────────────────────────────────────────────────

  @Patch('items/:id')
  @ApiOperation({ summary: 'Cập nhật số lượng / ngày HH / vị trí' })
  @ApiResponse({ status: 200, type: FridgeItemResponseDto })
  updateItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateFridgeItemDto,
  ): Promise<FridgeItemResponseDto> {
    return this.fridgeService.updateItem(user.sub, id, dto);
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /items/:id
  // ─────────────────────────────────────────────────────────

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa nguyên liệu khỏi tủ (soft delete)' })
  @ApiResponse({ status: 204 })
  removeItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.fridgeService.removeItem(user.sub, id);
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /items/:id/consume
  // ─────────────────────────────────────────────────────────

  @Patch('items/:id/consume')
  @ApiOperation({ summary: 'Đánh dấu nguyên liệu "Đã dùng hết"' })
  @ApiResponse({ status: 200, type: FridgeItemResponseDto })
  consumeItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<FridgeItemResponseDto> {
    return this.fridgeService.consumeItem(user.sub, id);
  }

  // ─────────────────────────────────────────────────────────
  // POST /scan/image
  // ─────────────────────────────────────────────────────────

  @Post('scan/image')
  @ApiOperation({ summary: 'Scan ảnh thực phẩm → AI nhận diện nguyên liệu' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, type: ScanResponseDto })
  @UseInterceptors(FileInterceptor('file', multerScanConfig))
  scanImage(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ScanResponseDto> {
    return this.fridgeService.scanImage(user.sub, file, 'image');
  }

  // ─────────────────────────────────────────────────────────
  // POST /scan/receipt
  // ─────────────────────────────────────────────────────────

  @Post('scan/receipt')
  @ApiOperation({
    summary: 'Scan hóa đơn mua sắm → AI parse danh sách thực phẩm',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, type: ScanResponseDto })
  @UseInterceptors(FileInterceptor('file', multerScanConfig))
  scanReceipt(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ScanResponseDto> {
    return this.fridgeService.scanImage(user.sub, file, 'receipt');
  }

  // ─────────────────────────────────────────────────────────
  // POST /scan/barcode
  // ─────────────────────────────────────────────────────────

  @Post('scan/barcode')
  @ApiOperation({
    summary: 'Scan barcode → Gemini Vision nhận diện sản phẩm → map ingredient',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, type: ScanResponseDto })
  @UseInterceptors(FileInterceptor('file', multerScanConfig))
  scanBarcode(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ScanResponseDto> {
    return this.fridgeService.scanImage(user.sub, file, 'barcode');
  }

  // ─────────────────────────────────────────────────────────
  // POST /scan/:scanId/confirm
  // ─────────────────────────────────────────────────────────

  @Post('scan/:scanId/confirm')
  @ApiOperation({
    summary: 'Xác nhận / chỉnh sửa kết quả scan → thêm vào tủ lạnh',
  })
  @ApiResponse({ status: 201, type: [FridgeItemResponseDto] })
  confirmScan(
    @CurrentUser() user: JwtPayload,
    @Param('scanId') scanId: string,
    @Body() dto: ConfirmScanDto,
  ): Promise<FridgeItemResponseDto[]> {
    return this.fridgeService.confirmScan(user.sub, scanId, dto);
  }
}
