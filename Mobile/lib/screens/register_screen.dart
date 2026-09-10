import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/mock_user_data.dart';
import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/social_button.dart';
import 'login_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  bool _isObscurePassword = true;
  bool _isObscureConfirmPassword = true;

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  int _calculatePasswordStrength(String password) {
    if (password.isEmpty) return 0;
    int score = 0;
    if (password.length >= 6) score++;
    if (password.contains(RegExp(r'[A-Z]')) || password.contains(RegExp(r'[0-9]'))) score++;
    if (password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]')) && password.length >= 8) score++;
    return score.clamp(1, 3);
  }

  String _getPasswordStrengthLabel(int score) {
    switch (score) {
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Strong';
      default:
        return '';
    }
  }

  Color _getPasswordStrengthColor(int score) {
    switch (score) {
      case 1:
        return const Color(0xFFE53935);
      case 2:
        return const Color(0xFF19221C);
      case 3:
        return AppColors.primary;
      default:
        return const Color(0xFFE2E8E4);
    }
  }

  Widget _buildPasswordStrengthMeter() {
    String password = _passwordController.text;
    int strength = _calculatePasswordStrength(password);
    String label = _getPasswordStrengthLabel(strength);
    Color color = _getPasswordStrengthColor(strength);

    if (password.isEmpty) return const SizedBox(height: 10);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Row(
          children: List.generate(3, (index) {
            bool isFilled = index < strength;
            return Expanded(
              child: Container(
                height: 4,
                margin: EdgeInsets.only(right: index < 2 ? 6 : 0),
                decoration: BoxDecoration(
                  color: isFilled ? color : const Color(0xFFE2E8E4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 10),
      ],
    );
  }

  void _navigateToLogin(BuildContext context) {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 400),
        pageBuilder: (context, animation, secondaryAnimation) =>
            const LoginScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          final curvedAnimation = CurvedAnimation(
            parent: animation,
            curve: Curves.easeOutCubic,
          );
          return SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(-1.0, 0.0), // Slide in from left to right
              end: Offset.zero,
            ).animate(curvedAnimation),
            child: FadeTransition(
              opacity: curvedAnimation,
              child: child,
            ),
          );
        },
      ),
    );
  }

  void _handleRegister() {
    if (_formKey.currentState?.validate() ?? false) {
      UserRepository.registerUser(
        fullName: _fullNameController.text.trim(),
        emailOrPhone: _emailController.text.trim(),
        password: _passwordController.text,
      );

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Account created successfully! You can now log in.',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          backgroundColor: AppColors.primary,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );

      // Navigate back to Login Screen (slides left to right)
      _navigateToLogin(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';
    final mediaQuery = MediaQuery.of(context);
    final screenHeight = mediaQuery.size.height;
    final topPadding = mediaQuery.padding.top;
    final topHeaderHeight = screenHeight * 0.27 + topPadding;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0E1611) : AppColors.accentGreen,
      resizeToAvoidBottomInset: false,
      body: SafeArea(
        top: false,
        bottom: false,
        child: SingleChildScrollView(
          physics: const NeverScrollableScrollPhysics(),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              // 1. Top Curved Decorative Background
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: topHeaderHeight + 60,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: isDark
                          ? const [
                              Color(0xFF0E1611),
                              Color(0xFF142017),
                              Color(0xFF1B2E21),
                            ]
                          : const [
                              Color(0xFFFFFFFF),
                              Color(0xFFF5FCF4),
                              Color(0xFFC7EFC2),
                              Color(0xFF86D978),
                            ],
                      stops: isDark
                          ? const [0.0, 0.5, 1.0]
                          : const [0.0, 0.3, 0.7, 1.0],
                    ),
                  ),
                ),
              ),

              // 2. Mascot Header Image
              Positioned(
                top: topPadding + 52,
                right: 0,
                width: 193,
                height: topHeaderHeight - 60,
                child: Image.asset(
                  'assets/images/mascot_login.png',
                  fit: BoxFit.contain,
                ),
              ),

              // 3. Top-Left App Title "< Friggy"
              Positioned(
                top: topPadding + 12,
                left: 16,
                child: GestureDetector(
                  onTap: () => _navigateToLogin(context),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.arrow_back_ios_new_rounded,
                          color: isDark ? Colors.white : AppColors.textPrimary,
                          size: 18,
                        ),
                        const SizedBox(width: 4),
                        RichText(
                          text: TextSpan(
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                            ),
                            children: [
                              TextSpan(
                                text: 'Fri',
                                style: TextStyle(
                                  color: isDark ? Colors.white : AppColors.textPrimary,
                                ),
                              ),
                              TextSpan(
                                text: 'ggy',
                                style: TextStyle(
                                  color: isDark ? const Color(0xFF81C784) : AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // 4. Bottom Card Container
              Container(
                margin: EdgeInsets.only(top: topHeaderHeight),
                width: double.infinity,
                constraints: BoxConstraints(
                  minHeight: screenHeight - topHeaderHeight + 100,
                ),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0E1611) : Colors.white,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(36),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.12),
                      blurRadius: 16,
                      offset: const Offset(0, -6),
                    ),
                  ],
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 28,
                  vertical: 24,
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title
                      Text(
                        isEn ? 'Create Account' : 'Tạo tài khoản',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 30,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : AppColors.textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 14),

                      // 1. Full Name Input Field
                      CustomTextField(
                        controller: _fullNameController,
                        hintText: isEn ? 'Full Name' : 'Họ và tên',
                        prefixIcon: Icons.person_outline_rounded,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return isEn ? 'Please enter your full name' : 'Vui lòng nhập họ và tên của bạn';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 10),

                      // 2. Email or Phone Input Field
                      CustomTextField(
                        controller: _emailController,
                        hintText: isEn ? 'Email or Phone Number' : 'Email hoặc Số điện thoại',
                        prefixIcon: Icons.email_outlined,
                        keyboardType: TextInputType.emailAddress,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return isEn ? 'Please enter email or phone number' : 'Vui lòng nhập email hoặc số điện thoại';
                          }
                          final input = value.trim();

                          final isNumeric = RegExp(r'^[0-9]+$').hasMatch(input);
                          if (isNumeric) {
                            if (input.length != 10) {
                              return isEn ? 'Phone number must be 10 digits' : 'Số điện thoại phải bao gồm đúng 10 chữ số';
                            }
                          } else {
                            final isEmailValid = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$').hasMatch(input);
                            if (!isEmailValid || !input.toLowerCase().contains('@')) {
                              return isEn ? 'Please enter a valid email' : 'Vui lòng nhập địa chỉ email hợp lệ (vd: example@gmail.com)';
                            }
                            if (!input.toLowerCase().endsWith('@gmail.com')) {
                              return isEn ? 'Email must end with @gmail.com' : 'Email phải kết thúc bằng @gmail.com';
                            }
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 10),

                      // 3. Password Input Field
                      CustomTextField(
                        controller: _passwordController,
                        hintText: isEn ? 'Password' : 'Mật khẩu',
                        prefixIcon: Icons.lock_outline_rounded,
                        obscureText: _isObscurePassword,
                        onChanged: (val) => setState(() {}),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _isObscurePassword
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                            color: isDark ? const Color(0xFF9DA8A0) : AppColors.hintText,
                            size: 22,
                          ),
                          onPressed: () {
                            setState(() {
                              _isObscurePassword = !_isObscurePassword;
                            });
                          },
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return isEn ? 'Please enter password' : 'Vui lòng nhập mật khẩu';
                          }
                          if (value.length < 6) {
                            return isEn ? 'Password must be at least 6 characters' : 'Mật khẩu phải có ít nhất 6 ký tự';
                          }
                          return null;
                        },
                      ),

                      // 3-Segment Password Strength Indicator
                      _buildPasswordStrengthMeter(),

                      // 4. Confirm Password Input Field
                      CustomTextField(
                        controller: _confirmPasswordController,
                        hintText: isEn ? 'Confirm Password' : 'Xác nhận mật khẩu',
                        prefixIcon: Icons.lock_outline_rounded,
                        obscureText: _isObscureConfirmPassword,
                        suffixIcon: IconButton(
                          icon: Icon(
                            _isObscureConfirmPassword
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                            color: isDark ? const Color(0xFF9DA8A0) : AppColors.hintText,
                            size: 22,
                          ),
                          onPressed: () {
                            setState(() {
                              _isObscureConfirmPassword =
                                  !_isObscureConfirmPassword;
                            });
                          },
                        ),
                        validator: (value) {
                          if (value != _passwordController.text) {
                            return isEn ? 'Confirm password does not match' : 'Mật khẩu xác nhận không khớp';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 18),

                      // 6. Main Sign Up Button
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: ElevatedButton(
                          onPressed: _handleRegister,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            elevation: 2,
                            shadowColor: AppColors.primary.withValues(alpha: 0.3),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(28),
                            ),
                          ),
                          child: Text(
                            isEn ? 'Register' : 'Đăng ký',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // 7. Social Login Divider ("Or Sign Up With")
                      Row(
                        children: [
                          Expanded(
                            child: Divider(
                              color: isDark
                                  ? const Color(0xFF2E4D36)
                                  : const Color(0xFFE8ECE9),
                              thickness: 1,
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              isEn ? 'Or register with' : 'Hoặc đăng ký bằng',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: isDark ? const Color(0xFF9DA8A0) : AppColors.hintText,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Divider(
                              color: isDark
                                  ? const Color(0xFF2E4D36)
                                  : const Color(0xFFE8ECE9),
                              thickness: 1,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // 8. Social Buttons
                      Row(
                        children: [
                          SocialButton(
                            type: SocialType.google,
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(isEn ? 'Selected Google Register' : 'Đã chọn đăng ký bằng Google'),
                                ),
                              );
                            },
                          ),
                          const SizedBox(width: 16),
                          SocialButton(
                            type: SocialType.apple,
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(isEn ? 'Selected Apple Register' : 'Đã chọn đăng ký bằng Apple'),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      // 9. Footer Link: "Already have an account? Log In"
                      Center(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              isEn ? 'Already have an account? ' : 'Bạn đã có tài khoản? ',
                              style: TextStyle(
                                fontSize: 14,
                                color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF6B786F),
                              ),
                            ),
                            GestureDetector(
                              onTap: () => _navigateToLogin(context),
                              child: Text(
                                isEn ? 'Log In' : 'Đăng nhập',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? const Color(0xFF81C784) : AppColors.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
