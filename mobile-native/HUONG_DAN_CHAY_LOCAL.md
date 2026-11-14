# 🚀 Chạy Local — BE + AI Service + RN (test với DB thật)

Hướng dẫn này dành cho việc chạy **toàn bộ hệ thống local** để test RN với API thật
(không dùng mock).

> **Trạng thái đã verify (04/11/2026)**: BE + ai-service + RN đều chạy được,
> login OK, AI chat SSE OK, PayOS renew OK.

---

## 0. Tóm tắt kiến trúc local

| Thành phần | Port | Thư mục | Ghi chú |
|---|---|---|---|
| **BE** (NestJS) | 6969 | `be/` | API chính, Swagger `/api/docs` |
| **AI Service** (NestJS) | 6970 | `ai-service/` | Consumer RabbitMQ, chạy AI thật |
| **RN** (Expo) | 8081 | `mobile-native/` | `npm run start:lan` (tự detect IP LAN) |
| MySQL | 3309 | Docker | DB chính, đã migrate + seed |
| Redis | 6380 | Docker | Cache + BullMQ + SSE pub/sub |
| RabbitMQ | 5673 | Docker | Message queue BE → ai-service |
| RabbitMQ UI | 15673 | Docker | `user` / `FriggyMQ2026` |

> ⚠️ **BE chỉ PUBLISH job, không consume.** `ai-service` là consumer.
> Không chạy `ai-service` → AI chat / meal plan / scan sẽ treo vô hạn (job nằm trong queue).

---

## 1. Docker — MySQL, Redis, RabbitMQ

Containers đã có sẵn trong môi trường local. Nếu chạy trên máy mới:

```bash
# MySQL (port host 3309 -> container 3306)
docker run -d --name con-friggy-mysql \
  -e MYSQL_ROOT_PASSWORD=FriggyDB2026 \
  -e MYSQL_DATABASE=Friggy \
  -p 3309:3306 mysql:8.0

# Redis (port host 6380 -> container 6379)
docker run -d --name con-friggy-redis \
  -p 6380:6379 redis:7-alpine

# RabbitMQ (5673 -> 5672, UI 15673 -> 15672)
docker run -d --name con-friggy-rabbitmq \
  -e RABBITMQ_DEFAULT_USER=user \
  -e RABBITMQ_DEFAULT_PASS=FriggyMQ2026 \
  -p 5673:5672 -p 15673:15672 rabbitmq:3-management-alpine
```

### Kiểm tra container đã sẵn sàng

```bash
docker ps
```

Kết quả mong đợi (3 container `Up`):

```
con-friggy-mysql     mysql:8.0                      0.0.0.0:3309->3306/tcp    Up
con-friggy-redis     redis:7-alpine                 0.0.0.0:6380->6379/tcp    Up
con-friggy-rabbitmq  rabbitmq:3-management-alpine   0.0.0.0:5673->5672/tcp    Up
```

> 💡 **Lưu ý Windows:** lệnh `docker exec` có thể bị **treo** (không trả output).
> Đó là vấn đề của Docker Desktop trên WSL2, **không phải** container chết.
> Dùng `docker ps` để kiểm tra, hoặc query trực tiếp bằng `node`/`curl`.

### Truy cập RabbitMQ Management UI

http://localhost:15673 — đăng nhập `user` / `FriggyMQ2026`

Xem queue để xác nhận job có được consume:

```bash
curl -s -u user:FriggyMQ2026 http://localhost:15673/api/queues
```

Kết quả mong đợi (mỗi queue có `consumers: 1` khi `ai-service` đang chạy):

```
ai-chat-message-queue    | messages=0 | consumers=1
ai-expiring-meal-queue   | messages=0 | consumers=1
ai-slot-regenerate-queue | messages=0 | consumers=1
fridge-scan-queue        | messages=0 | consumers=1
meal-plan-generate-queue | messages=0 | consumers=1
public-chat-queue        | messages=0 | consumers=1
```

---

