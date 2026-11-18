# FRIGGY — Tổng thể chức năng & luồng hoạt động (BE + AI Service + Mobile Native)

> Tài liệu này mô tả **toàn bộ** chức năng của hệ thống Friggy theo **hai lớp nghĩa**:
>
> 1. **NGHĨA ĐƠN GIẢN** — người dùng/nhà sản phẩm hiểu: "App gửi gì lên server, server xử lý gì, app hiển thị lại cái gì".
> 2. **NGHĨA HỌC THUẬT** — lập trình viên hiểu: UI component nào → hook nào → service method nào → HTTP method + route + body/header → guard → controller → service → Prisma model / RabbitMQ / Redis / SQLite → response envelope.
>
> **Phạm vi**: `be/` (NestJS API), `ai-service/` (worker AI), `email-service/`, `mobile-native/` (React Native Expo).
> Tài liệu này **không sửa code**, chỉ mô tả.

---

# PHẦN 0 — BẢN ĐỒ HỆ THỐNG (đọc trước)

## 0.1. Ba tiến trình chính

| Tiến trình | Thư mục | Công nghệ | Vai trò |
|---|---|---|---|
| **API (BE)** | `be/` | NestJS + Prisma + PostgreSQL | Xử lý HTTP/REST, xác thực, nghiệp vụ chính, phát job async, phục vụ file tĩnh, WebSocket `/family` |
| **AI Service** | `ai-service/` | NestJS worker + LLM (multi-agent) | Consume job RabbitMQ, chạy pipeline AI, publish tiến độ ngược lại qua Redis Pub/Sub |
| **Mobile Native** | `mobile-native/` | React Native + Expo + Zustand + SQLite | UI, gọi API, cache offline, đồng bộ 2 chiều, SSE, push notification |

Ngoài ra: `email-service/` (NestJS microservice riêng, gửi email OTP/chào mừng), `Web/` (web app cũ, không nằm trong phạm vi tài liệu này).

## 0.2. Hạ tầng phụ trợ

- **PostgreSQL** — database chính (Prisma ORM, 41 model).
- **Redis** — cache config động (`sysconfig:*`), Pub/Sub bridge giữa BE và AI Service, rate-limit.
- **RabbitMQ** — hàng đợi job AI, exchange `friggy.ai`.
- **Socket.IO** — realtime nhóm gia đình (namespace `/family`).
- **FCM (Firebase Cloud Messaging)** — push notification từ server xuống máy.

## 0.3. Chuỗi tổng quát của 1 request (NGHĨA HỌC THUẬT)

```
[UI Component]  (React Native, ví dụ FridgeInventoryScreen)
      │ useAsyncData/useFridgeItems() — hook gọi service qua useServices()
      ▼
[Service Layer]  RealFridgeService.getItems(filters)
      │ ApiClient.get('/fridge', { params })
      ▼
[ApiClient]  Axios interceptor:
      │  - gắn header Authorization: Bearer <accessToken>
      │  - unwrap response 3 nhánh
      │  - 401 → refresh single-flight → replay request
      ▼
[HTTP]  GET {API_BASE_URL}/api/v1/fridge?storageLocation=fridge
      ▼
[BE]  Global prefix /api + VersioningType.URI (v1)
      │ Guard chain: JwtAuthGuard → MaintenanceGuard → RolesGuard
      │ Interceptor: LoggingInterceptor → ResponseSuccessInterceptor
      ▼
[Controller]  FridgeController.findAll(@CurrentUser() user, @Query() query)
      ▼
[Service]  FridgeService.findAll(userId, query)  → Prisma query
      ▼
[DB]  prisma.fridgeItem.findMany({ where: { userId, ... } })
      ▼
[Response]  { statusCode: 200, message: 'Success', data: FridgeItemResponseDto[] }
      ▼
[ApiClient unwrap]  → res.data.data
      ▼
[Service mapper]  _toFridgeItem(dto) → shape FridgeItem của UI
      ▼
[Hook setState] → [UI render]
```

> **Khi offline**: `SafeService` bắt lỗi network → đọc SQLite cache (đọc) hoặc ghi vào Outbox queue (ghi) → UI vẫn render dữ liệu thật đã tải trước đó. Xem [PHẦN 2.4](#24-tầng-offline-sqlite--outbox--synengine).

---

# PHẦN 1 — BACKEND (NestJS)

## 1.1. NGHĨA ĐƠN GIẢN

> Backend là "trung tâm xử lý". App gửi yêu cầu lên, backend kiểm tra quyền → đọc/ghi database → có khi đẩy việc nặng (AI) sang hàng đợi chạy nền → trả kết quả về app để hiển thị. Mọi câu trả lời đều có cùng một khuôn: `{ statusCode, message, data }`.

## 1.2. NGHĨA HỌC THUẬT

### 1.2.1. Khởi động (`be/src/main.ts`)

- `app.setGlobalPrefix('api')` + `app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })` ⇒ **mọi route thực tế là `/api/v1/<controller-path>`**.
- `app.useStaticAssets(join(process.cwd(), 'public'))` ⇒ file tĩnh (avatar, ảnh scan) phục vụ ở **root** (`/avatars/x.jpg`), *không* có `/api/v1`.
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } })` ⇒ field không khai báo trong DTO sẽ bị **400**; query string tự cast kiểu.
- `app.enableCors({ origin: true, credentials: false })`.
- Swagger UI tại `SWAGGER_PATH` (bật cả production).

### 1.2.2. Lớp global (`be/src/app.module.ts`)

| Loại | Class | Vai trò |
|---|---|---|
| Filter | `HttpExceptionFilter` | Chuẩn hóa lỗi: `{ statusCode, message, error, timestamp, path }` |
| Interceptor | `LoggingInterceptor` | Log request (đặt **trước** để log cả response) |
| Interceptor | `ResponseSuccessInterceptor` | Bọc mọi response thành `{ statusCode, message: 'Success', data }` |
| Guard | `JwtAuthGuard` | Bắt buộc `Authorization: Bearer` trừ route `@Public()` |
| Guard | `MaintenanceGuard` | Chặn API khi hệ thống bảo trì (đọc `system_config`) |
| Guard | `RolesGuard` | Phân quyền theo `@Roles(...)` |

Guard đặc biệt theo route:
- **`AiUsageLimitGuard`** + `@AiFeature('chat' | 'slot_regenerate' | ...)` — kiểm tra hạn mức AI tuần từ `subscription_plans.aiUsagePerWeek` (đọc Redis → PostgreSQL), trả **429** nếu vượt.

Module system (`@Global`): `PrismaModule`, `RedisModule`, `RabbitMqPublisherModule`, `SocketModule`, `TokensModule`, `EmailClientModule`.

### 1.2.3. Xác thực & JWT (`modules-system/tokens/tokens.service.ts`)

- **Dual token**: `accessToken` (JWT ngắn hạn, trả về client, client giữ trong bộ nhớ/MMKV) + `refreshToken` (lưu DB dưới dạng **SHA-256 hash**, TTL **động** đọc từ `system_config`/Redis).
- `generateTokenPair(userId, role, deviceInfo, ipAddress)` → trả `{ accessToken, refreshToken, expiresAt, refreshExpiresAt }`.
- `verifyAccessToken(token)` → `JwtPayload { sub, role, email, ... }` → `@CurrentUser()`.
- Mật khẩu hash bằng `bcrypt` (10 rounds).

### 1.2.4. Model database (Prisma, `be/prisma/schema.prisma`)

Nhóm chính: `Role`, `User`, `EmailOtp`, `UserProfile`, `UserPreference`, `RefreshToken`, `IngredientCategory`, `Ingredient`, `Tag`, `Recipe`, `RecipeIngredient`, `RecipeStep`, `RecipeTag`, `UserSavedRecipe`, `FridgeItem`, `IngredientScanLog`, `UserAllergy`, `WeeklyPlan`, `DailyPlan`, `MealSlot`, `ShoppingList`, `ShoppingListItem`, `AiSystemPrompt`, `ChatSession`, `ChatMessage`, `AiProviderConfig`, `AiUsageLog`, `AdminActivityLog`, `Notification`, `UserDevice`, `CronJobConfig`, `SubscriptionPlan`, `UserSubscription`, `PaymentTransaction`, `FamilyGroup`, `FamilyMember`, `SystemConfig`, `SupplierProfile`, `SupplierPlan`, `SupplierSubscription`, `SupplierIngredient`, `SupplierPaymentTransaction`, `SupplierApplication`.

---

# PHẦN 2 — MOBILE NATIVE (React Native / Expo)

## 2.1. NGHĨA ĐƠN GIẢN

> Mobile có 3 tầng: **UI** (màn hình/component) → **Service** (hàm gọi API theo nghiệp vụ) → **ApiClient** (bộ gọi HTTP chung). Ngoài ra có tầng **offline**: mất mạng thì app đọc dữ liệu đã lưu trên máy, và các thao tác ghi được xếp hàng rồi tự đẩy lên server khi có mạng trở lại.

## 2.2. NGHĨA HỌC THUẬT — Tầng UI & Hook

- **Hooks** (`presentation/hooks/`):
  - `useServiceHooks.js` — generic `useAsyncData(fetcher, initialValue, deps)` + các hook chuyên biệt: `useFridgeItems`, `useFridgeSummary`, `useRecipes`, `useRecipesFiltered`, `useRecipeById`, `useRecipeSuggestions`, `useWeeklyStats`, `useNotifications`, `useUnreadCount`, `useUserProfile`.
  - `useNetworkStatus.js` — theo dõi online/offline.
  - `useSyncEngine.js` — trigger đồng bộ khi có mạng.
  - `useScanFlow.js` — luồng quét ảnh/receipt/barcode (upload → poll → review → confirm).
  - `useCookSlot.js` — tick "đã nấu" một meal slot.
  - `usePushNotifications.js` — đăng ký/đăng ký FCM token.
  - `useSubscriptionManagement.js` — mua gói, hủy gia hạn, lịch sử thanh toán.
- **State**: `useAuthStore` (Zustand + MMKV) — session, token, offline resume.
- **Context**: `data/ServiceProvider.jsx` cấp `useServices()` cho toàn app.

## 2.3. NGHĨA HỌC THUẬT — Tầng Service & ApiClient

### 2.3.1. `data/api/ApiClient.js` (Axios wrapper)

- `baseURL = appConfig.API_BASE_URL` (mặc định `https://api.friggy.io.vn/api/v1`).
- **Request interceptor**: gắn `Authorization: Bearer <accessToken>` từ `TokenStorage` trừ khi `options.skipAuth = true`.
- **Response interceptor — unwrap 3 nhánh**: `res.data.data` → `res.data` → `res.data` nguyên bản.
- **401 → refresh single-flight**: cờ `isRefreshing` + `failedQueue`; chỉ 1 request refresh chạy, các request khác chờ; refresh qua `rawClient` (không qua interceptor) để tránh loop vô hạn; sau đó replay request gốc với config giữ nguyên (method/data/headers/params).
- **Bất biến 6**: 401 ở `/auth/email/login|register|verify-otp|forgot-password|reset-password|/auth/google` **không refresh, không logout** (lỗi nhập liệu của user, không phải hết phiên).
- **Refresh token hết hạn theo config động**: `TokenStorage.isRefreshTokenExpired()` đọc `expiresAt` BE trả về.
- **Lỗi mạng khi refresh** ⇒ **không logout**, giữ token local, trả `ApiException(statusCode: 503, isNetworkError: true)` ⇒ app chạy bằng cache offline.
- Phân loại lỗi qua `ApiException.fromAxiosError` → `ApiException { message, statusCode, isNetworkError }`.
- `ApiClient.uploadFile(url, uri, fieldName, formFields)` — build `FormData`, **tự đoán MIME** theo đuôi file (`image/jpeg|png|webp`) để khớp `imageFileFilter` của BE; không set `Content-Type` thủ công để axios tự set boundary.

