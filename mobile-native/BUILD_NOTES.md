# Friggy Mobile Native - Build Notes

## Yêu cầu môi trường

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app trên điện thoại (Android/iOS)
- Hoặc Android Studio + emulator

## Cài đặt nhanh

```bash
cd mobile-native
npm install
```

## Lỗi thường gặp & Cách sửa

### 1. Module not found: 'react-native-mmkv'
MMKV yêu cầu native build. Nếu dùng Expo Go, dùng async-storage thay thế:

```bash
# Đổi trong package.json
# "react-native-mmkv": "^4.3.2" → xoá
# Cài thêm: "expo-sqlite/kv-store": "..."
```

Hoặc dùng development build:
```bash
npx expo install expo-dev-client
eas build --profile development --platform android
```

### 2. expo-video không play được
Đảm bảo asset video đúng path:
- `assets/videos/loading_login.mp4`

### 3. Font PlusJakartaSans không load
Package `@expo-google-fonts/plus-jakarta-sans` đã có sẵn. Nếu vẫn lỗi, dùng `expo-font`:
```bash
npx expo install expo-font
```

### 4. i18n không switch language
Đảm bảo đã gọi `initLocale()` ở `App.jsx`:
```js
const initLocale = useLanguageStore((s) => s.initLocale);
useEffect(() => { initLocale(); }, []);
```

## Test flows

1. **Auth flow**:
   - Mở app → Initial loading (2s video) → Splash
   - Tap "Bắt đầu ngay" → Login screen
   - Nhập `lam@example.com` / `123456` → Loading → Success video
   - Onboarding (2 bước) → Main tabs

2. **Home tab**:
   - Xem greeting banner thay đổi theo buổi (morning/afternoon/evening)
   - Tap summary cards → danh sách expired/available
   - Tap premium banner → package management
   - Tap recipe cards → recipe detail

3. **Fridge tab**:
   - Xem danh sách nguyên liệu
   - Filter theo "Tất cả / Sắp hết hạn / Còn tươi"
   - Tap "+" → Manual add screen

4. **AI tab**:
   - Chat với AI mock
   - Gõ "gợi ý món ăn" → nhận reply mock

5. **Profile tab**:
   - Switch language VI ↔ EN
   - Switch theme Light/Dark/System
   - Navigate tới 6 sub-screens

## Build production

```bash
# Android
eas build --platform android --profile preview

# iOS
eas build --platform ios --profile preview
```
