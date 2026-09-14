/**
 * AiProviderService — Dịch vụ quản lý nhà cung cấp AI
 *
 * Trách nhiệm:
 * 1. Đọc cấu hình AI provider đang active từ bảng `ai_provider_configs`
 * 2. Giải mã API key đã được mã hóa AES-256 (admin lưu key đã encrypt vào DB)
 * 3. Tạo OpenAI client với baseURL phù hợp (hỗ trợ mọi provider tương thích OpenAI)
 * 4. Cache client trong bộ nhớ để tránh tạo lại mỗi lần gọi
 *
 * Cách thêm provider mới (admin thực hiện 1 lần):
 * - Dùng AiProviderService.encrypt(apiKey) để mã hóa key
 * - INSERT vào bảng ai_provider_configs với encryptedApiKey đã mã hóa
 * - Ghi baseURL vào cột usageNote với format: "baseURL=https://..."
 * - Set isActive = 1
 *
 * Ví dụ cấu hình:
 * - OpenRouter:  usageNote = "baseURL=https://openrouter.ai/api/v1"
 * - Gemini:      usageNote = "baseURL=https://generativelanguage.googleapis.com/v1beta/openai/"
 * - OpenAI:      usageNote = "baseURL=https://api.openai.com/v1" (hoặc để trống)
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createDecipheriv, createCipheriv, randomBytes } from 'crypto';
import OpenAI from 'openai';

// Thuật toán mã hóa AES-256-CBC
const ALGORITHM = 'aes-256-cbc';

// Khóa mã hóa lấy từ biến môi trường — phải đủ 32 ký tự
// QUAN TRỌNG: Phải set AI_KEY_ENCRYPTION_SECRET trong file .env trên production!
const ENC_KEY = process.env.AI_KEY_ENCRYPTION_SECRET ?? 'friggy-ai-secret-key-32-chars!!';

// Chuẩn hóa khóa về đúng 32 bytes (yêu cầu của AES-256)
const KEY_BUF = Buffer.alloc(32);
Buffer.from(ENC_KEY).copy(KEY_BUF);
console.log('[AiProviderService] ENC_KEY khi decrypt (8 ký tự đầu):', ENC_KEY.slice(0, 8), '| length:', ENC_KEY.length);

/**
 * Cấu trúc client LLM sau khi đã được khởi tạo và cache
 */
export interface LlmClient {
  providerId: number;   // ID bản ghi trong DB
  provider: string;     // Tên provider: gemini | openai | anthropic
  client: OpenAI;       // OpenAI SDK client (tương thích mọi provider)
  modelName: string;    // Tên model: gemini-2.0-flash | gpt-4o | ...
  temperature: number;  // Độ sáng tạo (0.0 - 2.0)
  maxTokens: number;    // Giới hạn token output tối đa
}

@Injectable()
export class AiProviderService implements OnModuleInit {
  private readonly logger = new Logger(AiProviderService.name);

  /**
   * Cache in-memory: Map<providerId, LlmClient>
   * Tránh tạo lại client mỗi lần gọi — client được giữ đến khi admin thay đổi config
   */
  private cache = new Map<number, LlmClient>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Khởi động module: pre-warm cache với provider đang active
   * Giúp request AI đầu tiên không bị chậm do phải tạo client
   */
  async onModuleInit() {
    try {
      await this.getActiveClient();
      this.logger.log('✅ Đã khởi tạo AI provider client thành công');
    } catch (err: any) {
      this.logger.warn(
        '⚠️ Chưa có AI provider nào được cấu hình — ' +
        'Các tính năng AI sẽ không hoạt động cho đến khi admin thêm cấu hình vào bảng ai_provider_configs',
      );
      this.logger.error(`Chi tiết lỗi: ${err?.message}`);

    }
  }

  // ─────────────────────────────────────────────────────────
  // Lấy client của provider đang active
  // ─────────────────────────────────────────────────────────

