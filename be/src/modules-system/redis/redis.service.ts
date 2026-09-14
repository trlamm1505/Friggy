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
    // Khởi tạo kết nối Redis khi module được load
    this.client = new Redis(REDIS_URL, {
      // Tự động reconnect khi mất kết nối
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: false,
    });

    this.client.on('connect', () => {
      this.logger.log('Kết nối Redis thành công');
    });

    this.client.on('error', (err) => {
      this.logger.error(`Lỗi kết nối Redis: ${err.message}`);
    });
  }

  // ─────────────────────────────────────────────────────────
  // Lấy giá trị từ cache theo key
  // Trả về null nếu không tìm thấy hoặc đã hết hạn
  // ─────────────────────────────────────────────────────────
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      // Dữ liệu không phải JSON hợp lệ — xóa và trả null
      await this.client.del(key);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────
  // Lưu giá trị vào cache với TTL (giây)
  // Mặc định 300 giây (5 phút)
  // ─────────────────────────────────────────────────────────
  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.client.setex(key, ttlSeconds, serialized);
  }

  // ─────────────────────────────────────────────────────────
  // Xóa 1 key khỏi cache
  // ─────────────────────────────────────────────────────────
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  // ─────────────────────────────────────────────────────────
  // Xóa nhiều key theo pattern (dùng SCAN thay KEYS để không block Redis)
  // Ví dụ: invalidatePattern('fridge:abc123:*') sẽ xóa tất cả cache tủ lạnh của user abc123
  // ─────────────────────────────────────────────────────────
  async invalidatePattern(pattern: string): Promise<number> {
    let cursor = '0';
    let deletedCount = 0;

    do {
      // SCAN thay vì KEYS để không block Redis server
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

    if (deletedCount > 0) {
      this.logger.debug(
        `🗑️ Đã xóa ${deletedCount} cache key theo pattern: ${pattern}`,
      );
    }

    return deletedCount;
  }

  // ─────────────────────────────────────────────────────────
  // Publish message lên Redis channel (dùng cho SSE pub/sub)
  // ─────────────────────────────────────────────────────────
  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  // ─────────────────────────────────────────────────────────
  // Subscribe lắng nghe Redis channel (dùng cho SSE gateway)
  // Trả về client riêng vì subscribe không thể dùng chung client đang publish
  // ─────────────────────────────────────────────────────────
  createSubscriber(): Redis {
    return new Redis(REDIS_URL);
  }

  // ─────────────────────────────────────────────────────────
  // Lấy ioredis client gốc (dùng cho BullMQ config)
  // ─────────────────────────────────────────────────────────
  getClient(): Redis {
    return this.client;
  }
}
