import 'package:flutter/material.dart';

class AppLocalizations {
  final Locale locale;

  AppLocalizations(this.locale);

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static const List<Locale> supportedLocales = [
    Locale('vi', ''),
    Locale('en', ''),
  ];

  static final Map<String, Map<String, String>> _localizedValues = {
    'vi': {
      // General & Navigation
      'app_title': 'Friggy',
      'home': 'Trang chủ',
      'my_fridges': 'Tủ lạnh',
      'recipe': 'Công thức',
      'messages': 'Tin nhắn',
      'profile': 'Tài khoản',
      'search': 'Tìm kiếm...',
      'cancel': 'Hủy',
      'save': 'Lưu',
      'confirm': 'Xác nhận',
      'delete': 'Xóa',
      'edit': 'Sửa',
      'add': 'Thêm',
      'back': 'Quay lại',
      'close': 'Đóng',
      'see_all': 'Xem tất cả',
      'success': 'Thành công',
      'error': 'Lỗi',
      'loading': 'Đang tải...',

      // Settings
      'settings': 'Cài đặt',
      'notifications_reminders': 'Thông báo & Nhắc nhở',
      'app_notifications': 'Thông báo ứng dụng',
      'app_notifications_sub': 'Bật nhận tất cả thông báo đẩy',
      'weekly_shopping_reminder': 'Nhắc đi chợ hàng tuần',
      'weekly_shopping_reminder_sub': 'Cảnh báo chuẩn bị thực phẩm tuần tới',
      'expiry_alert': 'Cảnh báo hết hạn thực phẩm',
      'expiry_alert_sub': 'Thông báo trước 2 ngày khi hết hạn',
      'appearance_dark_mode': 'Giao diện & Chế độ tối',
      'dark_mode': 'Chế độ tối (Dark Mode)',
      'dark_mode_on': 'Đang bật (Giao diện tối)',
      'dark_mode_off': 'Đang tắt (Giao diện sáng)',
      'language': 'Ngôn ngữ',
      'app_language': 'Ngôn ngữ ứng dụng',
      'change': 'Đổi',
      'select_language': 'Chọn ngôn ngữ ứng dụng',
      'vietnamese': 'Tiếng Việt',
      'english': 'English',

      // User Profile
      'user_profile': 'Thông tin cá nhân',
      'personal_info': 'Thông tin cá nhân',
      'package_management': 'Gói ứng dụng của tôi',
      'change_password': 'Đổi mật khẩu',
      'logout': 'Đăng xuất',
      'free_tier': 'Gói Miễn Phí',
      'upgrade_now': 'Nâng cấp ngay',

      // My Fridges
      'add_new_fridge': 'Thêm tủ lạnh mới',
      'fridge_name': 'Tên tủ lạnh',
      'add_members': 'Thêm thành viên',
      'create_fridge': 'Tạo tủ lạnh',
      'shared_members': 'Thành viên dùng chung',
      'owner': 'Chủ tủ',
      'member': 'Thành viên',

      // Fridge Inventory & Items
      'inventory': 'Kho thực phẩm',
      'available_items': 'Thực phẩm sẵn có',
      'expiring_soon': 'Sắp hết hạn',
      'expired': 'Đã hết hạn',
      'categories': 'Danh mục',
      'add_ingredient': 'Nhập dữ liệu',
      'manual_input': 'Nhập thủ công',
      'scan_photo': 'Chụp ảnh thực phẩm',
      'scan_receipt': 'Quét hóa đơn',
      'scan_barcode': 'Quét mã vạch',

      // Auth
      'login': 'Đăng nhập',
      'register': 'Đăng ký',
      'forgot_password': 'Quên mật khẩu',
      'email_or_phone': 'Email hoặc Số điện thoại',
      'password': 'Mật khẩu',
      'confirm_password': 'Nhập lại mật khẩu',
    },
    'en': {
      // General & Navigation
      'app_title': 'Friggy',
      'home': 'Home',
      'my_fridges': 'My Fridges',
      'recipe': 'Recipes',
      'messages': 'Messages',
      'profile': 'Profile',
      'search': 'Search...',
      'cancel': 'Cancel',
      'save': 'Save',
      'confirm': 'Confirm',
      'delete': 'Delete',
      'edit': 'Edit',
      'add': 'Add',
      'back': 'Back',
      'close': 'Close',
      'see_all': 'See All',
      'success': 'Success',
      'error': 'Error',
      'loading': 'Loading...',

      // Settings
      'settings': 'Settings',
      'notifications_reminders': 'Notifications & Reminders',
      'app_notifications': 'App Notifications',
      'app_notifications_sub': 'Enable all push notifications',
      'weekly_shopping_reminder': 'Weekly Grocery Reminder',
      'weekly_shopping_reminder_sub': 'Alert to prepare food for next week',
      'expiry_alert': 'Food Expiration Alert',
      'expiry_alert_sub': 'Notify 2 days before expiration',
      'appearance_dark_mode': 'Appearance & Dark Mode',
      'dark_mode': 'Dark Mode',
      'dark_mode_on': 'Enabled (Dark theme)',
      'dark_mode_off': 'Disabled (Light theme)',
      'language': 'Language',
      'app_language': 'App Language',
      'change': 'Change',
      'select_language': 'Select App Language',
      'vietnamese': 'Tiếng Việt (Vietnamese)',
      'english': 'English',

      // User Profile
      'user_profile': 'User Profile',
      'personal_info': 'Personal Information',
      'package_management': 'My Membership Plan',
      'change_password': 'Change Password',
      'logout': 'Log Out',
      'free_tier': 'Free Plan',
      'upgrade_now': 'Upgrade Now',

      // My Fridges
      'add_new_fridge': 'Add New Fridge',
      'fridge_name': 'Fridge Name',
      'add_members': 'Add Members',
      'create_fridge': 'Create Fridge',
      'shared_members': 'Shared Members',
      'owner': 'Owner',
      'member': 'Member',

      // Fridge Inventory & Items
      'inventory': 'Inventory',
      'available_items': 'Available Food',
      'expiring_soon': 'Expiring Soon',
      'expired': 'Expired',
      'categories': 'Categories',
      'add_ingredient': 'Input Data',
      'manual_input': 'Manual Input',
      'scan_photo': 'Scan Food Photo',
      'scan_receipt': 'Scan Receipt',
      'scan_barcode': 'Scan Barcode',

      // Auth
      'login': 'Log In',
      'register': 'Register',
      'forgot_password': 'Forgot Password',
      'email_or_phone': 'Email or Phone Number',
      'password': 'Password',
      'confirm_password': 'Confirm Password',
    },
  };

