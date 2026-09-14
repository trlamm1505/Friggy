/**
 * NormalizerAgent — Agent chuẩn hóa nguyên liệu từ VisionAgent
 *
 * Bước 2 trong FridgeScan pipeline.
 * Nhiệm vụ:
 *   1. Map tên nguyên liệu raw → ingredient trong DB (fuzzy search, fallback LLM)
 *   2. Chuẩn hóa đơn vị về danh sách chuẩn: g | kg | ml | l | cái | gói | hộp | chai
 *   3. Ước tính ngày hết hạn theo loại nguyên liệu
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AiProviderService } from '../../ai-provider.service';
import { stripJsonFences } from '../../utils/json.utils';
import type { RawDetectedItem } from './vision.agent';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface NormalizedItem {
  ingredientId: number | null;   // null nếu không match được trong DB
  name: string;                  // Tên sau normalize
  rawName: string;               // Tên gốc từ VisionAgent
  quantity: number;
  unit: string;
  estimatedExpiryDays: number | null;
  confidence: number;
}

// Đơn vị chuẩn cho phép
const STANDARD_UNITS = ['g', 'kg', 'ml', 'l', 'cái', 'gói', 'hộp', 'chai', 'bó', 'quả', 'củ', 'miếng'];

// Map đơn vị thường gặp về chuẩn
const UNIT_MAP: Record<string, string> = {
  'gram': 'g', 'gam': 'g', 'grm': 'g',
  'kilo': 'kg', 'kilogram': 'kg',
  'mili': 'ml', 'mililit': 'ml', 'mililiter': 'ml',
  'lit': 'l', 'liter': 'l', 'litre': 'l',
  'cai': 'cái', 'cuc': 'củ', 'qua': 'quả', 'bo': 'bó', 'miec': 'miếng',
  'pack': 'gói', 'bag': 'gói', 'box': 'hộp', 'bottle': 'chai',
  'piece': 'cái', 'pcs': 'cái',
};

// Ước tính hạn sử dụng theo loại nguyên liệu (ngày)
const EXPIRY_ESTIMATE: Record<string, number> = {
  'thịt': 3, 'cá': 2, 'tôm': 2, 'mực': 2, 'hải sản': 2,
  'rau': 5, 'cải': 5, 'salad': 3, 'xà lách': 3,
  'trứng': 21, 'sữa': 7, 'phô mai': 14,
  'trái cây': 7, 'quả': 7,
  'đồ hộp': 365, 'lon': 365,
  'gia vị': 180, 'nước mắm': 180, 'dầu ăn': 180,
  'tinh bột': 180, 'gạo': 180, 'mì': 180, 'bột': 180,
};

@Injectable()
export class NormalizerAgent {
  private readonly logger = new Logger(NormalizerAgent.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
  ) {}

  async normalize(items: RawDetectedItem[]): Promise<NormalizedItem[]> {
    this.logger.log(`🔗 [NormalizerAgent] Bắt đầu normalize ${items.length} items`);

    const results: NormalizedItem[] = [];

    for (const item of items) {
      const normalized = await this.normalizeOne(item);
      results.push(normalized);
    }

    const matched = results.filter(r => r.ingredientId !== null).length;
    this.logger.log(`✅ [NormalizerAgent] Normalize xong: ${matched}/${items.length} items match DB`);

    return results;
  }

  private async normalizeOne(item: RawDetectedItem): Promise<NormalizedItem> {
    // 1. Normalize đơn vị
    const unit = this.normalizeUnit(item.unit);

    // 2. Fuzzy search trong DB — tìm ingredient khớp nhất với tên
    const ingredientId = await this.matchIngredient(item.name);

    // 3. Ước tính hạn sử dụng
    const estimatedExpiryDays = this.estimateExpiry(item.name);

    return {
      ingredientId,
      name: item.name,
      rawName: item.name,
      quantity: item.quantity,
      unit,
      estimatedExpiryDays,
      confidence: item.confidence,
    };
  }

  private normalizeUnit(rawUnit: string): string {
    const lower = rawUnit.toLowerCase().trim();
    // Kiểm tra đã chuẩn chưa
    if (STANDARD_UNITS.includes(lower)) return lower;
    // Map về chuẩn
    return UNIT_MAP[lower] ?? 'cái';
  }

  private async matchIngredient(name: string): Promise<number | null> {
    // Fuzzy search: tên chứa từ khóa (không phân biệt hoa thường)
    const keywords = name.toLowerCase().split(/\s+/);

    for (const keyword of keywords) {
      if (keyword.length < 2) continue;

      const ingredient = await this.prisma.ingredient.findFirst({
        where: {
          deletedAt: null,
          name: { contains: keyword },
        },
      });

      if (ingredient) return ingredient.id;
    }

    // Không match → trả về null (NormalizerAgent không dùng LLM để giảm chi phí)
    return null;
  }

  private estimateExpiry(name: string): number | null {
    const lower = name.toLowerCase();
    for (const [keyword, days] of Object.entries(EXPIRY_ESTIMATE)) {
      if (lower.includes(keyword)) return days;
    }
    return 7; // Mặc định 7 ngày nếu không xác định được loại
  }
}
