import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { TokensService } from './tokens.service';

@Module({
  imports: [
    // JwtModule đăng ký không có secret cố định vì mỗi lần sign/verify
    // sẽ truyền secret động trong TokensService
    JwtModule.register({}),
    PrismaModule,
    // RedisModule là @Global() — không cần import, RedisService tự được inject
  ],
  providers: [TokensService],
  exports: [TokensService, JwtModule],
})
export class TokensModule {}