### 2.3.2. `data/api/ServiceRegistry.jsx` + `SafeService.js`

- `registerService(key, instance)` — side-effect ở cuối mỗi file `Real*Service.js`.
- `ServiceProvider` quyết định `mock` vs `real` (biến môi trường `EXPO_PUBLIC_USE_MOCKS`), rồi bọc bằng `SafeService.withFallback`.

**SafeService — 4 tầng fallback:**

| Tình huống | Hành vi |
|---|---|
| Thành công | trả dữ liệu thật |
| **Ghi** + lỗi 5xx | **ném lỗi thật** (không mock, không queue) |
| **Ghi** + lỗi network | có `mutationHandler` → ghi vào Outbox + ném `OfflineQueuedError`; không có → ném `OfflineRequiresNetworkError` |
| **Đọc** + lỗi network | đọc SQLite cache → cache rỗng → ném lỗi thật |
| Lỗi 4xx (401/403/408/422/429) | **ném lên UI**, tuyệt đối không fallback (giấu lỗi = nói dối) |
| 5xx khi đọc | fallback (cache → mock nếu `allowMockData`) |

`allowMockData` mặc định `false` ⇒ app **không bao giờ** trả dữ liệu giả. Mock vẫn được giữ trong bundle chỉ để (1) dựng proxy đúng contract interface, (2) chế độ demo.

### 2.3.3. `data/api/SseClient.js`

- Không dùng `EventSource` (React Native không có) → dùng `expo/fetch` + `ReadableStream`, decode chunk UTF-8 bằng `TextDecoder`, tách theo `\n\n`.
- `normalizeSsePayload()` **unwrap 2 lớp** do NestJS `@Sse()` bọc: `data: {"type":"message","data":"{\"event\":\"chunk\",\"data\":\"...\"}"}` → `{ event: 'chunk', data: '...' }`.
- Hỗ trợ `AbortSignal` để dừng stream khi rời màn hình.

### 2.3.4. Các `Real*Service` (mapping hàm → endpoint)

| Service | Method → HTTP | Route |
|---|---|---|
| **RealAuthService** | `loginWithEmail` | `POST /auth/email/login` |
| | `registerWithEmail` | `POST /auth/email/register` |
| | `verifyOtp` | `POST /auth/email/verify-otp` |
| | `loginWithGoogle` | `POST /auth/google` |
| | `forgotPassword` | `POST /auth/email/forgot-password` |
| | `resetPassword` | `POST /auth/email/reset-password` |
| | `changePassword` | `POST /auth/email/change-password` |
| | `refreshToken` | `POST /auth/refresh` |
| | `logout` | `POST /auth/logout` |
| | `getMe` | `GET /users/me` |
| **RealFridgeService** | `getItems` | `GET /fridge` |
| | `addItem` | `POST /fridge/items` |
| | `updateItem` | `PATCH /fridge/items/{id}` (kèm `version` cho optimistic locking) |
| | `removeItem` | `DELETE /fridge/items/{id}` |
| | `consumeItem` | `PATCH /fridge/items/{id}/consume` |
| | `getStats` | `GET /fridge/stats` |
| | `getStatsChart` | `GET /fridge/stats/chart?period=week\|month` |
| | `getExpiring` | `GET /fridge/expiring?days=3` |
| | `scanImage / scanReceipt / scanBarcode` | `POST /fridge/scan/image|receipt|barcode` (multipart `file`) |
| | `getScanStatus` | `GET /fridge/scan/{scanId}` |
| | `confirmScan` | `POST /fridge/scan/{scanId}/confirm` |
| | `getScanHistory` | `GET /fridge/scan/history` |
| | `searchIngredients` | `GET /ingredients` |
| **RealRecipeService** | `getRecipes / getRecipesFiltered` | `GET /recipes` |
| | `getRecipeById` | `GET /recipes/{id}` |
| | `getSuggestions` | `GET /recipes/suggestions` |
| | `getBookmarked / addBookmark / removeBookmark` | `GET /recipes/bookmarked`, `POST|DELETE /recipes/{id}/bookmark` |
| | `getPlans` | `GET /meal-planning/plans` |
| | `getPlanDetail` | `GET /meal-planning/plans/{id}` |
| | `getNextWeekPlan` | (combo 2 call trên) |
| | `getSlotDetail` | `GET /meal-planning/slots/{id}` |
| | `updatePlan` | `PATCH /meal-planning/plans/{id}` |
| | `updateSlot` | `PATCH /meal-planning/slots/{id}` |
| | `generatePlan` | `POST /meal-planning/plans/generate` |
| | `generateFromExpiring` | `POST /meal-planning/plans/generate-from-expiring` |
| | `regenerateSlot` | `POST /meal-planning/slots/{id}/regenerate` |
| | `streamPlanProgress` | SSE `GET {streamUrl}` |
| | `getShoppingLists / createShoppingList / toggleShoppingItem` | `GET/POST /meal-planning/shopping-lists`, `PATCH /meal-planning/shopping-lists/{listId}/items/{itemId}` |
| | `getWeeklyStats` | `GET /fridge/stats` (map lại) |
| **RealUserService** | `getProfile / updateProfile` | `GET/PATCH /users/me/profile` |
| | `getPreferences / updatePreferences` | `GET/PATCH /users/me/preferences` |
| | `getAllergies / addAllergy / removeAllergy` | `GET/POST /users/me/allergies`, `DELETE /users/me/allergies/{id}` |
| | `submitOnboarding` | `POST /users/me/onboarding` |
| | `getNotificationSettings / updateNotificationSettings` | `GET/PATCH /users/me/notification-settings` |
| | `getAiUsage` | `GET /users/me/ai-usage` |
| | `getSubscription` | `GET /subscriptions/me` |
| **RealNotificationService** | `getNotifications` | `GET /notifications` |
| | `markAsRead / markAllAsRead` | `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all` |
| | `deleteNotification` | `DELETE /notifications/{id}` |
| | `getUnreadCount` | `GET /notifications/unread-count` |
| | `registerFcmToken / unregisterFcmToken` | `POST/DELETE /notifications/fcm-token` |
| **RealAiChatService** | `getSessions / createSession / getSession / deleteSession` | `GET/POST /ai-chat/sessions`, `GET/DELETE /ai-chat/sessions/{id}` |
| | `sendMessage` | `POST /ai-chat/sessions/{id}/messages` |
| | `streamSession` | SSE `GET /ai-chat/sessions/{id}/stream` |
| **RealFamilyService** | `getFamily` | `GET /family/me` |
| | `inviteMember / acceptInvite / rejectInvite` | `POST /family/invite|accept|reject` |
| | `removeMember / dissolveGroup` | `DELETE /family/members/{memberId}`, `DELETE /family/groups` |
| **RealSubscriptionService** | `getPlans` | `GET /subscriptions/plans` (`skipAuth`) |
| | `getMySubscription` | `GET /subscriptions/me` |
| | `subscribe` | `POST /subscriptions/subscribe` |
| | `renew` | `POST /subscriptions/renew` |
| | `cancelRenewal` | `DELETE /subscriptions/me/auto-renewal` |
| | `getPaymentHistory` | `GET /payment-transactions/me` |
| | `getPaymentStatus` | `GET /payment-transactions/me/{paymentRef}` |
| **PushNotificationManager** | `registerToken` | `POST /notifications/fcm-token` |
| | `unregisterToken` | `DELETE /notifications/fcm-token` |

### 2.3.5. `PushNotificationManager.js`

- Đăng ký `expo-notifications`, lấy **FCM device token** → `POST /notifications/fcm-token { token, platform }`.
- Lắng nghe notification foreground → route deep-link theo `shared/constants/pushRoutes.js`.
- `PushNotificationBridge.jsx` (component) + `usePushNotifications.js` (hook) gắn vào cây component.

## 2.4. Tầng offline (SQLite + Outbox + SyncEngine)

### 2.4.1. NGHĨA ĐƠN GIẢN

> Mất mạng: các màn hình vẫn hiện dữ liệu **thật** đã tải về trước đó. Nếu user thêm/xóa/sửa thực phẩm, thao tác được **xếp hàng** trong máy. Khi có mạng lại, engine tự đẩy hàng đợi lên server, rồi tải dữ liệu mới về, rồi tải trước công thức để mở offline.

### 2.4.2. NGHĨA HỌC THUẬT

