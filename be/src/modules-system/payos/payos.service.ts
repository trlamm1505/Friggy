/**
 * PayOsService — Wrapper cho PayOS Node SDK
 *
 * Trách nhiệm:
 * 1. Tạo payment link (QR) cho đơn mua gói / gia hạn
 * 2. Lấy thông tin đơn hàng theo orderCode
 * 3. Xác thực webhook signature từ PayOS
 *
 * Biến môi trường cần thiết:
 *   PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY
 */
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PayOS } from '@payos/node';
import type {
  CreatePaymentLinkRequest,
  CreatePaymentLinkResponse,
  PaymentLink,
} from '@payos/node';
import type { Webhook, WebhookData } from '@payos/node';
import { InvalidSignatureError } from '@payos/node';

// Placeholder URL — PayOS bắt buộc truyền nhưng app mobile không cần redirect
const PAYOS_PLACEHOLDER_URL = 'https://friggy.vn/payment/result';

@Injectable()
export class PayOsService {
  private readonly logger = new Logger(PayOsService.name);
  private readonly payos: PayOS;

  constructor() {
    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!clientId || !apiKey || !checksumKey) {
      throw new Error(
        'Thiếu biến môi trường PayOS: PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY',
      );
    }

    this.payos = new PayOS({ clientId, apiKey, checksumKey });
  }

  // ─────────────────────────────────────────────────────────
  // Tạo payment link (QR + checkout URL)
  // ─────────────────────────────────────────────────────────

  /**
   * Tạo link thanh toán PayOS.
   *
   * @param orderCode  Mã đơn hàng — số nguyên, unique toàn hệ thống
   * @param amount     Số tiền VND
   * @param description Nội dung chuyển khoản (tối đa 25 ký tự)
   * @param planName   Tên gói dịch vụ (dùng trong items)
   * @returns checkoutUrl, qrCode (base64), orderCode
   */
  async createPaymentLink(params: {
    orderCode: number;
    amount: number;
    description: string;
    planName: string;
  }): Promise<CreatePaymentLinkResponse> {
    const { orderCode, amount, description, planName } = params;

    const payload: CreatePaymentLinkRequest = {
      orderCode,
      amount,
      description: description.slice(0, 25), // PayOS giới hạn 25 ký tự
      items: [
        {
          name: planName.slice(0, 50),
          quantity: 1,
          price: amount,
        },
      ],
      // PayOS bắt buộc 2 field này — dùng placeholder cho mobile app
      returnUrl: PAYOS_PLACEHOLDER_URL,
      cancelUrl: PAYOS_PLACEHOLDER_URL,
      expiredAt: Math.floor(Date.now() / 1000) + 15 * 60, // 15 phút
    };

    try {
      const response = await this.payos.paymentRequests.create(payload);
      this.logger.log(
        `[PayOS] Tạo payment link thành công | orderCode=${orderCode} | linkId=${response.paymentLinkId}`,
      );
      return response;
    } catch (err) {
      this.logger.error(`[PayOS] Lỗi tạo payment link | orderCode=${orderCode}: ${err}`);
      throw new InternalServerErrorException('Không thể tạo link thanh toán, thử lại sau');
    }
  }

  // ─────────────────────────────────────────────────────────
  // Lấy thông tin đơn hàng
  // ─────────────────────────────────────────────────────────

  /**
   * Kiểm tra trạng thái đơn hàng theo orderCode.
   * Dùng để FE polling khi webhook chậm.
   */
  async getPaymentInfo(orderCode: number): Promise<PaymentLink> {
    try {
      return await this.payos.paymentRequests.get(orderCode);
    } catch (err) {
      this.logger.error(`[PayOS] Lỗi lấy thông tin đơn ${orderCode}: ${err}`);
      throw new InternalServerErrorException('Không thể lấy thông tin thanh toán');
    }
  }

  // ─────────────────────────────────────────────────────────
  // Xác thực webhook
  // ─────────────────────────────────────────────────────────

  /**
   * Xác thực signature của webhook từ PayOS.
   * Throw InvalidSignatureError nếu bị giả mạo.
   *
   * @returns WebhookData — dữ liệu đã xác thực
   */
  async verifyWebhook(body: Webhook): Promise<WebhookData> {
    try {
      return await this.payos.webhooks.verify(body);
    } catch (err) {
      if (err instanceof InvalidSignatureError) {
        this.logger.warn(`[PayOS] Webhook signature không hợp lệ — có thể bị giả mạo`);
        throw err;
      }
      this.logger.error(`[PayOS] Lỗi verify webhook: ${err}`);
      throw err;
    }
  }
}
