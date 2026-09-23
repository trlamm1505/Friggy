import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { TokensModule } from 'src/modules-system/tokens/tokens.module';
// EMAIL_SERVICE ClientProxy được cung cấp global bởi EmailClientModule (import trong AppModule)

@Module({
  imports: [PrismaModule, TokensModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
