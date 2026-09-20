import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/models/fridge_summary_model.dart';
import '../l10n/app_localizations.dart';

class FridgeSummaryCards extends StatelessWidget {
  final FridgeSummaryModel? summaryData;
  final VoidCallback? onExpiringTap;
  final VoidCallback? onAvailableTap;

  const FridgeSummaryCards({
    super.key,
    this.summaryData,
    this.onExpiringTap,
    this.onAvailableTap,
  });

  @override
  Widget build(BuildContext context) {
    if (summaryData != null) {
      return _buildCardsRow(context, summaryData!);
    }

    return FutureBuilder<FridgeSummaryModel>(
      future: FridgeSummaryRepository.fetchFridgeSummary(),
      builder: (context, snapshot) {
        final data = snapshot.data ??
            const FridgeSummaryModel(
              expiredCount: 0,
              availableCount: 0,
            );
        return _buildCardsRow(context, data);
      },
    );
  }

  Widget _buildCardsRow(BuildContext context, FridgeSummaryModel summary) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';

    final expiredGradients = isDark
        ? const [Color(0xFF2A1C19), Color(0xFF38231E)]
        : const [Color(0xFFFAF1EB), Color(0xFFF4DCD1)];
    final expiredBorder = isDark
        ? const Color(0xFF5E352B)
        : const Color(0xFFF1B4A4).withValues(alpha: 0.85);
    final expiredTitle = isDark ? const Color(0xFFFF8A80) : const Color(0xFFB71C1C);
    final expiredButtonBg = isDark ? const Color(0xFF4A2822) : const Color(0xFFE8BCB0).withValues(alpha: 0.80);

    final availableGradients = isDark
        ? const [Color(0xFF19271E), Color(0xFF1E3325)]
        : const [Color(0xFFF3FCF2), Color(0xFFD6F3CF)];
    final availableBorder = isDark
        ? const Color(0xFF2E4D36)
        : const Color(0xFFA5E69C).withValues(alpha: 0.85);
    final availableTitle = isDark ? const Color(0xFF81C784) : const Color(0xFF0F5A24);
    final availableButtonBg = isDark ? const Color(0xFF233629) : const Color(0xFFC8E6C9).withValues(alpha: 0.90);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Left Card: Expired / Expiring Ingredients
            Expanded(
              child: _SummaryCard(
                gradientColors: expiredGradients,
                borderColor: expiredBorder,
                imagePath: 'assets/images/expired_tomato.png',
                title: isEn ? 'Expired\nIngredients' : 'Nguyên Liệu\nHết Hạn',
                titleColor: expiredTitle,
                count: summary.expiredCount,
                countUnitColor: expiredTitle.withValues(alpha: 0.8),
                buttonText: isEn ? 'Check now' : 'Kiểm tra ngay',
                buttonBgColor: expiredButtonBg,
                buttonTextColor: expiredTitle,
                onTap: onExpiringTap,
              ),
            ),
            const SizedBox(width: 14),

            // Right Card: Available Ingredients
            Expanded(
              child: _SummaryCard(
                gradientColors: availableGradients,
                borderColor: availableBorder,
                imagePath: 'assets/images/available_veggies.png',
                title: isEn ? 'Available\nIngredients' : 'Nguyên Liệu\nSẵn Có',
                titleColor: availableTitle,
                count: summary.availableCount,
                countUnitColor: availableTitle.withValues(alpha: 0.8),
                buttonText: isEn ? 'View fridge' : 'Xem tủ lạnh',
                buttonBgColor: availableButtonBg,
                buttonTextColor: availableTitle,
                onTap: onAvailableTap,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final List<Color> gradientColors;
  final Color borderColor;
  final String imagePath;
  final String title;
  final Color titleColor;
  final int count;
  final Color countUnitColor;
  final String buttonText;
  final Color buttonBgColor;
  final Color buttonTextColor;
  final VoidCallback? onTap;

  const _SummaryCard({
    required this.gradientColors,
    required this.borderColor,
    required this.imagePath,
    required this.title,
    required this.titleColor,
    required this.count,
    required this.countUnitColor,
    required this.buttonText,
    required this.buttonBgColor,
    required this.buttonTextColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      splashColor: titleColor.withValues(alpha: 0.10),
      highlightColor: titleColor.withValues(alpha: 0.05),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 12.0),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: gradientColors,
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: borderColor,
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Mascot 3D Image Asset (76px for optimal fitting)
            SizedBox(
              height: 76,
              child: Image.asset(
                imagePath,
                fit: BoxFit.contain,
              ),
            ),

            const SizedBox(height: 4),

            // Content Block
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Card Title (13.5px)
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                    color: titleColor,
                    height: 1.15,
                  ),
                ),
                const SizedBox(height: 2),

                // Count Metric + Unit (26px)
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      '$count',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        color: titleColor,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isEn ? 'items' : 'món',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: countUnitColor,
                      ),
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 6),

            // Pill Action Button (Centered at bottom)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7.5),
              decoration: BoxDecoration(
                color: buttonBgColor,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    buttonText,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                      color: buttonTextColor,
                    ),
                  ),
                  const SizedBox(width: 3),
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 16,
                    color: buttonTextColor,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
