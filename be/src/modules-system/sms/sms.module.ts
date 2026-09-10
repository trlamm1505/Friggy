import { Module } from '@nestjs/common';
import { SpeedSmsService } from './speed-sms.service';

@Module({
  providers: [SpeedSmsService],
  exports: [SpeedSmsService],
})
export class SmsModule {}
