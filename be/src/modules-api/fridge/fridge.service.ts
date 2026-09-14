import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { RabbitMqPublisherService } from 'src/modules-system/rabbit-mq/rabbit-mq-publisher.service';
import { FRIDGE_SCAN_ROUTING_KEY } from 'src/common/constant/app.constant';
import { v4 as uuid } from 'uuid';
import type {
  AddFridgeItemDto,
  UpdateFridgeItemDto,
  ListFridgeQueryDto,
  ExpiringQueryDto,
  ConfirmScanDto,
  StatsChartQueryDto,
} from './dto/fridge.dto';
import type {
  FridgeItemResponseDto,
  FridgeStatsResponseDto,
  ScanResponseDto,
  ScanHistoryItemDto,
  FridgeStatsChartResponseDto,
  ScanStatusResponseDto,
} from './dto/fridge-response.dto';

@Injectable()
export class FridgeService {
  private readonly logger = new Logger(FridgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMq: RabbitMqPublisherService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // GET / — Danh sách tủ lạnh
  // ─────────────────────────────────────────────────────────

  async findAll(userId: string, query: ListFridgeQueryDto): Promise<FridgeItemResponseDto[]> {
    const where: any = { userId, deletedAt: null };
    if (query.storageLocation) where.storageLocation = query.storageLocation;

    const items = await this.prisma.fridgeItem.findMany({
      where,
      include: { ingredient: true },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
    });

    return items.map(this.mapFridgeItem);
  }

  // ─────────────────────────────────────────────────────────
  // GET /expiring — Sắp hết hạn trong N ngày
  // ─────────────────────────────────────────────────────────

  async getExpiring(userId: string, query: ExpiringQueryDto): Promise<FridgeItemResponseDto[]> {
    const days = query.days ?? 3;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);

    const items = await this.prisma.fridgeItem.findMany({
      where: {
        userId,
        deletedAt: null,
        consumedAt: null,
        expiresAt: { not: null, lte: deadline },
      },
      include: { ingredient: true },
      orderBy: { expiresAt: 'asc' },
    });

    return items.map(this.mapFridgeItem);
  }

  // ─────────────────────────────────────────────────────────
  // GET /stats
  // ─────────────────────────────────────────────────────────

  async getStats(userId: string): Promise<FridgeStatsResponseDto> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const expirySoon = new Date(now);
    expirySoon.setDate(now.getDate() + 3);

    // Tổng chi tiêu tháng: từ shopping list items đã mua
    const spentResult = await this.prisma.shoppingListItem.aggregate({
      _sum: { estimatedPrice: true },
      where: {
        shoppingList: { userId },
        isPurchased: true,
        purchasedAt: { gte: monthStart },
      },
    });
    const totalSpentThisMonth = (spentResult._sum?.estimatedPrice) ?? 0;

    // % lãng phí: item hết hạn chưa dùng / tổng item có expiresAt
    const [expiredWaste, totalWithExpiry] = await Promise.all([
      this.prisma.fridgeItem.count({
        where: { userId, deletedAt: null, consumedAt: null, expiresAt: { lt: now } },
      }),
      this.prisma.fridgeItem.count({
        where: { userId, deletedAt: null, expiresAt: { not: null } },
      }),
    ]);
    const wastePercent =
      totalWithExpiry > 0 ? Math.round((expiredWaste / totalWithExpiry) * 1000) / 10 : 0;

    // Số bữa đã nấu tuần này (MealSlot có completedAt, join qua dailyPlan -> weeklyPlan)
    const mealsCooked = await this.prisma.mealSlot.count({
      where: {
        dailyPlan: { weeklyPlan: { userId } },
        completedAt: { gte: weekStart },
      },
    });

    // Sắp hết hạn ≤3 ngày
    const expiringSoonCount = await this.prisma.fridgeItem.count({
      where: {
        userId,
        deletedAt: null,
        consumedAt: null,
        expiresAt: { gte: now, lte: expirySoon },
      },
    });

    // Tổng items hiện tại
    const totalItems = await this.prisma.fridgeItem.count({
      where: { userId, deletedAt: null, consumedAt: null },
    });

