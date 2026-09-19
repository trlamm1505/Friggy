import 'package:flutter/material.dart';
import '../screens/login_screen.dart';
import '../data/local/storage_service.dart';

class NavigationService {
  NavigationService._();

  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  /// Clears local authentication session and redirects user to LoginScreen.
  static Future<void> navigateToLoginAndClearSession() async {
    try {
      final storage = await StorageService.getInstance();
      await storage.clearSession();
      debugPrint('[NavigationService] Session cleared automatically due to auth expiration.');
    } catch (e) {
      debugPrint('[NavigationService] Error clearing session: $e');
    }

    final currentState = navigatorKey.currentState;
    if (currentState != null) {
      currentState.pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }
}
