class AiSessionModel {
  final String id;
  final String? title;
  final String status;
  final int messageCount;
  final String createdAt;
  final String updatedAt;

  AiSessionModel({
    required this.id,
    this.title,
    required this.status,
    required this.messageCount,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AiSessionModel.fromJson(Map<String, dynamic> json) {
    return AiSessionModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String?,
      status: json['status'] as String? ?? 'active',
      messageCount: json['messageCount'] as int? ?? 0,
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'status': status,
      'messageCount': messageCount,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  AiSessionModel copyWith({
    String? id,
    String? title,
    String? status,
    int? messageCount,
    String? createdAt,
    String? updatedAt,
  }) {
    return AiSessionModel(
      id: id ?? this.id,
      title: title ?? this.title,
      status: status ?? this.status,
      messageCount: messageCount ?? this.messageCount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class AiMessageModel {
  final String id;
  final String role; // 'user' | 'assistant'
  String content;
  final int? tokensUsed;
  final String createdAt;
  bool isStreaming;

  AiMessageModel({
    required this.id,
    required this.role,
    required this.content,
    this.tokensUsed,
    required this.createdAt,
    this.isStreaming = false,
  });

  factory AiMessageModel.fromJson(Map<String, dynamic> json) {
    return AiMessageModel(
      id: json['id'] as String? ?? '',
      role: json['role'] as String? ?? 'assistant',
      content: json['content'] as String? ?? '',
      tokensUsed: json['tokensUsed'] as int?,
      createdAt: json['createdAt'] as String? ?? '',
      isStreaming: false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'role': role,
      'content': content,
      'tokensUsed': tokensUsed,
      'createdAt': createdAt,
    };
  }
}

class AiSessionDetailModel extends AiSessionModel {
  final List<AiMessageModel> messages;

  AiSessionDetailModel({
    required super.id,
    super.title,
    required super.status,
    required super.messageCount,
    required super.createdAt,
    required super.updatedAt,
    required this.messages,
  });

  factory AiSessionDetailModel.fromJson(Map<String, dynamic> json) {
    final rawMessages = json['messages'] as List<dynamic>? ?? [];
    return AiSessionDetailModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String?,
      status: json['status'] as String? ?? 'active',
      messageCount: json['messageCount'] as int? ?? 0,
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
      messages: rawMessages
          .map((m) => AiMessageModel.fromJson(m as Map<String, dynamic>))
          .toList(),
    );
  }
}
