# Hướng dẫn cập nhật Web Frontend — Mã số thuế Doanh nghiệp (`taxCode`) cho Supplier

> **Base URL:** `/api/v1`  
> Tài liệu này liệt kê toàn bộ các thay đổi API liên quan đến trường **Mã số thuế doanh nghiệp (`taxCode`)** mà phía Web (Landing Page đăng ký đối tác, Supplier Portal & Admin Dashboard) cần cập nhật.

---

## Tổng quan các màn hình Web cần cập nhật

| Phân hệ Web | Màn hình / Chức năng | Endpoint liên quan | Thay đổi cần làm trên UI |
|---|---|---|---|
| **Public Web** | Form Đăng ký Đối tác Nhà cung cấp | `POST /supplier/apply` | Thêm ô input **Mã số thuế doanh nghiệp** (`taxCode` — bắt buộc) |
| **Admin Web** | Danh sách & Chi tiết Đơn đăng ký Đối tác | `GET /admin/supplier-applications`<br>`GET /admin/supplier-applications/:id` | Hiển thị cột/trường `taxCode`, hỗ trợ search theo `taxCode` |
| **Admin Web** | Danh sách & Chi tiết Nhà cung cấp | `GET /admin/suppliers`<br>`GET /admin/suppliers/:id` | Hiển thị cột/trường `taxCode`, hỗ trợ search theo `taxCode` |
| **Supplier Portal** | Hồ sơ Nhà cung cấp | `GET /supplier/profile` | Hiển thị `taxCode` (read-only) trong trang thông tin doanh nghiệp |

---

## 1. Public Web — Form Đăng ký Đối tác (`POST /supplier/apply`)

### Endpoint
- **Method & Path:** `POST /api/v1/supplier/apply`
- **Auth:** Public (không cần token)

### Request Body (Cập nhật)
Bổ sung trường bắt buộc **`taxCode`**:

```json
{
  "companyName": "Nông Sản Xanh Đà Lạt",
  "taxCode": "5801426891",
  "contactName": "Nguyễn Minh Quân",
  "email": "supplier@nongsanxanh.vn",
  "phone": "0974895709",
  "address": "128 Hùng Vương, Phường 9, TP. Đà Lạt, Lâm Đồng",
  "description": "Chuyên cung cấp nông sản sạch VietGAP, rau củ quả tươi Đà Lạt.",
  "website": "https://nongsanxanh.vn"
}
```

### Quy tắc Validate `taxCode` ở Frontend Form
| Rule | Chi tiết | Thông báo lỗi gợi ý trên UI |
|---|---|---|
| **Bắt buộc** | Không được để trống | `"Vui lòng nhập mã số thuế doanh nghiệp"` |
| **Định dạng (Regex)** | `/^\d{10}(-\d{3})?$/` (10 chữ số, hoặc 10 chữ số kèm `-xxx` cho chi nhánh) | `"Mã số thuế không hợp lệ (VD: 0101234567 hoặc 0101234567-001)"` |
| **Độ dài tối đa** | 20 ký tự | — |

### Response `201 Created`
```json
{
  "id": "844f7e05-4703-473f-aa20-184571998041",
  "companyName": "Nông Sản Xanh Đà Lạt",
  "taxCode": "5801426891",
  "contactName": "Nguyễn Minh Quân",
  "email": "supplier@nongsanxanh.vn",
  "phone": "0974895709",
  "address": "128 Hùng Vương, Phường 9, TP. Đà Lạt, Lâm Đồng",
  "description": "Chuyên cung cấp nông sản sạch VietGAP, rau củ quả tươi Đà Lạt.",
  "website": "https://nongsanxanh.vn",
  "status": "pending",
  "createdAt": "2026-11-14T02:30:00.000Z"
}
```

### Mã lỗi cần xử lý thêm
- **`400 Bad Request`**: Sai định dạng `taxCode`.
- **`409 Conflict`**: `"Mã số thuế này đã được đăng ký hoặc đang chờ xét duyệt."` (hoặc trùng `email`).

---

## 2. Admin Web — Quản lý Đơn đăng ký Đối tác (`/admin/supplier-applications`)

### 2.1. Danh sách đơn đăng ký
- **Method & Path:** `GET /api/v1/admin/supplier-applications?status=pending&search=5801426891&page=1&limit=20`
- **Auth:** `Bearer <token>` (`admin` | `manager`)
- **Cập nhật Query `search`:** Ô tìm kiếm hiện tại đã hỗ trợ tìm theo **Tên công ty**, **Mã số thuế (`taxCode`)**, **Email**, hoặc **Tên người liên hệ** (FE có thể cập nhật placeholder ô search thành: *"Tìm theo tên công ty, MST, email..."*).