  /**
   * Lấy LLM client của provider đang active trong hệ thống.
   * Ưu tiên dùng từ cache — nếu chưa có mới tạo mới và lưu vào cache.
   *
   * @throws Error nếu không có provider nào được set isActive = true
   */
  async getActiveClient(): Promise<LlmClient> {
    // Tìm cấu hình AI đang active (ưu tiên cái mới nhất)
    const config = await this.prisma.aiProviderConfig.findFirst({
      where: { isActive: true, deletedAt: null },
      orderBy: { activatedAt: 'desc' },
    });

    if (!config) {
      throw new Error(
        'Không có AI provider nào đang active. ' +
        'Admin cần thêm bản ghi vào bảng ai_provider_configs và set isActive = true.',
      );
    }

    // Trả về từ cache nếu đã có (tránh decrypt và tạo client lại)
    const cached = this.cache.get(config.id);
    if (cached) return cached;

    // Giải mã API key và tạo client mới
    const apiKey = this.decrypt(config.encryptedApiKey);
    const baseURL = this.parseBaseUrl(config.usageNote, config.provider);

    const client = new OpenAI({ apiKey, baseURL });

    const llmClient: LlmClient = {
      providerId: config.id,
      provider: config.provider,
      client,
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    };

    // Lưu vào cache để tái sử dụng
    this.cache.set(config.id, llmClient);

    this.logger.log(
      `🤖 Đã tạo AI client: provider=${config.provider} | model=${config.modelName} | baseURL=${baseURL}`,
    );

    return llmClient;
  }

  /**
   * Xóa cache của một hoặc tất cả provider.
   * Admin gọi khi thay đổi cấu hình provider để client được tạo lại với key mới.
   *
   * @param providerId - ID provider cần xóa cache, bỏ trống = xóa tất cả
   */
  invalidateCache(providerId?: number) {
    if (providerId) {
      this.cache.delete(providerId);
      this.logger.log(`🔄 Đã xóa cache AI provider (providerId=${providerId})`);
    } else {
      this.cache.clear();
      this.logger.log('🔄 Đã xóa toàn bộ cache AI provider');
    }
  }

  // ─────────────────────────────────────────────────────────
  // Mã hóa (dùng khi admin thêm API key mới vào DB)
  // ─────────────────────────────────────────────────────────

  /**
   * Mã hóa API key bằng AES-256-CBC.
   * Admin dùng hàm này để mã hóa key thô trước khi lưu vào DB.
   *
   * Cách dùng trong admin script:
   * const encrypted = AiProviderService.encrypt('sk-...');
   * // Sau đó INSERT encrypted vào cột encryptedApiKey
   *
   * @param plaintext - API key thô chưa mã hóa
   * @returns Chuỗi định dạng "iv_hex:encrypted_hex"
   */
  static encrypt(plaintext: string): string {
    const iv = randomBytes(16); // Vector khởi tạo ngẫu nhiên 16 bytes
    const cipher = createCipheriv(ALGORITHM, KEY_BUF, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    // Format: "iv_hex:encrypted_hex" để lưu cả IV và ciphertext vào 1 trường
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  // ─────────────────────────────────────────────────────────
  // Các hàm nội bộ (private)
  // ─────────────────────────────────────────────────────────

  /**
   * Giải mã API key đã được mã hóa AES-256-CBC.
   *
   * @param ciphertext - Chuỗi định dạng "iv_hex:encrypted_hex"
   * @returns API key dạng plaintext
   */
  private decrypt(ciphertext: string): string {
    const [ivHex, encHex] = ciphertext.split(':');
    if (!ivHex || !encHex) {
      throw new Error('Định dạng API key không hợp lệ — phải là "iv_hex:encrypted_hex"');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, KEY_BUF, iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }

  /**
   * Xác định baseURL của provider từ cột usageNote hoặc dùng URL mặc định.
   *
   * Admin có thể ghi vào usageNote theo format: "baseURL=https://openrouter.ai/api/v1"
   * Nếu không có, sẽ dùng URL mặc định theo provider type.
   *
   * @param usageNote - Nội dung cột usageNote trong DB
   * @param provider - Tên provider (gemini | openai | anthropic)
   */
  private parseBaseUrl(usageNote: string | null, provider: string): string | undefined {
    // Ưu tiên: đọc từ usageNote nếu admin có cấu hình thủ công
    if (usageNote) {
      const match = usageNote.match(/baseURL=([^\s]+)/);
      if (match?.[1]) return match[1];
    }

    // Fallback: dùng URL mặc định của từng provider
    const defaults: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
      // Gemini hỗ trợ OpenAI-compatible endpoint từ phiên bản v1beta
      gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      anthropic: 'https://api.anthropic.com/v1',
    };

    return defaults[provider];
  }
}
