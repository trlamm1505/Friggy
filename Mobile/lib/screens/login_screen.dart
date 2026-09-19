import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/services/api_service.dart';
import '../data/services/auth_service.dart';
import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/social_button.dart';
import 'forgot_password_screen.dart';
import 'login_success_video_screen.dart';
import 'register_screen.dart';
import 'splash_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _isObscurePassword = true;
  bool _keepMeSignedIn = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  String _formatPhone(String input) {
    final clean = input.trim().replaceAll(RegExp(r'\s+'), '');
    if (clean.startsWith('0')) {
      return '+84${clean.substring(1)}';
    }
    if (!clean.startsWith('+')) {
      return '+84$clean';
    }
    return clean;
  }

  void _handleLogin() async {
    if (_formKey.currentState?.validate() ?? false) {
      final rawInput = _phoneController.text.trim();
      final formattedPhone = _formatPhone(rawInput);

      setState(() => _isLoading = true);

      try {
        // Send OTP to user's phone via Backend API
        await ApiService().sendPhoneOtp(formattedPhone);

        if (!mounted) return;
        setState(() => _isLoading = false);

        // Prompt modal for 6-digit OTP verification & Login
        _showOtpVerificationModal(formattedPhone);
      } catch (e) {
        if (!mounted) return;
        setState(() => _isLoading = false);
        final errorMsg = e.toString().replaceAll('ApiException: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    errorMsg,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  void _showOtpVerificationModal(String phone) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';
    final otpController = TextEditingController();
    bool isVerifying = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF19271E) : Colors.white,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFE2E8E4),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      isEn ? 'Enter OTP Code' : 'Nhập mã OTP',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: isDark ? Colors.white : AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      isEn
                          ? '6-digit verification OTP code was sent to $phone'
                          : 'Mã OTP 6 chữ số đã được gửi đến $phone',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? const Color(0xFFD0D7D1) : const Color(0xFF6B786F),
                      ),
                    ),
                    const SizedBox(height: 20),
                    CustomTextField(
                      controller: otpController,
                      hintText: isEn ? 'Enter 6-digit OTP (e.g. 123456)' : 'Nhập mã OTP 6 chữ số (VD: 123456)',
                      prefixIcon: Icons.security_rounded,
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: isVerifying
                            ? null
                            : () async {
                                final otp = otpController.text.trim();
                                if (otp.length != 6) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(isEn ? 'OTP must be 6 digits' : 'Mã OTP phải đúng 6 chữ số'),
                                      backgroundColor: AppColors.error,
                                      behavior: SnackBarBehavior.floating,
                                    ),
                                  );
                                  return;
                                }

                                setModalState(() => isVerifying = true);

                                final success = await AuthService().verifyPhoneOtpAndLogin(
                                  context,
                                  phone,
                                  otp,
                                );

                                if (context.mounted) {
                                  setModalState(() => isVerifying = false);
                                  if (success) {
                                    Navigator.pop(context); // close modal
                                    Navigator.of(context).pushReplacement(
                                      PageRouteBuilder(
                                        transitionDuration: const Duration(milliseconds: 500),
                                        pageBuilder: (context, animation, secondaryAnimation) =>
                                            const LoginSuccessVideoScreen(),
                                        transitionsBuilder: (context, animation, secondaryAnimation, child) {
                                          return FadeTransition(
                                            opacity: CurvedAnimation(
                                              parent: animation,
                                              curve: Curves.easeInOut,
                                            ),
                                            child: child,
                                          );
                                        },
                                      ),
                                    );
                                  }
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(24),
                          ),
                        ),
                        child: isVerifying
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : Text(
                                isEn ? 'Verify & Log In' : 'Xác nhận & Đăng nhập',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';
    final mediaQuery = MediaQuery.of(context);
    final screenHeight = mediaQuery.size.height;
    final topPadding = mediaQuery.padding.top;
    final topHeaderHeight = screenHeight * 0.35 + topPadding;

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
                top: topPadding + 55,
                right: 0,
                width: 260,
                height: topHeaderHeight - 35,
                child: Image.asset(
                  'assets/images/mascot_login.png',
                  fit: BoxFit.contain,
                ),
              ),

              // 3. Top Left Back Button + Brand Logo
              Positioned(
                top: topPadding + 12,
                left: 16,
                child: GestureDetector(
                  onTap: () {
                    Navigator.of(context).pushReplacement(
                      PageRouteBuilder(
                        transitionDuration: const Duration(milliseconds: 400),
                        pageBuilder: (context, animation, secondaryAnimation) =>
                            const SplashScreen(),
                        transitionsBuilder: (context, animation, secondaryAnimation, child) {
                          final curvedAnimation = CurvedAnimation(
                            parent: animation,
                            curve: Curves.easeOutCubic,
                          );
                          return SlideTransition(
                            position: Tween<Offset>(
                              begin: const Offset(-1.0, 0.0),
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
                  },
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
                  minHeight: screenHeight - topHeaderHeight + 150,
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
                  vertical: 28,
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title
                      Text(
                        isEn ? 'Welcome Back' : 'Chào mừng trở lại',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 30,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : AppColors.textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Phone Number Input Field
                      CustomTextField(
                        controller: _phoneController,
                        hintText: isEn ? 'Phone Number' : 'Số điện thoại',
                        prefixIcon: Icons.phone_android_outlined,
                        keyboardType: TextInputType.phone,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return isEn ? 'Please enter phone number' : 'Vui lòng nhập số điện thoại';
                          }
                          final input = value.trim();
                          final isNumeric = RegExp(r'^[0-9]+$').hasMatch(input);
                          if (!isNumeric || input.length != 10) {
                            return isEn ? 'Phone number must be exactly 10 digits' : 'Số điện thoại phải bao gồm đúng 10 chữ số';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),

                      // Password Input Field
                      CustomTextField(
                        controller: _passwordController,
                        hintText: isEn ? 'Password' : 'Mật khẩu',
                        prefixIcon: Icons.lock_outline_rounded,
                        obscureText: _isObscurePassword,
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
                      const SizedBox(height: 12),

                      // Keep me signed in & Forgot Password Row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _keepMeSignedIn = !_keepMeSignedIn;
                                  });
                                },
                                child: Container(
                                  width: 22,
                                  height: 22,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: _keepMeSignedIn
                                        ? AppColors.primary
                                        : Colors.transparent,
                                    border: Border.all(
                                      color: _keepMeSignedIn
                                          ? AppColors.primary
                                          : (isDark
                                              ? const Color(0xFF2E4D36)
                                              : const Color(0xFFC0C9C3)),
                                      width: 2,
                                    ),
                                  ),
                                  child: _keepMeSignedIn
                                      ? const Icon(
                                          Icons.check,
                                          size: 14,
                                          color: Colors.white,
                                        )
                                      : null,
                                ),
                              ),
                              const SizedBox(width: 10),
                              GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _keepMeSignedIn = !_keepMeSignedIn;
                                  });
                                },
                                child: Text(
                                  isEn ? 'Remember me' : 'Ghi nhớ đăng nhập',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: isDark
                                        ? const Color(0xFFD0D7D1)
                                        : const Color(0xFF6B786F),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.of(context).push(
                                PageRouteBuilder(
                                  transitionDuration: const Duration(milliseconds: 400),
                                  pageBuilder: (context, animation, secondaryAnimation) =>
                                      const ForgotPasswordScreen(),
                                  transitionsBuilder: (context, animation, secondaryAnimation, child) {
                                    final curvedAnimation = CurvedAnimation(
                                      parent: animation,
                                      curve: Curves.easeOutCubic,
                                    );
                                    return SlideTransition(
                                      position: Tween<Offset>(
                                        begin: const Offset(1.0, 0.0),
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
                            },
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: Text(
                              isEn ? 'Forgot Password?' : 'Quên mật khẩu?',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: isDark ? const Color(0xFF81C784) : AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Main Log In Button
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handleLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            elevation: 2,
                            shadowColor: AppColors.primary.withValues(alpha: 0.3),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(28),
                            ),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : Text(
                                  isEn ? 'Log In' : 'Đăng nhập',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Social Login Divider ("Or Continue With")
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
                              isEn ? 'Or continue with' : 'Hoặc tiếp tục với',
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
                      const SizedBox(height: 18),

                      // Google Social Button (Full Width)
                      Row(
                        children: [
                          SocialButton(
                            type: SocialType.google,
                            onPressed: () async {
                              final success = await AuthService().signInWithGoogle(context);
                              if (success && context.mounted) {
                                ScaffoldMessenger.of(context).clearSnackBars();
                                Navigator.of(context).pushReplacement(
                                  PageRouteBuilder(
                                    transitionDuration: const Duration(milliseconds: 500),
                                    pageBuilder: (context, animation, secondaryAnimation) =>
                                        const LoginSuccessVideoScreen(),
                                    transitionsBuilder: (context, animation, secondaryAnimation, child) {
                                      return FadeTransition(
                                        opacity: CurvedAnimation(
                                          parent: animation,
                                          curve: Curves.easeInOut,
                                        ),
                                        child: child,
                                      );
                                    },
                                  ),
                                );
                              }
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Footer Link: "Don't have an account? Register"
                      Center(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              isEn ? "Don't have an account? " : "Bạn chưa có tài khoản? ",
                              style: TextStyle(
                                fontSize: 14,
                                color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF6B786F),
                              ),
                            ),
                            GestureDetector(
                              onTap: () {
                                Navigator.of(context).push(
                                  PageRouteBuilder(
                                    transitionDuration: const Duration(milliseconds: 400),
                                    pageBuilder: (context, animation, secondaryAnimation) =>
                                        const RegisterScreen(),
                                    transitionsBuilder: (context, animation, secondaryAnimation, child) {
                                      final curvedAnimation = CurvedAnimation(
                                        parent: animation,
                                        curve: Curves.easeOutCubic,
                                      );
                                      return SlideTransition(
                                        position: Tween<Offset>(
                                          begin: const Offset(1.0, 0.0),
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
                              },
                              child: Text(
                                isEn ? 'Register' : 'Đăng ký',
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
                      const SizedBox(height: 24),
                      const SizedBox(height: 36),
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