| Thành phần | File | Vai trò |
|---|---|---|
| `DatabaseService` | `data/storage/` | Mở SQLite, tạo bảng local |
| `OfflineCache` | `offline/OfflineCache.js` | Cache đọc: fridge items, stats, shopping lists, weekly plan, profile, preferences, allergies, ingredient catalog, recipe detail |
| `OutboxQueue` / `OfflineMutationQueue` | `offline/OutboxQueue.js`, `OfflineMutationQueue.js` | Hàng đợi thao tác ghi offline (`OP_TYPES`, `SYNC_STATES`) |
| `MutationHandlers` | `offline/MutationHandlers.js` | Handler cụ thể cho từng loại mutation (thêm/sửa/xóa fridge item…) |
| `NetworkMonitor` | `offline/NetworkMonitor.js` | `onNetworkEvent` → báo mất/ có mạng |
| `SyncEngine` | `offline/SyncEngine.js` | Đồng bộ 3 phase (xem dưới) |
| `CacheFallback` | `offline/CacheFallback.js` | Cầu nối SafeService → OfflineCache |

**`SyncEngine` — 3 phase** (chạy khi App mount, Home mount, hoặc sự kiện mạng khôi phục; có cờ `_isSyncing` chống chạy trùng):

- **Phase 1 – UPLOAD (Outbox → server)**: mỗi op gọi đúng service real (không fallback mock) →
  - thành công → `resolve()` (xoá khỏi hàng đợi)
  - lỗi 4xx (trừ 409) → `fail(permanent)` (xoá, không retry vô ích)
  - lỗi **409** → `markConflict()` (giữ op, hiện badge cảnh báo `SyncConflictModal`)
  - lỗi 5xx / network → `fail()` (giữ op, thử lại sau)
- **Phase 2 – PULL (server → cache)**: 6 nhóm dữ liệu: fridge items, fridge stats, shopping lists, weekly plan, profile+preferences+allergies, ingredient catalog.
- **Phase 3 – PRE-CACHE**: tải trước chi tiết công thức & slot của plan tuần, chạy nền (không await, không chặn UI).

**Conflict 409 (optimistic locking)**: `PATCH /fridge/items/{id}` so `version` client gửi với `version` trong DB; lệch ⇒ BE trả **409** ⇒ Outbox đánh dấu conflict ⇒ UI hiện modal hợp nhất.

---

# PHẦN 3 — TỪNG MODULE CHỨC NĂNG (đơn giản + học thuật)

> Mỗi module gồm 4 phần: **(A) Nghĩa đơn giản**, **(B) Luồng học thuật**, **(C) Bảng endpoint**, **(D) Ghi chú offline/AI**.

---

## 3.1. AUTH — Đăng ký / Đăng nhập / OTP / JWT

### (A) Nghĩa đơn giản
- Đăng ký bằng email: user nhập email → app gửi lên → BE tạo mã OTP 6 số, gửi qua email → user nhập OTP + mật khẩu + tên → app gửi lên → BE kiểm tra OTP, tạo tài khoản, cấp JWT → app lưu token và vào app.
- Đăng nhập email: app gửi email + mật khẩu → BE so bcrypt → trả access + refresh token.
- Đăng nhập Google: app gửi Google ID Token → BE verify với Google → tạo/nhận user → trả JWT.
- Quên mật khẩu: gửi email → BE gửi OTP → user nhập OTP + mật khẩu mới → BE reset.
- Token hết hạn: app tự gọi `/auth/refresh` rồi replay request, **không** bắt user login lại.
- Đăng xuất: app gửi refresh token → BE thu hồi trong DB.

### (B) Luồng học thuật

**Đăng ký 2 bước:**
1. `RealAuthService.registerWithEmail(email)` → `POST /auth/email/register` body `{ email }` → `AuthService.emailRegister()`:
   - check `user` tồn tại theo `email` **hoặc** `googleEmail` → 409 nếu trùng
   - `checkOtpRateLimit(email)`: tối đa **3 lần / 10 phút**
   - `generateOtp()` → `hashOtp()` → lưu `EmailOtp { id, email, otpHash, purpose:'register', expiresAt }`
   - TTL lấy động: `Redis 'sysconfig:otp.ttlSeconds'` → `system_config` → fallback 300s; `maxAttempts` fallback 5
   - `emailClient.emit('email.send', { type:'otp', to, data:{ otp, purpose } })` → RabbitMQ → `email-service`
   - trả `{ message, expiresIn }`
2. `verifyOtp(email, otpCode, password, name)` → `POST /auth/email/verify-otp` body `{ email, otpCode, password, name }` → controller `bcrypt.hash(password, 10)` → `AuthService.verifyEmailOtp()`:
   - `findValidOtp(email,'register')` + `validateOtpAttempt()` (đếm sai, sai quá số lần → 400)
   - tạo `User { id: uuid(), email, passwordHash, name, authProvider:'email', status:'active', roleId, isOnboardingCompleted:false, lastLoginAt }`
   - tạo `UserProfile` nếu có `name`
   - `assignFreePlan(user.id)` → gán gói Free
   - `emailClient.emit('email.send', { type:'welcome', ... })`
   - `tokensService.generateTokenPair()` → `{ accessToken, refreshToken, expiresAt, refreshExpiresAt, isNewUser:true, user:{...} }`

**Đăng nhập email:** `POST /auth/email/login` body `{ email, password }` → tìm user → `bcrypt.compare` → cập nhật `lastLoginAt` → `generateTokenPair` → `AuthResponseDto`.

**Google:** `POST /auth/google` body `{ idToken }` → `OAuth2Client.verifyIdToken()` → tìm theo `googleEmail` → chưa có thì tạo user + `assignFreePlan` → `generateTokenPair`.

**Refresh:** `POST /auth/refresh` body `{ refreshToken }` → hash SHA-256 → tìm `RefreshToken` còn hạn → xoá cũ, cấp cặp mới → trả `{ accessToken, refreshToken, expiresAt }`.

**Logout:** `POST /auth/logout` body `{ refreshToken }` → xoá/thu hồi bản ghi `RefreshToken`.

### (C) Bảng endpoint

| Method | Route | Body | Auth | Trả về |
|---|---|---|---|---|
| POST | `/auth/google` | `{ idToken }` | Public | `AuthResponseDto` |
| POST | `/auth/email/register` | `{ email }` | Public | `{ message, expiresIn }` |
| POST | `/auth/email/verify-otp` | `{ email, otpCode, password, name }` | Public | `AuthResponseDto` |
| POST | `/auth/email/login` | `{ email, password }` | Public | `AuthResponseDto` |
| POST | `/auth/email/forgot-password` | `{ email }` | Public | `{ message, expiresIn }` |
| POST | `/auth/email/reset-password` | `{ email, otpCode, newPassword }` | Public | `{ message }` |
| POST | `/auth/email/change-password` | `{ currentPassword, newPassword }` | JWT | `{ message }` |
| POST | `/auth/refresh` | `{ refreshToken }` | Public | `RefreshResponseDto` |
| POST | `/auth/logout` | `{ refreshToken }` | JWT | 204 |

### (D) Ghi chú
- `RealAuthService` **không** có fallback mock (đăng nhập giả là nguy hiểm).
- Tất cả route trên dùng `skipAuth: true` khi gọi; `/auth/email/change-password` và `/auth/logout` cần Bearer.

---

## 3.2. USERS — Hồ sơ, sở thích, dị ứng, onboarding, hạn mức AI

### (A) Nghĩa đơn giản
- App hiển thị tên/ảnh/email của user → lấy từ BE.
- Sửa hồ sơ (tên, ngày sinh, giới tính, tiểu sử) → lưu lên BE.
- Sở thích (khẩu vị, thời gian nấu, dị ứng…) → lưu lên BE để AI tham chiếu.
- Dị ứng: thêm/xoá nguyên liệu gây dị ứng → BE lưu và dùng để cảnh báo khi AI quét đồ ăn.
- Onboarding: khảo sát nhiều bước → gửi 1 lần lên BE.
- Hạn mức AI: xem đã dùng bao nhiêu lượt trong tuần.

### (B) Luồng học thuật

- `GET /users/me` → `UsersService.getMe(userId)` → `prisma.user.findUnique({ where:{ id, deletedAt:null }, include:{ role, profile, preferences } })` → `mapUserToMeResponse()`.
- `PATCH /users/me/profile` → `updateProfile()`: update `users.name` + **upsert** `UserProfile` (find → update | create) → trả lại `getMe()`.
- `POST /users/me/avatar` → nhận path file đã upload → `updateAvatarUrl(userId, avatarPath)` → update/create `UserProfile.avatarPath`.
- `GET/PATCH /users/me/preferences` → `UserPreference` (1-1 với user).
- `POST /users/me/onboarding` → `OnboardingDto` (survey) → lưu `UserPreference` + set `User.isOnboardingCompleted = true`.
- `GET/POST /users/me/allergies`, `DELETE /users/me/allergies/{id}` → `UserAllergy { userId, ingredientId, note }`.
- `GET /users/me/ai-usage` → đếm `AiUsageLog` trong tuần vs `subscription_plans.aiUsagePerWeek`.
- `GET/PATCH /users/me/notification-settings` → cờ bật/tắt từng loại thông báo.

### (C) Bảng endpoint

| Method | Route | Ghi chú |
|---|---|---|
| GET | `/users/me` | hồ sơ + role + preferences |
| PATCH | `/users/me/profile` | `{ name, dateOfBirth, gender, bio }` |
| POST | `/users/me/avatar` | multipart avatar |
| GET / PATCH | `/users/me/preferences` | sở thích |
| POST | `/users/me/onboarding` | survey onboarding |
| GET / POST | `/users/me/allergies` | dị ứng |
| DELETE | `/users/me/allergies/{id}` | xoá dị ứng |
| GET | `/users/me/ai-usage` | hạn mức AI tuần |
| GET / PATCH | `/users/me/notification-settings` | tuỳ chọn thông báo |

---

## 3.3. FRIDGE — Tủ lạnh (CRUD, thống kê, quét AI)