## 2. BE — `be/`

### 2.1. Cấu hình `.env`

`be/.env` đã có sẵn. Giá trị quan trọng:

```env
PORT=6969
NODE_ENV=development
DATABASE_URL="mysql://root:FriggyDB2026@localhost:3309/Friggy"
DATABASE_REDIS=redis://localhost:6380
RABBIT_MQ_URL=amqp://user:FriggyMQ2026@localhost:5673
```

Các key khác (`PAYOS_*`, `JWT_*`, `ENCRYPTION_SECRET`, `GOOGLE_CLIENT_ID`,
`FIREBASE_SERVICE_ACCOUNT_JSON`) đã có sẵn trong file.

> ⚠️ **`ENCRYPTION_SECRET` (be) phải == `AI_KEY_ENCRYPTION_SECRET` (ai-service).**
> Dùng để encrypt/decrypt Gemini API key lưu trong DB. Nếu lệch → AI provider
> không đọc được key → AI chat fail.

### 2.2. Chạy

```bash
cd be
npm install          # chỉ lần đầu
npm run start:dev    # watch mode
```

Đợi tới khi log hiện:

```
[SERVER] ONLINE on port: 6969 | ENV: development
Swagger UI: http://localhost:6969/api/docs
```

### 2.3. Kiểm tra nhanh

```bash
# Swagger
curl -s -o NUL -w "%{http_code}" http://localhost:6969/api/docs
# -> 200

# Login
curl -s -X POST http://localhost:6969/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@friggy.vn","password":"Demo@12345"}'
# -> {"message":"...","statusCode":201,"data":{"accessToken":"...","refreshToken":"...","user":{...}}}
```

> ℹ️ BE bọc response trong `{ message, statusCode, data }`.
> RN (`ApiClient`) tự unwrap `body.data` nên không cần xử lý gì thêm.

### 2.4. Database đã sẵn sàng

DB đã được migrate + seed (43 bảng, 4 user, 15 recipe, 3 gói dịch vụ):

| Email | Password | Role | Ghi chú |
|---|---|---|---|
| `admin@friggy.vn` | `Friggy@Admin2026` | admin | ⚠️ Đổi khi deploy |
| `manager@friggy.vn` | `Friggy@Manager2026` | manager | |
| `user@friggy.vn` | `Test@12345` | user | |
| `demo@friggy.vn` | `Demo@12345` | user | **User đầy đủ dữ liệu** — profile, preferences, tủ lạnh, gói `individual` active |

> ⚠️ Comment trong `be/prisma/seed.sql` ghi `user@friggy.vn` → `User@12345`,
> nhưng hash thực tế là **`Test@12345`**. Đã ghi nhận — cần sửa comment trong seed.sql.
>
> `demo@friggy.vn` có gói **individual** (79.000đ) active → test luồng gia hạn được ngay.

Nếu cần migrate/seed lại từ đầu:

```bash
cd be
npx prisma migrate deploy
mysql -h localhost -P 3309 -uroot -pFriggyDB2026 Friggy < prisma/seed.sql
```

---

## 3. AI Service — `ai-service/`

### 3.1. Cấu hình `.env`

```env
PORT=6970
NODE_ENV=development
DATABASE_URL=mysql://root:FriggyDB2026@localhost:3309/Friggy
REDIS_URL=redis://localhost:6380
RABBIT_MQ_URL=amqp://user:FriggyMQ2026@localhost:5673
AI_KEY_ENCRYPTION_SECRET=<64 hex chars>   # PHẢI == ENCRYPTION_SECRET trong be/.env
```

### 3.2. Chạy (terminal riêng)

```bash
cd ai-service
npm install          # chỉ lần đầu
npm run start:dev
```

### 3.3. Kiểm tra

```bash
curl -s -o NUL -w "%{http_code}" http://localhost:6970/api/docs
# -> 200
```

Và xem RabbitMQ queue có `consumers: 1` (xem §1).

---

## 4. RN — `mobile-native/`

