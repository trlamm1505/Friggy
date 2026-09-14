import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PORT } from './common/constant/app.constant';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('AI Service');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  await app.listen(PORT);
  logger.log(`AI Service đang chạy trên port: ${PORT}`);
  logger.log(`Đang lắng nghe RabbitMQ cho job tạo thực đơn...`);
}

bootstrap();
