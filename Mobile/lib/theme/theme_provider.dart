import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeProvider extends ChangeNotifier {
  static const String _themePrefKey = 'theme_mode';
  ThemeMode _themeMode = ThemeMode.light;

  ThemeProvider({ThemeMode? initialTheme}) {
    if (initialTheme != null) {
      _themeMode = initialTheme;
    }
  }

  ThemeMode get themeMode => _themeMode;

  bool get isDarkMode => _themeMode == ThemeMode.dark;

  /// Loads saved theme mode from SharedPreferences
  static Future<ThemeMode> loadSavedThemeMode() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? savedTheme = prefs.getString(_themePrefKey);

      if (savedTheme == 'dark') {
        return ThemeMode.dark;
      } else if (savedTheme == 'light') {
        return ThemeMode.light;
      } else if (savedTheme == 'system') {
        return ThemeMode.system;
      }
    } catch (_) {
      // Fallback to light mode on error
    }

    return ThemeMode.light;
  }

  /// Sets the theme mode and persists it locally
  Future<void> setThemeMode(ThemeMode mode) async {
    if (_themeMode == mode) return;

    _themeMode = mode;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      switch (mode) {
        case ThemeMode.dark:
          await prefs.setString(_themePrefKey, 'dark');
          break;
        case ThemeMode.light:
          await prefs.setString(_themePrefKey, 'light');
          break;
        case ThemeMode.system:
          await prefs.setString(_themePrefKey, 'system');
          break;
      }
    } catch (_) {}
  }

  /// Toggles between light and dark modes
  Future<void> toggleDarkMode(bool isDark) async {
    await setThemeMode(isDark ? ThemeMode.dark : ThemeMode.light);
  }
}
