import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint('┌------------------------------------------------------------------');
      debugPrint('│ [HTTP REQUEST] ${options.method} => ${options.uri}');
      if (options.headers.isNotEmpty) {
        debugPrint('│ Headers: ${options.headers}');
      }
      if (options.data != null) {
        debugPrint('│ Payload: ${options.data}');
      }
      debugPrint('└------------------------------------------------------------------');
    }
    return handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint('┌------------------------------------------------------------------');
      debugPrint('│ [HTTP RESPONSE] ${response.statusCode} <= ${response.requestOptions.uri}');
      debugPrint('│ Data: ${response.data}');
      debugPrint('└------------------------------------------------------------------');
    }
    return handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint('┌------------------------------------------------------------------');
      debugPrint('│ [HTTP ERROR] ${err.response?.statusCode ?? 'NO STATUS'} <= ${err.requestOptions.uri}');
      debugPrint('│ Message: ${err.message}');
      if (err.response?.data != null) {
        debugPrint('│ Error Response: ${err.response?.data}');
      }
      debugPrint('└------------------------------------------------------------------');
    }
    return handler.next(err);
  }
}
