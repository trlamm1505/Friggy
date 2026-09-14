import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { AdminAiController } from './admin-ai.controller';
import { AdminAiService } from './admin-ai.service';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [AdminAiController],
  providers: [AdminAiService],
})
export class AdminModule {}
