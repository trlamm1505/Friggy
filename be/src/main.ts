import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  PORT,
  NODE_ENV,
  SWAGGER_PATH,
  APP_URL,
} from './common/constants/app.constant';
import { SocketIoAdapter } from './modules-system/socket/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ── Socket.IO Adapter (CORS + transports + ping config) ──────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.useWebSocketAdapter(new SocketIoAdapter() as any);

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

  // ── Swagger UI (bật cả production & development) ────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Friggy API')
    .setDescription(
      `**Tủ lạnh thông minh** — Hệ thống quản lý thực phẩm & tư vấn bữa ăn AI.\n\n` +
        `### Quy ước\n` +
        `- Tất cả response bọc trong \`{ success, data, message }\`\n` +
        `- DateTime theo chuẩn **ISO 8601** (UTC)\n` +
        `- Tiền tệ đơn vị **VND** (số nguyên)\n` +
        `- Ảnh trả về dưới dạng **path tương đối** \`/avatars/...\`\n\n` +
        `### Auth\n` +
        `Dùng **Bearer Token** (JWT). Lấy token qua \`POST /api/v1/auth/google\` hoặc \`POST /api/v1/auth/email/login\`.\n\n` +
        `### Phân quyền Admin Panel\n` +
        `Các nhóm chức năng quản trị được phân biệt qua tiền tố trong mô tả tag:\n\n` +
        `| Tiền tố trên tag | Quyền truy cập |\n` +
        `|---|---|\n` +
        `| **[Chỉ Admin]** | Chỉ tài khoản admin (siêu quản trị) mới có quyền |\n` +
        `| **[Admin | Manager]** | Cả admin lẫn manager đều có quyền |\n\n` +
        `> **Manager** có thể quản lý nội dung & kinh doanh nhưng không được truy cập cấu hình kỹ thuật (AI, Cron Jobs, tạo/sửa/xoá gói cước).`,
  )
    .setVersion('1.0')
    .addServer(
      APP_URL,
      NODE_ENV === 'production' ? 'Production' : 'Development',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhập Access Token JWT vào đây',
      },
      'access-token',
    )
    .addTag('Auth', 'Đăng nhập / Đăng xuất')
    .addTag('Users', 'Hồ sơ & Tùy chọn người dùng')
    .addTag('Ingredients', 'Nguyên liệu & Danh mục')
    .addTag('Recipes', 'Công thức nấu ăn')
    .addTag('Fridge', 'Tủ lạnh cá nhân')
    .addTag('Notifications', 'Thông báo & Cài đặt thông báo')
    .addTag('Subscriptions', 'Gói dịch vụ Free & Individual')
    .addTag(
      'Payment Transactions',
      'Lịch sử giao dịch thanh toán & Polling trạng thái',
    )
    .addTag('Family', 'Gói Gia Đình — Mời thành viên, Chấp nhận, Giải tán')
    .addTag('Meal Planning', 'Thực đơn tuần & Danh sách mua')
    .addTag('AI Chat', 'Đầu bếp AI — Chat có tài khoản & Chatbot công khai')
    .addTag('AI Public Chat', 'API Chat public (Chatbot SEO)')
    .addTag('Admin / AI', '[Chỉ Admin] Cấu hình AI provider & system prompt — chỉ tài khoản admin mới được phép')
    .addTag('Admin / Cron', '[Chỉ Admin] Điều khiển cron job — bật/tắt, đổi schedule, trigger thủ công')
    .addTag('Admin / Ingredients', '[Admin | Manager] Quản lý nguyên liệu & danh mục nguyên liệu')
    .addTag('Admin / Payment Transactions', '[Admin | Manager] Xem toàn bộ lịch sử giao dịch thanh toán')
    .addTag('Admin / Plans', '[Chỉ Admin] Tạo / Sửa / Xoá gói cước | [Admin | Manager] Xem danh sách gói')
    .addTag('Admin / Recipes', '[Admin | Manager] Quản lý công thức nấu ăn hệ thống')
    .addTag('Admin / Roles', '[Chỉ Admin] Quản lý danh sách vai trò (roles) & cập nhật mô tả')
    .addTag('Admin / Sponsors', '[Admin | Manager] Quản lý nhà tài trợ & chiến dịch quảng cáo')
    .addTag('Admin / Stats', '[Admin | Manager] Dashboard thống kê — người dùng, doanh thu, AI usage')
    .addTag('Admin / Users', '[Admin | Manager] Quản lý tài khoản & trạng thái người dùng')
    .addTag('Admin / Sessions & AI Quota', '[Chỉ Admin] Quản lý phiên đăng nhập & ghi đè quota AI theo user')
    .addTag('Admin / System Config', '[Chỉ Admin] Cấu hình hệ thống runtime: Token TTL, OTP, Bảo trì, Health')
    .addTag('Admin / Activity Logs', '[Chỉ Admin] Lịch sử hoạt động của admin và manager')
    .addTag('Admin / Broadcast', '[Chỉ Admin] Gửi thông báo đẩy hàng loạt đến nhóm người dùng')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    customSiteTitle: 'Friggy API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      docExpansion: 'none',
      filter: true,
      displayRequestDuration: true,
    },
  });

  console.log(`\nSwagger UI: ${APP_URL}/${SWAGGER_PATH}\n`);

  const port = PORT || 3069;
  await app.listen(port, () => {
    console.log(`[SERVER] ONLINE on port: ${port} | ENV: ${NODE_ENV}`);
  });
}
bootstrap();
