/**
 * RedisModule — Module hệ thống Redis, global scope
 *
 * Export RedisService để toàn bộ ứng dụng có thể dùng cache
 * mà không cần import module này lặp lại.
 */
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
