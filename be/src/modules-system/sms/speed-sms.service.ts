import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const SPEEDSMS_TOKEN = process.env.SPEEDSMS_ACCESS_TOKEN ?? '';
const SPEEDSMS_SENDER = process.env.SPEEDSMS_SENDER ?? 'Verify';
const SPEEDSMS_TYPE = Number(process.env.SPEEDSMS_TYPE ?? '4'); // 4 = brandname mặc định Verify
const SPEEDSMS_BASE_URL = 'https://api.speedsms.vn/index.php';

@Injectable()
export class SpeedSmsService {
  private readonly logger = new Logger(SpeedSmsService.name);

  /**
   * Gửi OTP SMS qua SpeedSMS API
   * @param phone Số điện thoại định dạng +84xxxxxxxxx (E.164)
   * @param otp   Mã OTP 6 chữ số
   */
  async sendOtp(phone: string, otp: string): Promise<void> {
    // SpeedSMS dùng định dạng 84xxxxxxxxx (bỏ dấu +)
    const formattedPhone = phone.replace('+', '');
    const content = `[FRIGGY] Ma OTP cua ban la: ${otp}. Co hieu luc 5 phut. Khong chia se voi bat ky ai.`;

    // DEV mode: chỉ log ra console, không gửi thật
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV - SpeedSMS] OTP cho ${phone}: ${otp}`);
      return;
    }

    // PRODUCTION: gửi thật qua SpeedSMS API
    if (!SPEEDSMS_TOKEN) {
      this.logger.error('SPEEDSMS_ACCESS_TOKEN chưa được cấu hình trong .env');
      return;
    }

    try {
      // SpeedSMS dùng Basic Auth: token:x (password cố định là 'x')
      const credentials = Buffer.from(`${SPEEDSMS_TOKEN}:x`).toString('base64');

      const response = await axios.post(
        `${SPEEDSMS_BASE_URL}/sms/send`,
        {
          to: [formattedPhone],
          content,
          sms_type: SPEEDSMS_TYPE,
          sender: SPEEDSMS_SENDER,
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
          timeout: 10_000,
        },
      );

      const result = response.data;

      if (result?.status === 'error') {
        this.logger.error(
          `SpeedSMS lỗi [${result.code}]: ${result.message}`,
        );
      } else {
        this.logger.log(
          `SpeedSMS gửi thành công đến ${phone} | tranId: ${result?.data?.tranId}`,
        );
      }
    } catch (err) {
      // Không throw để tránh leak lỗi provider ra user
      this.logger.error(`SpeedSMS exception: ${err}`);
    }
  }

  /**
   * Kiểm tra số dư tài khoản SpeedSMS
   */
  async getBalance(): Promise<{ email: string; balance: number; currency: string } | null> {
    if (!SPEEDSMS_TOKEN) return null;

    try {
      const credentials = Buffer.from(`${SPEEDSMS_TOKEN}:x`).toString('base64');
      const response = await axios.get(`${SPEEDSMS_BASE_URL}/user/info`, {
        headers: { Authorization: `Basic ${credentials}` },
        timeout: 5_000,
      });
      return response.data?.data ?? null;
    } catch {
      return null;
    }
  }
}
