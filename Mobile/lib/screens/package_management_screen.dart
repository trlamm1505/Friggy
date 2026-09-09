import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../l10n/app_localizations.dart';

class PackageManagementScreen extends StatefulWidget {
  const PackageManagementScreen({super.key});

  @override
  State<PackageManagementScreen> createState() =>
      _PackageManagementScreenState();
}

class _PackageManagementScreenState extends State<PackageManagementScreen> {
  void _showAllPlansModal() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF142017) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 5,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF2E4D36) : Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Icon(
                    Icons.workspace_premium_rounded,
                    color: isDark ? Colors.white : const Color(0xFF006428),
                    size: 28,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    isEn ? 'Friggy Service Plans' : 'Các gói dịch vụ Friggy',
                    style: GoogleFonts.outfit(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: isDark ? Colors.white : const Color(0xFF006428),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Plan 1: Gói Miễn Phí
              _buildPlanCard(
                title: isEn ? 'Free Plan (Basic)' : 'Gói Miễn Phí (Basic)',
                price: '0 VNĐ',
                period: isEn ? 'Forever' : 'Mãi mãi',
                description: isEn ? 'For basic user experience' : 'Dành cho người dùng trải nghiệm cơ bản',
                isCurrentPlan: false,
                features: isEn
                    ? [
                        'Max 1 fridge',
                        'Manual food entry',
                        'Standard expiry alert',
                      ]
                    : [
                        'Tối đa 1 tủ lạnh',
                        'Nhập thực phẩm thủ công',
                        'Cảnh báo hết hạn tiêu chuẩn',
                      ],
                buttonText: isEn ? 'Default Plan' : 'Gói mặc định',
                buttonColor: Colors.grey.shade400,
                isDark: isDark,
              ),

              const SizedBox(height: 16),

              // Plan 2: Gói Individual (Đang dùng)
              _buildPlanCard(
                title: isEn ? 'Individual Plan' : 'Gói Individual (Cá Nhân)',
                price: isEn ? '\$4.99' : '99.000 VNĐ',
                period: isEn ? '/ year' : '/ năm',
                description: isEn ? 'Full AI features for 1 user' : 'Đầy đủ tính năng AI cho 1 người dùng',
                isCurrentPlan: true,
                badgeText: isEn ? 'Currently Active' : 'Đang sử dụng',
                features: isEn
                    ? [
                        'Unlimited AI camera scanning',
                        'Advanced smart menu suggestions',
                        'Detailed weekly & monthly stats',
                        'Personalized alerts',
                      ]
                    : [
                        'Scan không giới hạn bằng camera AI',
                        'Gợi ý thực đơn thông minh nâng cao',
                        'Thống kê chi tiết tuần & tháng',
                        'Cảnh báo cá nhân hóa',
                      ],
                buttonText: isEn ? 'Your Current Plan' : 'Gói hiện tại của bạn',
                buttonColor: const Color(0xFF4CAF50),
                isDark: isDark,
              ),

              const SizedBox(height: 16),

              // Plan 3: Gói Gia Đình
              _buildPlanCard(
                title: isEn ? 'Family Plan' : 'Gói Gia Đình (Family)',
                price: isEn ? '\$9.99' : '199.000 VNĐ',
                period: isEn ? '/ year' : '/ năm',
                description: isEn ? 'For up to 5 members managing together' : 'Dành cho tối đa 5 thành viên cùng quản lý',
                isCurrentPlan: false,
                badgeText: isEn ? 'Recommended for families' : 'Khuyên dùng cho gia đình',
                features: isEn
                    ? [
                        'All Individual plan features',
                        'Shared management up to 5 group fridges',
                        'Real-time shopping list sharing',
                        'Priority 24/7 support',
                      ]
                    : [
                        'Tất cả tính năng gói Individual',
                        'Quản lý chung tối đa 5 tủ lạnh nhóm',
                        'Chia sẻ danh sách đi chợ thời gian thực',
                        'Hỗ trợ ưu tiên 24/7',
                      ],
                buttonText: isEn ? 'Upgrade to Family Plan' : 'Nâng cấp lên gói Gia Đình',
                buttonColor: const Color(0xFF008435),
                isDark: isDark,
                onTap: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(isEn ? 'Plan upgrade feature coming soon!' : 'Tính năng nâng cấp gói sắp ra mắt!'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
              ),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlanCard({
    required String title,
    required String price,
    required String period,
    required String description,
    required bool isCurrentPlan,
    String? badgeText,
    required List<String> features,
    required String buttonText,
    required Color buttonColor,
    VoidCallback? onTap,
    bool isDark = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark
            ? (isCurrentPlan ? const Color(0xFF1E3A25) : const Color(0xFF19271E))
            : (isCurrentPlan ? const Color(0xFFF1F8E9) : Colors.white),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: isCurrentPlan
              ? const Color(0xFF4CAF50)
              : (isDark ? const Color(0xFF2E4D36) : const Color(0xFFE0E0E0)),
          width: isCurrentPlan ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (badgeText != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: isCurrentPlan
                    ? const Color(0xFF4CAF50)
                    : const Color(0xFFFFB74D),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                badgeText,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.outfit(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                        color: isDark ? Colors.white : const Color(0xFF006428),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      description,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12.5,
                        color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF757575),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    price,
                    style: GoogleFonts.outfit(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                    ),
                  ),
                  Text(
                    period,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 11.5,
                      color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF757575),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...features.map(
            (feat) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  const Icon(
                    Icons.check_rounded,
                    color: Color(0xFF4CAF50),
                    size: 16,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      feat,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : const Color(0xFF19221C),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onTap,
              style: ElevatedButton.styleFrom(
                backgroundColor: buttonColor,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Text(
                buttonText,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? const [
                    Color(0xFF0E1611),
                    Color(0xFF142017),
                    Color(0xFF1B2E21),
                  ]
                : const [
                    Color(0xFFFFFFFF),
                    Color(0xFFF5FCF4),
                    Color(0xFFC7EFC2),
                    Color(0xFF86D978),
                  ],
            stops: isDark ? const [0.0, 0.5, 1.0] : const [0.0, 0.3, 0.7, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Top Bar Header
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF19271E) : Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C),
                            width: 1.2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                        child: Icon(
                          Icons.arrow_back_rounded,
                          color: isDark ? Colors.white : const Color(0xFF006428),
                          size: 22,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Text(
                      isEn ? 'Membership Plans' : 'Thông tin gói dịch vụ',
                      style: GoogleFonts.outfit(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: isDark ? Colors.white : const Color(0xFF006428),
                      ),
                    ),
                  ],
                ),
              ),

              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20.0,
                    vertical: 12.0,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 6),

                      // 1. Subscription Header Card with package.png Mascot Image
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.only(
                              left: 20,
                              right: 120,
                              top: 20,
                              bottom: 20,
                            ),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(26),
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: isDark
                                    ? const [
                                        Color(0xFF1E3A25),
                                        Color(0xFF2E5B3B),
                                        Color(0xFF3B724A),
                                      ]
                                    : const [
                                        Color(0xFF7CB342),
                                        Color(0xFF8BC34A),
                                        Color(0xFFC0CA33),
                                      ],
                              ),
                              border: isDark
                                  ? Border.all(color: const Color(0xFF2E4D36), width: 1.5)
                                  : null,
                              boxShadow: [
                                BoxShadow(
                                  color: (isDark
                                          ? const Color(0xFF1E3A25)
                                          : const Color(0xFF7CB342))
                                      .withValues(alpha: 0.3),
                                  blurRadius: 14,
                                  offset: const Offset(0, 6),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(4),
                                      decoration: const BoxDecoration(
                                        color: Color(0xFFFFB74D),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.star_rounded,
                                        color: Colors.white,
                                        size: 14,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'FRIGGY PREMIUM',
                                      style: GoogleFonts.outfit(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.white,
                                        letterSpacing: 0.6,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  isEn ? 'Individual Plan' : 'Gói Individual',
                                  style: GoogleFonts.outfit(
                                    fontSize: 26,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                    height: 1.1,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  isEn ? 'Expires in 12/2024' : 'Hết hạn vào 12/2024',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white.withValues(alpha: 0.95),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Integrated Mascot Image (package.png)
                          Positioned(
                            right: -6,
                            top: -18,
                            bottom: -18,
                            width: 145,
                            child: Image.asset(
                              'assets/images/package.png',
                              fit: BoxFit.contain,
                              alignment: Alignment.centerRight,
                              errorBuilder: (context, error, stackTrace) =>
                                  const Icon(
                                Icons.card_giftcard_rounded,
                                size: 64,
                                color: Colors.white30,
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // 2. Timeline Info Box (Ngày mua gói & Ngày kết thúc gói)
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF19271E) : Colors.white,
                          borderRadius: BorderRadius.circular(22),
                          border: Border.all(
                            color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C),
                            width: 1.2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _buildTimelineItem(
                                  icon: Icons.event_available_rounded,
                                  label: isEn ? 'Purchase Date' : 'Ngày mua gói',
                                  value: '15/12/2023',
                                  isDark: isDark,
                                ),
                                Container(
                                  width: 1,
                                  height: 38,
                                  color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFC8E6C9),
                                ),
                                _buildTimelineItem(
                                  icon: Icons.event_busy_rounded,
                                  label: isEn ? 'Expiry Date' : 'Ngày kết thúc gói',
                                  value: '15/12/2024',
                                  isDark: isDark,
                                ),
                              ],
                            ),
                            Divider(
                                height: 22,
                                color: isDark
                                    ? const Color(0xFF2E4D36)
                                    : const Color(0xFFE8F5E9)),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      Icons.verified_user_rounded,
                                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                                      size: 18,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      isEn ? 'Status: ' : 'Trạng thái: ',
                                      style: GoogleFonts.plusJakartaSans(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF757575),
                                      ),
                                    ),
                                    Text(
                                      isEn ? 'Active' : 'Đang hoạt động',
                                      style: GoogleFonts.plusJakartaSans(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w800,
                                        color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  isEn ? '\$4.99/year' : '99.000đ/năm',
                                  style: GoogleFonts.outfit(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w900,
                                    color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // 3. Feature Perks Cards Grid (Matching Screenshots 2 & 3)
                      Text(
                        isEn ? 'Your Plan Benefits' : 'Đặc quyền gói của bạn',
                        style: GoogleFonts.outfit(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF006428),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Perk 1: Scan không giới hạn (Wide card)
                      _buildWidePerkCard(
                        icon: Icons.qr_code_scanner_rounded,
                        iconBgColor: isDark ? const Color(0xFF233629) : const Color(0xFFC8E6C9),
                        iconColor: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                        title: isEn ? 'Unlimited Scan' : 'Scan không giới hạn',
                        subtitle: isEn
                            ? 'Quickly import food with AI camera'
                            : 'Nhập thực phẩm nhanh chóng bằng camera AI',
                        cardBgColor: isDark ? const Color(0xFF19271E) : const Color(0xFFEAF5E1),
                        isDark: isDark,
                      ),

                      const SizedBox(height: 12),

                      // Perks Row 1: Gợi ý thông minh nâng cao & Thống kê tuần & tháng
                      IntrinsicHeight(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(
                              child: _buildSquarePerkCard(
                                icon: Icons.auto_awesome_rounded,
                                iconBgColor: isDark ? const Color(0xFF382E1C) : const Color(0xFFFFF1C5),
                                iconColor: const Color(0xFFFFB74D),
                                title: isEn ? 'Smart AI\nSuggestions' : 'Gợi ý thông minh\nnâng cao',
                                cardBgColor: isDark ? const Color(0xFF19271E) : const Color(0xFFFFFDF5),
                                isDark: isDark,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildSquarePerkCard(
                                icon: Icons.show_chart_rounded,
                                iconBgColor: isDark ? const Color(0xFF1C2D38) : const Color(0xFFE3F2FD),
                                iconColor: const Color(0xFF64B5F6),
                                title: isEn ? 'Weekly &\nMonthly Stats' : 'Thống kê\ntuần & tháng',
                                cardBgColor: isDark ? const Color(0xFF19271E) : const Color(0xFFF5FCF4),
                                isDark: isDark,
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Perk 4: Cảnh báo cá nhân hóa (Wide card)
                      _buildWidePerkCard(
                        icon: Icons.notifications_active_rounded,
                        iconBgColor: isDark ? const Color(0xFF381F1F) : const Color(0xFFFFEBEE),
                        iconColor: isDark ? const Color(0xFFFF8A80) : const Color(0xFFD32F2F),
                        title: isEn ? 'Personalized Alerts' : 'Cảnh báo cá nhân hóa',
                        subtitle: isEn
                            ? 'Auto expiry reminders & shopping list'
                            : 'Tự động nhắc nhở hết hạn & danh sách mua sắm',
                        cardBgColor: isDark ? const Color(0xFF19271E) : Colors.white,
                        isDark: isDark,
                      ),

                      const SizedBox(height: 12),

                      // Perks Row 2: Quản lý tủ nhóm & Trải nghiệm không quảng cáo
                      IntrinsicHeight(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(
                              child: _buildSquarePerkCard(
                                icon: Icons.group_rounded,
                                iconBgColor: isDark ? const Color(0xFF2C1C38) : const Color(0xFFEDE7F6),
                                iconColor: const Color(0xFFB388FF),
                                title: isEn ? 'Group Fridge\nManagement' : 'Quản lý\ntủ nhóm',
                                cardBgColor: isDark ? const Color(0xFF19271E) : Colors.white,
                                isDark: isDark,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildSquarePerkCard(
                                icon: Icons.block_rounded,
                                iconBgColor: isDark ? const Color(0xFF233629) : const Color(0xFFE8F5E9),
                                iconColor: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                                title: isEn ? 'Ad-Free\nExperience' : 'Trải nghiệm\nkhông quảng cáo',
                                cardBgColor: isDark ? const Color(0xFF19271E) : const Color(0xFFF1F8E9),
                                isDark: isDark,
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 28),

                      // 4. Action Button: "Xem các gói dịch vụ"
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _showAllPlansModal,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF4CAF50),
                            elevation: 2,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(28),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.explore_rounded,
                                color: Colors.white,
                                size: 22,
                              ),
                              const SizedBox(width: 10),
                              Text(
                                isEn ? 'View All Service Plans' : 'Xem tất cả các gói dịch vụ',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 15.5,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTimelineItem({
    required IconData icon,
    required String label,
    required String value,
    bool isDark = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon,
                color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                size: 16),
            const SizedBox(width: 4),
            Text(
              label,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF757575),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: GoogleFonts.outfit(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF006428),
          ),
        ),
      ],
    );
  }

  Widget _buildWidePerkCard({
    required IconData icon,
    required Color iconBgColor,
    required Color iconColor,
    required String title,
    required String subtitle,
    required Color cardBgColor,
    bool isDark = false,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF19271E) : cardBgColor,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
            color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C),
            width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: iconBgColor,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.outfit(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF006428),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF558B2F),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSquarePerkCard({
    required IconData icon,
    required Color iconBgColor,
    required Color iconColor,
    required String title,
    required Color cardBgColor,
    bool isDark = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF19271E) : cardBgColor,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
            color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C),
            width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: iconBgColor,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: GoogleFonts.outfit(
              fontSize: 14.5,
              fontWeight: FontWeight.w800,
              color: isDark ? Colors.white : const Color(0xFF006428),
              height: 1.25,
            ),
          ),
        ],
      ),
    );
  }
}
