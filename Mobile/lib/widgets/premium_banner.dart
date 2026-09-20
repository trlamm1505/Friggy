import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../l10n/app_localizations.dart';

class PremiumBanner extends StatelessWidget {
  final bool isFamilyPlan;
  final VoidCallback? onTryNowTap;

  const PremiumBanner({
    super.key,
    this.isFamilyPlan = false,
    this.onTryNowTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';

    return Container(
      width: double.infinity,
      height: 244,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: isDark
              ? const [
                  Color(0xFF1E3A25),
                  Color(0xFF2E5B3B),
                  Color(0xFF19271E),
                ]
              : const [
                  Color(0xFFFFFFFF),
                  Color(0xFFE8FAF0),
                  Color(0xFFD6F5E3),
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
            // Right Side: Mascot 3D Image Asset
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

            // Left Side Content Area
            Positioned.fill(
              right: 145,
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
                    // Top Block: Logo, Badge, Headline & Stars
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
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

                            // Badge: GÓI GIA ĐÌNH vs PREMIUM
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2.5,
                              ),
                              decoration: BoxDecoration(
                                color: isFamilyPlan
                                    ? const Color(0xFF2E7D32)
                                    : const Color(0xFFF5B025),
                                borderRadius: BorderRadius.circular(12),
                                boxShadow: [
                                  BoxShadow(
                                    color: (isFamilyPlan
                                            ? const Color(0xFF2E7D32)
                                            : const Color(0xFFF5B025))
                                        .withValues(alpha: 0.30),
                                    blurRadius: 5,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    isFamilyPlan
                                        ? Icons.family_restroom_rounded
                                        : Icons.workspace_premium_rounded,
                                    color: Colors.white,
                                    size: 11,
                                  ),
                                  const SizedBox(width: 3),
                                  Text(
                                    isFamilyPlan
                                        ? (isEn ? 'FAMILY PLAN' : 'GÓI GIA ĐÌNH')
                                        : 'PREMIUM',
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

                        // Main Headline
                        Text(
                          isFamilyPlan
                              ? (isEn
                                  ? 'Family Account !\nActive Premium !'
                                  : 'Tài khoản Gia Đình !\nĐã kích hoạt !')
                              : (isEn ? 'Cook better!\nSave more!' : 'Nấu ngon hơn !\ntiết kiệm hơn !'),
                          style: GoogleFonts.outfit(
                            fontSize: 17.5,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : const Color(0xFF0F5A24),
                            height: 1.12,
                          ),
                        ),
                        const SizedBox(height: 6),

                        // Stars Graphic Cluster
                        Padding(
                          padding: const EdgeInsets.only(left: 44.0),
                          child: SizedBox(
                            width: 104,
                            height: 58,
                            child: Stack(
                              clipBehavior: Clip.none,
                              children: const [
                                Positioned(
                                  left: 0,
                                  top: 0,
                                  child: Icon(
                                    Icons.star_rounded,
                                    color: Color(0xFFFFB300),
                                    size: 58,
                                  ),
                                ),
                                Positioned(
                                  left: 52,
                                  top: 0,
                                  child: Icon(
                                    Icons.star_rounded,
                                    color: Color(0xFFFFB300),
                                    size: 26,
                                  ),
                                ),
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

                    // Subtitle Description
                    Text(
                      isFamilyPlan
                          ? (isEn
                              ? 'Enjoying unlimited AI,\nmembers & shared fridges!'
                              : 'Tận hưởng trọn vẹn AI,\nthành viên & tủ lạnh dùng chung!')
                          : (isEn
                              ? 'Unlock exclusive recipes\nand smart features!'
                              : 'Mở khóa công thức độc quyền\nvà các tính năng thông minh!'),
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

            // Bottom Right Action / Active Status
            Positioned(
              right: 16,
              bottom: 12,
              child: isFamilyPlan
                  ? InkWell(
                      onTap: onTryNowTap,
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF233629)
                              : const Color(0xFFE8F5E9),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isDark
                                ? const Color(0xFF2E4D36)
                                : const Color(0xFFA5D6A7),
                            width: 1.2,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.check_circle_rounded,
                              color: Color(0xFF2E7D32),
                              size: 16,
                            ),
                            const SizedBox(width: 5),
                            Text(
                              isEn ? 'Active Plan' : 'Đang sử dụng',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w800,
                                color: isDark
                                    ? const Color(0xFF81C784)
                                    : const Color(0xFF1B5E20),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  : InkWell(
                      onTap: onTryNowTap,
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 9,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF81C784)
                              : const Color(0xFF0F853B),
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: (isDark
                                      ? const Color(0xFF81C784)
                                      : const Color(0xFF0F853B))
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
