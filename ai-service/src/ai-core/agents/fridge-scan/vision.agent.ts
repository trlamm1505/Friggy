/**
 * VisionAgent — Agent nhận diện nguyên liệu từ ảnh
 *
 * Bước 1 trong FridgeScan pipeline.
 * Dùng Gemini Vision (multimodal) để phân tích ảnh và trả về
 * danh sách nguyên liệu thô với tên, số lượng, đơn vị và độ tin cậy.
 *
 * Hỗ trợ 3 loại scan:
 *   - image:   Ảnh tủ lạnh / thực phẩm
 *   - receipt: Hóa đơn mua sắm
 *   - barcode: Barcode / QR code sản phẩm
 */
import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../../ai-provider.service';
import { stripJsonFences } from '../../utils/json.utils';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface RawDetectedItem {
  name: string;           // Tên nhận diện (có thể không chuẩn)
  quantity: number;       // Số lượng ước tính
  unit: string;           // Đơn vị ước tính
  confidence: number;     // 0.0 - 1.0
}

@Injectable()
export class VisionAgent {
  private readonly logger = new Logger(VisionAgent.name);

  constructor(private readonly aiProvider: AiProviderService) {}

  async analyze(params: {
    imageBase64: string;
    mimeType: string;
    scanType: 'image' | 'receipt' | 'barcode';
  }): Promise<RawDetectedItem[]> {
    this.logger.log(`🔍 [VisionAgent] Phân tích ảnh: type=${params.scanType}`);

    const llmClient = await this.aiProvider.getActiveClient();
    const systemPrompt = this.getDefaultPrompt(params.scanType);

    // Gemini Vision — gửi ảnh base64 kèm text prompt
    const imageUrl = `data:${params.mimeType};base64,${params.imageBase64}`;

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
          {
            type: 'text',
            text: 'Phân tích ảnh và trả về JSON theo đúng cấu trúc đã yêu cầu. CHỈ trả về JSON, không thêm text.',
          },
        ] as any,
      },
    ];

    const response = await llmClient.client.chat.completions.create({
      model: llmClient.modelName,
      messages,
      temperature: 0.1,
    });

    const rawContent = response.choices[0]?.message?.content ?? '{}';
    this.logger.debug(`[VisionAgent] Raw response: ${rawContent.slice(0, 300)}`);

    try {
      const cleaned = stripJsonFences(rawContent);
      const parsed = JSON.parse(cleaned);

      // Normalize về mảng — hỗ trợ nhiều format AI trả về
      let rawArray: any[] = [];

      if (Array.isArray(parsed)) {
        // Format: [{name, quantity, unit, confidence}]
        rawArray = parsed;
      } else if (Array.isArray(parsed.items)) {
        // Format: { items: [...] }
        rawArray = parsed.items;
      } else if (Array.isArray(parsed.detectedItems)) {
        // Format: { detectedItems: [...] }
        rawArray = parsed.detectedItems;
      } else if (parsed.name || parsed.ingredient) {
        // Format: single object { name/ingredient, quantity, unit }
        rawArray = [parsed];
      } else {
        // Thử lấy value đầu tiên là array
        const firstArray = Object.values(parsed).find(v => Array.isArray(v));
        if (firstArray) rawArray = firstArray as any[];
      }

      const items: RawDetectedItem[] = rawArray
        .map((item: any) => ({
          name: (item.name ?? item.ingredient ?? item.ten ?? item.product ?? '').trim(),
          quantity: Number(item.quantity ?? item.amount ?? item.so_luong ?? 1),
          unit: (item.unit ?? item.don_vi ?? item.unit_of_measure ?? 'cái').toString(),
          confidence: Number(item.confidence ?? item.score ?? 0.8),
        }))
        .filter((item: RawDetectedItem) => item.name.length > 1);

      this.logger.log(`✅ [VisionAgent] Nhận diện xong: ${items.length} items thô`);
      return items;
    } catch (e: any) {
      this.logger.warn(`⚠️ [VisionAgent] Không parse được JSON: ${e.message} | raw: ${rawContent.slice(0, 300)}`);
      return [];
    }
  }

  private getDefaultPrompt(scanType: 'image' | 'receipt' | 'barcode'): string {
    const prompts = {
      image: `Bạn là AI chuyên nhận diện thực phẩm trong tủ lạnh và bếp.
Phân tích ảnh và nhận diện TẤT CẢ nguyên liệu thực phẩm nhìn thấy được.
Trả về JSON với cấu trúc CHÍNH XÁC:
{ "items": [ { "name": "tên nguyên liệu tiếng Việt", "quantity": 1, "unit": "cái/kg/g/ml/gói/hộp/chai", "confidence": 0.95 } ] }`,

      receipt: `Bạn là AI chuyên đọc hóa đơn mua sắm siêu thị.
Trích xuất danh sách thực phẩm từ hóa đơn (bỏ qua đồ dùng, hóa mỹ phẩm).
Trả về JSON với cấu trúc CHÍNH XÁC:
{ "items": [ { "name": "tên nguyên liệu tiếng Việt", "quantity": 1, "unit": "cái/kg/g/ml/gói/hộp", "confidence": 0.98 } ] }`,

      barcode: `Bạn là AI chuyên nhận diện sản phẩm qua barcode/QR code.
Nhận diện sản phẩm và xác định đây có phải thực phẩm không.
Trả về JSON với cấu trúc CHÍNH XÁC:
{ "items": [ { "name": "tên sản phẩm tiếng Việt", "quantity": 1, "unit": "hộp/gói/chai/cái", "confidence": 0.99 } ] }`,
    };
    return prompts[scanType];
  }
}
