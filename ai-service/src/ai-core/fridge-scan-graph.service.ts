/**
 * FridgeScanGraphService — Orchestrate Multi-Agent Fridge Scan Pipeline
 *
 * Pipeline: VisionAgent → NormalizerAgent → ValidatorAgent
 *
 * Tương tự MealPlanGraphService nhưng cho tác vụ scan nguyên liệu.
 * Kết quả được lưu vào ingredient_scan_logs và publish Redis để BE biết xong.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { VisionAgent } from './agents/fridge-scan/vision.agent';
import { NormalizerAgent } from './agents/fridge-scan/normalizer.agent';
import { ValidatorAgent } from './agents/fridge-scan/validator.agent';
import type { DetectedItem } from './agents/fridge-scan/validator.agent';

export interface FridgeScanJob {
  scanId: string;
  userId: string;
  scanType: 'image' | 'receipt' | 'barcode';
  imageBase64: string;
  mimeType: string;
}

@Injectable()
export class FridgeScanGraphService {
  private readonly logger = new Logger(FridgeScanGraphService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly visionAgent: VisionAgent,
    private readonly normalizerAgent: NormalizerAgent,
    private readonly validatorAgent: ValidatorAgent,
  ) {}

  async run(job: FridgeScanJob): Promise<void> {
    const { scanId, userId, scanType, imageBase64, mimeType } = job;

    this.logger.log(
      `📷 [FridgeScanGraph] Bắt đầu pipeline: scanId=${scanId} | type=${scanType} | userId=${userId}`,
    );

    try {
      // Không cập nhật status riêng — giữ 'pending' cho đến khi xong
      // ── Bước 1: VisionAgent phân tích ảnh ──────────────────
      const rawItems = await this.visionAgent.analyze({
        imageBase64,
        mimeType,
        scanType,
      });

      if (rawItems.length === 0) {
        this.logger.warn(`[FridgeScanGraph] VisionAgent không nhận diện được item nào`);
        await this.saveResult(scanId, [], { warning: 'Không nhận diện được nguyên liệu nào trong ảnh' });
        return;
      }

      // ── Bước 2: NormalizerAgent chuẩn hóa ──────────────────
      const normalizedItems = await this.normalizerAgent.normalize(rawItems);

      // ── Bước 3: ValidatorAgent kiểm tra + lọc ──────────────
      const validatedItems = await this.validatorAgent.validate({
        items: normalizedItems,
        userId,
      });

      // ── Lưu kết quả vào DB ──────────────────────────────────
      await this.saveResult(scanId, validatedItems);

      this.logger.log(
        `🎉 [FridgeScanGraph] Pipeline hoàn thành: scanId=${scanId} | ${validatedItems.length} items`,
      );
    } catch (error: any) {
      this.logger.error(
        `❌ [FridgeScanGraph] Pipeline thất bại: scanId=${scanId} | ${error?.message}`,
      );
      await this.updateStatus(scanId, 'failed', { error: error?.message });
    }
  }

  private async updateStatus(
    scanId: string,
    status: string,
    extra: Record<string, any> = {},
  ): Promise<void> {
    await this.prisma.ingredientScanLog.update({
      where: { id: scanId },
      data: {
        processingStatus: status as any,
        ...(Object.keys(extra).length > 0 ? { aiRawResponse: extra as any } : {}),
      },
    });
  }

  private async saveResult(
    scanId: string,
    items: DetectedItem[],
    aiRawResponse?: Record<string, any>,
  ): Promise<void> {
    await this.prisma.ingredientScanLog.update({
      where: { id: scanId },
      data: {
        processingStatus: (items.length > 0 ? 'success' : 'failed') as any,
        detectedItems: items as any,
        aiRawResponse: (aiRawResponse ?? { itemCount: items.length }) as any,
        processedAt: new Date(),
      },
    });

    // Publish Redis để BE SSE biết scan xong (optional — FE có thể poll thay vì SSE)
    await this.redis.publish(`scan:${scanId}:done`, JSON.stringify({ scanId, itemCount: items.length }));
  }
}