### (A) Nghĩa đơn giản
- Mở màn "Tủ lạnh" → app lấy danh sách thực phẩm đang có → hiển thị.
- Thêm/sửa/xoá thực phẩm → app gửi lên BE → BE lưu → app cập nhật danh sách.
- "Dùng hết" 1 món → app gửi lên → BE giảm số lượng.
- Màn thống kê → app lấy số liệu tổng/hết hạn/biểu đồ.
- **Quét AI**: chụp ảnh thực phẩm / hoá đơn / mã vạch → app upload → BE nhận ảnh và đẩy job AI → app **poll** chờ kết quả → AI trả về danh sách món nhận diện → user sửa/duyệt → app gửi xác nhận → BE tạo item thật trong tủ.

### (B) Luồng học thuật

**Đọc danh sách:**
`RealFridgeService.getItems(filters)` → `GET /fridge?storageLocation=&expiringSoon=` → `FridgeController.findAll` → `FridgeService.findAll(userId, query)`:
- `resolveFamilyGroupId(userId)` — nếu user thuộc nhóm gia đình thì lấy item của **cả nhóm** (chia sẻ tủ lạnh), không thì item của riêng user.
- `prisma.fridgeItem.findMany({ where: { userId | familyGroupId, storageLocation?, deletedAt:null }, orderBy })` → map `FridgeItemResponseDto` (kèm `version`).

**Thêm item:** `POST /fridge/items` body `AddFridgeItemDto`:
`{ ingredientId?, name?, quantity (>=0), unit (<=30), purchasedAt?, expiresAt?, storageLocation?: 'fridge'|'freezer'|'pantry' }`
→ `FridgeService.addItem()` → `resolveIngredient(ingredientId, name, unit)` (dò catalog `Ingredient` theo id hoặc tên, nếu không có thì tạo mới) → nếu không có `expiresAt` thì `estimateExpiryDate()` theo `defaultShelfLifeDays` của danh mục → `prisma.fridgeItem.create({ version: 1 })` → phát Socket.IO `fridge:item_added`.

**Sửa item (optimistic locking):** `PATCH /fridge/items/{id}` body `UpdateFridgeItemDto`:
`{ quantity?, unit?, expiresAt?, storageLocation?, version }` (version bắt buộc)
→ `FridgeService.updateItem()`:
```
if (dto.version !== undefined && item.version !== dto.version)
    throw new ConflictException({ message, currentVersion: item.version })
```
→ update với `version: { increment: 1 }` → trả item có `version` mới → Socket.IO `fridge:item_updated`.

**Xoá:** `DELETE /fridge/items/{id}` → xoá mềm (`deletedAt`) → `fridge:item_removed`.

**Dùng hết:** `PATCH /fridge/items/{id}/consume` → giảm `quantity`, tăng `version`.

**Thống kê:** `GET /fridge/stats` → tổng số món, sắp hết hạn, đã hết hạn, theo storage location, theo category.
`GET /fridge/stats/chart?period=week|month` → dữ liệu biểu đồ theo ngày/tuần.
`GET /fridge/expiring?days=3` → item hết hạn trong N ngày (1..30).

**Quét AI (3 bước):**
1. `POST /fridge/scan/image|receipt|barcode` multipart field `file` (BE `FileInterceptor` + `imageFileFilter` chỉ nhận jpeg/png/webp) →
   `FridgeService.scanImage()` tạo `IngredientScanLog { id, userId, scanType, status:'pending' }` → publish `FRIDGE_SCAN_ROUTING_KEY` lên RabbitMQ → trả **ngay** `{ scanId, status:'pending', detectedItems: [] }`.
2. `GET /fridge/scan/{scanId}` → `FridgeService.getScanStatus()` → đọc `IngredientScanLog` → khi AI xong: `status='success'`, `detectedItems[]` (`DetectedItemResultDto`: `ingredientId, name, quantity, unit, confidence, needsConfirm, allergyWarning, estimatedExpiryDays`) → trả `ScanStatusResponseDto`.
   FE poll mỗi **2s**, backoff 2→4→8s, tổng tối đa **60s**, dừng bằng `AbortSignal` khi rời màn hình.
3. `POST /fridge/scan/{scanId}/confirm` body `ConfirmScanDto { items: ConfirmedScanItemDto[] }` →
   `FridgeService.confirmScan()` tạo `FridgeItem` cho từng item đã duyệt → trả `FridgeItemResponseDto[]`.
   Lịch sử: `GET /fridge/scan/history` → `ScanHistoryItemDto[]`.

### (C) Bảng endpoint

| Method | Route | Body / Query |
|---|---|---|
| GET | `/fridge` | `?storageLocation=&expiringSoon=` |
| POST | `/fridge/items` | `AddFridgeItemDto` |
| PATCH | `/fridge/items/{id}` | `UpdateFridgeItemDto` (**có `version`**) |
| DELETE | `/fridge/items/{id}` | — |
| PATCH | `/fridge/items/{id}/consume` | — |
| GET | `/fridge/stats` | — |
| GET | `/fridge/stats/chart` | `?period=week\|month` |
| GET | `/fridge/expiring` | `?days=3` |
| POST | `/fridge/scan/image` | multipart `file` |
| POST | `/fridge/scan/receipt` | multipart `file` |
| POST | `/fridge/scan/barcode` | multipart `file` |
| GET | `/fridge/scan/{scanId}` | — |
| POST | `/fridge/scan/{scanId}/confirm` | `{ items: [...] }` |
| GET | `/fridge/scan/history` | — |

### (D) Ghi chú offline
- Đọc offline → `OfflineCache.getFridgeItems()`.
- Ghi offline → `MutationHandlers` ghi vào Outbox (`OP_TYPES.ADD_FRIDGE_ITEM` / `UPDATE` / `DELETE`); khi upload mà server trả **409** (version lệch) → `markConflict()` → UI hiện `SyncConflictModal`.
- **Không có mock cho scan** (lỗi 4xx/5xx ném lên UI, không bịa kết quả).

---

## 3.4. RECIPES — Công thức & gợi ý theo tủ lạnh

### (A) Nghĩa đơn giản
- Màn công thức: app lấy danh sách, lọc theo loại bữa/độ khó/tag/từ khoá → hiển thị.
- Mở chi tiết: app lấy nguyên liệu + các bước + **phần nguyên liệu đã có trong tủ lạnh** → hiển thị badge "có sẵn / cần mua".
- Gợi ý: app lấy danh sách gợi ý → BE tính **matchScore %** dựa trên nguyên liệu đang có trong tủ → app sắp xếp theo độ khớp.
- Bookmark: lưu / bỏ lưu công thức yêu thích.

### (B) Luồng học thuật

- `GET /recipes` query `ListRecipesQueryDto` (`search, mealType, difficulty, tag, page, limit`) → `RecipesService.findAll()` → `prisma.recipe.findMany` + `include: { ingredients, tags }` → `PaginatedRecipesDto { data, total, page, limit, totalPages }`.
- `GET /recipes/suggestions` → `RecipesService.getSuggestions(userId)`:
  1. lấy nguyên liệu trong tủ (`fridgeItem` của user/nhóm)
  2. lấy toàn bộ recipe + ingredients
  3. tính `matchScore = (số nguyên liệu có trong tủ / tổng nguyên liệu) * 100`
  4. sắp xếp giảm dần → `RecipeSummaryDto[]` kèm `matchScore`.
- `GET /recipes/{id}` → `RecipesService.findOne(id, userId)` → recipe + `RecipeIngredient` + `RecipeStep` + `isBookmarked` + `inFridge[]` (đối chiếu tủ lạnh).
- `POST /recipes/{id}/bookmark` → upsert `UserSavedRecipe`; `DELETE` → xoá.
- `GET /recipes/bookmarked` → list theo `UserSavedRecipe`.

### (C) Bảng endpoint

| Method | Route | Ghi chú |
|---|---|---|
| GET | `/recipes` | filter + pagination |
| GET | `/recipes/suggestions` | **phải đặt trước `/:id`** trong controller |
| GET | `/recipes/bookmarked` | |
| GET | `/recipes/{id}` | detail + inFridge |
| POST | `/recipes/{id}/bookmark` | 204 |
| DELETE | `/recipes/{id}/bookmark` | 204 |

---

## 3.5. MEAL PLANNING — Thực đơn tuần AI + danh sách mua

> Đây là module phức tạp nhất: **AI chạy nền**, tiến độ truyền về bằng **SSE**.

### (A) Nghĩa đơn giản
- User bấm "Tạo thực đơn tuần" + chọn ngày bắt đầu + ngân sách → app gửi lên BE → BE **không chờ AI** mà trả ngay "đã nhận việc" kèm `jobId` → app mở 1 kênh SSE để theo dõi tiến độ ("đang phân tích tủ lạnh…", "đang chọn công thức…", "xong!") → khi xong app tải kế hoạch tuần và hiển thị lịch 7 ngày × 3 bữa.
- Đổi 1 món trong tuần → app gửi lý do → BE đẩy job AI → app mở SSE nhận **3 gợi ý món thay thế** → user chọn 1 → app gửi `PATCH` cập nhật slot.
- Tick "đã nấu" 1 slot → app gửi → BE **tự trừ nguyên liệu** từ tủ lạnh → trả về danh sách nguyên liệu đã dùng để app hiển thị.
- Tạo danh sách mua từ kế hoạch tuần → BE tính nguyên liệu còn thiếu (có sẵn trong tủ không) → gợi ý nhà cung cấp → app hiển thị giỏ hàng, tick từng món.

### (B) Luồng học thuật

#### 3.5.1. Tạo thực đơn tuần (AI, bất đồng bộ)

