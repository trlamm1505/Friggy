/**
 * FamilyCron — Auto-dissolve FamilyGroup khi owner hết hạn gói Family
 * Chạy mỗi ngày lúc 1:00 AM — kiểm tra các group active mà owner không còn gói Family
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FamilyService } from './family.service';

@Injectable()
export class FamilyCron {
  private readonly logger = new Logger(FamilyCron.name);

  constructor(private readonly familyService: FamilyService) {}

  @Cron('0 1 * * *')  // 1:00 AM mỗi ngày
  async autoDissolveExpiredFamilies() {
    try {
      const count = await this.familyService.autoDissolveExpired();
      if (count > 0) {
        this.logger.log(`[Cron] Auto-dissolved ${count} expired family group(s)`);
      }
    } catch (err) {
      this.logger.error(`[Cron] Failed to auto-dissolve families: ${err}`);
    }
  }
}
