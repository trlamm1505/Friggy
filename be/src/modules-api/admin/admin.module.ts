import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { AiCoreModule } from 'src/modules-system/ai-core/ai-core.module';
import { AdminAiController } from './admin-ai.controller';
import { AdminAiService } from './admin-ai.service';

@Module({
  imports: [
    PrismaModule,
    AiCoreModule, // Cần AiProviderService để invalidate cache khi admin thay đổi provider
  ],
  controllers: [AdminAiController],
  providers: [AdminAiService],
})
export class AdminModule {}