```
[FE] RealRecipeService.generatePlan({ weekStartDate, budget })
      → POST /meal-planning/plans/generate
        body: { weekStartDate: 'YYYY-MM-DD' (bắt buộc là Thứ 2), budget: number (VND) }
      → 202 { jobId, status:'queued', streamUrl:'/meal-planning/plans/generate/{jobId}/stream' }
[BE] MealPlanningService.generatePlan(userId, dto)
      → jobId = uuidv4()
      → rabbitMq.publish(MEAL_PLAN_ROUTING_KEY='meal.plan.generate',
            { jobId, userId, weekStartDate, budget })
[AI] MealPlanConsumer (@RabbitSubscribe exchange 'friggy.ai', routingKey 'meal.plan.generate',
      queue 'meal-plan-generate-queue', durable, x-message-ttl 30 phút)
      → MealPlanGraphService.run(job)  — pipeline multi-agent:
          supervisor → agents chạy song song (chef / evaluator / ...)
      → publish progress lên Redis channel `meal_plan:{jobId}:progress`
[BE] GET /meal-planning/plans/generate/{jobId}/stream  (SSE)
      → res.setHeader('Content-Type','text/event-stream'), 'Cache-Control:no-cache',
        'Connection:keep-alive', 'X-Accel-Buffering:no'  → res.flushHeaders()
      → redis.createSubscriber().subscribe('meal_plan:{jobId}:progress')
      → mỗi message: parse JSON, tách `step`, sendEvent(step, rest)
        → ghi ra: `event: <step>\ndata: <json>\n\n`
      → đóng khi step === 'completed' | 'failed'; timeout 10 phút
[FE] RealRecipeService.streamPlanProgress(streamUrl)
      → chuẩn hóa path (bỏ prefix /api/v1 để không gọi /api/v1/api/v1)
      → streamSse(path) từ SseClient (expo/fetch + ReadableStream)
      → yield { event, data }
```

**Chuỗi event SSE**: `connected` → `supervisor_start` → `agents_parallel_start` → `chef_start` → `evaluator_start` → `completed` | `failed`.

#### 3.5.2. Đổi món 1 slot (regenerate)

```
POST /meal-planning/slots/{id}/regenerate  body { reason }
   reason ∈ 'no_ingredients' | 'dislike' | 'want_different' | 'too_expensive'
   Guard: AiUsageLimitGuard + @AiFeature('slot_regenerate') → 429 nếu vượt hạn mức tuần
→ 202 { jobId, status, streamUrl:'/meal-planning/slots/{id}/regenerate/{jobId}/stream' }
→ RabbitMQ 'ai.slot.regenerate' → SlotRegenerateConsumer → AI tìm top 3 món thay thế
→ publish Redis `slot_regenerate:{jobId}:result`
→ SSE GET /meal-planning/slots/{id}/regenerate/{jobId}/stream
   events: connected → result { suggestions: string[], message } → done
→ FE chọn 1 → PATCH /meal-planning/slots/{id} { recipeId }
```

#### 3.5.3. Tạo thực đơn từ nguyên liệu sắp hết hạn

```
POST /meal-planning/plans/generate-from-expiring  body { withinDays | days }
→ 202 { jobId, streamUrl:'/meal-planning/plans/generate-from-expiring/{jobId}/stream' }
→ RabbitMQ 'ai.expiring.meal.plan' → ExpiringMealConsumer
→ Redis `expiring_meal:{jobId}:progress` → SSE tương ứng
```

#### 3.5.4. Đọc / cập nhật kế hoạch & slot

| Hành động | Endpoint | Ghi chú học thuật |
|---|---|---|
| Danh sách plan | `GET /meal-planning/plans` | `WeeklyPlan` theo user, sort `weekStartDate` desc |
| Chi tiết plan | `GET /meal-planning/plans/{id}` | `WeeklyPlan` + `DailyPlan[]` + `MealSlot[]` + recipe summary |
| Đổi trạng thái | `PATCH /meal-planning/plans/{id}` | body `{ status: 'draft'\|'confirmed'\|'active'\|'completed' }` — enum, sai là 400 |
| Xoá plan | `DELETE /meal-planning/plans/{id}` | |
| Chi tiết slot | `GET /meal-planning/slots/{id}` | slot + recipe + phân tích tủ lạnh (thiếu/có) |
| Tick "đã nấu" / đổi món | `PATCH /meal-planning/slots/{id}` | body `{ recipeId?, servings?, note?, completed? }` |

**Tick "đã nấu" — luồng trừ kho (quan trọng):**
`PATCH /meal-planning/slots/{id}` body `{ completed: true }` → `MealPlanningService`:
- đặt `slot.completedAt = now`
- **scale nguyên liệu** theo `servings / recipe.servings`
- **trừ** số lượng tương ứng trong `FridgeItem` (theo `unit` quy đổi về base unit qua `normalizeToBaseUnit`, `canCompare`)
- trả kèm `consumedIngredients[]` (chỉ có ở lần tick đầu tiên) → FE hiển thị "đã dùng bao nhiêu"
- phát Socket.IO `meal:slot_completed` cho nhóm gia đình.

> ⚠️ FE **không gửi `servings`** (đã gỡ Stepper khẩu phần) → BE dùng `slot.servings` (mặc định 1) ⇒ khớp giá trị cố định FE hiển thị.

#### 3.5.5. Danh sách mua

| Hành động | Endpoint | Chi tiết |
|---|---|---|
| Xem danh sách | `GET /meal-planning/shopping-lists` | `ShoppingList[]` + `ShoppingListItem[]` |
| Tạo từ plan | `POST /meal-planning/shopping-lists` | body `{ weeklyPlanId, title? }` |
| Tick đã mua | `PATCH /meal-planning/shopping-lists/{listId}/items/{itemId}` | body `{ done?: boolean }` |

Logic BE khi tạo list: tổng hợp nguyên liệu của tất cả slot trong plan → so với `FridgeItem` đang có → tính `missingQuantity = max(0, needed*scale - fridgeQuantity)` → tạo `ShoppingListItem` → **`enrichWithSuppliers()`** gợi ý nhà cung cấp: tìm `supplierIngredient` có `linkedIngredientId` khớp, `status='approved'`, supplier còn hạn gói (`subscription.status='active'` và `endDate > now`), sort `averagePricePerUnit` asc.

### (C) Bảng endpoint (đầy đủ)

| Method | Route | Guard | Body / Query |
|---|---|---|---|
| POST | `/meal-planning/plans/generate` | — | `{ weekStartDate, budget }` → 202 |
| GET | `/meal-planning/plans/generate/{jobId}/stream` | — | SSE |
| POST | `/meal-planning/plans/generate-from-expiring` | — | `{ withinDays?/days? }` → 202 |
| GET | `/meal-planning/plans/generate-from-expiring/{jobId}/stream` | — | SSE |
| GET | `/meal-planning/plans` | JWT | |
| GET | `/meal-planning/plans/{id}` | JWT | |
| PATCH | `/meal-planning/plans/{id}` | JWT | `{ status }` |
| DELETE | `/meal-planning/plans/{id}` | JWT | |
| GET | `/meal-planning/slots/{id}` | JWT | |
| PATCH | `/meal-planning/slots/{id}` | JWT | `{ recipeId?, servings?, note?, completed? }` |
| POST | `/meal-planning/slots/{id}/regenerate` | **AiUsageLimit** | `{ reason }` → 202 |
| GET | `/meal-planning/slots/{id}/regenerate/{jobId}/stream` | — | SSE |
| GET | `/meal-planning/shopping-lists` | JWT | |
| POST | `/meal-planning/shopping-lists` | JWT | `{ weeklyPlanId, title? }` |
| PATCH | `/meal-planning/shopping-lists/{listId}/items/{itemId}` | JWT | `{ done? }` |

---

## 3.6. SUBSCRIPTIONS & PAYMENT — Gói dùng, PayOS, webhook

### (A) Nghĩa đơn giản
- App hiển thị các gói (Free / Basic / Pro…) kèm giá và hạn mức AI tuần.
- User chọn gói → app gửi lên → BE tạo **link thanh toán PayOS** và **mã QR** → trả về app → app hiển thị QR để user quét (thanh toán qua app ngân hàng).
- User trả tiền xong → PayOS gọi **webhook** về BE → BE kiểm tra chữ ký, bật gói cho user.
- App **poll** `GET /payment-transactions/me/{paymentRef}` để biết đã thanh toán chưa.
- Tự động gia hạn: user tắt được (`DELETE /subscriptions/me/auto-renewal`).

### (B) Luồng học thuật

**Subscribe (`POST /subscriptions/subscribe`, body `{ planId }`):**
1. `SubscriptionsService.subscribe(userId, dto)`:
   - nếu đang có `pending` transaction cũ và đổi gói → `payOsService.cancelPaymentLink(orderCode)` + đánh dấu `cancelled` (giữ lịch sử PayOS)
   - **tạo payment link PayOS TRƯỚC** (`payOsService.createPaymentLink(...)`) — nếu PayOS lỗi thì subscription chưa bị ảnh hưởng
   - PayOS OK → mới `prisma.userSubscription.upsert` (status `active`, `startDate`, `endDate`) + `prisma.paymentTransaction.create({ status:'pending', payosOrderCode: BigInt, payosPaymentLinkId, checkoutUrl, qrCode, amount })`
   - trả `{ subscription, checkoutUrl, qrCode, paymentRef }`

**Webhook (`POST /subscriptions/webhook` — `@Public()`):**
- `payOsService.verifyWebhookSignature(body)` → HMAC-SHA256; sai ⇒ throw `InvalidSignatureError` ⇒ 401 (chống giả mạo).
- Tìm transaction theo `payosOrderCode` (thử user trước, rồi supplier).
- `code === 'SUCCESS'` → transaction `status='paid'`, cấp/nâng hạn gói theo `planId` → trả `{ success: true }`.
- Webhook nhận HTTP 200 trong <5s; nếu lỗi trung gian có thể PayOS retry ⇒ phải **idempotent** (check `status !== 'pending'` thì bỏ qua).

**Poll (`GET /payment-transactions/me/{paymentRef}`):** trả `PaymentTransactionDetailDto { status, amount, ... }`; FE poll mỗi 2–3s, tối đa ~2 phút.

**Gia hạn:** `POST /subscriptions/renew` → tạo payment link mới theo gói hiện tại (giống subscribe).
**Tắt auto-renewal:** `DELETE /subscriptions/me/auto-renewal` → set `autoRenew=false`.
**Lịch sử:** `GET /payment-transactions/me?page=&limit=` → `PaymentTransactionListResponseDto`.

**Cron nhắc gia hạn:** `subscription_renewal_reminder` (`0 9 * * *`) → kiểm tra gói có phí còn 7 ngày → tạo `Notification` + gửi email.

