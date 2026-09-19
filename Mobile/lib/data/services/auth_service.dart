import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../config/app_constants.dart';
import '../local/storage_service.dart';
import 'api_exception.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _apiService;
  final GoogleSignIn _googleSignIn;

  static final AuthService _instance = AuthService._internal();

  factory AuthService({ApiService? apiService, GoogleSignIn? googleSignIn}) {
    return _instance;
  }

  AuthService._internal()
      : _apiService = ApiService(),
        _googleSignIn = GoogleSignIn(
          scopes: ['email', 'profile'],
          serverClientId: AppConstants.googleClientId,
        );

  /// Checks whether a user role is allowed to access the Mobile app (only 'user' or 'users' allowed).
  static bool isAllowedRole(dynamic role) {
    if (role == null) return false;
    final String r = (role is Map ? role['name'] : role).toString().trim().toLowerCase();
    return r == 'user' || r == 'users';
  }

  /// Handles full Google Sign-In workflow:
  /// 1. Prompts user to select Google account via SDK
  /// 2. Retrieves Google ID Token
  /// 3. Sends POST /api/v1/auth/google via Dio
  /// 4. Validates user.role == 'user' / 'users'
  /// 5. Persists accessToken, refreshToken & user data in SharedPreferences
  Future<bool> signInWithGoogle(BuildContext context) async {
    try {
      // 1. Sign out first to ensure fresh account selection prompt
      await _googleSignIn.signOut();

      // 2. Trigger native Google Sign-In prompt
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        // User canceled sign-in flow
        debugPrint('[AuthService] User canceled Google sign in');
        return false;
      }

      // 3. Obtain authentication tokens
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final String? idToken = googleAuth.idToken;

      if (idToken == null || idToken.isEmpty) {
        if (context.mounted) {
          _showSnackBar(context, 'Không lấy được Google ID Token từ thiết bị', isError: true);
        }
        return false;
      }

      debugPrint('[AuthService] Obtained Google ID Token successfully: ${idToken.substring(0, 20)}...');

      // 4. Call Backend API POST /api/v1/auth/google
      final dynamic apiResult = await _apiService.loginWithGoogle(idToken);

      final Map<String, dynamic> result = (apiResult is Map<String, dynamic>) ? apiResult : {};
      final payload = (result.containsKey('data') && result['data'] is Map<String, dynamic>)
          ? result['data'] as Map<String, dynamic>
          : result;

      final String? accessToken = payload['accessToken'] as String?;
      final String? refreshToken = payload['refreshToken'] as String?;
      final Map<String, dynamic>? user = (payload['user'] is Map<String, dynamic>)
          ? payload['user'] as Map<String, dynamic>
          : null;

      final dynamic userRole = user?['role'];
      if (!isAllowedRole(userRole)) {
        final String roleDisplay = (userRole is Map ? userRole['name'] : userRole)?.toString() ?? 'Khác';
        debugPrint('[AuthService] Rejected Google Login: User role "$roleDisplay" is not allowed.');
        if (context.mounted) {
          _showSnackBar(
            context,
            'Tài khoản của bạn ($roleDisplay) không có quyền truy cập ứng dụng di động (Chỉ dành cho tài khoản User).',
            isError: true,
          );
        }
        return false;
      }

      if (accessToken != null && accessToken.isNotEmpty) {
        final storage = await StorageService.getInstance();
        await storage.saveAccessToken(accessToken);
        if (refreshToken != null) await storage.saveRefreshToken(refreshToken);

        final Map<String, dynamic> userDataToSave = user ?? {};
        if (userDataToSave['name'] == null || (userDataToSave['name'] as String).trim().isEmpty) {
          userDataToSave['name'] = googleUser.displayName ?? googleUser.email.split('@').first;
        }
        if (userDataToSave['email'] == null || (userDataToSave['email'] as String).trim().isEmpty) {
          userDataToSave['email'] = googleUser.email;
        }

        if (userDataToSave['id'] != null) await storage.saveUserId(userDataToSave['id'].toString());
        await storage.saveUserData(jsonEncode(userDataToSave));

        debugPrint('[AuthService] Google Login successful. User (${userDataToSave['name']}) saved in StorageService.');
        return true;
      } else {
        if (context.mounted) {
          _showSnackBar(context, 'Đăng nhập không thành công. Vui lòng thử lại', isError: true);
        }
        return false;
      }
    } on MissingPluginException catch (_) {
      debugPrint('[AuthService] MissingPluginException: Native Google Sign-In plugin not compiled into running APK.');
      if (context.mounted) {
        _showSnackBar(
          context,
          'Vui lòng tắt ứng dụng và bấm RUN lại (Rebuild) để nạp plugin Native Google!',
          isError: true,
        );
      }
      return false;
    } on PlatformException catch (e) {
      debugPrint('[AuthService] PlatformException during Google login: ${e.code} - ${e.message}');
      if (context.mounted) {
        final isDevError = e.message?.contains('10') == true || e.code == 'sign_in_failed';
        final msg = isDevError
            ? 'Lỗi 10 (DEVELOPER_ERROR): Cần thêm SHA-1 fingerprint vào Google Cloud Console'
            : 'Lỗi Google Sign-In: ${e.message}';
        _showSnackBar(context, msg, isError: true);
      }
      return false;
    } on ApiException catch (e) {
      debugPrint('[AuthService] ApiException during Google login: ${e.message}');
      if (context.mounted) {
        _showSnackBar(context, e.message, isError: true);
      }
      return false;
    } catch (e) {
      debugPrint('[AuthService] Unexpected error during Google login: $e');
      if (context.mounted) {
        _showSnackBar(context, 'Đã xảy ra lỗi khi đăng nhập bằng Google', isError: true);
      }
      return false;
    }
  }

  /// Handles Phone OTP verification & login:
  /// 1. Calls backend POST /api/v1/auth/phone/verify
  /// 2. Verifies user.role == 'user' / 'users'
  /// 3. Saves session & user data
  Future<bool> verifyPhoneOtpAndLogin(BuildContext context, String phone, String otpCode) async {
    try {
      final dynamic apiResult = await _apiService.verifyPhoneOtp(phone, otpCode);

      final Map<String, dynamic> result = (apiResult is Map<String, dynamic>) ? apiResult : {};
      final payload = (result.containsKey('data') && result['data'] is Map<String, dynamic>)
          ? result['data'] as Map<String, dynamic>
          : result;

      final String? accessToken = payload['accessToken'] as String?;
      final String? refreshToken = payload['refreshToken'] as String?;
      final Map<String, dynamic>? user = (payload['user'] is Map<String, dynamic>)
          ? payload['user'] as Map<String, dynamic>
          : null;

      final dynamic userRole = user?['role'];
      if (!isAllowedRole(userRole)) {
        final String roleDisplay = (userRole is Map ? userRole['name'] : userRole)?.toString() ?? 'Khác';
        debugPrint('[AuthService] Rejected Phone Login: User role "$roleDisplay" is not allowed.');
        if (context.mounted) {
          _showSnackBar(
            context,
            'Tài khoản của bạn ($roleDisplay) không có quyền truy cập ứng dụng di động (Chỉ dành cho tài khoản User).',
            isError: true,
          );
        }
        return false;
      }

      if (accessToken != null && accessToken.isNotEmpty) {
        final storage = await StorageService.getInstance();
        await storage.saveAccessToken(accessToken);
        if (refreshToken != null) await storage.saveRefreshToken(refreshToken);

        final Map<String, dynamic> userDataToSave = user ?? {};
        if (userDataToSave['id'] != null) await storage.saveUserId(userDataToSave['id'].toString());
        await storage.saveUserData(jsonEncode(userDataToSave));

        debugPrint('[AuthService] Phone Login successful. User saved in StorageService.');
        return true;
      } else {
        if (context.mounted) {
          _showSnackBar(context, 'Xác minh không thành công. Vui lòng thử lại', isError: true);
        }
        return false;
      }
    } on ApiException catch (e) {
      debugPrint('[AuthService] ApiException during Phone verify: ${e.message}');
      if (context.mounted) {
        _showSnackBar(context, e.message, isError: true);
      }
      return false;
    } catch (e) {
      debugPrint('[AuthService] Unexpected error during Phone verify: $e');
      if (context.mounted) {
        _showSnackBar(context, 'Đã xảy ra lỗi khi xác minh OTP', isError: true);
      }
      return false;
    }
  }

  /// Handles full Logout workflow:
  /// 1. Calls Backend POST /api/v1/auth/logout with stored refreshToken
  /// 2. Signs out of GoogleSignIn SDK
  /// 3. Clears local SharedPreferences session
  Future<void> logout() async {
    try {
      final storage = await StorageService.getInstance();
      final refreshToken = storage.getRefreshToken();
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await _apiService.logout(refreshToken);
        debugPrint('[AuthService] Successfully revoked refresh token on backend.');
      }
    } catch (e) {
      debugPrint('[AuthService] Exception during backend logout call: $e');
    } finally {
      try {
        await _googleSignIn.signOut();
      } catch (e) {
        debugPrint('[AuthService] Error signing out from Google SDK: $e');
      }
      final storage = await StorageService.getInstance();
      await storage.clearSession();
      debugPrint('[AuthService] Local session cleared.');
    }
  }

  void _showSnackBar(BuildContext context, String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isError ? Icons.error_outline : Icons.check_circle_outline,
              color: Colors.white,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        backgroundColor: isError ? const Color(0xFFE53935) : const Color(0xFF2E7D32),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
