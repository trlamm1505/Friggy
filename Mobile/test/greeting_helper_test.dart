import 'package:flutter_test/flutter_test.dart';
import 'package:friggy/utils/greeting_helper.dart';

void main() {
  group('GreetingHelper Unit Tests', () {
    test('Morning hours (05:00 to 11:59) return goodmorning-Photoroom.png', () {
      final morningTimes = [
        DateTime(2026, 8, 25, 5, 0),   // 05:00 AM (Start of morning)
        DateTime(2026, 8, 25, 8, 30),  // 08:30 AM
        DateTime(2026, 8, 25, 11, 59), // 11:59 AM (End of morning)
      ];

      for (final time in morningTimes) {
        expect(
          GreetingHelper.getPeriod(time),
          GreetingPeriod.morning,
          reason: 'Time ${time.hour}:${time.minute} should be morning',
        );
        expect(
          GreetingHelper.getGreetingAsset(time),
          'assets/images/goodmorning-Photoroom.png',
          reason: 'Time ${time.hour}:${time.minute} should return goodmorning-Photoroom.png',
        );
      }
    });

    test('Afternoon hours (12:00 to 17:59) return goodafternoon-Photoroom.png', () {
      final afternoonTimes = [
        DateTime(2026, 8, 25, 12, 0),  // 12:00 PM (Start of afternoon)
        DateTime(2026, 8, 25, 14, 15), // 02:15 PM
        DateTime(2026, 8, 25, 17, 59), // 05:59 PM (End of afternoon)
      ];

      for (final time in afternoonTimes) {
        expect(
          GreetingHelper.getPeriod(time),
          GreetingPeriod.afternoon,
          reason: 'Time ${time.hour}:${time.minute} should be afternoon',
        );
        expect(
          GreetingHelper.getGreetingAsset(time),
          'assets/images/goodafternoon-Photoroom.png',
          reason: 'Time ${time.hour}:${time.minute} should return goodafternoon-Photoroom.png',
        );
      }
    });

    test('Evening/Night hours (18:00 to 04:59) return goodevening-Photoroom.png', () {
      final eveningTimes = [
        DateTime(2026, 8, 25, 18, 0),  // 06:00 PM (Start of evening)
        DateTime(2026, 8, 25, 21, 45), // 09:45 PM
        DateTime(2026, 8, 25, 23, 59), // 11:59 PM
        DateTime(2026, 8, 25, 0, 0),   // 12:00 AM (Midnight)
        DateTime(2026, 8, 25, 4, 59),  // 04:59 AM (End of night)
      ];

      for (final time in eveningTimes) {
        expect(
          GreetingHelper.getPeriod(time),
          GreetingPeriod.evening,
          reason: 'Time ${time.hour}:${time.minute} should be evening',
        );
        expect(
          GreetingHelper.getGreetingAsset(time),
          'assets/images/goodevening-Photoroom.png',
          reason: 'Time ${time.hour}:${time.minute} should return goodevening-Photoroom.png',
        );
      }
    });
  });
}