### (C) Bảng endpoint

| Method | Route | Auth | Ghi chú |
|---|---|---|---|
| GET | `/subscriptions/plans` | Public | danh sách gói + `aiUsagePerWeek` |
| GET | `/subscriptions/me` | JWT | gói hiện tại của user |
| POST | `/subscriptions/subscribe` | JWT | `{ planId }` → link/QR PayOS |
| POST | `/subscriptions/renew` | JWT | gia hạn |
| DELETE | `/subscriptions/me/auto-renewal` | JWT | tắt tự động gia hạn |
| POST | `/subscriptions/webhook` | Public | PayOS callback + verify signature |
| GET | `/payment-transactions/me` | JWT | `?page&limit` |
| GET | `/payment-transactions/me/{paymentRef}` | JWT | polling trạng thái |

---

## 3.7. NOTIFICATIONS — Thông báo trong app + push FCM

### (A) Nghĩa đơn giản
- App lấy danh sách thông báo + số chưa đọc → hiển thị ở icon chuông.
- Bấm 1 thông báo → app đánh dấu đã đọc.
- "Đánh dấu đã đọc tất cả" → app gửi lên.
- Xoá 1 thông báo.
- **Push**: khi app mở, nó đăng ký token thiết bị với BE. Sau đó BE (cron hoặc nghiệp vụ) đẩy thông báo qua FCM → máy nhận → mở app đúng màn tương ứng (deep link).
- Người dùng bật/tắt từng loại thông báo trong cài đặt.

### (B) Luồng học thuật

- `GET /notifications?page=&limit=&isRead=` → `NotificationsService.findAll()` → `prisma.notification.findMany` + đếm `total` + `unreadCount` → `PaginatedNotificationsDto`.
- `PATCH /notifications/{id}/read` → set `isRead=true, readAt=now`.
- `PATCH /notifications/read-all` → update nhiều → `MarkAllReadResponseDto`.
- `DELETE /notifications/{id}` → xoá mềm.
- `GET /notifications/unread-count` → count `isRead=false`.
- `POST /notifications/fcm-token` body `{ token, platform }` → upsert `UserDevice { userId, token, platform }`.
- `DELETE /notifications/fcm-token` body `{ token }` → xoá bản ghi thiết bị.
- `GET/PATCH /users/me/notification-settings` → cờ bật/tắt theo loại.

**Nguồn tạo thông báo:**
- `NotificationCronService` (dynamic cron đọc `cron_job_config` trong DB → `SchedulerRegistry`):
  | Tên job | Mặc định | Việc |
  |---|---|---|
  | `expiry_warning` | `0 8 * * *` | cảnh báo nguyên liệu sắp hết hạn |
  | `weekly_plan_remind` | `0 9 * * 0` | nhắc lập thực đơn tuần mới (Chủ Nhật) |
  | `subscription_renewal_reminder` | `0 9 * * *` | nhắc gia hạn gói (còn 7 ngày) |
  | `supplier_expiry_warning` | `0 8 * * *` | cảnh báo gói nhà cung cấp hết hạn |
  | `supplier_expiry_deactivate` | `5 0 * * *` | hủy kích hoạt gói NCC hết hạn |
  | `supplier_ingredient_cleanup` | `10 0 * * *` | archive nguyên liệu NCC |
- Nghiệp vụ khác (đổi món slot, hết hạn, thanh toán…) cũng có thể tạo `Notification` trực tiếp.

**Push**: `FcmService` (firebase-admin) gửi tới `UserDevice.token`; FE `PushNotificationManager` nhận token, đăng ký với BE, và nghe sự kiện để điều hướng theo `shared/constants/pushRoutes.js`.

### (C) Bảng endpoint

| Method | Route | Body / Query |
|---|---|---|
| GET | `/notifications` | `?page&limit&isRead` |
| GET | `/notifications/unread-count` | — |
| PATCH | `/notifications/read-all` | — |
| PATCH | `/notifications/{id}/read` | — |
| DELETE | `/notifications/{id}` | — |
| POST | `/notifications/fcm-token` | `{ token, platform }` |
| DELETE | `/notifications/fcm-token` | `{ token }` |
| GET / PATCH | `/users/me/notification-settings` | |

---

## 3.8. FAMILY — Nhóm gia đình (mời, nhận, tủ lạnh dùng chung)

### (A) Nghĩa đơn giản
- Owner mời người thân bằng email → hệ thống gửi email chứa link/token.
- Người được mời bấm link → app gửi token lên BE → BE thêm họ vào nhóm (hoặc từ chối).
- Từ đó **tủ lạnh dùng chung**: thêm/xoá/sửa trong nhóm → các máy khác trong nhóm **cập nhật tức thì** (Socket.IO).
- Owner có thể xoá thành viên hoặc giải tán nhóm.

### (B) Luồng học thuật

- `GET /family/me` → `FamilyService.getFamily(userId)` → `FamilyRoleDto { role: 'owner'|'member', group: { id, name, members[], inviteCode? } }`; member có `status` = `pending|active|rejected|removed`.
- `POST /family/invite` body `{ email }`:
  - `requireActiveGroup(ownerId)` → phải là owner
  - giới hạn `MAX_MEMBERS` → 400 nếu đủ
  - không mời chính mình → 400
  - check `FamilyMember` đã tồn tại: `active` → 409; `pending` còn hạn (48h) → 409; hết hạn/`rejected`/`removed` → xoá bản ghi cũ để re-invite
  - tạo `FamilyMember { id, familyGroupId, invitedEmail, status:'pending', inviteToken: uuid(), invitedAt }`
  - gửi email chứa link `/family/accept?token=...` (token hết hạn sau 48h)
  - trả **chỉ `{ message }`** (không trả danh sách pending) → FE phải refresh `GET /family/me` mới thấy member pending.
- `POST /family/accept` body `{ token }` (`@Public()`) → tìm member theo `inviteToken` + `status='pending'` + còn hạn → set `status='active'`, `userId` → trả `{ message }`.
- `POST /family/reject` body `{ token }` → set `status='rejected'`.
- `DELETE /family/members/{memberId}` → owner xoá member.
- `DELETE /family/groups` → owner giải tán nhóm (mất tất cả thành viên).

> ⚠️ Không có endpoint "rời nhóm" cho member — BE chỉ cho owner xoá member ⇒ UI member không có nút rời nhóm.

**Socket.IO (`namespace /family`)** — `SocketService` vừa là `@WebSocketGateway` vừa là `@Injectable` (`@Global`):
- `handleConnection`: xác thực JWT (socket handshake `auth.token` hoặc query) → `tokensService.verifyAccessToken()` → join room theo `familyGroupId`.
- Events server → client:
  | Event | Nội dung |
  |---|---|
  | `fridge:item_added` | thêm thực phẩm mới |
  | `fridge:item_updated` | sửa số lượng / hạn (kèm `version` mới) |
  | `fridge:item_removed` | xoá / dùng hết |
  | `fridge:member_joined` | thành viên mới vào → merge đồ cá nhân |
  | `meal:slot_completed` | đánh dấu nấu xong, nguyên liệu đã trừ |
  | `shopping:item_toggled` | tick món trong giỏ |

### (C) Bảng endpoint

| Method | Route | Body |
|---|---|---|
| GET | `/family/me` | — |
| POST | `/family/invite` | `{ email }` |
| POST | `/family/accept` | `{ token }` (Public) |
| POST | `/family/reject` | `{ token }` (Public) |
| DELETE | `/family/members/{memberId}` | — (owner) |
| DELETE | `/family/groups` | — (owner) |

---

## 3.9. AI CHAT — Trợ lý AI (stream token)

### (A) Nghĩa đơn giản
- User mở màn chat → app tạo/lấy danh sách phiên chat.
- User gõ tin → app gửi lên → BE kiểm tra an toàn (chống prompt injection), lưu tin nhắn vào DB, **đẩy job AI** và trả `202` kèm `streamUrl` → app mở SSE → AI trả lời **từng chữ** (streaming) hiện dần trên màn hình → `done` thì kết thúc.

### (B) Luồng học thuật

```
[FE] RealAiChatService.sendMessage(sessionId, content)
   → POST /ai-chat/sessions/{id}/messages  body { content }
   → 202 { messageId, status:'pending', streamUrl:'/ai-chat/sessions/{id}/stream' }
[BE] AiChatService.sendMessage(userId, sessionId, dto)
   1. validate session thuộc user & status='active' → 404 nếu sai
   2. throwIfInjection(dto.content)   ← Layer 1 chống prompt injection
   3. sanitize: trim + slice(0, AI_CHAT_MAX_LENGTH)
   4. lấy history (take AI_CHAT_HISTORY_LIMIT, order createdAt desc) TRƯỚC khi lưu
   5. lưu ChatMessage { sessionId, role:'user', content }
   6. rabbitMq.publish(AI_CHAT_ROUTING_KEY='ai.chat.message',
        { sessionId, messageId, userId, userMessage, history(oldest→newest) })
[AI] AiChatConsumer (@RabbitSubscribe 'friggy.ai' / 'ai.chat.message' / queue durable)
   → SingleAgentService: gọi LLM, stream token từng chút
   → publish từng token lên Redis channel `chat:{sessionId}:stream`
   → lưu ChatMessage { role:'assistant' } + AiUsageLog
[BE] GET /ai-chat/sessions/{id}/stream  (@Sse())
   → Observable<MessageEvent> từ Redis pub/sub
[FE] RealAiChatService.streamSession(sessionId)
   → for await (const event of streamSse(path))
     event 'chunk'       → text (nối vào message đang stream)
     event 'tool_call'   → AI đang gọi tool
     event 'tool_result' → kết quả tool
     event 'done'        → { tokensUsed }
```

> **Lưu ý 2 lớp bọc SSE**: NestJS `@Sse()` sinh `data: {"type":"message","data":"{\"event\":\"chunk\",\"data\":\"...\"}"}`. `SseClient.normalizeSsePayload()` đã unwrap 2 cấp ⇒ FE nhận `{ event, data }`.