**Response Item mẫu:**
```json
{
  "items": [
    {
      "id": "844f7e05-4703-473f-aa20-184571998041",
      "companyName": "Nông Sản Xanh Đà Lạt",
      "taxCode": "5801426891",
      "contactName": "Nguyễn Minh Quân",
      "email": "supplier@nongsanxanh.vn",
      "phone": "0974895709",
      "address": "128 Hùng Vương, Phường 9, TP. Đà Lạt, Lâm Đồng",
      "description": "Chuyên cung cấp nông sản sạch VietGAP...",
      "website": "https://nongsanxanh.vn",
      "status": "pending",
      "rejectionReason": null,
      "reviewedAt": null,
      "reviewedBy": null,
      "userId": null,
      "createdAt": "2026-11-09T14:13:41.207Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### 2.2. Chi tiết đơn đăng ký
- **Method & Path:** `GET /api/v1/admin/supplier-applications/:id`
- **Thay đổi trên UI:** Hiển thị rõ trường **Mã số thuế (`taxCode`)** trong modal/trang chi tiết đơn để Admin đối chiếu pháp lý trước khi bấm **Duyệt (`POST /:id/approve`)** hoặc **Từ chối (`POST /:id/reject`)**.
- **Lưu ý khi Duyệt (`POST /:id/approve`):** Backend tự động copy `taxCode` từ đơn đăng ký sang `SupplierProfile`, FE không cần truyền thêm body gì khi gọi approve.

---

## 3. Admin Web — Quản lý Nhà cung cấp (`/admin/suppliers`)

### 3.1. Danh sách nhà cung cấp
- **Method & Path:** `GET /api/v1/admin/suppliers?search=5801426891&isVerified=true&page=1&limit=20`
- **Auth:** `Bearer <token>` (`admin` | `manager`)
- **Cập nhật Query `search`:** Hỗ trợ tìm theo cả **Tên công ty (`companyName`)** hoặc **Mã số thuế (`taxCode`)**.

**Response Item mẫu:**
```json
{
  "items": [
    {
      "id": "d6cbf9a8-61d4-4a9d-a887-7dfafb79e137",
      "userId": "e401eddd-3614-4457-9915-231c31732bd7",
      "companyName": "Nông Sản Xanh Đà Lạt",
      "taxCode": "5801426891",
      "contactPhone": "0974895709",
      "address": "128 Hùng Vương, Phường 9, TP. Đà Lạt, Lâm Đồng",
      "logoPath": null,
      "description": "Chuyên cung cấp nông sản sạch VietGAP...",
      "isVerified": true,
      "createdAt": "2026-11-09T14:14:05.020Z",
      "updatedAt": "2026-11-09T14:14:05.020Z",
      "user": {
        "id": "e401eddd-3614-4457-9915-231c31732bd7",
        "email": "supplier@nongsanxanh.vn"
      },
      "subscription": {
        "status": "active",
        "startDate": "2026-11-09T00:00:00.000Z",
        "endDate": "2026-12-09T00:00:00.000Z"
      },
      "_count": {
        "ingredients": 18
      }
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### 3.2. Chi tiết nhà cung cấp
- **Method & Path:** `GET /api/v1/admin/suppliers/:id`
- **Thay đổi trên UI:** Hiển thị thêm `taxCode` trong phần thông tin hồ sơ đối tác.

---

## 4. Supplier Portal — Hồ sơ Nhà cung cấp (`GET /supplier/profile`)

- **Method & Path:** `GET /api/v1/supplier/profile`
- **Auth:** `Bearer <token>` (`food_supplier`)
- **Response (Cập nhật):**
```json
{
  "id": "d6cbf9a8-61d4-4a9d-a887-7dfafb79e137",
  "userId": "e401eddd-3614-4457-9915-231c31732bd7",
  "companyName": "Nông Sản Xanh Đà Lạt",
  "taxCode": "5801426891",
  "contactPhone": "0974895709",
  "address": "128 Hùng Vương, Phường 9, TP. Đà Lạt, Lâm Đồng",
  "logoPath": null,
  "description": "Chuyên cung cấp nông sản sạch VietGAP...",
  "isVerified": true,
  "createdAt": "2026-11-09T14:14:05.020Z"
}
```
- **Thay đổi trên UI:** Hiển thị trường **Mã số thuế (`taxCode`)** ở chế độ **Read-only (không cho sửa)** vì mã số thuế đã được Admin duyệt cố định theo hồ sơ pháp lý lúc đăng ký.