  String translate(String key) {
    return _localizedValues[locale.languageCode]?[key] ??
        _localizedValues['en']?[key] ??
        _localizedValues['vi']?[key] ??
        key;
  }

  // Getters
  String get appTitle => translate('app_title');
  String get home => translate('home');
  String get myFridges => translate('my_fridges');
  String get recipe => translate('recipe');
  String get messages => translate('messages');
  String get profile => translate('profile');
  String get search => translate('search');
  String get cancel => translate('cancel');
  String get save => translate('save');
  String get confirm => translate('confirm');
  String get delete => translate('delete');
  String get edit => translate('edit');
  String get add => translate('add');
  String get back => translate('back');
  String get close => translate('close');
  String get seeAll => translate('see_all');

  String get settings => translate('settings');
  String get notificationsReminders => translate('notifications_reminders');
  String get appNotifications => translate('app_notifications');
  String get appNotificationsSub => translate('app_notifications_sub');
  String get weeklyShoppingReminder => translate('weekly_shopping_reminder');
  String get weeklyShoppingReminderSub => translate('weekly_shopping_reminder_sub');
  String get expiryAlert => translate('expiry_alert');
  String get expiryAlertSub => translate('expiry_alert_sub');
  String get appearanceDarkMode => translate('appearance_dark_mode');
  String get darkMode => translate('dark_mode');
  String get darkModeOn => translate('dark_mode_on');
  String get darkModeOff => translate('dark_mode_off');
  String get language => translate('language');
  String get appLanguage => translate('app_language');
  String get change => translate('change');
  String get selectLanguage => translate('select_language');

  String get userProfile => translate('user_profile');
  String get personalInfo => translate('personal_info');
  String get packageManagement => translate('package_management');
  String get changePassword => translate('change_password');
  String get logout => translate('logout');
  String get freeTier => translate('free_tier');
  String get upgradeNow => translate('upgrade_now');

  String get addNewFridge => translate('add_new_fridge');
  String get fridgeName => translate('fridge_name');
  String get addMembers => translate('add_members');
  String get createFridge => translate('create_fridge');
  String get sharedMembers => translate('shared_members');
  String get owner => translate('owner');
  String get member => translate('member');

  String get inventory => translate('inventory');
  String get availableItems => translate('available_items');
  String get expiringSoon => translate('expiring_soon');
  String get expired => translate('expired');
  String get categories => translate('categories');
  String get addIngredient => translate('add_ingredient');
  String get manualInput => translate('manual_input');
  String get scanPhoto => translate('scan_photo');
  String get scanReceipt => translate('scan_receipt');
  String get scanBarcode => translate('scan_barcode');

  String get login => translate('login');
  String get register => translate('register');
  String get forgotPassword => translate('forgot_password');
  String get emailOrPhone => translate('email_or_phone');
  String get password => translate('password');
  String get confirmPassword => translate('confirm_password');
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return ['vi', 'en'].contains(locale.languageCode);
  }

  @override
  Future<AppLocalizations> load(Locale locale) async => AppLocalizations(locale);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}
