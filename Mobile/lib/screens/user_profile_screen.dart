import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../l10n/app_localizations.dart';
import 'login_screen.dart';
import 'personal_info_screen.dart';
import 'change_password_screen.dart';
import 'app_settings_screen.dart';
import 'package:friggy/screens/package_management_screen.dart';

class UserProfileScreen extends StatefulWidget {
  const UserProfileScreen({super.key});

  @override
  State<UserProfileScreen> createState() => _UserProfileScreenState();
}

class _UserProfileScreenState extends State<UserProfileScreen> {
  void _performLogout() {
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);

    final nameColor = isDark ? Colors.white : const Color(0xFF006428);
    final emailColor = isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32);
    final sectionTitleColor = isDark ? const Color(0xFF81C784) : const Color(0xFF006428);
    final cardBg = isDark ? const Color(0xFF19271E) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C);
    final defaultTitleColor = isDark ? Colors.white : const Color(0xFF19221C);
    final defaultIconBg = isDark ? const Color(0xFF233629) : const Color(0xFFE8F5E9);
    final defaultIconColor = isDark ? const Color(0xFF81C784) : const Color(0xFF006428);

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 28),

          // 2. User Avatar & Info Section
          Center(
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(5),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFF4CAF50),
                      width: 3.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.1),
                        blurRadius: 14,
                        offset: const Offset(0, 5),
                      ),
                    ],
                  ),
                  child: CircleAvatar(
                    radius: 58,
                    backgroundColor: defaultIconBg,
                    backgroundImage:
                        const AssetImage('assets/images/cute_mascot.png'),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Trần Quốc Lâm',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: nameColor,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'lam.tran@friggy.app',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: emailColor,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // 3. Subscription Package Card
          GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const PackageManagementScreen(),
                ),
              );
            },
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(26),
                border: isDark
                    ? Border.all(
                        color: const Color(0xFF2E4D36),
                        width: 1.2,
                      )
                    : null,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: isDark
                      ? const [
                          Color(0xFF1E3A25),
                          Color(0xFF142017),
                          Color(0xFF192C1E),
                        ]
                      : const [
                          Color(0xFF7CB342),
                          Color(0xFF8BC34A),
                          Color(0xFFC0CA33),
                        ],
                  stops: isDark ? const [0.0, 0.5, 1.0] : const [0.0, 0.5, 1.0],
                ),
                boxShadow: [
                  BoxShadow(
                    color: isDark
                        ? Colors.black.withValues(alpha: 0.25)
                        : const Color(0xFF7CB342).withValues(alpha: 0.3),
                    blurRadius: 14,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: Color(0xFFFFB74D),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.star_rounded,
                                color: Colors.white,
                                size: 14,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              loc?.locale.languageCode == 'en' ? 'PREMIUM PLAN' : 'GÓI CAO CẤP',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                color: isDark ? const Color(0xFFFFB74D) : Colors.white,
                                letterSpacing: 0.6,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        Text(
                          loc?.locale.languageCode == 'en' ? 'Personal Plan' : 'Gói Cá Nhân',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            height: 1.1,
                          ),
                        ),
                        const SizedBox(height: 4),

                        Text(
                          loc?.locale.languageCode == 'en' ? 'Expires in 12/2024' : 'Hết hạn vào 12/2024',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            color: isDark ? const Color(0xFFD0D7D1) : Colors.white.withValues(alpha: 0.95),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 12),

                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: isDark
                          ? const Color(0xFF233629)
                          : const Color(0xFF8BC34A).withValues(alpha: 0.85),
                      borderRadius: BorderRadius.circular(30),
                      border: Border.all(
                        color: isDark
                            ? const Color(0xFF81C784)
                            : Colors.white.withValues(alpha: 0.4),
                        width: 1.2,
                      ),
                    ),
                    child: Text(
                      loc?.locale.languageCode == 'en' ? 'Manage Plan' : 'Quản lý gói',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: isDark ? const Color(0xFF81C784) : Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 28),

          // 4. Account Settings Menu List Section
          Text(
            loc?.locale.languageCode == 'en' ? 'Account & Settings' : 'Tài khoản & Ứng dụng',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: sectionTitleColor,
            ),
          ),
          const SizedBox(height: 12),

          Container(
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: cardBorder,
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              children: [
                // 1. Personal Info
                _buildMenuItem(
                  icon: Icons.person_outline_rounded,
                  title: loc?.personalInfo ?? 'Thông tin cá nhân',
                  titleColor: defaultTitleColor,
                  iconColor: defaultIconColor,
                  iconBgColor: defaultIconBg,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const PersonalInfoScreen(),
                      ),
                    );
                  },
                ),
                _buildDivider(isDark),

                // 2. Change Password
                _buildMenuItem(
                  icon: Icons.lock_outline_rounded,
                  title: loc?.changePassword ?? 'Đổi mật khẩu',
                  titleColor: defaultTitleColor,
                  iconColor: defaultIconColor,
                  iconBgColor: defaultIconBg,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const ChangePasswordScreen(),
                      ),
                    );
                  },
                ),
                _buildDivider(isDark),

                // 3. Settings
                _buildMenuItem(
                  icon: Icons.settings_outlined,
                  title: loc?.settings ?? 'Cài đặt',
                  titleColor: defaultTitleColor,
                  iconColor: defaultIconColor,
                  iconBgColor: defaultIconBg,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const AppSettingsScreen(),
                      ),
                    );
                  },
                ),
                _buildDivider(isDark),

                // 4. Logout
                _buildMenuItem(
                  icon: Icons.logout_rounded,
                  title: loc?.logout ?? 'Đăng xuất',
                  titleColor: const Color(0xFFD32F2F),
                  iconColor: const Color(0xFFD32F2F),
                  iconBgColor: isDark ? const Color(0xFF4A1F1F) : const Color(0xFFFFEBEE),
                  showChevron: false,
                  onTap: _performLogout,
                ),
              ],
            ),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildDivider(bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      height: 1,
      color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFE8F5E9),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    String? subtitle,
    Color titleColor = const Color(0xFF19221C),
    Color subtitleColor = const Color(0xFF757575),
    Color iconColor = const Color(0xFF006428),
    Color iconBgColor = const Color(0xFFE8F5E9),
    bool showChevron = true,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: iconBgColor,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Icon(icon, color: iconColor, size: 22),
      ),
      title: Text(
        title,
        style: GoogleFonts.plusJakartaSans(
          fontSize: 15,
          fontWeight: FontWeight.w700,
          color: titleColor,
        ),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12.5,
                color: subtitleColor,
              ),
            )
          : null,
      trailing: showChevron
          ? const Icon(
              Icons.chevron_right_rounded,
              color: Color(0xFF757575),
              size: 20,
            )
          : null,
    );
  }
}
