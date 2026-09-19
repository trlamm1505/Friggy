import 'package:shared_preferences/shared_preferences.dart';
import '../../config/app_constants.dart';

class StorageService {
  static StorageService? _instance;
  static SharedPreferences? _prefs;

  StorageService._();

  static Future<StorageService> getInstance() async {
    _instance ??= StorageService._();
    _prefs ??= await SharedPreferences.getInstance();
    return _instance!;
  }

  // Access Token
  Future<bool> saveAccessToken(String token) async {
    return await _prefs?.setString(AppConstants.keyAccessToken, token) ?? false;
  }

  String? getAccessToken() {
    return _prefs?.getString(AppConstants.keyAccessToken);
  }

  // Refresh Token
  Future<bool> saveRefreshToken(String token) async {
    return await _prefs?.setString(AppConstants.keyRefreshToken, token) ?? false;
  }

  String? getRefreshToken() {
    return _prefs?.getString(AppConstants.keyRefreshToken);
  }

  // User ID
  Future<bool> saveUserId(String userId) async {
    return await _prefs?.setString(AppConstants.keyUserId, userId) ?? false;
  }

  String? getUserId() {
    return _prefs?.getString(AppConstants.keyUserId);
  }

  // User Data JSON
  Future<bool> saveUserData(String jsonString) async {
    return await _prefs?.setString(AppConstants.keyUserData, jsonString) ?? false;
  }

  String? getUserData() {
    return _prefs?.getString(AppConstants.keyUserData);
  }

  // Clear Session
  Future<bool> clearSession() async {
    await _prefs?.remove(AppConstants.keyAccessToken);
    await _prefs?.remove(AppConstants.keyRefreshToken);
    await _prefs?.remove(AppConstants.keyUserId);
    await _prefs?.remove(AppConstants.keyUserData);
    return true;
  }

  // Check if logged in
  bool get isLoggedIn => getAccessToken() != null && getAccessToken()!.isNotEmpty;
}
