import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PORT, NODE_ENV, SWAGGER_PATH } from './common/constant/app.constant';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ── Static files (ảnh upload lưu tại /public) ──────────────────────────
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public',
  });

  // ── Global API prefix & versioning ─────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── Global ValidationPipe (dùng khi có DTO class-validator sau này) ────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip các field không khai báo trong DTO
      forbidNonWhitelisted: true,
      transform: true, // tự động cast kiểu dữ liệu
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── CORS ───────────────────────────────────────────────────────────────
  app.enableCors({
    origin: true,
    credentials: false,
  });

  // ── Swagger (chỉ bật ở môi trường development) ─────────────────────────
  if (NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Friggy API')
      .setDescription(
        `**Tủ lạnh thông minh** — Hệ thống quản lý thực phẩm & tư vấn bữa ăn AI.\n\n` +
          `### Quy ước\n` +
          `- Tất cả response bọc trong \`{ success, data, message }\`\n` +
          `- DateTime theo chuẩn **ISO 8601** (UTC)\n` +
          `- Tiền tệ đơn vị **VND** (số nguyên)\n` +
          `- Ảnh trả về dưới dạng **path tương đối** \`/public/...\`\n\n` +
          `### Auth\n` +
          `Dùng **Bearer Token** (JWT). Lấy token qua \`POST /api/v1/auth/google\` hoặc \`POST /api/v1/auth/phone/verify\`.`,
      )
      .setVersion('1.0')
      .setContact('Friggy Team', '', 'support@friggy.vn')
      .setLicense('UNLICENSED', '')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập Access Token JWT vào đây',
        },
        'access-token', // tên security scheme — dùng @ApiBearerAuth('access-token') trên controller
      )
      .addTag('Auth', 'Đăng nhập / Đăng xuất')
      .addTag('Users', 'Hồ sơ & Tùy chọn người dùng')
      .addTag('Ingredients', 'Nguyên liệu & Danh mục')
      .addTag('Recipes', 'Công thức nấu ăn')
      .addTag('Fridge', 'Tủ lạnh cá nhân')
      .addTag('Meal Planning', 'Thực đơn tuần & Danh sách mua')
      .addTag('AI Chat', 'Đầu bếp AI — Chat & Stream')
      .addTag('Admin', 'Quản trị hệ thống')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup(SWAGGER_PATH, app, document, {
      customSiteTitle: 'Friggy API Docs',
      customfavIcon: '/public/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true, // giữ token sau khi reload trang
        tagsSorter: 'alpha',
        operationsSorter: 'method',
        docExpansion: 'none', // collapse tất cả endpoint mặc định
        filter: true, // bật ô tìm kiếm endpoint
        displayRequestDuration: true, // hiển thị thời gian response
      },
    });

    console.log(
      `\nSwagger UI: http://localhost:${PORT || 3069}/${SWAGGER_PATH}\n`,
    );
  }

  const port = PORT || 3069;
  await app.listen(port, () => {
    console.log(`[SERVER] ONLINE on port: ${port} | ENV: ${NODE_ENV}`);
  });
}
bootstrap();
