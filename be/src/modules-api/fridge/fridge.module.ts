import { Module } from '@nestjs/common';
import { FridgeController } from './fridge.controller';
import { FridgeService } from './fridge.service';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FridgeController],
  providers: [FridgeService],
  exports: [FridgeService],
})
export class FridgeModule {}
