import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PORT } from './common/constant/app.constant';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const port = PORT || 3069;

  await app.listen(port, () => {
    console.log(`[SERVER] ONLINE on port: ${port}`);
  });
}
bootstrap();
