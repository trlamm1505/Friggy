import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { RedisService } from 'src/modules-system/redis/redis.service';
import { v4 as uuid } from 'uuid';
import { existsSync, unlinkSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExcelJS = require('exceljs') as any;
import type { CreateSupplierIngredientDto, UpdateSupplierIngredientDto, ListSupplierIngredientsQueryDto } from './dto/supplier-ingredient.dto';
import type {
  SupplierIngredientResponseDto,
  PaginatedSupplierIngredientsDto,
  ImportResultDto,
} from './dto/supplier-ingredient-response.dto';

@Injectable()
export class SupplierIngredientsService {
  private readonly logger = new Logger(SupplierIngredientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Auto-match tên nguyên liệu supplier với bảng ingredients hệ thống.
   * So sánh case-insensitive, substring 2 chiều.
   * Chỉ trả về id nếu tìm được ĐÚNG 1 kết quả (tránh match nhầm).
   */
  private async autoMatchIngredient(name: string): Promise<number | null> {
    const keyword = name.trim().toLowerCase();
    const candidates = await this.prisma.ingredient.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });
    const filtered = candidates.filter((i) => {
      const sysName = i.name.toLowerCase();
      return keyword.includes(sysName) || sysName.includes(keyword);
    });
    return filtered.length === 1 ? filtered[0].id : null;
  }

  private async getProfile(userId: string) {
    const profile = await this.prisma.supplierProfile.findUnique({ where: { userId } });
    if (!profile || profile.deletedAt) {
      throw new NotFoundException('Không tìm thấy hồ sơ nhà cung cấp');
    }
    return profile;
  }

  private async checkIngredientLimit(profileId: string, planId: number, addCount = 1) {
    const plan = await this.prisma.supplierPlan.findUnique({ where: { id: planId } });
    if (!plan) return;

    const currentCount = await this.prisma.supplierIngredient.count({
      where: { profileId, status: { in: ['pending', 'approved'] }, deletedAt: null },
    });

    if (currentCount + addCount > plan.maxIngredients) {
      throw new BadRequestException(
        `Gói của bạn chỉ cho phép tối đa ${plan.maxIngredients} nguyên liệu (hiện có: ${currentCount})`,
      );
    }
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async findAll(userId: string, query: ListSupplierIngredientsQueryDto): Promise<PaginatedSupplierIngredientsDto> {
    const profile = await this.getProfile(userId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { profileId: profile.id, deletedAt: null };
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.supplierIngredient.findMany({
        where,
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supplierIngredient.count({ where }),
    ]);

    return {
      data: items.map(this.mapIngredient),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Get one ───────────────────────────────────────────────────────────────

  async findOne(userId: string, id: string): Promise<SupplierIngredientResponseDto> {
    const profile = await this.getProfile(userId);
    const item = await this.prisma.supplierIngredient.findFirst({
      where: { id, profileId: profile.id, deletedAt: null },
      include: { category: { select: { name: true } } },
    });
    if (!item) throw new NotFoundException('Không tìm thấy nguyên liệu');
    return this.mapIngredient(item);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateSupplierIngredientDto, image?: Express.Multer.File): Promise<SupplierIngredientResponseDto> {
    const profile = await this.getProfile(userId);

    // Kiểm tra category tồn tại
    const category = await this.prisma.ingredientCategory.findFirst({
      where: { id: dto.categoryId, deletedAt: null },
    });
    if (!category) throw new BadRequestException(`Danh mục ID ${dto.categoryId} không tồn tại`);

    // Kiểm tra giới hạn gói
    const sub = await this.prisma.supplierSubscription.findUnique({ where: { profileId: profile.id } });
    if (!sub) {
      throw new ForbiddenException('Bạn cần có gói cước active để thêm nguyên liệu');
    }
    await this.checkIngredientLimit(profile.id, sub.planId);

    const imagePath = image ? `/ingredients/${image.filename}` : null;

    const linkedIngredientId = await this.autoMatchIngredient(dto.name);

    const ingredient = await this.prisma.supplierIngredient.create({
      data: {
        id: uuid(),
        profileId: profile.id,
        name: dto.name.trim(),
        categoryId: dto.categoryId,
        defaultUnit: dto.defaultUnit.trim(),
        caloriesPer100g: dto.caloriesPer100g ?? null,
        averagePricePerUnit: dto.averagePricePerUnit ?? null,
        brand: dto.brand?.trim() ?? null,
        barcode: dto.barcode?.trim() ?? null,
        description: dto.description?.trim() ?? null,
        imagePath,
        linkedIngredientId,
      },
      include: { category: { select: { name: true } } },
    });

    this.logger.log(`[Supplier] Created ingredient "${dto.name}" for profile ${profile.id}`);
    return this.mapIngredient(ingredient);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(userId: string, id: string, dto: UpdateSupplierIngredientDto): Promise<SupplierIngredientResponseDto> {
    const profile = await this.getProfile(userId);
    const item = await this.prisma.supplierIngredient.findFirst({
      where: { id, profileId: profile.id, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Không tìm thấy nguyên liệu');

    if (!['pending', 'rejected'].includes(item.status)) {
      throw new ForbiddenException('Chỉ có thể chỉnh sửa nguyên liệu đang ở trạng thái pending hoặc rejected');
    }

    if (dto.categoryId) {
      const category = await this.prisma.ingredientCategory.findFirst({
        where: { id: dto.categoryId, deletedAt: null },
      });
      if (!category) throw new BadRequestException(`Danh mục ID ${dto.categoryId} không tồn tại`);
    }

    const updated = await this.prisma.supplierIngredient.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim(), status: 'pending', rejectionReason: null }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.defaultUnit && { defaultUnit: dto.defaultUnit.trim() }),
        ...(dto.caloriesPer100g !== undefined && { caloriesPer100g: dto.caloriesPer100g }),
        ...(dto.averagePricePerUnit !== undefined && { averagePricePerUnit: dto.averagePricePerUnit }),
        ...(dto.brand !== undefined && { brand: dto.brand?.trim() ?? null }),
        ...(dto.barcode !== undefined && { barcode: dto.barcode?.trim() ?? null }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
      },
      include: { category: { select: { name: true } } },
    });

    return this.mapIngredient(updated);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async remove(userId: string, id: string): Promise<void> {
    const profile = await this.getProfile(userId);
    const item = await this.prisma.supplierIngredient.findFirst({
      where: { id, profileId: profile.id, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Không tìm thấy nguyên liệu');

    if (item.imagePath) {
      const oldFile = join(process.cwd(), 'public', item.imagePath);
      if (existsSync(oldFile)) unlinkSync(oldFile);
    }

    await this.prisma.supplierIngredient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Excel import ──────────────────────────────────────────────────────────

  async importExcel(userId: string, file: Express.Multer.File): Promise<ImportResultDto> {
    const profile = await this.getProfile(userId);

    // Rate limit: 5 lần/ngày
    const rateLimitKey = `supplier:import:daily:${profile.id}`;
    const importCount = await this.redis.get<number>(rateLimitKey) ?? 0;
    if (importCount >= 5) {
      throw new BadRequestException('Bạn đã import quá 5 lần hôm nay. Vui lòng thử lại vào ngày mai.');
    }

    // Lấy giới hạn từ DB
    const sub = await this.prisma.supplierSubscription.findUnique({ where: { profileId: profile.id } });
    const plan = sub ? await this.prisma.supplierPlan.findUnique({ where: { id: sub.planId } }) : null;
    if (!plan) {
      throw new ForbiddenException('Bạn cần có gói cước active để import nguyên liệu');
    }
    const maxIngredients = plan.maxIngredients;

    // Lấy systemconfig giới hạn rows
    const maxRowsConfig = await this.prisma.systemConfig.findUnique({ where: { key: 'supplier.ingredient.maxPerImport' } });
    const maxRows = parseInt(maxRowsConfig?.value ?? '500', 10);

    // Parse Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const sheet = workbook.getWorksheet(1);
    if (!sheet) throw new BadRequestException('File Excel không có sheet dữ liệu');

    // ── Extract embedded images từ Excel ──────────────────────────────────
    // nativeRow là 0-indexed: row 0 = header, row 1 = data row đầu tiên
    const rowImageMap = new Map<number, { buffer: Buffer; extension: string }>();
    try {
      const sheetImages = (sheet as any).getImages() as Array<{
        imageId: number;
        range: { tl: { nativeRow: number; nativeCol: number } };
      }>;
      for (const img of sheetImages) {
        const imageData = workbook.getImage(img.imageId) as { buffer: Buffer | ArrayBuffer; extension: string };
        const buffer = Buffer.isBuffer(imageData.buffer)
          ? imageData.buffer
          : Buffer.from(imageData.buffer as ArrayBuffer);
        const ext = ['jpeg', 'jpg', 'png', 'webp'].includes(imageData.extension)
          ? imageData.extension
          : 'jpg';
        rowImageMap.set(img.range.tl.nativeRow, { buffer, extension: ext });
      }
    } catch { /* ExcelJS version không support getImages — bỏ qua */ }

    // Load all valid categories
    const categories = await this.prisma.ingredientCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const failedRows: { row: number; name: string; reason: string }[] = [];
    const toInsert: any[] = [];

    // Check current count
    const currentCount = await this.prisma.supplierIngredient.count({
      where: { profileId: profile.id, status: { in: ['pending', 'approved'] }, deletedAt: null },
    });

    let rowIndex = 1;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      if (rowIndex > maxRows) return;
      rowIndex++;

      const name = row.getCell(1).text?.trim();
      const categoryIdRaw = row.getCell(2).text?.trim();
      const defaultUnit = row.getCell(3).text?.trim();
      const caloriesPer100g = row.getCell(4).text?.trim();
      const averagePricePerUnit = row.getCell(5).text?.trim();
      const brand = row.getCell(6).text?.trim();
      const barcode = row.getCell(7).text?.trim();
      const description = row.getCell(8).text?.trim();

      if (!name) {
        failedRows.push({ row: rowNumber, name: '', reason: 'Tên nguyên liệu không được để trống' });
        return;
      }
      if (!categoryIdRaw || isNaN(Number(categoryIdRaw))) {
        failedRows.push({ row: rowNumber, name, reason: 'categoryId không hợp lệ (phải là số)' });
        return;
      }
      const categoryId = parseInt(categoryIdRaw, 10);
      if (!categoryMap.has(categoryId)) {
        failedRows.push({ row: rowNumber, name, reason: `Danh mục ID ${categoryId} không tồn tại` });
        return;
      }
      if (!defaultUnit) {
        failedRows.push({ row: rowNumber, name, reason: 'defaultUnit không được để trống' });
        return;
      }
      if (name.length > 150) {
        failedRows.push({ row: rowNumber, name, reason: 'Tên nguyên liệu quá dài (tối đa 150 ký tự)' });
        return;
      }

      toInsert.push({
        id: uuid(),
        profileId: profile.id,
        name,
        categoryId,
        defaultUnit,
        caloriesPer100g: caloriesPer100g ? parseFloat(caloriesPer100g) : null,
        averagePricePerUnit: averagePricePerUnit ? parseInt(averagePricePerUnit, 10) : null,
        brand: brand || null,
        barcode: barcode || null,
        description: description || null,
        imagePath: null,       // sẽ set bên dưới nếu có ảnh
        status: 'pending',
        _nativeRow: rowNumber - 1, // 0-indexed để map với rowImageMap
      });
    });

    // Kiểm tra giới hạn gói
    if (currentCount + toInsert.length > maxIngredients) {
      const allowed = Math.max(0, maxIngredients - currentCount);
      if (allowed === 0) {
        throw new BadRequestException(`Bạn đã đạt giới hạn ${maxIngredients} nguyên liệu của gói hiện tại`);
      }
      // Chỉ insert số lượng được phép
      toInsert.splice(allowed);
      failedRows.push({ row: 0, name: '', reason: `Chỉ import được ${allowed} nguyên liệu (đã đạt giới hạn gói)` });
    }

    // ── Auto-match linkedIngredientId (batch, tránh N+1) ──────────────────
    // Load toàn bộ ingredients hệ thống 1 lần, match in-memory
    const sysIngredients = await this.prisma.ingredient.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });
    for (const item of toInsert) {
      const keyword = (item.name as string).toLowerCase();
      const filtered = sysIngredients.filter((i) => {
        const sysName = i.name.toLowerCase();
        return keyword.includes(sysName) || sysName.includes(keyword);
      });
      item.linkedIngredientId = filtered.length === 1 ? filtered[0].id : null;
    }

    // ── Lưu ảnh từ Excel vào disk ─────────────────────────────────────────
    if (rowImageMap.size > 0) {
      const imageDir = join(process.cwd(), 'public', 'ingredients');
      mkdirSync(imageDir, { recursive: true });

      for (const item of toInsert) {
        const imgData = rowImageMap.get(item._nativeRow as number);
        if (imgData) {
          const ext = imgData.extension === 'jpeg' ? 'jpg' : imgData.extension;
          const filename = `${uuid()}.${ext}`;
          writeFileSync(join(imageDir, filename), imgData.buffer);
          item.imagePath = `/ingredients/${filename}`;
        }
      }
    }

    // Xóa field tạm trước khi insert DB
    const dbRecords = toInsert.map(({ _nativeRow: _r, ...rest }) => rest);

    if (dbRecords.length > 0) {
      await this.prisma.supplierIngredient.createMany({ data: dbRecords });
    }

    // Tăng rate limit counter, TTL = phần còn lại của ngày (tính giây)
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const ttlSeconds = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
    await this.redis.set(rateLimitKey, importCount + 1, ttlSeconds);

    this.logger.log(`[Supplier] Import Excel: ${dbRecords.length} success, ${failedRows.length} failed for profile ${profile.id}`);

    return {
      total: dbRecords.length + failedRows.length,
      success: dbRecords.length,
      failed: failedRows.length,
      failedRows,
      pendingCount: dbRecords.length,
    };
  }

  // ── Template download ─────────────────────────────────────────────────────

  async getTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Nguyên liệu');

    // Cột 1-8: dữ liệu text
    // Cột 9 (image): hướng dẫn — ảnh được nhúng trực tiếp vào cell (Insert → Image),
    //   không phải nhập text. Mỗi ảnh đặt tại cùng hàng với nguyên liệu tương ứng.
    sheet.columns = [
      { header: 'name*', key: 'name', width: 30 },
      { header: 'categoryId*', key: 'categoryId', width: 15 },
      { header: 'defaultUnit*', key: 'defaultUnit', width: 15 },
      { header: 'caloriesPer100g', key: 'caloriesPer100g', width: 18 },
      { header: 'averagePricePerUnit', key: 'averagePricePerUnit', width: 22 },
      { header: 'brand', key: 'brand', width: 20 },
      { header: 'barcode', key: 'barcode', width: 18 },
      { header: 'description', key: 'description', width: 40 },
      { header: 'image (nhúng ảnh vào đây — không nhập text)', key: 'image', width: 35 },
    ];

    // Header style — cột thường: xanh nhạt, cột image: vàng nhạt
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colNumber === 9 ? 'FFFFF3CD' : 'FFD6E4F0' }, // vàng cho cột ảnh
      };
      cell.alignment = { vertical: 'middle', wrapText: true };
      if (colNumber === 9) {
        cell.font = { bold: true, italic: true, color: { argb: 'FF856404' } };
        // Thêm note hướng dẫn trực tiếp trên header cell
        cell.note = 'Nhúng ảnh vào đây:\n1. Tăng Row Height lên ≥ 60px\n2. Chọn ô này → Insert → Pictures\n3. Chọn "Place over Cells" (KHÔNG dùng "Place in Cell")\n4. Chọn file ảnh (JPEG/PNG/WEBP, tối đa 5MB)\n\nXem sheet "Hướng dẫn" để biết thêm chi tiết.';
      }
    });

    // Example row
    sheet.addRow({
      name: 'Thịt bò Úc',
      categoryId: 3,
      defaultUnit: 'kg',
      caloriesPer100g: 250,
      averagePricePerUnit: 150000,
      brand: 'ABC Farm',
      barcode: '8938505737946',
      description: 'Thịt bò nhập khẩu từ Úc',
      image: '', // ← để trống, nhúng ảnh vào đây bằng Insert → Image trong Excel
    });
    sheet.getRow(2).height = 60; // Chiều cao đủ để hiển thị ảnh thumbnail

    // Sheet hướng dẫn riêng — không ảnh hưởng vùng data
    const guideSheet = workbook.addWorksheet('Hướng dẫn');
    guideSheet.getColumn(1).width = 110;
    const guideLines: [string, boolean?][] = [
      ['HƯỚNG DẪN IMPORT NGUYÊN LIỆU'],
      [''],
      ['1. Điền dữ liệu vào sheet "Nguyên liệu" từ hàng 3 trở xuống (hàng 2 là ví dụ mẫu).'],
      ['2. Các cột có dấu * là bắt buộc: name*, categoryId*, defaultUnit*'],
      ['3. categoryId: xem sheet "Danh mục tham khảo" để lấy đúng ID danh mục.'],
      ['4. averagePricePerUnit: giá trên 1 đơn vị (ví dụ: gram → giá/gram, kg → giá/kg, bó → giá/bó).'],
      [''],
      ['HƯỚNG DẪN THÊM ẢNH (QUAN TRỌNG):'],
      ['- Cột "image" (cột 9, màu vàng): ảnh được nhúng trực tiếp — KHÔNG nhập text.'],
      [''],
      ['  BƯỚC 1: Tăng chiều cao hàng lên tối thiểu 60px (click chuột phải vào số thứ tự hàng → Row Height → nhập 60).'],
      ['  BƯỚC 2: Chọn ô tại cột 9 (cột "image") đúng hàng của nguyên liệu.'],
      ['  BƯỚC 3: Vào Insert → Pictures → Place over Cells → This Device → chọn file ảnh.'],
      ['           *** PHẢI chọn "Place over Cells" — KHÔNG dùng "Place in Cell" (hệ thống không đọc được định dạng đó). ***'],
      ['  BƯỚC 4: Sau khi chèn, kéo góc ảnh để resize cho vừa trong cột (không nên để ảnh tràn sang cột khác).'],
      [''],
      ['- Định dạng hỗ trợ: JPEG, PNG, WEBP. Tối đa 5MB/ảnh.'],
      ['- Ảnh phải nằm đúng hàng với nguyên liệu tương ứng.'],
      ['- Nếu không có ảnh: bỏ trống cột đó — nguyên liệu vẫn được import bình thường.'],
    ];
    guideLines.forEach(([text], i) => {
      const cell = guideSheet.getCell(`A${i + 1}`);
      cell.value = text ?? '';
      if (i === 0) {
        cell.font = { bold: true, size: 13 };
      } else if (text?.startsWith('HƯỚNG') || text?.startsWith('  BƯỚC')) {
        cell.font = { bold: text.startsWith('HƯỚNG'), size: 11 };
      } else if (text?.includes('*** PHẢI')) {
        // Dòng cảnh báo quan trọng — đỏ, bold
        cell.font = { bold: true, size: 11, color: { argb: 'FFCC0000' } };
      } else {
        cell.font = { size: 11 };
      }
    });

    // Category reference sheet
    const categories = await this.prisma.ingredientCategory.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
      select: { id: true, name: true },
    });
    const refSheet = workbook.addWorksheet('Danh mục tham khảo');
    refSheet.columns = [
      { header: 'categoryId', key: 'id', width: 15 },
      { header: 'Tên danh mục', key: 'name', width: 40 },
    ];
    refSheet.getRow(1).font = { bold: true };
    refSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD6E4F0' },
    };
    categories.forEach(c => refSheet.addRow({ id: c.id, name: c.name }));

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  // ── Mapper ────────────────────────────────────────────────────────────────

  private mapIngredient(i: any): SupplierIngredientResponseDto {
    return {
      id: i.id,
      name: i.name,
      categoryId: i.categoryId,
      categoryName: i.category?.name ?? '',
      defaultUnit: i.defaultUnit,
      caloriesPer100g: i.caloriesPer100g ?? null,
      averagePricePerUnit: i.averagePricePerUnit ?? null,
      imagePath: i.imagePath ?? null,
      brand: i.brand ?? null,
      barcode: i.barcode ?? null,
      description: i.description ?? null,
      status: i.status,
      rejectionReason: i.rejectionReason ?? null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    };
  }
}

