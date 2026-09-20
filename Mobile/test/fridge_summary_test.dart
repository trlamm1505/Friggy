import 'package:flutter_test/flutter_test.dart';
import 'package:friggy/data/models/fridge_summary_model.dart';

void main() {
  group('FridgeSummaryModel & Repository Tests', () {
    test('FridgeSummaryModel correctly initializes with given metrics', () {
      const summary = FridgeSummaryModel(
        expiredCount: 3,
        availableCount: 28,
      );

      expect(summary.expiredCount, equals(3));
      expect(summary.availableCount, equals(28));
    });

    test('FridgeSummaryModel converts to and from JSON correctly', () {
      final jsonMap = {
        'expired_count': 5,
        'available_count': 42,
      };

      final model = FridgeSummaryModel.fromJson(jsonMap);
      expect(model.expiredCount, equals(5));
      expect(model.availableCount, equals(42));

      final outputJson = model.toJson();
      expect(outputJson['expired_count'], equals(5));
      expect(outputJson['available_count'], equals(42));
    });

    test('FridgeSummaryRepository fetches mock data correctly', () async {
      final summary = await FridgeSummaryRepository.fetchFridgeSummary();
      expect(summary.expiredCount, equals(3));
      expect(summary.availableCount, equals(28));
    });
  });
}
