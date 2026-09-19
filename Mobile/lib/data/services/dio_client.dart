import 'package:dio/dio.dart';
import '../../config/app_constants.dart';
import 'api_exception.dart';
import 'interceptors/auth_interceptor.dart';
import 'interceptors/logging_interceptor.dart';

class DioClient {
  late final Dio _dio;

  static final DioClient _instance = DioClient._internal();

  factory DioClient() {
    return _instance;
  }

  DioClient._internal() {
    final options = BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: AppConstants.connectTimeout,
      receiveTimeout: AppConstants.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );

    _dio = Dio(options);

    // Add interceptors
    _dio.interceptors.addAll([
      AuthInterceptor(),
      LoggingInterceptor(),
    ]);
  }

  Dio get instance => _dio;

  // GET Request
  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    bool skipAuth = false,
  }) async {
    try {
      final opts = _mergeOptions(options, skipAuth);
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
        options: opts,
        cancelToken: cancelToken,
      );
      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  // POST Request
  Future<dynamic> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    bool skipAuth = false,
  }) async {
    try {
      final opts = _mergeOptions(options, skipAuth);
      final response = await _dio.post(
        path,
        data: data,
        queryParameters: queryParameters,
        options: opts,
        cancelToken: cancelToken,
      );
      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  // PUT Request
  Future<dynamic> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    bool skipAuth = false,
  }) async {
    try {
      final opts = _mergeOptions(options, skipAuth);
      final response = await _dio.put(
        path,
        data: data,
        queryParameters: queryParameters,
        options: opts,
        cancelToken: cancelToken,
      );
      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  // PATCH Request
  Future<dynamic> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    bool skipAuth = false,
  }) async {
    try {
      final opts = _mergeOptions(options, skipAuth);
      final response = await _dio.patch(
        path,
        data: data,
        queryParameters: queryParameters,
        options: opts,
        cancelToken: cancelToken,
      );
      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  // DELETE Request
  Future<dynamic> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    bool skipAuth = false,
  }) async {
    try {
      final opts = _mergeOptions(options, skipAuth);
      final response = await _dio.delete(
        path,
        data: data,
        queryParameters: queryParameters,
        options: opts,
        cancelToken: cancelToken,
      );
      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  // Multipart File Upload (Image scan, Avatar upload, etc.)
  Future<dynamic> uploadFile(
    String path, {
    required String filePath,
    required String fileKey,
    Map<String, dynamic>? extraFields,
    Options? options,
    ProgressCallback? onSendProgress,
    bool skipAuth = false,
  }) async {
    try {
      final fileName = filePath.split('/').last;
      final formData = FormData.fromMap({
        fileKey: await MultipartFile.fromFile(filePath, filename: fileName),
        ...?extraFields,
      });

      final opts = _mergeOptions(options, skipAuth);
      opts.headers?['Content-Type'] = 'multipart/form-data';

      final response = await _dio.post(
        path,
        data: formData,
        options: opts,
        onSendProgress: onSendProgress,
      );

      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Options _mergeOptions(Options? options, bool skipAuth) {
    final opts = options ?? Options();
    opts.extra ??= {};
    if (skipAuth) {
      opts.extra!['skipAuth'] = true;
    }
    return opts;
  }

  // Processes raw response and returns response data payload
  dynamic _processResponse(Response response) {
    final body = response.data;
    if (body is Map<String, dynamic>) {
      // Friggy backend standard response: { statusCode: 200, message: 'Success', data: ... }
      if (body.containsKey('data') && body['data'] != null) {
        return body['data'];
      } else if (body.containsKey('success') && body['success'] == true) {
        return body['data'];
      } else if (body.containsKey('success') && body['success'] == false) {
        throw ApiException(
          message: body['message'] ?? 'Thao tác thất bại',
          statusCode: response.statusCode,
          data: body,
        );
      }
    }
    return body;
  }
}