> **429**: `AiUsageLimitGuard` + `@AiFeature('chat')` → vượt `aiUsagePerWeek` ⇒ 429 kèm message tiếng Việt; FE hiển thị lỗi thật (không fallback).

### (C) Bảng endpoint

| Method | Route | Ghi chú |
|---|---|---|
| GET | `/ai-chat/sessions` | `?page&limit` |
| POST | `/ai-chat/sessions` | `{ title? }` |
| GET | `/ai-chat/sessions/{id}` | session + messages |
| DELETE | `/ai-chat/sessions/{id}` | xoá (soft) |
| POST | `/ai-chat/sessions/{id}/messages` | **AiUsageLimit**, 202 |
| GET (SSE) | `/ai-chat/sessions/{id}/stream` | stream token |

---

## 3.10. PUBLIC CHAT — Chatbot SEO (không cần đăng nhập)

### (A) Nghĩa đơn giản
- Trang web công khai có chatbot. Không cần tài khoản. Mỗi IP tối đa **10 tin/ngày**. Phiên chat lưu trong Redis TTL 30 phút, hết hạn thì tự tạo phiên mới.

### (B) Luồng học thuật
- `POST /public-chat/messages` (`@Public()` + `WebChatRateLimitGuard`) body `{ message, sessionId? }` → `PublicChatService.sendMessage()` → trả `{ sessionId, streamKey, streamUrl:'/api/v1/public-chat/stream?key=...', isNewSession }`.
- `GET /public-chat/stream?key=` (`@Sse()`) → đọc Redis channel theo `streamKey` → stream token.
- `GET /public-chat/history?sessionId=` → lịch sử phiên trong Redis.

---

## 3.11. INGREDIENTS — Catalog nguyên liệu

### (A) Nghĩa đơn giản
- App cần danh sách nguyên liệu hệ thống để: chọn khi thêm thực phẩm, chọn dị ứng, gợi ý món, tìm kiếm.
- Danh mục là cây (cha → con), mỗi danh mục có `defaultShelfLifeDays` để ước tính ngày hết hạn.

### (B) Luồng học thuật
- `GET /ingredients/categories` → `prisma.ingredientCategory.findMany({ include: { children: true } })` → `CategoryResponseDto[]` (kèm `defaultShelfLifeDays`).
- `GET /ingredients?search=&categoryId=&page=&limit=` → `PaginatedIngredientsDto`.
- `GET /ingredients/{id}` → chi tiết.

---

## 3.12. SUPPLIER — Nhà cung cấp (nền tảng B2B)

### (A) Nghĩa đơn giản
- Nhà cung cấp đăng ký hồ sơ, đặt mật khẩu, đăng ký gói (thuê bao), đăng tải danh mục nguyên liệu + giá. Người dùng thấy gợi ý nhà cung cấp khi xem danh sách mua.

### (B) Luồng học thuật
- `POST /supplier/apply` (đơn đăng ký) → `POST /supplier/set-password` → admin duyệt.
- `GET/PATCH /supplier/me`, `POST /supplier/me/logo` → hồ sơ NCC.
- `GET /supplier/plans`, `GET /supplier/subscription`, `POST /supplier/subscribe`, `DELETE /supplier/subscription/auto-renewal`, `GET /supplier/payment-history` → quản lý gói NCC (thanh toán qua **cùng PayOS**, webhook nhận biết bằng `payosOrderCode` — `handleSupplierWebhook`).
- `GET /supplier/ingredients/template`, `GET /supplier/ingredients`, `GET /supplier/ingredients/{id}`, `POST /supplier/ingredients`, `POST /supplier/ingredients/import`, `PATCH /supplier/ingredients/{id}`, `DELETE /supplier/ingredients/{id}` → CRUD danh mục nguyên liệu NCC (import hàng loạt từ template).
- `supplier_ingredients` có `linkedIngredientId` trỏ về `ingredients` hệ thống → cơ sở cho `enrichWithSuppliers()` ở module Meal Planning.

---

# PHẦN 4 — CÁC CƠ CHẾ THỜI GIAN THỰC & HẠ TẦNG

## 4.1. RabbitMQ — hàng đợi job AI

- Exchange: `friggy.ai` (topic).
- Message chung: `{ jobId, userId, ...payload }`.

| Routing key | Queue | Consumer (ai-service) | Redis channel trả về |
|---|---|---|---|
| `meal.plan.generate` | `meal-plan-generate-queue` | `MealPlanConsumer` → `MealPlanGraphService` | `meal_plan:{jobId}:progress` |
| `fridge.scan` | `fridge-scan-queue` | `FridgeScanConsumer` (Gemini Vision) | (cập nhật `IngredientScanLog` trong DB) |
| `ai.slot.regenerate` | slot-regenerate queue | `SlotRegenerateConsumer` | `slot_regenerate:{jobId}:result` |
| `ai.expiring.meal.plan` | expiring queue | `ExpiringMealConsumer` | `expiring_meal:{jobId}:progress` |
| `ai.chat.message` | chat queue | `AiChatConsumer` → `SingleAgentService` | `chat:{sessionId}:stream` |
| `email.send` | — | `email-service` (microservice NestJS) | — |

Queue `durable: true`, `x-message-ttl: 30 phút` (job quá hạn bị broker drop).

## 4.2. Redis Pub/Sub — cầu nối BE ↔ AI Service

| Kênh | Producer | Consumer (BE) | Endpoint SSE |
|---|---|---|---|
| `meal_plan:{jobId}:progress` | ai-service | `MealPlanningController.streamProgress` | `GET /meal-planning/plans/generate/{jobId}/stream` |
| `expiring_meal:{jobId}:progress` | ai-service | controller tương ứng | `GET /meal-planning/plans/generate-from-expiring/{jobId}/stream` |
| `slot_regenerate:{jobId}:result` | ai-service | `streamRegenerateSlot` | `GET /meal-planning/slots/{id}/regenerate/{jobId}/stream` |
| `chat:{sessionId}:stream` | ai-service | `AiChatService.streamSession` | `GET /ai-chat/sessions/{id}/stream` |

Redis còn dùng cho: cache `sysconfig:*` (OTP TTL, AI quota), rate-limit, phiên public chat (TTL 30 phút).

## 4.3. Ba kênh realtime từ góc nhìn user

| Kênh | Công nghệ | Hướng | Dùng cho |
|---|---|---|---|
| SSE | HTTP `text/event-stream` | server → client | tiến độ AI (thực đơn, đổi món), token chat AI |
| WebSocket | Socket.IO namespace `/family` | hai chiều | đồng bộ tủ lạnh & slot nấu giữa các thành viên |
| Push | FCM | server → máy | thông báo nền (hết hạn, gia hạn gói, nhắc tuần) |

## 4.4. Cron động

`NotificationCronService.onModuleInit()`:
1. seed `cron_job_config` mặc định (nếu chưa có) — có retry 3 lần + exponential backoff.
2. đọc toàn bộ config từ DB → `SchedulerRegistry` đăng ký `CronJob` cho config `isEnabled = true`.
3. Admin có thể đổi lịch / bật-tắt / trigger thủ công **không cần restart server**.

---

# PHẦN 5 — BẢNG TỔNG HỢP ENDPOINT

> Base URL: `{API_BASE_URL}` = `https://api.friggy.io.vn/api/v1` (dev: `http://<ip>:6969/api/v1`).