    return { totalSpentThisMonth, wastePercent, mealsCooked, expiringSoonCount, totalItems };
  }

  // ─────────────────────────────────────────────────────────
  // POST /items — Thêm nguyên liệu
  // ─────────────────────────────────────────────────────────

  async addItem(userId: string, dto: AddFridgeItemDto): Promise<FridgeItemResponseDto> {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id: dto.ingredientId, deletedAt: null },
    });
    if (!ingredient) throw new NotFoundException('Nguyên liệu không tồn tại');

    const item = await this.prisma.fridgeItem.create({
      data: {
        id: uuid(),
        userId,
        ingredientId: dto.ingredientId,
        quantity: dto.quantity,
        unit: dto.unit,
        purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        storageLocation: (dto.storageLocation as any) ?? 'fridge',
        addedBy: 'manual',
      },
      include: { ingredient: true },
    });

    return this.mapFridgeItem(item);
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /items/:id — Cập nhật
  // ─────────────────────────────────────────────────────────

  async updateItem(userId: string, itemId: string, dto: UpdateFridgeItemDto): Promise<FridgeItemResponseDto> {
    const item = await this.prisma.fridgeItem.findFirst({
      where: { id: itemId, userId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Không tìm thấy nguyên liệu trong tủ');

    const updated = await this.prisma.fridgeItem.update({
      where: { id: itemId },
      data: {
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.unit && { unit: dto.unit }),
        ...(dto.expiresAt !== undefined && { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }),
        ...(dto.storageLocation && { storageLocation: dto.storageLocation as any }),
      },
      include: { ingredient: true },
    });

    return this.mapFridgeItem(updated);
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /items/:id — Soft delete
  // ─────────────────────────────────────────────────────────

  async removeItem(userId: string, itemId: string): Promise<void> {
    const item = await this.prisma.fridgeItem.findFirst({
      where: { id: itemId, userId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Không tìm thấy nguyên liệu trong tủ');

    await this.prisma.fridgeItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /items/:id/consume — Đánh dấu đã dùng hết
  // ─────────────────────────────────────────────────────────

  async consumeItem(userId: string, itemId: string): Promise<FridgeItemResponseDto> {
    const item = await this.prisma.fridgeItem.findFirst({
      where: { id: itemId, userId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Không tìm thấy nguyên liệu trong tủ');
    if (item.consumedAt) throw new BadRequestException('Nguyên liệu này đã được đánh dấu dùng hết');

    const updated = await this.prisma.fridgeItem.update({
      where: { id: itemId },
      data: { consumedAt: new Date() },
      include: { ingredient: true },
    });

    return this.mapFridgeItem(updated);
  }

  // ─────────────────────────────────────────────────────────
  // GET /stats/chart — Dữ liệu biểu đồ theo ngày
  // ─────────────────────────────────────────────────────────

  async getStatsChart(userId: string, query: StatsChartQueryDto): Promise<FridgeStatsChartResponseDto> {
    const period = query.period ?? 'week';
    const now = new Date();
    const days = period === 'week' ? 7 : 30;

    // Tạo danh sách ngày trong kỳ
    const dateRange: Date[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      dateRange.push(d);
    };

    // Labels viết tắt
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const labels = dateRange.map((d) =>
      period === 'week'
        ? dayLabels[d.getDay()]
        : `${d.getDate()}/${d.getMonth() + 1}`,
    );

    // Query chi tiêu: JOIN shopping_list_items isPurchased=true GROUP BY ngày
    const startDate = dateRange[0];
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    const purchasedItems = await this.prisma.shoppingListItem.findMany({
      where: {
        shoppingList: { userId },
        isPurchased: true,
        purchasedAt: { gte: startDate, lte: endDate },
      },
      select: { estimatedPrice: true, purchasedAt: true },
    });

    // Query lãng phí: items hết hạn trong kỳ, chưa dùng
    const wastedItems = await this.prisma.fridgeItem.findMany({
      where: {
        userId,
        consumedAt: null,
        deletedAt: null,
        expiresAt: { gte: startDate, lte: endDate },
      },
      select: { expiresAt: true },
    });

    // Map vào mảng theo ngày
    const spending = dateRange.map((day) => {
      const dayStr = day.toDateString();
      return purchasedItems
        .filter((i) => i.purchasedAt && new Date(i.purchasedAt).toDateString() === dayStr)
        .reduce((sum, i) => sum + (i.estimatedPrice ?? 0), 0);
    });

    const wasteItemsArr = dateRange.map((day) => {
      const dayStr = day.toDateString();
      return wastedItems.filter(
        (i) => i.expiresAt && new Date(i.expiresAt).toDateString() === dayStr,
      ).length;
    });

    return { period, labels, spending, wasteItems: wasteItemsArr };
  }

  // ─────────────────────────────────────────────────────────
  // POST /scan/image|receipt|barcode — Scan AI (stub)
  // NOTE: AI integration sẽ được implement ở Phase 7
  // ─────────────────────────────────────────────────────────

  async scanImage(
    userId: string,
    file: Express.Multer.File,
    scanType: 'image' | 'receipt' | 'barcode',
  ): Promise<ScanResponseDto> {
    if (!file) throw new BadRequestException('Vui lòng upload file ảnh');

    const scanId = uuid();
    const imagePath = file.path ?? `/uploads/scans/${userId}/${scanId}`;

    // Tạo scan log trạng thái pending
    const scanLog = await this.prisma.ingredientScanLog.create({
      data: {
        id: scanId,
        userId,
        imagePath,
        scanType,
        aiRawResponse: {},
        detectedItems: [],
        processingStatus: 'pending',
      },
    });

    // Encode file sang base64 để gửi qua RabbitMQ
    const imageBase64 = file.buffer
      ? file.buffer.toString('base64')
      : require('fs').readFileSync(file.path).toString('base64');

    // Publish job cho ai-service xử lý Vision AI
    await this.rabbitMq.publish(FRIDGE_SCAN_ROUTING_KEY, {
      scanId,
      userId,
      scanType,
      imageBase64,
      mimeType: file.mimetype,
    });

    this.logger.log(`[Scan] scanId=${scanId} type=${scanType} user=${userId} — published to ai-service`);

    return {
      scanId: scanLog.id,
      scanType,
      status: 'pending',
      detectedItems: [],
    };
  }

  // ─────────────────────────────────────────────────────────
  // GET /scan/:scanId — Trạng thái + kết quả scan
  // ─────────────────────────────────────────────────────────

  async getScanStatus(userId: string, scanId: string): Promise<ScanStatusResponseDto> {
    const scanLog = await this.prisma.ingredientScanLog.findFirst({
      where: { id: scanId, userId, deletedAt: null },
    });
    if (!scanLog) throw new NotFoundException('Không tìm thấy kết quả scan');

    return {
      scanId: scanLog.id,
      scanType: scanLog.scanType,
      status: scanLog.processingStatus,
      detectedItems: Array.isArray(scanLog.detectedItems) ? scanLog.detectedItems as any[] : [],
      errorMessage: (scanLog.aiRawResponse as any)?.error ?? null,
      createdAt: scanLog.createdAt.toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────
  // POST /scan/:scanId/confirm — Xác nhận kết quả scan
  // ─────────────────────────────────────────────────────────

  async confirmScan(userId: string, scanId: string, dto: ConfirmScanDto): Promise<FridgeItemResponseDto[]> {
    const scanLog = await this.prisma.ingredientScanLog.findFirst({
      where: { id: scanId, userId, deletedAt: null },
    });
    if (!scanLog) throw new NotFoundException('Không tìm thấy kết quả scan');

    const addedBy = scanLog.scanType === 'receipt'
      ? 'receipt_scan'
      : scanLog.scanType === 'barcode'
      ? 'barcode_scan'
      : 'ai_scan';

    // Tạo fridge items từ confirmed list
    const createdItems: FridgeItemResponseDto[] = [];
    for (const item of dto.items) {
      const ingredient = await this.prisma.ingredient.findFirst({
        where: { id: item.ingredientId, deletedAt: null },
      });
      if (!ingredient) continue;

      const fridgeItem = await this.prisma.fridgeItem.create({
        data: {
          id: uuid(),
          userId,
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unit: item.unit,
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
          storageLocation: (item.storageLocation as any) ?? 'fridge',
          addedBy: addedBy as any,
        },
        include: { ingredient: true },
      });
      createdItems.push(this.mapFridgeItem(fridgeItem));
    }

    // Cập nhật scan log
    await this.prisma.ingredientScanLog.update({
      where: { id: scanId },
      data: {
        confirmedItems: dto.items as any,
        processingStatus: 'success',
        processedAt: new Date(),
      },
    });

    return createdItems;
  }

  // ─────────────────────────────────────────────────────────
  // GET /scan/history — Lịch sử scan
  // ─────────────────────────────────────────────────────────

  async getScanHistory(userId: string): Promise<ScanHistoryItemDto[]> {
    const logs = await this.prisma.ingredientScanLog.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return logs.map((l) => ({
      id: l.id,
      scanType: l.scanType,
      status: l.processingStatus,
      detectedCount: Array.isArray(l.detectedItems) ? (l.detectedItems as any[]).length : 0,
      confirmedCount: l.confirmedItems
        ? Array.isArray(l.confirmedItems)
          ? (l.confirmedItems as any[]).length
          : null
        : null,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  // ─────────────────────────────────────────────────────────
  // HELPER
  // ─────────────────────────────────────────────────────────

  private mapFridgeItem(item: any): FridgeItemResponseDto {
    let daysUntilExpiry: number | null = null;
    if (item.expiresAt) {
      const diff = item.expiresAt.getTime() - Date.now();
      daysUntilExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return {
      id: item.id,
      ingredientId: item.ingredientId,
      ingredientName: item.ingredient.name,
      ingredientImagePath: item.ingredient.imagePath ?? null,
      quantity: item.quantity,
      unit: item.unit,
      purchasedAt: item.purchasedAt?.toISOString().split('T')[0] ?? null,
      expiresAt: item.expiresAt?.toISOString().split('T')[0] ?? null,
      storageLocation: item.storageLocation,
      addedBy: item.addedBy,
      consumedAt: item.consumedAt?.toISOString() ?? null,
      daysUntilExpiry,
      createdAt: item.createdAt.toISOString(),
    };
  }
}
