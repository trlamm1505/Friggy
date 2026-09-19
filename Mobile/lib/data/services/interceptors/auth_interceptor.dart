import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:friggy/config/app_constants.dart';
import '../../local/storage_service.dart';
import '../../../utils/navigation_service.dart';

class AuthInterceptor extends Interceptor {
  bool _isRefreshing = false;
  Completer<String?>? _refreshCompleter;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // If request has skipAuth flag, do not attach Bearer token
    if (options.extra['skipAuth'] == true) {
      return handler.next(options);
    }

    try {
      final storage = await StorageService.getInstance();
      final token = storage.getAccessToken();

      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    } catch (e) {
      debugPrint('[AuthInterceptor] Error getting access token: $e');
    }

    return handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final response = err.response;
    final isUnauthorized = response?.statusCode == 401;
    final isRefreshEndpoint = err.requestOptions.path.contains(AppConstants.epAuthRefreshToken);

    if (isUnauthorized && !isRefreshEndpoint) {
      debugPrint('[AuthInterceptor] 401 Unauthorized on ${err.requestOptions.path}. Attempting token refresh...');

      try {
        final storage = await StorageService.getInstance();
        final refreshToken = storage.getRefreshToken();

        if (refreshToken == null || refreshToken.isEmpty) {
          debugPrint('[AuthInterceptor] No refresh token found. Redirecting to LoginScreen.');
          await NavigationService.navigateToLoginAndClearSession();
          return handler.next(err);
        }

        String? newAccessToken;

        if (_isRefreshing) {
          debugPrint('[AuthInterceptor] Token refresh already in progress. Waiting for result...');
          newAccessToken = await _refreshCompleter?.future;
        } else {
          _isRefreshing = true;
          _refreshCompleter = Completer<String?>();

          newAccessToken = await _performTokenRefresh(refreshToken);

          _refreshCompleter?.complete(newAccessToken);
          _isRefreshing = false;
          _refreshCompleter = null;
        }

        if (newAccessToken != null && newAccessToken.isNotEmpty) {
          debugPrint('[AuthInterceptor] Retrying original request ${err.requestOptions.path} with new token.');
          final requestOptions = err.requestOptions;
          requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';

          final dio = Dio(BaseOptions(
            baseUrl: AppConstants.baseUrl,
            connectTimeout: AppConstants.connectTimeout,
            receiveTimeout: AppConstants.receiveTimeout,
          ));

          final retryResponse = await dio.fetch(requestOptions);
          return handler.resolve(retryResponse);
        } else {
          debugPrint('[AuthInterceptor] Token refresh failed or empty. Clearing session & logging out.');
          await NavigationService.navigateToLoginAndClearSession();
          return handler.next(err);
        }
      } catch (e) {
        debugPrint('[AuthInterceptor] Exception during token refresh / request retry: $e');
        await NavigationService.navigateToLoginAndClearSession();
        return handler.next(err);
      }
    } else if (isUnauthorized && isRefreshEndpoint) {
      debugPrint('[AuthInterceptor] Refresh token expired or invalid (401 on /auth/refresh). Force logging out.');
      await NavigationService.navigateToLoginAndClearSession();
      return handler.next(err);
    }

    return handler.next(err);
  }

  Future<String?> _performTokenRefresh(String refreshToken) async {
    try {
      final dio = Dio(BaseOptions(
        baseUrl: AppConstants.baseUrl,
        connectTimeout: AppConstants.connectTimeout,
        receiveTimeout: AppConstants.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ));

      final response = await dio.post(
        AppConstants.epAuthRefreshToken,
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        Map<String, dynamic>? payload;
        if (data is Map<String, dynamic>) {
          if (data.containsKey('data') && data['data'] is Map<String, dynamic>) {
            payload = data['data'] as Map<String, dynamic>;
          } else {
            payload = data;
          }
        }

        if (payload != null) {
          final newAccessToken = payload['accessToken'] as String?;
          final newRefreshToken = payload['refreshToken'] as String?;

          if (newAccessToken != null && newAccessToken.isNotEmpty) {
            final storage = await StorageService.getInstance();
            await storage.saveAccessToken(newAccessToken);
            if (newRefreshToken != null && newRefreshToken.isNotEmpty) {
              await storage.saveRefreshToken(newRefreshToken);
            }
            debugPrint('[AuthInterceptor] Refresh token call succeeded. New access token obtained.');
            return newAccessToken;
          }
        }
      }
    } catch (e) {
      debugPrint('[AuthInterceptor] _performTokenRefresh exception: $e');
    }
    return null;
  }
}

