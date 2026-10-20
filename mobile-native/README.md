# Friggy Mobile Native (React Native Expo)

Clone UI của ứng dụng Friggy (Flutter) sang React Native Expo SDK 57.

## Tech Stack

- Expo SDK 57 + React Native 0.86.3 + React 19.2.3
- @react-navigation/native (native-stack + custom tabs)
- Zustand (state management) + MMKV (persistence)
- i18next + react-i18next (đa ngôn ngữ - VI/EN, mặc định VI)
- react-native-svg, expo-linear-gradient, expo-video, expo-image-picker
- lucide-react-native (icons)
- @expo-google-fonts/plus-jakarta-sans (font)

## Cài đặt

```bash
cd mobile-native
npm install
npx expo start
```

## Cấu trúc

```
src/
├── App.jsx                          # Root component
├── presentation/
│   ├── navigation/                  # RootNavigator, MainTabs, AuthStack
│   ├── screens/                     # 30+ screens
│   ├── components/                  # Common, navigation, home, fridge, modals, icons
│   ├── theme/                       # colors, gradients, typography, spacing, ThemeContext
│   ├── hooks/
│   └── utils/                       # responsive, greetingHelper, formatters, validators, helpers
├── shared/
│   ├── constants/                   # routes, appConstants
│   ├── i18n/                        # i18n, locales (vi.json, en.json), LanguageBridge
│   ├── mocks/                       # 12 mock data JSON files
│   └── stores/                      # useThemeStore, useLanguageStore, useAuthStore
└── providers/
    └── AppProviders.jsx             # GestureHandler + SafeArea + Language + Theme
```

## Mock data tài khoản

Để test nhanh, dùng tài khoản mock có sẵn:
- Email: `lam@example.com`
- Password: `123456`

Hoặc nhấn "Tiếp tục với Google" để vào nhanh.

## Flow chính

1. Mở app → Initial Loading (video 2s)
2. Splash screen → Bắt đầu ngay → Login
3. Login thành công → LoginSuccessVideo (3s)
4. Onboarding survey (2 bước) → Main tabs
5. Main tabs: Home, Fridge, Add (modal), AI Chat, Profile
6. Từ các tab có thể navigate sâu vào: Notifications, Recipe Detail, Statistics, Shopping Reminder, Settings, v.v.

## Theme

- **Light mode** (mặc định): gradient xanh lá từ trắng → xanh nhạt → xanh đậm
- **Dark mode**: xanh đen, card tối
- Switch tại Profile > Theme (Light / Dark / System)

## Language

- Mặc định **Tiếng Việt (vi)**
- Fallback **English (en)**
- Switch tại Profile > Language (Tiếng Việt / English)
- Persistence qua MMKV

## Mock data (chưa nối BE)

Tất cả data hiện đang lấy từ `src/shared/mocks/*.json`:
- user, fridge-summary, inventory, recipes, notifications
- cooking-suggestions, weekly-stats, shopping-reminder
- subscription, packages, family-members, allergies, user-preferences

Sau khi UI được duyệt, sẽ thay bằng API calls trong Phase 7+.

## Phase tiếp theo (sau khi UI xong)

- Nối backend thật (axios + react-query)
- Auth thật (Google/Apple Sign-In, JWT)
- Push notifications (Expo Notifications)
- Camera/Barcode thật
- Build APK/AAB
