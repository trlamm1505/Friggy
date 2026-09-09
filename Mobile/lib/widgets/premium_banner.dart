import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../l10n/app_localizations.dart';

class PremiumBanner extends StatelessWidget {
  final VoidCallback? onTryNowTap;

  const PremiumBanner({
    super.key,
    this.onTryNowTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';

    return Container(
      width: double.infinity,
      height: 244, // Increased height to prevent pixel overflow
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: isDark
              ? const [
                  Color(0xFF1E3A25), // Dark green top
                  Color(0xFF2E5B3B), // Medium dark green middle
                  Color(0xFF19271E), // Dark surface bottom
                ]
              : const [
                  Color(0xFFFFFFFF), // Pure crisp white top
                  Color(0xFFE8FAF0), // Mint white middle
                  Color(0xFFD6F5E3), // Soft fresh green bottom
                ],
          stops: const [0.0, 0.55, 1.0],
        ),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(
          color: isDark ? const Color(0xFF2E4D36) : Colors.white.withValues(alpha: 0.90),
          width: isDark ? 1.0 : 1.4,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.08),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(26),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            // Right Side: Mascot 3D Image Asset (Shifted left & positioned above CTA button)
            Positioned(
              right: 25,
              top: 6,
              bottom: 40,
              width: 175,
              child: Image.asset(
                'assets/images/premium_banner_mascot.png',
                fit: BoxFit.contain,
                alignment: Alignment.centerRight,
              ),
            ),

            // Left Side Content Area (Shifted slightly to the right with left: 22.0)
            Positioned.fill(
              right: 145, // Leaves ample room for mascot on right
              child: Padding(
                padding: const EdgeInsets.only(
                  left: 22.0,
                  right: 12.0,
                  top: 14.0,
                  bottom: 14.0,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Top Block: Logo, PREMIUM Badge, Headline & Stars
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Friggy Logo + PREMIUM Badge in SAME Row
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            RichText(
                              text: TextSpan(
                                style: GoogleFonts.outfit(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                                children: [
                                  TextSpan(
                                    text: 'Fri',
                                    style: TextStyle(
                                      color: isDark ? Colors.white : const Color(0xFF0F5A24),
                                    ),
                                  ),
                                  const TextSpan(
                                    text: 'ggy',
                                    style: TextStyle(color: Color(0xFF4CAF50)),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 2),
                            const Icon(
                              Icons.eco_rounded,
                              color: Color(0xFF4CAF50),
                              size: 15,
                            ),
                            const SizedBox(width: 6),

                            // Golden PREMIUM Badge
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 7,
                                vertical: 2.5,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF5B025),
                                borderRadius: BorderRadius.circular(12),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFF5B025).withValues(alpha: 0.30),
                                    blurRadius: 5,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.workspace_premium_rounded,
                                    color: Colors.white,
                                    size: 10,
                                  ),
                                  const SizedBox(width: 3),
                                  Text(
                                    'PREMIUM',
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 9.0,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.white,
                                      letterSpacing: 0.4,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        // Main Headline (17.5px)
                        Text(
                          isEn ? 'Cook better!\nSave more!' : 'Nấu ngon hơn !\ntiết kiệm hơn !',
                          style: GoogleFonts.outfit(
                            fontSize: 17.5,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : const Color(0xFF0F5A24),
                            height: 1.12,
                          ),
                        ),
                        const SizedBox(height: 6),

                        // Enlarged 3D Golden Stars Graphic Cluster (Shifted further RIGHT to left: 44.0)
                        Padding(
                          padding: const EdgeInsets.only(left: 44.0),
                          child: SizedBox(
                            width: 104,
                            height: 58,
                            child: Stack(
                              clipBehavior: Clip.none,
                              children: const [
                                // Big Main Star on Left (58px)
                                Positioned(
                                  left: 0,
                                  top: 0,
                                  child: Icon(
                                    Icons.star_rounded,
                                    color: Color(0xFFFFB300),
                                    size: 58,
                                  ),
                                ),
                                // Small Top Right Star (26px)
                                Positioned(
                                  left: 52,
                                  top: 0,
                                  child: Icon(
                                    Icons.star_rounded,
                                    color: Color(0xFFFFB300),
                                    size: 26,
                                  ),
                                ),
                                // Medium Bottom Right Star (34px)
                                Positioned(
                                  left: 40,
                                  bottom: 0,
                                  child: Icon(
                                    Icons.star_rounded,
                                    color: Color(0xFFFFB300),
                                    size: 34,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),

                    // Subtitle Description (12.0px)
                    Text(
                      isEn
                          ? 'Unlock exclusive recipes\nand smart features!'
                          : 'Mở khóa công thức độc quyền\nvà các tính năng thông minh!',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12.0,
                        fontWeight: FontWeight.w700,
                        color: isDark ? const Color(0xFFD0D7D1) : const Color(0xFF0F5A24),
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Bottom Right Action CTA Button ("Dùng thử ngay")
            Positioned(
              right: 16,
              bottom: 12,
              child: InkWell(
                onTap: onTryNowTap,
                borderRadius: BorderRadius.circular(24),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 9,
                  ),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF81C784) : const Color(0xFF0F853B),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: (isDark ? const Color(0xFF81C784) : const Color(0xFF0F853B))
                            .withValues(alpha: 0.35),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Text(
                    isEn ? 'Try now' : 'Dùng thử ngay',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 13.0,
                      fontWeight: FontWeight.w800,
                      color: isDark ? const Color(0xFF0E1611) : Colors.white,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
