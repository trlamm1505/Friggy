class AppConstants {
  AppConstants._();

  // Network Configuration
  // 10.0.2.2 is the Android emulator loopback to host machine localhost
  static const String baseUrl = 'http://10.0.2.2:6969/api/v1';
  static const String googleClientId = '302076463841-itoefla7rlbl9rgadphcodev7poj62rn.apps.googleusercontent.com';
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Storage Keys
  static const String keyAccessToken = 'access_token';
  static const String keyRefreshToken = 'refresh_token';
  static const String keyUserId = 'user_id';
  static const String keyUserData = 'user_data';

  // API Endpoints - Auth & Users
  static const String epAuthGoogle = '/auth/google';
  static const String epAuthPhoneSendOtp = '/auth/phone/send-otp';
  static const String epAuthPhoneVerify = '/auth/phone/verify';
  static const String epAuthRefreshToken = '/auth/refresh';
  static const String epAuthLogout = '/auth/logout';
  
  static const String epUsersMe = '/users/me';
  static const String epUsersProfile = '/users/me/profile';
  static const String epUsersAvatar = '/users/me/avatar';
  static const String epUsersPreferences = '/users/me/preferences';
  static const String epUsersAllergies = '/users/me/allergies';
  static const String epUsersAiUsage = '/users/me/ai-usage';
  static const String epUsersNotificationSettings = '/users/me/notification-settings';
  static const String epUsersOnboarding = '/users/me/onboarding';

  static const String epIngredients = '/ingredients';
  static const String epIngredientCategories = '/ingredients/categories';
  
  static const String epFridgeItems = '/fridge/items';
  static const String epFridgeScan = '/fridge/scan';

  static const String epRecipes = '/recipes';
  static const String epRecipeDetail = '/recipes'; // + /{id}
  
  static const String epWeeklyPlans = '/weekly-plans';
  static const String epChatSessions = '/chat/sessions';

  // Subscriptions APIs
  static const String epSubscriptionsPlans = '/subscriptions/plans';
  static const String epSubscriptionsMe = '/subscriptions/me';
  static const String epSubscriptionsSubscribe = '/subscriptions/subscribe';
  static const String epSubscriptionsWebhook = '/subscriptions/webhook';

  // Notifications APIs
  static const String epNotifications = '/notifications';
  static const String epNotificationsUnreadCount = '/notifications/unread-count';
  static const String epNotificationsReadAll = '/notifications/read-all';
}
