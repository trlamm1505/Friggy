# Flutter Project Architecture & Specification (Layer-First / Android Only)

> **Context Prompt for AI Assistants:**  
> This project is a Flutter application targeting **Android only**. It adheres strictly to the **Layer-First** architecture pattern. When generating code, proposing modifications, or creating new files, follow the directory structure, file placement rules, and coding conventions defined below.

---

## 1. High-Level Project Overview

- **Platform Target:** Android only (`android/` directory retained; unused desktop/web/iOS platforms pruned).
- **Architecture Pattern:** Layer-First (Screen & Data Separation).
- **Core Principles:** Single Responsibility, centralized configurations, no hardcoded constants, no media assets at the root level.

---

## 2. Directory Tree Specification

```text
mobile_root/
├── .env                              # Environment variables (Base URL, Secret keys) - Git ignored
├── analysis_options.yaml             # Dart linter configuration
├── pubspec.yaml                      # App dependencies, assets, and metadata
├── android/                          # Native Android platform configuration
│   ├── app/
│   │   ├── build.gradle              # App ID, compileSdkVersion, minSdkVersion (>= 21), dependencies
│   │   └── src/main/
│   │       └── AndroidManifest.xml   # Permissions (Internet, Camera, etc.), app name, icons
│   └── build.gradle                  # Project-level Gradle build script
│
├── assets/                           # Static assets referenced via pubspec.yaml
│   ├── images/                       # App icons, illustrations, logo PNG/SVG
│   └── videos/                       # Video files (e.g., loading_login.mp4)
│
└── lib/                              # Application Dart source code
    ├── config/                       # Global app configurations and routing
    │   ├── app_constants.dart        # Base URLs, endpoints, timeouts, storage keys
    │   └── app_routes.dart           # Route definitions, route generation logic
    │
    ├── data/                         # Data layer (Remote API, Local DB, Models)
    │   ├── models/                   # Data classes with serialization (fromJson, toJson)
    │   ├── services/                 # Remote API services, Dio/Http clients, networking
    │   └── local/                    # SharedPreferences, SQLite, SecureStorage helpers
    │
    ├── screens/                      # UI Screens grouped by domain / workflow
    │   ├── auth/                     # Authentication flow (Login, Register, Forgot Password)
    │   │   ├── login_screen.dart
    │   │   └── register_screen.dart
    │   └── home/                     # Primary user dashboard / home screen
    │       └── home_screen.dart
    │
    ├── widgets/                      # Reusable common UI components across multiple screens
    │   ├── custom_button.dart        # Standard primary/secondary app buttons
    │   ├── custom_text_field.dart   # Input fields with integrated validation states
    │   └── loading_indicator.dart    # Full-screen or inline spinners
    │
    ├── theme/                        # Design system & visual branding
    │   ├── app_colors.dart           # Semantic and brand color palette definitions
    │   ├── app_text_styles.dart      # Typography scale (headline, body, caption)
    │   └── app_theme.dart            # ThemeData definitions (lightTheme, darkTheme)
    │
    ├── utils/                        # Pure utility functions and helpers
    │   ├── formatters.dart           # Currency (VND), date-time, number formatters
    │   ├── validators.dart           # Form field validation regex (email, phone, password)
    │   └── helpers.dart              # UI helpers (Snackbar, BottomSheet, Dialog alerts)
    │
    ├── l10n/                         # Internationalization / Localization
    │   ├── app_en.arb                # English strings
    │   └── app_vi.arb                # Vietnamese strings
    │
    └── main.dart                     # App entry point (initialization & runApp)
```

---

## 3. Directory Responsibilities & File Placement Rules

| Directory / File | Purpose & Allowed Contents | Disallowed Contents |
| :--- | :--- | :--- |
| `lib/config/` | App-wide constant values, route switch logic, environment loaders. | UI widgets, business logic, state management. |
| `lib/data/models/` | Data classes, serializable JSON entities (`fromJson`, `toJson`). | UI rendering logic, Flutter UI imports (`package:flutter/material.dart`). |
| `lib/data/services/` | HTTP clients (Dio/Http), WebSocket managers, third-party SDK wrappers. | Direct UI controller state mutations. |
| `lib/data/local/` | Key-value store wrappers (`SharedPreferences`), DB helpers (`Sqflite`). | Networking logic, view-layer logic. |
| `lib/screens/` | Top-level view layouts, screen scaffold, coordinator logic. | Raw network calls, globally reusable base widgets. |
| `lib/widgets/` | Generic reusable widgets (buttons, input boxes, spinners). | Screen-specific full-page scaffolds, network calls. |
| `lib/theme/` | Color constants, TextStyles, ThemeData objects. | Hardcoded business values, dynamic calculations. |
| `lib/utils/` | Static methods, extensions, formatting, regex. | Stateful logic, direct database/network access. |
| `assets/videos/` | Static video assets (e.g. `loading_login.mp4`). | Never keep `.mp4` or media files in root directory. |

---

## 4. Key Configuration Templates

### 4.1. Global Constants (`lib/config/app_constants.dart`)

```dart
class AppConstants {
  AppConstants._();

  // Network Configuration
  // 10.0.2.2 is the Android emulator loopback to host machine localhost
  static const String baseUrl = 'http://10.0.2.2:8080/api/v1';
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Storage Keys
  static const String keyAccessToken = 'access_token';
  static const String keyRefreshToken = 'refresh_token';
  static const String keyUserId = 'user_id';
}
```

### 4.2. Route Handler (`lib/config/app_routes.dart`)

```dart
import 'package:flutter/material.dart';
import '../screens/auth/login_screen.dart';
import '../screens/home/home_screen.dart';

class AppRoutes {
  AppRoutes._();

  static const String initial = '/';
  static const String login = '/login';
  static const String home = '/home';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case login:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const LoginScreen(),
        );
      case home:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const HomeScreen(),
        );
      default:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => Scaffold(
            body: Center(
              child: Text('Route not found: ${settings.name}'),
            ),
          ),
        );
    }
  }
}
```

### 4.3. Assets Declaration (`pubspec.yaml`)

```yaml
flutter:
  uses-material-design: true

  assets:
    - assets/images/
    - assets/videos/
```

---

## 5. Android-Specific Directives

1. **Host-Machine API Access:**
   - For Android Emulators connecting to a local development server, always use `http://10.0.2.2:<PORT>` instead of `localhost` or `127.0.0.1`.
2. **Network Security Config:**
   - If using plain HTTP in development, ensure `android:usesCleartextTraffic="true"` is set inside `<application>` in `android/app/src/main/AndroidManifest.xml`.
3. **Redundant Platforms:**
   - Do not generate or suggest files for `ios/`, `web/`, `linux/`, `macos/`, or `windows/`.