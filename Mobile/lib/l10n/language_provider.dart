import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LanguageProvider extends ChangeNotifier {
  static const String _prefKey = 'language_code';

  Locale _locale;

  LanguageProvider({Locale? initialLocale})
      : _locale = initialLocale ?? const Locale('vi');

  Locale get locale => _locale;

  String get currentLanguageName {
    switch (_locale.languageCode) {
      case 'en':
        return 'English';
      case 'vi':
      default:
        return 'Tiếng Việt';
    }
  }

  /// Load initial locale from SharedPreferences
  static Future<Locale> loadSavedLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final String? languageCode = prefs.getString(_prefKey);
    if (languageCode != null && languageCode.isNotEmpty) {
      return Locale(languageCode);
    }
    return const Locale('vi');
  }

  /// Change current locale and persist choice to SharedPreferences
  Future<void> setLocale(Locale newLocale) async {
    if (_locale.languageCode == newLocale.languageCode) return;

    _locale = newLocale;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKey, newLocale.languageCode);
  }

  /// Convenience toggle between Vietnamese and English
  Future<void> toggleLanguage() async {
    if (_locale.languageCode == 'vi') {
      await setLocale(const Locale('en'));
    } else {
      await setLocale(const Locale('vi'));
    }
  }
}
