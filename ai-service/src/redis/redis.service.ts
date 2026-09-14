/**
 * RedisService — Wrapper tiện lợi cho Redis cache
 *
 * Cung cấp các thao tác cơ bản: get/set/del/invalidatePattern
 * Được inject vào các Tool Services để cache kết quả query DB,
 * tránh gọi DB lặp lại trong cùng 1 phiên AI.
 *
 * Cache key naming convention:
 *   fridge:{userId}:{toolName}    — dữ liệu tủ lạnh, TTL 5 phút
 *   recipe:{hash}                 — kết quả tìm công thức, TTL 10 phút
 *   user:{userId}:preferences     — sở thích người dùng, TTL 15 phút
 *   user:{userId}:allergies       — danh sách dị ứng, TTL 15 phút
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_URL } from 'src/common/constant/app.constant';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  onModuleInit() {
    this.client = new Redis(REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: false,
    });

    this.client.on('connect', () => {
      this.logger.log('Kết nối Redis thành công (AI Service)');
    });

    this.client.on('error', (err) => {
      this.logger.error(`Lỗi kết nối Redis: ${err.message}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      await this.client.del(key);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    await this.client.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async invalidatePattern(pattern: string): Promise<number> {
    let cursor = '0';
    let deletedCount = 0;
    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.client.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');
    return deletedCount;
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  createSubscriber(): Redis {
    return new Redis(REDIS_URL);
  }

  getClient(): Redis {
    return this.client;
  }
}
