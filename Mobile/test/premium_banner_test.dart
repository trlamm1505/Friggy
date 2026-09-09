import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:friggy/widgets/premium_banner.dart';

void main() {
  group('PremiumBanner Widget Tests', () {
    testWidgets('PremiumBanner renders logo, badge, headline, and button', (WidgetTester tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PremiumBanner(
              onTryNowTap: () {
                tapped = true;
              },
            ),
          ),
        ),
      );

      // Verify text elements
      expect(find.byType(RichText), findsWidgets);
      expect(find.text('PREMIUM'), findsOneWidget);
      expect(find.text('Cook Better !\nSave More !'), findsOneWidget);
      expect(find.text('Unlock exclusive recipes\nand smart AI features!'), findsOneWidget);
      expect(find.text('Try Now'), findsOneWidget);

      // Tap CTA button
      await tester.tap(find.text('Try Now'));
      await tester.pumpAndSettle();

      expect(tapped, isTrue);
    });
  });
}
