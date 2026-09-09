import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../l10n/app_localizations.dart';
import 'friggy_app_bar.dart';

class HomeHeader extends StatelessWidget {
  final TextEditingController? searchController;
  final VoidCallback? onNotificationTap;
  final VoidCallback? onFilterTap;
  final ValueChanged<String>? onSearchChanged;

  const HomeHeader({
    super.key,
    this.searchController,
    this.onNotificationTap,
    this.onFilterTap,
    this.onSearchChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Top Row using unified FriggyAppBar
          FriggyAppBar(
            showBackButton: false,
            onNotificationTap: onNotificationTap,
          ),

          const SizedBox(height: 16),

          // Search Bar Input Field
          Container(
            height: 52,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF19271E) : Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isDark
                    ? const Color(0xFF2E4D36)
                    : const Color(0xFF66BB6A).withValues(alpha: 0.65),
                width: 0.8,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: TextField(
              controller: searchController,
              onChanged: onSearchChanged,
              textAlignVertical: TextAlignVertical.center,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 15,
                color: isDark ? Colors.white : const Color(0xFF19221C),
                fontWeight: FontWeight.w600,
              ),
              decoration: InputDecoration(
                isCollapsed: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 14.0),
                hintText: isEn
                    ? 'Search ingredients, dishes, recipes...'
                    : 'Tìm nguyên liệu, món ăn, công thức...',
                hintStyle: GoogleFonts.plusJakartaSans(
                  fontSize: 14.5,
                  color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF757575),
                  fontWeight: FontWeight.w400,
                ),
                prefixIcon: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14.0),
                  child: Icon(
                    Icons.search_rounded,
                    color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                    size: 24,
                  ),
                ),
                prefixIconConstraints: const BoxConstraints(
                  minWidth: 48,
                  minHeight: 48,
                ),
                suffixIcon: IconButton(
                  onPressed: onFilterTap,
                  icon: Icon(
                    Icons.tune_rounded,
                    color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                    size: 22,
                  ),
                  splashRadius: 20,
                ),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
