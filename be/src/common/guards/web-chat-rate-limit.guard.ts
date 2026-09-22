/**
 * WebChatRateLimitGuard — Rate limiting cho Public SEO Chatbot
 *
 * Định danh bằng hash(IP + User-Agent) — BE tự tính, FE không cần gửi gì thêm.
 * Khó bypass hơn UUID localStorage (phải đổi cả IP lẫn UA cùng lúc).
 *
 * Key Redis: web_chat:{hash16}:{YYYY-MM-DD}
 * Giới hạn: 10 tin nhắn / browser / ngày (reset lúc 00:00 UTC)
 */
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RedisService } from 'src/modules-system/redis/redis.service';
import { createHash } from 'crypto';

const DAILY_LIMIT = 10;
const TTL_SECONDS = 86400;

@Injectable()
export class WebChatRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(WebChatRateLimitGuard.name);

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Lấy IP — ưu tiên X-Forwarded-For (sau proxy/nginx)
    const ip: string =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      request.ip ??
      'unknown';

    const ua: string = (request.headers['user-agent'] as string) ?? 'unknown';

    // Hash 16 ký tự đầu — đủ để phân biệt, không lưu raw UA vào Redis
    const identifier = createHash('sha256')
      .update(`${ip}:${ua}`)
      .digest('hex')
      .slice(0, 16);

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `web_chat:${identifier}:${today}`;

    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expireIfNew(key, TTL_SECONDS);

    const remaining = Math.max(0, DAILY_LIMIT - count);

    const response = context.switchToHttp().getResponse();
    response.setHeader('X-WebChat-Limit', DAILY_LIMIT);
    response.setHeader('X-WebChat-Remaining', remaining);

    if (count > DAILY_LIMIT) {
      this.logger.warn(`[WebChat] ${identifier} vượt giới hạn: ${count}/${DAILY_LIMIT}`);
      throw new HttpException(
        {
          statusCode: 429,
          message: `Bạn đã dùng hết ${DAILY_LIMIT} tin nhắn miễn phí hôm nay. Quay lại vào ngày mai hoặc đăng ký tài khoản để dùng không giới hạn!`,
          remaining: 0,
          resetAt: 'midnight UTC',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.logger.log(`[WebChat] ${identifier}: ${count}/${DAILY_LIMIT}`);
    return true;
  }
}