| # | Method | Route | Module | FE service | Guard đặc biệt |
|---|---|---|---|---|---|
| 1 | POST | `/auth/google` | auth | RealAuthService | Public |
| 2 | POST | `/auth/email/register` | auth | RealAuthService | Public |
| 3 | POST | `/auth/email/verify-otp` | auth | RealAuthService | Public |
| 4 | POST | `/auth/email/login` | auth | RealAuthService | Public |
| 5 | POST | `/auth/email/forgot-password` | auth | RealAuthService | Public |
| 6 | POST | `/auth/email/reset-password` | auth | RealAuthService | Public |
| 7 | POST | `/auth/email/change-password` | auth | RealAuthService | JWT |
| 8 | POST | `/auth/refresh` | auth | ApiClient (raw) | Public |
| 9 | POST | `/auth/logout` | auth | RealAuthService | JWT |
| 10 | GET | `/users/me` | users | RealAuthService/RealUserService | JWT |
| 11 | PATCH | `/users/me/profile` | users | RealUserService | JWT |
| 12 | POST | `/users/me/avatar` | users | (upload) | JWT |
| 13 | GET | `/users/me/preferences` | users | RealUserService | JWT |
| 14 | PATCH | `/users/me/preferences` | users | RealUserService | JWT |
| 15 | POST | `/users/me/onboarding` | users | RealUserService | JWT |
| 16 | GET | `/users/me/allergies` | users | RealUserService | JWT |
| 17 | POST | `/users/me/allergies` | users | RealUserService | JWT |
| 18 | DELETE | `/users/me/allergies/{id}` | users | RealUserService | JWT |
| 19 | GET | `/users/me/ai-usage` | users | RealUserService | JWT |
| 20 | GET | `/users/me/notification-settings` | users | RealUserService/RealNotificationService | JWT |
| 21 | PATCH | `/users/me/notification-settings` | users | RealUserService | JWT |
| 22 | GET | `/ingredients/categories` | ingredients | — | JWT |
| 23 | GET | `/ingredients` | ingredients | RealFridgeService/RealUserService | JWT |
| 24 | GET | `/ingredients/{id}` | ingredients | — | JWT |
| 25 | GET | `/recipes` | recipes | RealRecipeService | JWT |
| 26 | GET | `/recipes/suggestions` | recipes | RealRecipeService | JWT |
| 27 | GET | `/recipes/bookmarked` | recipes | RealRecipeService | JWT |
| 28 | GET | `/recipes/{id}` | recipes | RealRecipeService | JWT |
| 29 | POST | `/recipes/{id}/bookmark` | recipes | RealRecipeService | JWT |
| 30 | DELETE | `/recipes/{id}/bookmark` | recipes | RealRecipeService | JWT |
| 31 | GET | `/fridge` | fridge | RealFridgeService | JWT |
| 32 | POST | `/fridge/items` | fridge | RealFridgeService | JWT |
| 33 | PATCH | `/fridge/items/{id}` | fridge | RealFridgeService | JWT (409 conflict) |
| 34 | DELETE | `/fridge/items/{id}` | fridge | RealFridgeService | JWT |
| 35 | PATCH | `/fridge/items/{id}/consume` | fridge | RealFridgeService | JWT |
| 36 | GET | `/fridge/stats` | fridge | RealFridgeService | JWT |
| 37 | GET | `/fridge/stats/chart` | fridge | RealFridgeService | JWT |
| 38 | GET | `/fridge/expiring` | fridge | RealFridgeService | JWT |
| 39 | POST | `/fridge/scan/image` | fridge | RealFridgeService | JWT (AI) |
| 40 | POST | `/fridge/scan/receipt` | fridge | RealFridgeService | JWT (AI) |
| 41 | POST | `/fridge/scan/barcode` | fridge | RealFridgeService | JWT (AI) |
| 42 | GET | `/fridge/scan/{scanId}` | fridge | RealFridgeService | JWT |
| 43 | POST | `/fridge/scan/{scanId}/confirm` | fridge | RealFridgeService | JWT |
| 44 | GET | `/fridge/scan/history` | fridge | RealFridgeService | JWT |
| 45 | POST | `/meal-planning/plans/generate` | meal-planning | RealRecipeService | JWT (AI) |
| 46 | GET | `/meal-planning/plans/generate/{jobId}/stream` | meal-planning | SSE | JWT |
| 47 | POST | `/meal-planning/plans/generate-from-expiring` | meal-planning | RealRecipeService | JWT (AI) |
| 48 | GET | `/meal-planning/plans/generate-from-expiring/{jobId}/stream` | meal-planning | SSE | JWT |
| 49 | GET | `/meal-planning/plans` | meal-planning | RealRecipeService | JWT |
| 50 | GET | `/meal-planning/plans/{id}` | meal-planning | RealRecipeService | JWT |
| 51 | PATCH | `/meal-planning/plans/{id}` | meal-planning | RealRecipeService | JWT |
| 52 | DELETE | `/meal-planning/plans/{id}` | meal-planning | RealRecipeService | JWT |
| 53 | GET | `/meal-planning/slots/{id}` | meal-planning | RealRecipeService | JWT |
| 54 | PATCH | `/meal-planning/slots/{id}` | meal-planning | RealRecipeService/useCookSlot | JWT |
| 55 | POST | `/meal-planning/slots/{id}/regenerate` | meal-planning | RealRecipeService | **AiUsageLimit** |
| 56 | GET | `/meal-planning/slots/{id}/regenerate/{jobId}/stream` | meal-planning | SSE | JWT |
| 57 | GET | `/meal-planning/shopping-lists` | meal-planning | RealRecipeService | JWT |
| 58 | POST | `/meal-planning/shopping-lists` | meal-planning | RealRecipeService | JWT |
| 59 | PATCH | `/meal-planning/shopping-lists/{listId}/items/{itemId}` | meal-planning | RealRecipeService | JWT |
| 60 | GET | `/subscriptions/plans` | subscriptions | RealSubscriptionService | Public |
| 61 | GET | `/subscriptions/me` | subscriptions | RealSubscriptionService | JWT |
| 62 | POST | `/subscriptions/subscribe` | subscriptions | RealSubscriptionService | JWT |
| 63 | POST | `/subscriptions/renew` | subscriptions | RealSubscriptionService | JWT |
| 64 | DELETE | `/subscriptions/me/auto-renewal` | subscriptions | RealSubscriptionService | JWT |
| 65 | POST | `/subscriptions/webhook` | subscriptions | (PayOS) | Public + HMAC |
| 66 | GET | `/payment-transactions/me` | payment | RealSubscriptionService | JWT |
| 67 | GET | `/payment-transactions/me/{paymentRef}` | payment | RealSubscriptionService | JWT |
| 68 | GET | `/notifications` | notifications | RealNotificationService | JWT |
| 69 | GET | `/notifications/unread-count` | notifications | RealNotificationService | JWT |
| 70 | PATCH | `/notifications/read-all` | notifications | RealNotificationService | JWT |
| 71 | PATCH | `/notifications/{id}/read` | notifications | RealNotificationService | JWT |
| 72 | DELETE | `/notifications/{id}` | notifications | RealNotificationService | JWT |
| 73 | POST | `/notifications/fcm-token` | notifications | PushNotificationManager | JWT |
| 74 | DELETE | `/notifications/fcm-token` | notifications | PushNotificationManager | JWT |
| 75 | GET | `/family/me` | family | RealFamilyService | JWT |
| 76 | POST | `/family/invite` | family | RealFamilyService | JWT (owner) |
| 77 | POST | `/family/accept` | family | RealFamilyService | Public |
| 78 | POST | `/family/reject` | family | RealFamilyService | Public |
| 79 | DELETE | `/family/members/{memberId}` | family | RealFamilyService | JWT (owner) |
| 80 | DELETE | `/family/groups` | family | RealFamilyService | JWT (owner) |
| 81 | GET | `/ai-chat/sessions` | ai-chat | RealAiChatService | JWT |
| 82 | POST | `/ai-chat/sessions` | ai-chat | RealAiChatService | JWT |
| 83 | GET | `/ai-chat/sessions/{id}` | ai-chat | RealAiChatService | JWT |
| 84 | DELETE | `/ai-chat/sessions/{id}` | ai-chat | RealAiChatService | JWT |
| 85 | POST | `/ai-chat/sessions/{id}/messages` | ai-chat | RealAiChatService | **AiUsageLimit**, 202 |
| 86 | GET (SSE) | `/ai-chat/sessions/{id}/stream` | ai-chat | SSE | JWT |
| 87 | POST | `/public-chat/messages` | public-chat | (Web) | Public + rate-limit 10/ngày/IP |
| 88 | GET | `/public-chat/history` | public-chat | (Web) | Public |
| 89 | GET (SSE) | `/public-chat/stream?key=` | public-chat | SSE | Public |
| 90–99 | — | `/supplier/*` | supplier | (Web NCC) | JWT + role |
| — | — | `/admin/*` | admin | (Web Admin) | JWT + role admin/manager |

---

# PHẦN 6 — NHỮNG ĐIỂM CẦN BIẾT (gotchas)

| # | Vấn đề | Xử lý |
|---|---|---|
| 1 | Response BE có 2 lớp | `ApiClient` unwrap: `res.data.data` → `res.data` → raw |
| 2 | SSE của NestJS bọc 2 lớp | `SseClient.normalizeSsePayload()` unwrap |
| 3 | 401 ở endpoint auth = lỗi nhập liệu | Không refresh, không logout |
| 4 | Mất mạng lúc refresh token | Không logout, dùng cache offline |
| 5 | `PATCH /fridge/items/{id}` cần `version` | Lệch ⇒ **409** ⇒ Outbox `markConflict` ⇒ UI hiện modal hợp nhất |
| 6 | `PATCH /meal-planning/plans/{id}` chỉ nhận `status` trong enum | FE chặn trước status ngoài enum để khỏi bắn 400 |
| 7 | File upload phải đúng MIME | `ApiClient.guessMimeType()` theo đuôi file; BE chỉ nhận jpeg/png/webp |
| 8 | Quét ảnh/receipt/barcode đều nhận **file ảnh** | `scanBarcode(uri)` truyền URI ảnh chụp mã vạch, không phải chuỗi mã |
| 9 | `POST /family/invite` chỉ trả `{ message }` | Member pending chỉ thấy sau khi refresh `GET /family/me` |
| 10 | 429 hết lượt AI | Không fallback, hiện lỗi thật cho user |
| 11 | BE không có endpoint "rời nhóm" | Member không có nút rời nhóm |
| 12 | Mất mạng khi ghi | Có `mutationHandler` → queue + `OfflineQueuedError`; không có → `OfflineRequiresNetworkError` |
| 13 | `streamUrl` có thể kèm `/api/v1` | FE bỏ prefix trước khi gọi để khỏi `/api/v1/api/v1/...` |
| 14 | Ảnh dev: API host ≠ file host | `getImageUrl()` — dev dùng server root, prod dùng CDN `file.friggy.io.vn` |

---

# PHẦN 7 — SƠ ĐỒ TỔNG THỂ

```
┌──────────────────────────── MOBILE NATIVE ────────────────────────────┐
│  UI: Screens / Components                                             │
│      ↓ useAsyncData / useXxx hooks                                    │
│  Service: Real*Service (RealFridgeService, RealRecipeService, ...)     │
│      ↓                                                                │
│  ApiClient (Axios + Bearer + 401 refresh + unwrap)                     │
│      ↓                    SseClient (SSE)      Socket.IO client        │
│  Offline: OfflineCache (SQLite) · OutboxQueue · SyncEngine             │
│  Push: PushNotificationManager (Expo Notifications + FCM token)         │
└───────────────┬─────────────────────────────────┬─────────────────────┘
                │ HTTP /api/v1/**                 │ WebSocket /family
                ▼                                 ▼
┌──────────────────────────── BE (NestJS) ──────────────────────────────┐
│  Guards: Jwt → Maintenance → Roles (→ AiUsageLimit theo route)          │
│  Interceptors: Logging → ResponseSuccess  { statusCode, message, data } │
│  Controllers × 12 module                                              │
│  Services (Prisma) ──► PostgreSQL                                     │
│       │ publish                                                         │
│       ▼                                                                │
│  RabbitMQ (friggy.ai)        Redis Pub/Sub         Socket.IO          │
└───────┬───────────────────────────┬────────────────────────────────────┘
        │ consume                   │ subscribe
        ▼                           │
┌───────────────────────┐   ┌─────────────────────────────────────────────┐
│  AI SERVICE           │   │ email-service (OTP, welcome, invoice)       │
│  MealPlanConsumer     │   └─────────────────────────────────────────────┘
│  FridgeScanConsumer   │
│  SlotRegenerateCons.  │   ┌─────────────────────────────────────────────┐
│  ExpiringMealConsumer │   │ FCM (Firebase Cloud Messaging) → máy user    │
│  AiChatConsumer       │   └─────────────────────────────────────────────┘
│  PublicChatConsumer   │
└───────────────────────┘
```
