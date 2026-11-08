# Supplier API — Hướng dẫn tích hợp Frontend

> **Base URL (dev):** `http://localhost:6969/api/v1`  
> **Swagger UI (dev):** `http://localhost:6969/api/docs`  
> **Auth:** Thêm header `Authorization: Bearer <access_token>` cho các endpoint yêu cầu đăng nhập.

---

## Mục lục

1. [Dev Setup — Chạy migration & khởi động](#1-dev-setup--chạy-migration--khởi-động)
2. [Luồng tổng quan (B2B Onboarding)](#2-luồng-tổng-quan-b2b-onboarding)
3. [Public — Nộp đơn & Đặt mật khẩu](#3-public--nộp-đơn--đặt-mật-khẩu)
4. [Supplier — Hồ sơ](#4-supplier--hồ-sơ)
5. [Supplier — Gói cước & Thanh toán](#5-supplier--gói-cước--thanh-toán)
6. [Supplier — Quản lý nguyên liệu](#6-supplier--quản-lý-nguyên-liệu)
7. [Admin — Xét duyệt đơn đăng ký đối tác](#7-admin--xét-duyệt-đơn-đăng-ký-đối-tác)
8. [Admin — Quản lý nhà cung cấp](#8-admin--quản-lý-nhà-cung-cấp)
9. [Admin — Duyệt nguyên liệu supplier](#9-admin--duyệt-nguyên-liệu-supplier)
10. [Admin — Quản lý gói cước supplier](#10-admin--quản-lý-gói-cước-supplier)
11. [Admin — Lịch sử giao dịch thanh toán supplier](#11-admin--lịch-sử-giao-dịch-thanh-toán-supplier)
12. [Enum & Giá trị hợp lệ](#12-enum--giá-trị-hợp-lệ)
13. [Xử lý lỗi thường gặp](#13-xử-lý-lỗi-thường-gặp)

---

## 1. Dev Setup — Chạy migration & khởi động

### Services cần chạy trước

| Service | Container | Port |
|---|---|---|
| MySQL | `con-friggy-mysql` | `3309` |
| Redis | `con-friggy-redis` | `6380` |
| RabbitMQ | `con-friggy-rabbitmq` | `5672` / UI: `15672` |
| Email Service | — | port theo `.env` |

### Chạy migration

> Chỉ cần thực hiện **1 lần** khi pull code về lần đầu hoặc khi DB chưa được migrate.

```bash
npx prisma migrate deploy
```

`migrate deploy` áp dụng toàn bộ migration chưa chạy trong `prisma/migrations/` — bao gồm migration tạo bảng `SupplierApplication`.

### Khởi động

```bash
npm install       # lần đầu
npm run start:dev # dev mode (hot reload)
```

---

## 2. Luồng tổng quan (B2B Onboarding)

```
[Supplier FE]                      [Backend]                     [Admin FE]
     │                                  │                              │
     │── POST /supplier/apply ─────────>│ Tạo đơn, gửi email xác nhận │
     │                                  │                              │
     │                                  │<── GET /admin/supplier-applications ─
     │                                  │<── POST /:id/approve ─────────────────
     │                                  │    (Tạo User + Profile, gửi email set-password)
     │                                  │
     │<── Email: link set-password ─────│
     │                                  │
     │── POST /supplier/set-password ──>│ Đặt mật khẩu, kích hoạt tài khoản
     │                                  │
     │── POST /auth/email/login ───────>│ Đăng nhập bình thường
     │<── { accessToken } ──────────────│
     │                                  │
     │── GET  /supplier/plans ─────────>│ Xem gói cước
     │── POST /supplier/subscribe ─────>│ Mua gói → nhận link PayOS
     │── [Thanh toán qua PayOS]         │
     │                                  │ Webhook kích hoạt subscription
     │                                  │
     │── POST /supplier/ingredients ───>│ Thêm nguyên liệu (cần gói active)
     │                                  │                              │
     │                                  │<── PATCH /admin/supplier-ingredients/:id/approve
     │                                  │    (Duyệt nguyên liệu, push FCM cho supplier)
     │<── FCM: "Nguyên liệu đã duyệt" ──│
```

---

## 3. Public — Nộp đơn & Đặt mật khẩu

### 3.1 Nộp đơn đăng ký trở thành đối tác

```
POST /supplier/apply
Auth: Không cần
```

**Request body:**

```json
{
  "companyName": "Công ty TNHH ABC Farm",
  "contactName": "Nguyễn Văn A",
  "email": "contact@abcfarm.vn",
  "phone": "0901234567",
  "address": "123 Lê Lợi, Q1, TP.HCM",
  "description": "Nhà cung cấp VietGAP...",
  "website": "https://abcfarm.vn"
}
```

| Field | Bắt buộc | Giới hạn |
|---|---|---|
| `companyName` | ✅ | max 150 ký tự |
| `contactName` | ✅ | max 100 ký tự |
| `email` | ✅ | email hợp lệ, sẽ dùng làm tài khoản đăng nhập |
| `phone` | ❌ | max 20 ký tự |
| `address` | ❌ | max 255 ký tự |
| `description` | ❌ | không giới hạn |
| `website` | ❌ | max 255 ký tự |

**Response `201`:**

```json
{
  "id": "uuid",
  "companyName": "Công ty TNHH ABC Farm",
  "contactName": "Nguyễn Văn A",
  "email": "contact@abcfarm.vn",
  "phone": "0901234567",
  "address": "123 Lê Lợi, Q1, TP.HCM",
  "description": null,
  "website": "https://abcfarm.vn",
  "status": "pending",
  "createdAt": "2026-11-08T08:00:00.000Z"
}
```

**Lỗi:**

| Status | Nguyên nhân |
|---|---|
| `409` | Email đã được đăng ký làm tài khoản người dùng |
| `409` | Đã có đơn đang chờ duyệt với email này |
| `409` | Email đã được phê duyệt — kiểm tra hộp thư |

---

### 3.2 Đặt mật khẩu lần đầu (từ link email)

```
POST /supplier/set-password
Auth: Không cần
```

> Supplier nhận email sau khi admin approve. Email chứa link:  
> `https://<frontend>/supplier/set-password?token=<uuid>`  
> FE lấy `token` từ query param và gọi endpoint này.

**Request body:**

```json
{
  "token": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "password": "MyStr0ng@Pass"
}
```

| Field | Bắt buộc | Giới hạn |
|---|---|---|
| `token` | ✅ | UUID từ link email, hiệu lực 7 ngày (single-use) |
| `password` | ✅ | min 8 ký tự |

**Response `200`:**

```json
{
  "accessToken": "",
  "message": "Mật khẩu đã được đặt thành công. Vui lòng đăng nhập bằng email và mật khẩu vừa tạo."
}
```

> `accessToken` luôn rỗng `""`. Sau khi set password, **redirect về trang login** và dùng `POST /auth/email/login`.  
> Token Redis bị xóa ngay sau khi dùng (không thể dùng lại).

**Lỗi:**

| Status | Nguyên nhân |
|---|---|
| `400` | Link không hợp lệ hoặc đã hết hạn (7 ngày) |
| `404` | Tài khoản không tồn tại |

---

## 4. Supplier — Hồ sơ

> Tất cả endpoint dưới yêu cầu role `food_supplier`.

### 4.1 Xem hồ sơ của mình

```
GET /supplier/me
Auth: food_supplier
```

**Response `200`:**

```json
{
  "id": "uuid",
  "userId": "uuid",
  "companyName": "Công ty TNHH ABC Farm",
  "contactPhone": "0901234567",
  "address": "123 Lê Lợi, Q1, TP.HCM",
  "logoPath": "/suppliers/logo-abc.png",
  "description": "Nhà cung cấp VietGAP...",
  "isVerified": true,
  "createdAt": "2026-11-08T08:00:00.000Z"
}
```

> `logoPath` là path tương đối, hiển thị ảnh tại: `http://localhost:6969<logoPath>`

---

### 4.2 Cập nhật hồ sơ

```
PATCH /supplier/me
Auth: food_supplier
Content-Type: application/json
```

**Request body** (tất cả optional — chỉ gửi field muốn thay đổi):

```json
{
  "companyName": "Công ty ABC Farm Mới",
  "contactPhone": "0909999888",
  "address": "456 Nguyễn Trãi, Q5, TP.HCM",
  "description": "Mô tả mới..."
}
```

| Field | Giới hạn |
|---|---|
| `companyName` | max 150 ký tự |
| `contactPhone` | max 20 ký tự |
| `address` | max 255 ký tự |
| `description` | không giới hạn |

**Response `200`:** `SupplierProfileResponseDto` (xem 4.1)

**Lỗi:** `404` nếu hồ sơ chưa tồn tại.

---

### 4.3 Upload logo công ty

```
POST /supplier/me/logo
Auth: food_supplier
Content-Type: multipart/form-data
```

| Form field | Giá trị |
|---|---|
| `file` | File ảnh JPEG / PNG / WEBP, tối đa 5MB |

**Response `201`:** `SupplierProfileResponseDto` với `logoPath` đã cập nhật.

> Logo cũ bị **xóa tự động** trên server khi upload logo mới.

**Lỗi:** `400` nếu không đính kèm file.

---

## 5. Supplier — Gói cước & Thanh toán

### 5.1 Xem danh sách gói cước (Public)

```
GET /supplier/plans
Auth: Không cần
```

**Response `200`:**

```json
[
  {
    "id": 1,
    "name": "basic",
    "displayName": "Gói Cơ Bản",
    "priceVnd": 299000,
    "billingCycle": "monthly",
    "maxIngredients": 50,
    "features": ["Tối đa 50 nguyên liệu", "Hỗ trợ email"],
    "isActive": true
  },
  {
    "id": 2,
    "name": "pro",
    "displayName": "Gói Chuyên Nghiệp",
    "priceVnd": 699000,
    "billingCycle": "monthly",
    "maxIngredients": 500,
    "features": ["Tối đa 500 nguyên liệu", "Import Excel", "Badge xác minh"],
    "isActive": true
  }
]
```

---

### 5.2 Xem gói cước đang dùng

```
GET /supplier/subscription
Auth: food_supplier
```

**Response `200`:**

```json
{
  "id": "uuid",
  "status": "active",
  "startDate": "2026-11-01",
  "endDate": "2026-12-01",
  "autoRenew": true,
  "cancelledAt": null,
  "plan": {
    "id": 2,
    "name": "pro",
    "displayName": "Gói Chuyên Nghiệp",
    "priceVnd": 699000,
    "billingCycle": "monthly",
    "maxIngredients": 500,
    "features": ["..."],
    "isActive": true
  }
}
```

**Lỗi:** `404` nếu chưa có gói nào.

---

### 5.3 Mua / gia hạn gói cước

```
POST /supplier/subscribe
Auth: food_supplier
Content-Type: application/json
```

**Request body:**

```json
{
  "planId": 2
}
```

**Response `201`:**

```json
{
  "checkoutUrl": "https://pay.payos.vn/web/xxxx",
  "qrCode": "data:image/png;base64,...",
  "paymentRef": "FRIGGY-SUP-1234567890",
  "amount": 699000,
  "expireAt": "2026-11-08T09:15:00.000Z",
  "status": "pending"
}
```

> **Flow thanh toán:**
> 1. Redirect/open `checkoutUrl` hoặc hiển thị `qrCode`
> 2. Người dùng thanh toán trên PayOS
> 3. Backend nhận webhook → kích hoạt subscription, cập nhật role, push FCM
> 4. FE polling `GET /supplier/subscription` hoặc lắng nghe FCM notification để cập nhật UI

**Lỗi:**

| Status | Nguyên nhân |
|---|---|
| `404` | Hồ sơ nhà cung cấp chưa tồn tại (đã bị xóa) |
| `404` | Gói cước không tồn tại hoặc ngừng hoạt động |
| `409` | Đã có giao dịch pending chưa hết hạn (cooldown 15 phút) |

---

### 5.4 Hủy tự động gia hạn

```
DELETE /supplier/subscription/auto-renewal
Auth: food_supplier
```

**Response `200`:**

```json
{
  "message": "Đã hủy tự động gia hạn. Gói sẽ hết hạn vào ngày đã đăng ký."
}
```

> Gói vẫn **hoạt động đến hết ngày `endDate`**, chỉ không tự gia hạn sau đó.

**Lỗi:**

| Status | Nguyên nhân |
|---|---|
| `404` | Không có gói cước nào |
| `400` | Gói cước không ở trạng thái `active` |

---

## 6. Supplier — Quản lý nguyên liệu

> Tất cả yêu cầu role `food_supplier`.  
> Các thao tác **ghi** (tạo, import) còn yêu cầu gói subscription **active** (trả `403` nếu hết hạn).

### 6.1 Tải file Excel mẫu để import

```
GET /supplier/ingredients/template
Auth: food_supplier
```

**Response:** File `.xlsx` tải về tự động với 2 sheet:
- `Nguyên liệu` — template điền dữ liệu
- `Danh mục tham khảo` — danh sách `categoryId` hợp lệ kèm tên

> Không yêu cầu gói active — supplier hết hạn vẫn tải được template.

---

### 6.2 Danh sách nguyên liệu

```
GET /supplier/ingredients
Auth: food_supplier
```

**Query params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `status` | `string` | Lọc: `pending` / `approved` / `rejected` / `archived` |
| `page` | `number` | default `1` |
| `limit` | `number` | default `20` |

**Response `200`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Thịt bò Úc",
      "categoryId": 3,
      "categoryName": "Thịt & Hải sản",
      "defaultUnit": "kg",
      "caloriesPer100g": 250,
      "averagePricePerUnit": 150000,
      "imagePath": null,
      "brand": "ABC Farm",
      "barcode": "8938505737946",
      "description": "Thịt bò nhập khẩu từ Úc",
      "status": "pending",
      "rejectionReason": null,
      "createdAt": "2026-11-08T08:00:00.000Z",
      "updatedAt": "2026-11-08T08:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### 6.3 Chi tiết 1 nguyên liệu

```
GET /supplier/ingredients/:id
Auth: food_supplier
```

**Response `200`:** `SupplierIngredientResponseDto` (xem 6.2)

**Lỗi:** `404` nếu không tìm thấy hoặc không thuộc hồ sơ của mình.

---

### 6.4 Thêm nguyên liệu mới

```
POST /supplier/ingredients
Auth: food_supplier + subscription active
Content-Type: application/json
```

**Request body:**

```json
{
  "name": "Thịt bò Úc",
  "categoryId": 3,
  "defaultUnit": "kg",
  "caloriesPer100g": 250,
  "averagePricePerUnit": 150000,
  "brand": "ABC Farm",
  "barcode": "8938505737946",
  "description": "Thịt bò nhập khẩu từ Úc, chứng nhận hữu cơ"
}
```

| Field | Bắt buộc | Giới hạn |
|---|---|---|
| `name` | ✅ | max 150 ký tự |
| `categoryId` | ✅ | int, lấy từ `GET /ingredients/categories` |
| `defaultUnit` | ✅ | max 30 ký tự (vd: `kg`, `g`, `lít`, `cái`) |
| `caloriesPer100g` | ❌ | number >= 0 |
| `averagePricePerUnit` | ❌ | int >= 0 (VND) |
| `brand` | ❌ | max 100 ký tự |
| `barcode` | ❌ | max 50 ký tự |
| `description` | ❌ | không giới hạn |

**Response `201`:** `SupplierIngredientResponseDto` với `status: "pending"`.

> Nguyên liệu mới luôn ở trạng thái `pending` — cần admin duyệt trước khi hiển thị cho người dùng cuối.

**Lỗi:**

| Status | Nguyên nhân |
|---|---|
| `403` | Gói cước hết hạn hoặc chưa đăng ký |
| `400` | `categoryId` không tồn tại |
| `400` | Vượt giới hạn `maxIngredients` của gói hiện tại |

---

### 6.5 Import hàng loạt từ Excel

```
POST /supplier/ingredients/import
Auth: food_supplier + subscription active
Content-Type: multipart/form-data
```

| Form field | Giá trị |
|---|---|
| `file` | File `.xlsx` đã điền theo template (max 10MB) |

> **Rate limit:** Mỗi ngày tối đa **5 lần** import (reset lúc 00:00). Nếu vượt quá → `400`.

**Response `201`:**

```json
{
  "total": 10,
  "success": 8,
  "failed": 2,
  "failedRows": [
    { "row": 3, "name": "Mực ống", "reason": "defaultUnit không được để trống" },
    { "row": 7, "name": "Tên dài...", "reason": "Tên nguyên liệu quá dài (tối đa 150 ký tự)" }
  ],
  "pendingCount": 8
}
```

> Các dòng import thành công sẽ có `status: "pending"` chờ admin duyệt.  
> Các dòng bị lỗi không được import nhưng không ảnh hưởng đến các dòng khác.

**Lỗi:**

| Status | Nguyên nhân |
|---|---|
| `400` | Chưa đính kèm file |
| `400` | Đã import 5 lần hôm nay — thử lại ngày mai |
| `400` | Đã đạt giới hạn nguyên liệu của gói |
| `403` | Gói cước hết hạn |

---

### 6.6 Cập nhật nguyên liệu

```
PATCH /supplier/ingredients/:id
Auth: food_supplier
Content-Type: application/json
```

> Chỉ cập nhật được khi `status` là `pending` hoặc `rejected`.  
> Nếu `approved` hoặc `archived` → `400 Bad Request`.

**Request body** (tất cả optional):

```json
{
  "name": "Thịt bò Mỹ",
  "categoryId": 3,
  "defaultUnit": "kg",
  "caloriesPer100g": 260,
  "averagePricePerUnit": 160000,
  "brand": "US Farm",
  "barcode": "1234567890",
  "description": "Mô tả mới..."
}
```

**Response `200`:** `SupplierIngredientResponseDto`

---

### 6.7 Xóa nguyên liệu (soft delete)

```
DELETE /supplier/ingredients/:id
Auth: food_supplier
```

**Response `204` No Content**

**Lỗi:** `404` nếu không tìm thấy hoặc không thuộc hồ sơ của mình.

---

## 7. Admin — Xét duyệt đơn đăng ký đối tác

> Yêu cầu role `admin` hoặc `manager`.  
> **Chỉ `admin`** mới có quyền duyệt (`approve`). Manager chỉ xem và từ chối.

### 7.1 Danh sách đơn đăng ký

```
GET /admin/supplier-applications
Auth: admin | manager
```

**Query params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `status` | `string` | Lọc: `pending` / `approved` / `rejected` |
| `search` | `string` | Tìm theo tên công ty, email, tên người đại diện |
| `page` | `number` | default `1` |
| `limit` | `number` | default `20` |

**Response `200`:**

```json
{
  "items": [
    {
      "id": "uuid",
      "companyName": "Công ty TNHH ABC Farm",
      "contactName": "Nguyễn Văn A",
      "email": "contact@abcfarm.vn",
      "phone": "0901234567",
      "address": "123 Lê Lợi, Q1, TP.HCM",
      "description": "...",
      "website": "https://abcfarm.vn",
      "status": "pending",
      "rejectionReason": null,
      "reviewedAt": null,
      "reviewedBy": null,
      "userId": null,
      "createdAt": "2026-11-08T08:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 7.2 Chi tiết 1 đơn đăng ký

```
GET /admin/supplier-applications/:id
Auth: admin | manager
```

**Response `200`:** Đơn đăng ký đầy đủ kèm:

```json
{
  "...",
  "user": { "id": "uuid", "email": "...", "status": "active" },
  "reviewer": { "id": "uuid", "email": "admin@friggy.vn" }
}
```

---

### 7.3 Duyệt đơn — tạo tài khoản supplier

```
POST /admin/supplier-applications/:id/approve
Auth: admin ONLY
```

**Request body:** Không cần.

**Response `200`:**

```json
{
  "message": "Đã duyệt đơn. Tài khoản đã được tạo và email đã được gửi.",
  "userId": "uuid-của-user-vừa-tạo"
}
```

> **Hệ thống tự động thực hiện (trong 1 DB transaction):**
> - Tạo `User` (role: `food_supplier`, status: `pending`)
> - Tạo `SupplierProfile` (`isVerified: true`)
> - Cập nhật đơn → `status: approved`
> - Ghi `AdminActivityLog`
> - Lưu set-password token vào Redis (TTL 7 ngày)
> - Gửi email kèm **link đặt mật khẩu** cho supplier

**Lỗi:**

| Status | Nguyên nhân |
|---|---|
| `404` | Không tìm thấy đơn |
| `409` | Đơn đã được xử lý (approved/rejected) |
| `409` | Email đã tồn tại trong hệ thống |
| `400` | Role `food_supplier` chưa được seed trong DB |

---

### 7.4 Từ chối đơn

```
POST /admin/supplier-applications/:id/reject
Auth: admin | manager
```

**Request body:**

```json
{
  "rejectionReason": "Thông tin công ty không đầy đủ, thiếu địa chỉ cụ thể."
}
```

> `rejectionReason` **bắt buộc** và không được để trống.

**Response `200`:**

```json
{
  "message": "Đã từ chối đơn và gửi email thông báo."
}
```

> Hệ thống ghi `AdminActivityLog` và gửi email từ chối kèm lý do cho supplier.

**Lỗi:**

| Status | Nguyên nhân |
|---|---|
| `404` | Không tìm thấy đơn |
| `409` | Đơn đã được xử lý |
| `400` | Thiếu `rejectionReason` |

---

## 8. Admin — Quản lý nhà cung cấp

> Yêu cầu role `admin` hoặc `manager`.

### 8.1 Danh sách nhà cung cấp

```
GET /admin/suppliers
Auth: admin | manager
```

**Query params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `search` | `string` | Tìm theo tên công ty |
| `isVerified` | `boolean` | Lọc theo trạng thái xác minh |
| `page` | `number` | default `1` |
| `limit` | `number` | default `20` |

**Response `200`:**

```json
{
  "items": [
    {
      "id": "uuid",
      "companyName": "Công ty TNHH ABC Farm",
      "contactPhone": "0901234567",
      "address": "...",
      "logoPath": null,
      "isVerified": true,
      "createdAt": "...",
      "user": { "id": "uuid", "email": "contact@abcfarm.vn" },
      "subscription": {
        "status": "active",
        "startDate": "2026-11-01T00:00:00.000Z",
        "endDate": "2026-12-01T00:00:00.000Z"
      },
      "_count": { "ingredients": 12 }
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 8.2 Chi tiết 1 nhà cung cấp

```
GET /admin/suppliers/:id
Auth: admin | manager
```

> `:id` là **SupplierProfile ID** (không phải User ID).

**Response `200`:** Profile đầy đủ kèm:
- `user` — thông tin tài khoản
- `subscription` + `plan` — gói cước hiện tại
- `ingredients` — toàn bộ nguyên liệu (trừ deleted)
- `paymentTransactions` — 10 giao dịch gần nhất

---

### 8.3 Xác minh / Thu hồi xác minh

```
PATCH /admin/suppliers/:id/verify
Auth: admin | manager
Content-Type: application/json
```

> `:id` là **SupplierProfile ID**.

**Request body:**

```json
{
  "isVerified": true
}
```

| Value | Ý nghĩa |
|---|---|
| `true` | Xác minh nhà cung cấp (hiển thị badge) |
| `false` | Thu hồi xác minh |

**Response `200`:** SupplierProfile đã cập nhật.

**Lỗi:** `404` nếu profile không tồn tại.

---

## 9. Admin — Duyệt nguyên liệu supplier

> Yêu cầu role `admin` hoặc `manager`.  
> Sau khi duyệt/từ chối, hệ thống tự động **ghi `AdminActivityLog`** và **push FCM notification** cho supplier.

### 9.1 Danh sách nguyên liệu chờ duyệt

```
GET /admin/supplier-ingredients
Auth: admin | manager
```

**Query params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `status` | `string` | Lọc: `pending` / `approved` / `rejected` / `archived` |
| `profileId` | `string` | Lọc theo 1 nhà cung cấp cụ thể (SupplierProfile ID) |
| `page` | `number` | default `1` |
| `limit` | `number` | default `20` |

**Response `200`:**

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Thịt bò Úc",
      "categoryId": 3,
      "defaultUnit": "kg",
      "caloriesPer100g": 250,
      "averagePricePerUnit": 150000,
      "imagePath": null,
      "brand": "ABC Farm",
      "barcode": "8938505737946",
      "description": "...",
      "status": "pending",
      "rejectionReason": null,
      "reviewedBy": null,
      "reviewedAt": null,
      "linkedIngredientId": null,
      "createdAt": "...",
      "updatedAt": "...",
      "profile": {
        "companyName": "Công ty TNHH ABC Farm",
        "userId": "uuid"
      },
      "category": { "name": "Thịt & Hải sản" },
      "reviewer": null
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 9.2 Chi tiết 1 nguyên liệu

```
GET /admin/supplier-ingredients/:id
Auth: admin | manager
```

**Response `200`:** Nguyên liệu đầy đủ kèm:
- `profile` + `user` — thông tin nhà cung cấp sở hữu
- `category` — danh mục
- `reviewer` — admin đã xét duyệt (nếu có)
- `linkedIngredient` — nguyên liệu global được liên kết (nếu đã merge)

---

### 9.3 Duyệt nguyên liệu

```
PATCH /admin/supplier-ingredients/:id/approve
Auth: admin | manager
Content-Type: application/json
```

**Request body:**

```json
{
  "mergeToGlobal": true
}
```

| Field | Bắt buộc | Mô tả |
|---|---|---|
| `mergeToGlobal` | ❌ | `true` → tạo hoặc liên kết với nguyên liệu trong bảng global `Ingredient`. Nếu tên đã tồn tại thì liên kết vào nguyên liệu đó. |

**Response `200`:** `SupplierIngredient` đã cập nhật với `status: "approved"`.

> **Sau khi approve:**
> - Supplier nhận **FCM notification**: "Nguyên liệu đã được duyệt"
> - Thêm bản ghi `Notification` vào DB cho supplier
> - Nếu `mergeToGlobal: true`: nguyên liệu xuất hiện trong danh sách global (dùng được cho toàn hệ thống)

**Lỗi:**

| Status | Nguyên nhân |
|---|---|
| `404` | Không tìm thấy nguyên liệu |
| `409` | Nguyên liệu không ở trạng thái `pending` |

---

### 9.4 Từ chối nguyên liệu

```
PATCH /admin/supplier-ingredients/:id/reject
Auth: admin | manager
Content-Type: application/json
```

**Request body:**

```json
{
  "reason": "Thông tin calo không chính xác, vui lòng kiểm tra lại nguồn tham chiếu."
}
```

> `reason` **bắt buộc**.

**Response `200`:** `SupplierIngredient` với `status: "rejected"` và `rejectionReason` đã cập nhật.

> **Sau khi reject:**
> - Supplier nhận **FCM notification**: "Nguyên liệu bị từ chối" kèm lý do
> - Supplier có thể sửa (`PATCH /supplier/ingredients/:id`) và chờ duyệt lại

**Lỗi:**

| Status | Nguyên nhân |
|---|---|
| `404` | Không tìm thấy nguyên liệu |
| `409` | Nguyên liệu không ở trạng thái `pending` |

---

## 10. Admin — Quản lý gói cước supplier

> Yêu cầu role `admin` only (manager không có quyền).

### 10.1 Danh sách gói cước

```
GET /admin/supplier-plans
Auth: admin
```

**Response `200`:** Mảng toàn bộ `SupplierPlan` (kể cả `isActive: false`), không bao gồm deleted:

```json
[
  {
    "id": 1,
    "name": "basic",
    "displayName": "Gói Cơ Bản",
    "priceVnd": 299000,
    "billingCycle": "monthly",
    "maxIngredients": 50,
    "features": ["Tối đa 50 nguyên liệu", "Hỗ trợ email"],
    "isActive": true,
    "createdAt": "2026-11-01T00:00:00.000Z",
    "updatedAt": "2026-11-01T00:00:00.000Z"
  }
]
```

> Khác với `GET /supplier/plans` (public) — endpoint này trả cả gói `isActive: false`.

---

### 10.2 Tạo gói cước mới

```
POST /admin/supplier-plans
Auth: admin
Content-Type: application/json
```

**Request body:**

```json
{
  "name": "enterprise",
  "displayName": "Gói Doanh Nghiệp",
  "priceVnd": 1499000,
  "billingCycle": "monthly",
  "maxIngredients": 2000,
  "features": [
    "Tối đa 2000 nguyên liệu",
    "Import Excel không giới hạn",
    "Badge xác minh vàng",
    "Hỗ trợ ưu tiên 24/7"
  ],
  "isActive": true
}
```

| Field | Bắt buộc | Mô tả |
|---|---|---|
| `name` | ✅ | Slug định danh nội bộ, không dấu, không space (vd: `basic`, `pro`) |
| `displayName` | ✅ | Tên hiển thị cho người dùng |
| `priceVnd` | ✅ | Giá (VND, số nguyên) |
| `billingCycle` | ✅ | `"monthly"` hoặc `"yearly"` |
| `maxIngredients` | ❌ | Giới hạn nguyên liệu, default `50` |
| `features` | ✅ | Mảng chuỗi mô tả tính năng |
| `isActive` | ❌ | default `true` |

**Response `201`:** `SupplierPlan` vừa tạo.

---

### 10.3 Cập nhật gói cước

```
PATCH /admin/supplier-plans/:id
Auth: admin
Content-Type: application/json
```

> `:id` là Plan ID (số nguyên).  
> Tất cả field optional — chỉ gửi field muốn thay đổi.  
> `name` và `billingCycle` **không thể sửa** sau khi tạo.

**Request body:**

```json
{
  "displayName": "Gói Doanh Nghiệp Pro",
  "priceVnd": 1299000,
  "maxIngredients": 3000,
  "features": ["Tối đa 3000 nguyên liệu", "..."],
  "isActive": false
}
```

> Đặt `"isActive": false` để **vô hiệu hóa gói** — gói ẩn khỏi `GET /supplier/plans` nhưng các subscription hiện có không bị ảnh hưởng.

**Response `200`:** `SupplierPlan` đã cập nhật.

**Lỗi:** `404` nếu plan không tồn tại.

---

## 11. Admin — Lịch sử giao dịch thanh toán supplier

> Yêu cầu role `admin` hoặc `manager`.

### 11.1 Danh sách giao dịch

```
GET /admin/supplier-payment-transactions
Auth: admin | manager
```

**Query params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `profileId` | `string` | Lọc theo 1 nhà cung cấp cụ thể (SupplierProfile ID) |
| `status` | `string` | Lọc: `pending` / `completed` / `cancelled` |
| `page` | `number` | default `1` |
| `limit` | `number` | default `20` |

**Response `200`:**

```json
{
  "items": [
    {
      "id": "uuid",
      "profileId": "uuid",
      "companyName": "Công ty TNHH ABC Farm",
      "supplierEmail": "contact@abcfarm.vn",
      "planName": "Gói Chuyên Nghiệp",
      "type": "subscribe",
      "amount": 699000,
      "status": "completed",
      "paymentMethod": "payos",
      "paymentRef": "FRIGGY-SUP-1234567890",
      "description": "Gói NCC Chuyên Nghiệp",
      "checkoutUrl": "https://pay.payos.vn/web/xxxx",
      "expiredAt": "2026-11-08T09:15:00.000Z",
      "paidAt": "2026-11-08T08:30:00.000Z",
      "createdAt": "2026-11-08T08:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

> **Lưu ý:** Đây là bảng riêng (`supplier_payment_transactions`) — **độc lập** với giao dịch của user thường (`GET /admin/payment-transactions`).

---

## 12. Enum & Giá trị hợp lệ

### Trạng thái đơn đăng ký (`SupplierApplication.status`)

| Value | Mô tả |
|---|---|
| `pending` | Đang chờ admin xem xét |
| `approved` | Đã được duyệt, tài khoản đã tạo |
| `rejected` | Đã bị từ chối |

### Trạng thái nguyên liệu (`SupplierIngredient.status`)

| Value | Mô tả |
|---|---|
| `pending` | Mới tạo, chờ admin duyệt |
| `approved` | Đã duyệt, hiển thị cho người dùng cuối |
| `rejected` | Bị từ chối, supplier có thể sửa và resubmit |
| `archived` | Đã lưu trữ, không hiển thị |

### Trạng thái gói cước (`SupplierSubscription.status`)

| Value | Mô tả |
|---|---|
| `active` | Đang hoạt động |
| `expired` | Đã hết hạn |
| `cancelled` | Đã hủy |

### Chu kỳ thanh toán (`SupplierPlan.billingCycle`)

| Value | Mô tả |
|---|---|
| `monthly` | Hàng tháng |
| `yearly` | Hàng năm |

---

## 13. Xử lý lỗi thường gặp

### Format lỗi chung

```json
{
  "statusCode": 400,
  "message": "...",
  "error": "Bad Request"
}
```

### `403` — Gói cước không active

```json
{
  "statusCode": 403,
  "message": "Gói nhà cung cấp đã hết hạn hoặc chưa đăng ký. Vui lòng mua gói để sử dụng tính năng này.",
  "error": "Forbidden"
}
```

→ FE redirect đến trang mua gói (`GET /supplier/plans` → `POST /supplier/subscribe`).

### `401` — Token hết hạn hoặc không hợp lệ

```json
{ "statusCode": 401, "message": "Unauthorized" }
```

→ Dùng refresh token hoặc redirect về trang login.

### `400` — Validation DTO thất bại

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "companyName should not be empty"],
  "error": "Bad Request"
}
```

→ `message` là mảng — hiển thị từng lỗi tương ứng với field trên form.

### `409` — Conflict

Thường gặp khi: đơn đã được xử lý, email trùng, có giao dịch pending chưa hết hạn.  
→ Hiển thị `message` trực tiếp cho người dùng.

---

*Cập nhật lần cuối: 2026-11-08*
