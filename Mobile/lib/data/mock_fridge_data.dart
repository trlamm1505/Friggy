import 'mock_ingredient_data.dart';

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
  /// Fetch summary stats calculated dynamically from central master ingredient data
  static Future<FridgeSummaryModel> fetchFridgeSummary() async {
    await Future.delayed(const Duration(milliseconds: 20));
    final availableCount = IngredientRepository.getAllAvailableIngredients().length;
    final expiredCount = IngredientRepository.getAllExpiredIngredients().length;

    return FridgeSummaryModel(
      expiredCount: expiredCount,
      availableCount: availableCount,
    );
  }
}
