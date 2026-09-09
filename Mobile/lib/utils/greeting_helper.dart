enum GreetingPeriod {
  morning,
  afternoon,
  evening,
}

class GreetingHelper {
  /// Returns the enum period (morning, afternoon, evening) based on current hour
  /// - Morning: 05:00 - 11:59 (hours 5..11)
  /// - Afternoon: 12:00 - 17:59 (hours 12..17)
  /// - Evening: 18:00 - 04:59 (hours 18..23, 0..4)
  static GreetingPeriod getPeriod(DateTime time) {
    final hour = time.hour;
    if (hour >= 5 && hour < 12) {
      return GreetingPeriod.morning;
    } else if (hour >= 12 && hour < 18) {
      return GreetingPeriod.afternoon;
    } else {
      return GreetingPeriod.evening;
    }
  }

  /// Returns the image asset path for the specified time
  static String getGreetingAsset(DateTime time) {
    final period = getPeriod(time);
    switch (period) {
      case GreetingPeriod.morning:
        return 'assets/images/goodmorning-Photoroom.png';
      case GreetingPeriod.afternoon:
        return 'assets/images/goodafternoon-Photoroom.png';
      case GreetingPeriod.evening:
        return 'assets/images/goodevening-Photoroom.png';
    }
  }
}
