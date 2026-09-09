import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Primary Green Color Palette - Matched exactly to header green
  static const Color primary = Color(0xFF4CAF50);      // Vibrant header green
  static const Color primaryDark = Color(0xFF2E7D32);  // Darker green for press state
  static const Color primaryLight = Color(0xFF81C784); // Light fresh green for badges/subtitles
  static const Color accentGreen = Color(0xFFE8F5E9);  // Soft green background tint

  // Dark Mode Colors (for Splash & Hero section)
  static const Color darkBackground = Color(0xFF0E1611); // Deep dark radial background
  static const Color darkSurface = Color(0xFF16231A);    // Card overlay dark tint
  static const Color darkCardBg = Color(0xFF19271E);
  static const Color darkCardBorder = Color(0xFF2E4D36);
  static const Color darkTextPrimary = Color(0xFFFFFFFF);
  static const Color darkTextSecondary = Color(0xFF9DA8A0);
  static const Color darkIconBg = Color(0xFF233629);

  // Light Mode Colors (for Login Card & Form)
  static const Color lightBackground = Color(0xFFF9FAFA);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightCardBg = Colors.white;
  static const Color lightCardBorder = Color(0xFFA5E69C);
  static const Color textPrimary = Color(0xFF19221C);
  static const Color textSecondary = Color(0xFF6B786F);
  static const Color border = Color(0xFFE3E8E4);
  static const Color inputBackground = Color(0xFFF4F7F4);
  static const Color hintText = Color(0xFF9DA8A0);

  // Social & System Colors
  static const Color googleRed = Color(0xFFEA4335);
  static const Color appleBlack = Color(0xFF000000);
  static const Color error = Color(0xFFE53935);
}

class AppGradients {
  static const LinearGradient lightBackground = LinearGradient(
    colors: [
      Color(0xFFFFFFFF),
      Color(0xFFF5FCF4),
      Color(0xFFC7EFC2),
      Color(0xFF86D978),
      Color(0xFF4CB93E),
    ],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    stops: [0.0, 0.24, 0.42, 0.72, 1.0],
  );

  static const LinearGradient darkBackground = LinearGradient(
    colors: [
      Color(0xFF0E1611),
      Color(0xFF142017),
      Color(0xFF1B2E21),
      Color(0xFF1E3A25),
      Color(0xFF162A1B),
    ],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    stops: [0.0, 0.24, 0.42, 0.72, 1.0],
  );

  static LinearGradient getBackground(bool isDark) {
    return isDark ? darkBackground : lightBackground;
  }
}

extension ThemeContextExtension on BuildContext {
  bool get isDarkMode => Theme.of(this).brightness == Brightness.dark;

  Color get cardBgColor => isDarkMode ? AppColors.darkCardBg : AppColors.lightCardBg;
  Color get cardBorderColor => isDarkMode ? AppColors.darkCardBorder : AppColors.lightCardBorder;
  Color get textPrimaryColor => isDarkMode ? AppColors.darkTextPrimary : AppColors.textPrimary;
  Color get textSecondaryColor => isDarkMode ? AppColors.darkTextSecondary : AppColors.textSecondary;
  Color get headerGreenColor => isDarkMode ? AppColors.primaryLight : const Color(0xFF006428);
  Color get iconContainerBg => isDarkMode ? AppColors.darkIconBg : AppColors.accentGreen;
  LinearGradient get mainBackgroundGradient => AppGradients.getBackground(isDarkMode);
}

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.lightBackground,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.primaryLight,
        surface: AppColors.lightSurface,
        onPrimary: Colors.white,
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
          statusBarBrightness: Brightness.light,
          systemNavigationBarColor: Colors.transparent,
          systemNavigationBarDividerColor: Colors.transparent,
          systemNavigationBarIconBrightness: Brightness.dark,
        ),
        iconTheme: IconThemeData(color: AppColors.textPrimary),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.darkBackground,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.primaryLight,
        surface: AppColors.darkSurface,
        onPrimary: Colors.white,
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(
        ThemeData.dark().textTheme,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
          statusBarBrightness: Brightness.dark,
          systemNavigationBarColor: Colors.transparent,
          systemNavigationBarDividerColor: Colors.transparent,
          systemNavigationBarIconBrightness: Brightness.light,
        ),
        iconTheme: IconThemeData(color: AppColors.darkTextPrimary),
      ),
    );
  }
}
