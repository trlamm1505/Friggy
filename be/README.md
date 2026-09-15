# Friggy AI Service (NestJS)

AI microservice cho Friggy — xử lý Multi-Agent meal planning, fridge scan, chat AI và rate limiting.

---

## Yêu cầu

- Node.js >= 20
- npm >= 10
- Docker Desktop
- Các container của `be/` đang chạy (MySQL, Redis, RabbitMQ)

---

## 1. Khởi động các container Docker

> AI Service dùng chung container với Main BE. Nếu đã chạy từ `be/README.md` thì bỏ qua bước này.

### MySQL (port 3309)

```bash
docker run -d \
  --name friggy-mysql \
  -e MYSQL_ROOT_PASSWORD=1234 \
  -e MYSQL_DATABASE=Friggy \
  -p 3309:3306 \
  mysql:latest
```

### Redis (port 6380)

```bash
docker run -d \
  --name friggy-redis \
  -p 6380:6379 \
  redis
```

### RabbitMQ (port 5673 + management UI 15673)

```bash
docker run -d \
  --name friggy-rabbit \
  -e RABBITMQ_DEFAULT_USER=user \
  -e RABBITMQ_DEFAULT_PASS=12345 \
  -p 5673:5672 \
  -p 15673:15672 \
  rabbitmq:3-management
```

> RabbitMQ Management UI: http://localhost:15673 (user/12345)

---

## 2. Cài đặt dependencies

```bash
npm install
```

---

## 3. Cấu hình môi trường

Dự án có **2 service** — mỗi service cần file `.env` riêng.

### `be/.env`

```env
PORT=6969
NODE_ENV=development
DATABASE_URL="mysql://<user>:<password>@localhost:3309/<db_name>"

# Google OAuth
GOOGLE_CLIENT_ID=<your_google_client_id>

# SpeedSMS — OTP SMS Provider (https://speedsms.vn)
SPEEDSMS_ACCESS_TOKEN=<your_speedsms_token>
SPEEDSMS_SENDER=<brand_name>
SPEEDSMS_TYPE=4

# JWT
JWT_ACCESS_SECRET=<random_secret>
JWT_REFRESH_SECRET=<random_secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AES-256 Encryption — PHẢI KHỚP với AI_KEY_ENCRYPTION_SECRET trong ai-service/.env
# Chuỗi hex 64 ký tự (32 bytes)
ENCRYPTION_SECRET=<64_char_hex_string>

# Redis
DATABASE_REDIS=redis://localhost:6380

# RabbitMQ
RABBIT_MQ_URL=amqp://<user>:<password>@localhost:5673
```

### `ai-service/.env`

```env
PORT=6970
NODE_ENV=development

# Cùng DB với Main BE
DATABASE_URL=mysql://<user>:<password>@localhost:3309/<db_name>

# Cùng Redis với Main BE (cache + SSE pub/sub)
REDIS_URL=redis://localhost:6380

# RabbitMQ broker
RABBIT_MQ_URL=amqp://<user>:<password>@localhost:5673

# PHẢI KHỚP với ENCRYPTION_SECRET trong be/.env
AI_KEY_ENCRYPTION_SECRET=<64_char_hex_string>
```

> ⚠️ `ENCRYPTION_SECRET` (be) và `AI_KEY_ENCRYPTION_SECRET` (ai-service) **phải là cùng một giá trị** — dùng để encrypt/decrypt AI API key lưu trong DB.

---

## 4. Chạy server

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run start:prod
```

AI Service chạy tại: http://localhost:6970

---

## Kiến trúc Multi-Agent

```
MealPlanWorker (BullMQ consumer)
  └── MealPlanGraphService
        ├── SupervisorAgent   — thu thập context user
        ├── NutritionAgent    — phân tích dinh dưỡng  ─┐ song song
        ├── AccountantAgent   — phân tích ngân sách   ─┘
        ├── ChefAgent         — lập thực đơn + hybrid recipe (kho sẵn → tự tạo)
        └── EvaluatorAgent    — kiểm tra chất lượng (retry tối đa 3 lần)
```

---

## Ports tổng quan

| Service       | Host port | Container port | Ghi chú               |
| ------------- | --------- | -------------- | --------------------- |
| NestJS BE     | 6969      | —              | Main API              |
| NestJS AI     | 6970      | —              | AI service (file này) |
| MySQL         | 3309      | 3306           | Database chính        |
| Redis         | 6380      | 6379           | Cache + SSE Pub/Sub   |
| RabbitMQ AMQP | 5673      | 5672           | Message queue         |
| RabbitMQ UI   | 15673     | 15672          | Management dashboard  |
