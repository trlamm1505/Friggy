/**
 * ValidatorAgent — Agent kiểm tra và lọc kết quả scan
 *
 * Bước 3 (cuối) trong FridgeScan pipeline.
 * Nhiệm vụ:
 *   1. Lọc items có confidence < ngưỡng
 *   2. Đánh dấu needsConfirm cho item không chắc chắn
 *   3. Check dị ứng của user
 *   4. Trả về danh sách final để lưu DB
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { NormalizedItem } from './normalizer.agent';

export interface DetectedItem {
  ingredientId: number | null;
  name: string;
  quantity: number;
  unit: string;
  estimatedExpiryDays: number | null;
  confidence: number;
  needsConfirm: boolean;    // true: confidence thấp hoặc không match DB
  allergyWarning: boolean;  // true: thuộc user_allergies
}

// Ngưỡng confidence
const CONFIDENCE_REJECT   = 0.2;  // < 0.2 → loại hoàn toàn
const CONFIDENCE_CONFIRM  = 0.7;  // < 0.7 → giữ nhưng cần xác nhận

@Injectable()
export class ValidatorAgent {
  private readonly logger = new Logger(ValidatorAgent.name);

  constructor(private readonly prisma: PrismaService) {}

  async validate(params: {
    items: NormalizedItem[];
    userId: string;
  }): Promise<DetectedItem[]> {
    const { items, userId } = params;

    // Lấy danh sách ingredientId bị dị ứng của user
    const allergies = await this.prisma.userAllergy.findMany({
      where: { userId, deletedAt: null },
      select: { ingredientId: true },
    });
    const allergyIds = new Set(allergies.map(a => a.ingredientId));

    const results: DetectedItem[] = [];

    for (const item of items) {
      // Lọc bỏ item confidence quá thấp
      if (item.confidence < CONFIDENCE_REJECT) {
        this.logger.debug(`[ValidatorAgent] Loại: ${item.name} (confidence=${item.confidence})`);
        continue;
      }

      const needsConfirm =
        item.confidence < CONFIDENCE_CONFIRM ||   // Không chắc chắn
        item.ingredientId === null;               // Không match DB

      const allergyWarning =
        item.ingredientId !== null &&
        allergyIds.has(item.ingredientId);

      results.push({
        ingredientId: item.ingredientId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        estimatedExpiryDays: item.estimatedExpiryDays,
        confidence: item.confidence,
        needsConfirm,
        allergyWarning,
      });
    }

    const ready   = results.filter(r => !r.needsConfirm).length;
    const confirm = results.filter(r => r.needsConfirm).length;
    const allergy = results.filter(r => r.allergyWarning).length;

    this.logger.log(
      `✅ [ValidatorAgent] Validation xong: ${ready} sẵn sàng | ${confirm} cần xác nhận | ${allergy} cảnh báo dị ứng | ${items.length - results.length} bị loại`,
    );

    return results;
  }
}