### 4.1. Chạy nhanh (KHUYẾN NGHỊ — không cần sửa IP)

```bash
cd mobile-native
npm install          # chỉ lần đầu
npm run start:lan
```

Script `scripts/startLan.js` sẽ:

1. **Tự detect IP LAN** hiện tại của máy host (dùng package `lan-network` —
   cùng cơ chế Expo CLI dùng để bind dev server; fallback sang UDP socket nếu
   package không resolve được).
2. **Inject** `EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN>:6969/api/v1` vào
   `process.env` của tiến trình Expo.
3. Chạy `expo start --lan`.

Kết quả in ra:

```
[friggy] IP LAN phát hiện: 192.168.1.60
[friggy] API base URL:    http://192.168.1.60:6969/api/v1
```

> ✅ **Đổi mạng / đổi Wi-Fi không cần sửa file env nữa.** IP tự cập nhật mỗi lần
> chạy lại lệnh.

Truyền thêm flag cho Expo CLI:

```bash
npm run start:lan -- --clear     # xoá cache Metro
npm run start:lan -- --tunnel    # dùng tunnel thay vì LAN
```

Xem IP mà script sẽ dùng (không chạy server):

```bash
npm run detect:ip
```

**Vì sao inject qua `process.env` là đủ?**

- `@expo/env` (dùng bởi Expo CLI) **không ghi đè** biến đã tồn tại trong shell
  env — log sẽ hiện `env: export ...` mà **không** có `EXPO_PUBLIC_API_BASE_URL`
  vì nó đã được set sẵn.
- Ở chế độ dev, Expo SDK 57 inline `process.env.EXPO_PUBLIC_*` ở **runtime**
  qua virtual module `expo/virtual/env` (hỗ trợ HMR) → giá trị mới có hiệu
  lực ngay, không phụ thuộc `.env`.

> ℹ️ `npx expo start --lan` (không qua script) vẫn chạy được nhưng **không** tự
> set API URL → app sẽ trỏ về giá trị trong `.env.local`.

### 4.2. Cấu hình `.env.local` (chỉ 1 lần, cho trường hợp chạy thủ công)

File này **đã được gitignore** (`.gitignore:5`) → an toàn, không bị commit nhầm.

```bash
cd mobile-native
cp .env .env.local
```

Nội dung mặc định (đã có sẵn trong repo):

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:6969/api/v1
EXPO_PUBLIC_FILE_BASE_URL=
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_SAFE_FALLBACK=false
GOOGLE_CLIENT_ID=717739810642-4neqbd4q4v3i65hup78shtn557u80d3s.apps.googleusercontent.com
```

### 4.3. Chọn `HOST` theo cách chạy RN (khi KHÔNG dùng `npm run start:lan`)

| Cách chạy | `EXPO_PUBLIC_API_BASE_URL` | Ghi chú |
|---|---|---|
| **Điện thoại thật (Expo Go)** | `http://192.168.1.227:6969/api/v1` | Điện thoại cùng Wi-Fi với máy host. IP đổi theo DHCP → dùng `npm run start:lan` để tự động hoá |
| **Emulator Android** | `http://10.0.2.2:6969/api/v1` | `10.0.2.2` = alias host loopback từ emulator |
| **Simulator iOS / RN trên máy host** | `http://localhost:6969/api/v1` | |
| **RN Web** (`--web`) | `http://localhost:6969/api/v1` | BE đã bật CORS `origin: true` → OK |

Lấy IP LAN của máy host (Windows):

```powershell
ipconfig | Select-String "IPv4"
```

### 4.4. Chạy thủ công (không dùng script)

```bash
cd mobile-native
npx expo start
```

Chọn target: `a` (Android) · `i` (iOS) · `w` (Web) · `s` (Expo Go → quét QR).

> ⚠️ **Sau khi sửa `.env.local` phải restart `npx expo start`.**
> Expo chỉ đọc env lúc khởi động, không hot-reload.

