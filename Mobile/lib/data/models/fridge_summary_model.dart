import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class FridgeSummaryModel {
  final int expiredCount;
  final int availableCount;

  const FridgeSummaryModel({
    required this.expiredCount,
    required this.availableCount,
  });

  factory FridgeSummaryModel.fromJson(Map<String, dynamic> json) {
    return FridgeSummaryModel(
      expiredCount: json['expired_count'] ?? 0,
      availableCount: json['available_count'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'expired_count': expiredCount,
      'available_count': availableCount,
    };
  }
}

class FridgeSummaryRepository {
  /// Fetch summary stats calculated dynamically from live Backend API
  static Future<FridgeSummaryModel> fetchFridgeSummary() async {
    try {
      final items = await ApiService().getFridgeItems();
      int expiredCount = 0;
      int availableCount = 0;
      for (var item in items) {
        final days = item['daysUntilExpiry'] as int? ?? 5;
        if (days < 0) {
          expiredCount++;
        } else {
          availableCount++;
        }
      }
      return FridgeSummaryModel(
        expiredCount: expiredCount,
        availableCount: availableCount,
      );
    } catch (e) {
      debugPrint('[FridgeSummaryRepository] Error fetching summary from API: $e');
      return const FridgeSummaryModel(
        expiredCount: 0,
        availableCount: 0,
      );
    }
  }
}
