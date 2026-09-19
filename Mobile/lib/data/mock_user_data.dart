class UserModel {
  final String fullName;
  final String emailOrPhone;
  final String password;
  final String role;

  UserModel({
    required this.fullName,
    required this.emailOrPhone,
    required this.password,
    this.role = 'user',
  });
}

class UserRepository {
  // Default mock user data initialized on app start
  static final List<UserModel> _initialUsers = [
    UserModel(
      fullName: 'Trần Quốc Lâm',
      emailOrPhone: '0854340045',
      password: '123456',
    ),
    UserModel(
      fullName: 'Trần Quốc Lâm',
      emailOrPhone: 'tqlam150504@gmail.com',
      password: '123456',
    ),
  ];

  // In-memory runtime user storage
  static final List<UserModel> _users = List.from(_initialUsers);

  /// Get current registered users list
  static List<UserModel> get users => List.unmodifiable(_users);

  /// Register a new user during app session (persisted in memory)
  static void registerUser({
    required String fullName,
    required String emailOrPhone,
    required String password,
  }) {
    _users.add(
      UserModel(
        fullName: fullName.trim(),
        emailOrPhone: emailOrPhone.trim(),
        password: password,
      ),
    );
  }

  /// Authenticate login credentials
  static bool authenticateUser(String emailOrPhone, String password) {
    final cleanInput = emailOrPhone.trim();
    return _users.any((u) =>
        (u.emailOrPhone.toLowerCase() == cleanInput.toLowerCase() ||
            u.emailOrPhone == cleanInput) &&
        u.password == password);
  }

  /// Check if user exists by email/phone
  static bool userExists(String emailOrPhone) {
    final cleanInput = emailOrPhone.trim();
    return _users.any((u) =>
        u.emailOrPhone.toLowerCase() == cleanInput.toLowerCase() ||
        u.emailOrPhone == cleanInput);
  }

  /// Find user by email or phone
  static UserModel? findUser(String emailOrPhone) {
    final cleanInput = emailOrPhone.trim();
    try {
      return _users.firstWhere((u) =>
          u.emailOrPhone.toLowerCase() == cleanInput.toLowerCase() ||
          u.emailOrPhone == cleanInput);
    } catch (_) {
      return null;
    }
  }

  /// Reset to initial default state
  static void resetToDefault() {
    _users.clear();
    _users.addAll(_initialUsers);
  }
}