### 4.5. Hai chế độ chạy

| `EXPO_PUBLIC_USE_MOCKS` | Hành vi |
|---|---|
| `false` | Dùng **BE thật** (`Real*Service`) — dùng khi test luồng server |
| `true` | Dùng **mock** (`Mock*Service`) — test UI nhanh, không cần BE |

Khi `USE_MOCKS=false`, `EXPO_PUBLIC_SAFE_FALLBACK=false` đảm bảo **không fallback
sang mock khi BE lỗi** (đúng yêu cầu R3 — user phải thấy lỗi thật).

---

## 5. Checklist test theo domain

Đã verify các dòng ✅ bằng API thật. Phần còn lại cần test trên thiết bị.

### 5.1. Auth ✅

```bash
curl -s -X POST http://localhost:6969/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@friggy.vn","password":"Demo@12345"}'
```

### 5.2. Subscriptions / PayOS ✅

```bash
TOKEN=<accessToken từ login>

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:6969/api/v1/subscriptions/me
# -> { status: "active", plan: { name: "individual", displayName: "Gói Cá Nhân", priceVnd: 79000 } }

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:6969/api/v1/subscriptions/plans
# -> 3 gói: free / individual (79.000) / family (149.000)

curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:6969/api/v1/subscriptions/renew
# -> { paymentRef: "FRIGGY-RENEW-...", qrCode: "<base64>", amount: 79000 }
```

**Kiểm tra chuỗi nội dung chuyển khoản** (phải khớp RN hiển thị):

```sql
SELECT type, planName, description, amount, status
FROM payment_transactions ORDER BY id DESC LIMIT 3;
```

Kết quả mong đợi:

| type | description | độ dài |
|---|---|---|
| `renew` | `Gia hạn Friggy Gói Cá Nhân` | 24 |
| `subscribe` | `Friggy Gói Cá Nhân` | 19 |

> ℹ️ `payos.service.ts` cắt chuỗi ở **ranh giới từ** (không cắt cụt) → "Gia hạn Friggy Gói Gia Đình"
> (27 ký tự) thành "Gia hạn Friggy Gói Gia" (24 ký tự). RN dùng **cùng quy tắc**
> (`truncateTransferDescription`) → 2 bên luôn khớp.

### 5.3. AI Chat (SSE) ✅

```bash
TOKEN=...
# 1. Tạo session
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{}' http://localhost:6969/api/v1/ai-chat/sessions
# -> { id: "<sessionId>" }

# 2. Gửi tin (payload field là `content`, KHÔNG phải `message`!)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"content":"Tôi có cà chua và trứng, nấu món gì?"}' \
  http://localhost:6969/api/v1/ai-chat/sessions/<sessionId>/messages
# -> 202 { messageId, status: "pending", streamUrl }

# 3. Mở SSE (phải mở TRƯỚC hoặc NGAY khi gửi để bắt được chunk)
curl -N -H "Authorization: Bearer $TOKEN" \
  http://localhost:6969/api/v1/ai-chat/sessions/<sessionId>/stream
```

> ⚠️ **Mở SSE sau khi AI đã trả lời xong sẽ không thấy chunk nào** (Redis pub/sub
> không giữ lịch sử). Kiểm tra kết quả trong DB nếu bỏ lỡ:
>
> ```sql
> SELECT role, content, createdAt FROM chat_messages
> WHERE sessionId = '<sessionId>' ORDER BY createdAt;
> ```

### 5.4. Fridge / Recipes / Ingredients ✅

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:6969/api/v1/fridge
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:6969/api/v1/fridge/stats
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:6969/api/v1/ingredients
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:6969/api/v1/recipes
```

> ⚠️ Route list là `GET /api/v1/fridge` (không phải `/fridge/items`).
> `POST /fridge/items` mới là thêm nguyên liệu.

### 5.5. Family ✅

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:6969/api/v1/family/me
# -> { role: "none" | "owner" | "member", group: {...} }
```

