import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:friggy/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = false;

  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const GroceryApp());
    await tester.pump();

    // Verify Onboarding Welcome Screen renders
    expect(find.text('Get Started'), findsOneWidget);
  });
}
