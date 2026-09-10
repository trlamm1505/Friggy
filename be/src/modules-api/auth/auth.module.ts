import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { TokensModule } from 'src/modules-system/tokens/tokens.module';
import { SmsModule } from 'src/modules-system/sms/sms.module';

@Module({
  imports: [PrismaModule, TokensModule, SmsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
