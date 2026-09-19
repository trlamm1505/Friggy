# 🥗 Friggy Mobile - Ứng Dụng Quản Lý Tủ Lạnh & Dinh Dưỡng Thông Minh

<p align="center">
  <img src="https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white" alt="Flutter" />
  <img src="https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white" alt="Dart" />
  <img src="https://img.shields.io/badge/Dio-008435?style=for-the-badge&logo=axios&logoColor=white" alt="Dio" />
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS-brightgreen?style=for-the-badge" alt="Platform" />
</p>

---

## 📖 Giới Thiệu

**Friggy Mobile** là ứng dụng di động thông minh trợ lý quản lý tủ lạnh, gợi ý món ăn và theo dõi dinh dưỡng gia đình. Ứng dụng giúp giảm thiểu lãng phí thực phẩm, tự động nhắc nhở hết hạn, gợi ý công thức nấu ăn dựa trên nguyên liệu có sẵn trong tủ lạnh và phân tích AI thông minh.

---

## 🚀 Các Tính Năng Nổi Bật

### 🔐 1. Xác Thực & Tài Khoản (Authentication & Onboarding)
- **Đăng nhập Google OAuth 2.0**: Đăng nhập nhanh chóng và bảo mật bằng Google ID Token.
- **Đăng nhập Số Điện Thoại (OTP)**: Gửi và xác thực mã OTP qua điện thoại.
- **Quản lý phiên (JWT Session)**: Tự động đính kèm Bearer token và làm mới token tự động (`AuthInterceptor`).

### 🧊 2. Quản Lý Tủ Lạnh & Thực Phẩm (Fridge Management)
- Phân loại khu vực lưu trữ: **Ngăn mát**, **Ngăn đông**, **Tủ khô**.
- Theo dõi ngày hết hạn thực phẩm với cảnh báo màu sắc trực quan (Đỏ: Hết hạn, Vàng: Sắp hết hạn, Xanh: Còn tươi).
- Xem danh sách tổng quan nhanh ngoài màn hình chính.

### 📸 3. Nhận Diện AI & Thêm Thực Phẩm Thông Minh
- **Đa dạng phương thức nhập**:
  - 📷 **Chụp ảnh thực phẩm (AI Scan)**: Tự động phân tích ảnh thực phẩm bằng AI.
  - 🧾 **Scan Hóa Đơn**: Nhận diện nguyên liệu từ hóa đơn đi chợ.
  - 🏷️ **Quét Mã Vạch (Barcode)**: Quét mã vạch sản phẩm đóng gói.
  - ✍️ **Thêm Thủ Công**: Tìm kiếm và thêm nhanh từ danh mục 60+ nguyên liệu chuẩn.

### 🍲 4. Gợi Ý Công Thức Nấu Ăn (Smart Recipe Suggestions)
- Gợi ý món ăn **Bữa Sáng**, **Bữa Trưa**, **Bữa Tối** tối ưu theo nguyên liệu hiện có trong tủ lạnh.
- Xem chi tiết công thức: thành phần nguyên liệu, mức độ khó, thời gian chế biến, chi phí ước tính và các bước thực hiện từng bước.

### 🔔 5. Hệ Thống Thông Báo Thời Gian Thực (Real-time Notifications)
- **Badge số lượng chưa đọc**: Badge quả chuông xanh lá trên thanh App Bar cập nhật tức thì theo thời gian thực (`ValueNotifier`).
- **Phân loại thông báo**: *Hết hạn*, *Nhắc đi chợ*, *Hệ thống*, *Khuyến mãi*.
- **Thao tác nhanh**: Đánh dấu đã đọc từng mục, "Đã đọc tất cả", vuốt để xóa thông báo.
- **Giao diện tối ưu**: Hiển thị mặc định 4 thông báo đầu tiên kèm nút bấm mở rộng full-width *"Xem toàn bộ thông báo"*.

### 👤 6. Hồ Sơ Cá Nhân & Cài Đặt Dinh Dưỡng (User Profile & Preferences)
- **Chỉnh sửa hồ sơ**: Cập nhật tên hiển thị, giới tính, ngày sinh, bio và tải lên ảnh đại diện (Avatar).
- **Cài đặt chế độ ăn & Dị ứng**: Lựa chọn khẩu vị, số lượng thành viên gia đình, lượng calo mục tiêu và quản lý danh sách nguyên liệu gây dị ứng.

### 💳 7. Gói Đăng Ký Premium (Subscriptions)
- Quản lý gói dịch vụ **Miễn phí (Free)** và **Cá nhân (Individual)**.
- Tích hợp thanh toán mô phỏng (Payment QR/Webhook) để nâng cấp đặc quyền AI không giới hạn.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **Core Framework**: [Flutter](https://flutter.dev/) (Dart SDK `>=3.0.0`)
- **HTTP Client & Interceptors**: [Dio](https://pub.dev/packages/dio) *(Tự động gắn Token, Log request/response, Refresh Token 401)*
- **Typography & UI**: 
  - [Google Fonts](https://pub.dev/packages/google_fonts) (*Plus Jakarta Sans*, *Outfit*)
  - Modern UI / Dark Mode support / Smooth Animations
- **State Management & Local Storage**: 
  - `ValueNotifier` & `ValueListenableBuilder` cho dữ liệu thời gian thực
  - [SharedPreferences](https://pub.dev/packages/shared_preferences) lưu trữ phiên làm việc an toàn
- **Đa Ngôn Ngữ (i18n)**: Flutter Localizations (`AppLocalizations` - Tiếng Việt & Tiếng Anh)

---

## 💻 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng (Getting Started)

### 📋 1. Yêu Cầu Tiền Đề (Prerequisites)
- [Flutter SDK](https://docs.flutter.dev/get-started/install) phiên bản `>= 3.0.0`
- **Dart SDK** (đi kèm Flutter)
- **Android Studio** hoặc **VS Code** (đã cài Flutter & Dart Extensions)
- Thiết bị thử nghiệm: Android Emulator / iOS Simulator hoặc Điện thoại thật

---

### 📥 2. Cài Đặt Dự Án

1. **Clone Thư Mục Dự Án**:
   ```bash
   git clone <repository-url>
   cd FRIGGY/Mobile
   ```

2. **Cài Đặt Các Thư Viện (Dependencies)**:
   ```bash
   flutter pub get
   ```

3. **Cấu Hình Địa Chỉ API Backend**:
   Mở file `lib/config/app_constants.dart` và kiểm tra cấu hình URL API cho thiết bị của bạn:
   - Nếu chạy **Android Emulator**: `http://10.0.2.2:6969/api/v1`
   - Nếu chạy **iOS Simulator / Máy thật**: `http://<IP_MAY_TINH>:6969/api/v1` hoặc `http://localhost:6969/api/v1`

---

### ▶️ 3. Khởi Chạy Ứng Dụng (Run App)

1. **Kiểm tra thiết bị đang kết nối**:
   ```bash
   flutter devices
   ```

2. **Khởi chạy ứng dụng**:
   ```bash
   flutter run
   ```

3. **Chạy ứng dụng ở chế độ Release (Tối ưu hiệu năng)**:
   ```bash
   flutter run --release
   ```

---

<p align="center">
  Developed with ❤️ by Friggy Team
</p>