### 5.6. Notifications ✅

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:6969/api/v1/notifications
```

### 5.7. Meal Planning

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:6969/api/v1/meal-planning/plans
```

> ℹ️ Demo user chưa có kế hoạch sẵn → tạo mới qua UI ("Lập thực đơn tuần").
> Luồng này publish job lên RabbitMQ → `ai-service` xử lý → SSE stream kết quả.

---

## 6. Troubleshooting

### BE không khởi động

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| `Error: P1001 Can't reach database server` | MySQL container chưa sẵn sàng | Chờ 10-20s sau `docker run`, kiểm tra `docker ps` |
| `ECONNREFUSED 6380` | Redis chưa chạy | `docker ps` → `con-friggy-redis` phải `Up` |
| `Missing PAYOS_CLIENT_ID` | `.env` thiếu key | `PayOsService` **throw** khi thiếu 3 key PayOS |
| `EADDRINUSE 6969` | BE đã chạy | `Get-NetTCPConnection -LocalPort 6969` để tìm PID, kill nó |

### AI chat không trả lời

1. `ai-service` có đang chạy? → `curl http://localhost:6970/api/docs`
2. RabbitMQ queue có `consumers: 1`? → xem §1
3. `ENCRYPTION_SECRET` (be) == `AI_KEY_ENCRYPTION_SECRET` (ai-service)?
4. Đọc log `ai-service` — lỗi Gemini sẽ hiện ở đó

### RN không gọi được BE

| Triệu chứng | Nguyên nhân |
|---|---|
| `Network request failed` (điện thoại thật) | Sai IP trong `.env.local` → dùng `npm run start:lan` (tự detect IP) hoặc `ipconfig` lấy IP LAN hiện tại. Nhớ restart server |
| `Network request failed` (emulator Android) | Dùng `10.0.2.2` chứ không phải `localhost` |
| Vẫn gọi production | Quên restart `expo start` sau khi sửa `.env.local`, hoặc `.env.local` chưa tồn tại |
| IP hiển thị sai khi chạy `npm run start:lan` | Máy có nhiều adapter (VPN/WSL/Hyper-V) → kiểm tra `npm run detect:ip`, hoặc override bằng `FRIGGY_API_PORT` + sửa `.env.local` |
| 401 Unauthorized | Token hết hạn → đăng xuất/đăng nhập lại |

### Port bị chiếm

```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 6969,6970,8081 }
```

---

## 7. Lệnh hay dùng

```bash
# Theo dõi log BE realtime
cd be && npm run start:dev

# Restart nhanh
Ctrl+C rồi npm run start:dev

# Test BE từ PowerShell
$body=@{email="demo@friggy.vn";password="Demo@12345"}|ConvertTo-Json
$r=Invoke-RestMethod -Uri "http://localhost:6969/api/v1/auth/email/login" `
  -Method POST -Body $body -ContentType "application/json"
$tok=$r.data.accessToken
Invoke-RestMethod -Uri "http://localhost:6969/api/v1/subscriptions/me" `
  -Headers @{Authorization="Bearer $tok"}

# Xem queue RabbitMQ
curl -s -u user:FriggyMQ2026 http://localhost:15673/api/queues

# Query DB (Node — không cần cài mysql client)
cd be && node -e "
const mysql=require('mysql2/promise');
(async()=>{
  const c=await mysql.createConnection({host:'localhost',port:3309,user:'root',
    password:'FriggyDB2026',database:'Friggy'});
  const [r]=await c.query('SELECT id,email,name FROM users');
  console.log(r); await c.end();
})();
"
```

---

## 8. Tài liệu liên quan

- `be/README.md` — kiến trúc AI Service, ports
- `mobile-native/README.md` — cấu trúc RN, mock data
- `be/guide/meal_plan_test_guide.md` — hướng dẫn test meal plan
- Swagger BE: http://localhost:6969/api/docs
- Swagger AI Service: http://localhost:6970/api/docs
- RabbitMQ UI: http://localhost:15673
