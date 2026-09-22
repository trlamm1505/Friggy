import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../../config/app_constants.dart';
import '../local/storage_service.dart';
import '../models/ai_chat_model.dart';
import 'dio_client.dart';

class AiChatService {
  final DioClient _dioClient;

  AiChatService({DioClient? dioClient}) : _dioClient = dioClient ?? DioClient();

  /// GET /ai-chat/sessions — Danh sách phiên chat
  Future<List<AiSessionModel>> getSessions({int page = 1, int limit = 20}) async {
    final response = await _dioClient.get(
      AppConstants.epAiChatSessions,
      queryParameters: {'page': page, 'limit': limit},
    );
    if (response is List) {
      return response
          .map((item) => AiSessionModel.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// POST /ai-chat/sessions — Tạo phiên chat mới
  Future<AiSessionModel> createSession({String? title}) async {
    final response = await _dioClient.post(
      AppConstants.epAiChatSessions,
      data: title != null && title.trim().isNotEmpty ? {'title': title.trim()} : {},
    );
    return AiSessionModel.fromJson(response as Map<String, dynamic>);
  }

  /// GET /ai-chat/sessions/:id — Chi tiết phiên chat + 50 messages
  Future<AiSessionDetailModel> getSessionDetail(String sessionId) async {
    final response = await _dioClient.get('${AppConstants.epAiChatSessions}/$sessionId');
    return AiSessionDetailModel.fromJson(response as Map<String, dynamic>);
  }

  /// DELETE /ai-chat/sessions/:id — Xóa phiên chat
  Future<void> deleteSession(String sessionId) async {
    await _dioClient.delete('${AppConstants.epAiChatSessions}/$sessionId');
  }

  /// POST /ai-chat/sessions/:id/messages — Gửi tin nhắn
  Future<Map<String, dynamic>> sendMessage(String sessionId, String content) async {
    final response = await _dioClient.post(
      '${AppConstants.epAiChatSessions}/$sessionId/messages',
      data: {'content': content},
    );
    return response as Map<String, dynamic>;
  }

  /// GET /ai-chat/sessions/:id/stream — SSE stream AI response tokens
  Stream<Map<String, dynamic>> streamSession(String sessionId) async* {
    final storage = await StorageService.getInstance();
    final token = storage.getAccessToken();

    final urlString = '${AppConstants.baseUrl}${AppConstants.epAiChatSessions}/$sessionId/stream';
    final uri = Uri.parse(urlString);

    final client = HttpClient();
    client.connectionTimeout = const Duration(seconds: 15);

    try {
      final request = await client.getUrl(uri);
      if (token != null && token.isNotEmpty) {
        request.headers.set('Authorization', 'Bearer $token');
      }
      request.headers.set('Accept', 'text/event-stream');
      request.headers.set('Cache-Control', 'no-cache');

      final response = await request.close();

      if (response.statusCode != 200) {
        debugPrint('[AiChatService] SSE Stream status code error: ${response.statusCode}');
        yield {'event': 'error', 'data': 'Không thể kết nối luồng SSE (${response.statusCode})'};
        client.close();
        return;
      }

      await for (final line in response.transform(utf8.decoder).transform(const LineSplitter())) {
        if (line.trim().isEmpty) continue;
        debugPrint('[AiChatService] Raw SSE line: $line');

        if (line.startsWith('data:')) {
          final rawData = line.substring(5).trim();
          if (rawData.isEmpty) continue;

          try {
            final parsed = jsonDecode(rawData);
            final normalized = _normalizeSsePayload(parsed);
            debugPrint('[AiChatService] Normalized SSE payload: $normalized');
            yield normalized;
            if (normalized['event'] == 'done' || normalized['event'] == 'error') {
              break;
            }
          } catch (e) {
            yield {'event': 'chunk', 'data': rawData};
          }
        }
      }
    } catch (e) {
      debugPrint('[AiChatService] SSE stream error: $e');
      yield {'event': 'error', 'data': 'Lỗi kết nối AI: $e'};
    } finally {
      client.close();
    }
  }

  /// Helper to unwrap nested SSE payloads (e.g. NestJS ResponseSuccessInterceptor wrapper)
  Map<String, dynamic> _normalizeSsePayload(dynamic parsed) {
    if (parsed == null) return {'event': 'unknown'};

    if (parsed is String) {
      final trimmed = parsed.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          final inner = jsonDecode(trimmed);
          return _normalizeSsePayload(inner);
        } catch (_) {}
      }
      return {'event': 'chunk', 'data': parsed};
    }

    if (parsed is Map<String, dynamic>) {
      // Handle NestJS interceptor wrapper: { message: 'Success', statusCode: 200, data: ... }
      if (parsed.containsKey('data') && (parsed.containsKey('statusCode') || parsed.containsKey('message'))) {
        return _normalizeSsePayload(parsed['data']);
      }

      // Handle standard SSE payload: { event: 'chunk'|'done'|'error', data: ... }
      if (parsed.containsKey('event')) {
        return parsed;
      }

      // Handle nested object with 'data' field: { data: "..." } or { data: { event: ... } }
      if (parsed.containsKey('data')) {
        return _normalizeSsePayload(parsed['data']);
      }
    }

    return {'event': 'chunk', 'data': parsed.toString()};
  }
}
