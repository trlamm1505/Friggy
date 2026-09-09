import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../l10n/app_localizations.dart';
import '../widgets/friggy_app_bar.dart';
import 'recipe_suggestions_screen.dart';

class IngredientStatisticsScreen extends StatefulWidget {
  final int initialTabIndex; // 0 for Tuần, 1 for Tháng

  const IngredientStatisticsScreen({
    super.key,
    this.initialTabIndex = 0,
  });

  @override
  State<IngredientStatisticsScreen> createState() =>
      _IngredientStatisticsScreenState();
}

class _IngredientStatisticsScreenState
    extends State<IngredientStatisticsScreen> {
  late int _selectedTab;

  @override
  void initState() {
    super.initState();
    _selectedTab = widget.initialTabIndex;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0E1611) : const Color(0xFFF4FAF2),
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
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
                    Color(0xFF4CB93E),
                  ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            stops: isDark ? const [0.0, 0.5, 1.0] : const [0.0, 0.24, 0.42, 0.72, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // 1. Header Bar using reusable FriggyAppBar
              const FriggyAppBar(),

              // 2. Scrollable Body Content
              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),

                      // Screen Title
                      Text(
                        isEn ? 'Ingredient Statistics' : 'Thống kê nguyên liệu',
                        style: GoogleFonts.outfit(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF006428),
                          letterSpacing: -0.3,
                        ),
                      ),

                      const SizedBox(height: 14),

                      // 3. Segmented Control Toggle (Tuần / Tháng)
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF19271E) : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: isDark
                              ? Border.all(color: const Color(0xFF2E4D36), width: 1)
                              : null,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _selectedTab = 0;
                                  });
                                },
                                child: Container(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 10),
                                  decoration: BoxDecoration(
                                    color: _selectedTab == 0
                                        ? const Color(0xFF2E7D32)
                                        : Colors.transparent,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Center(
                                    child: Text(
                                      isEn ? 'Week' : 'Tuần',
                                      style: GoogleFonts.plusJakartaSans(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w800,
                                        color: _selectedTab == 0
                                            ? Colors.white
                                            : (isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32)),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _selectedTab = 1;
                                  });
                                },
                                child: Container(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 10),
                                  decoration: BoxDecoration(
                                    color: _selectedTab == 1
                                        ? const Color(0xFF2E7D32)
                                        : Colors.transparent,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Center(
                                    child: Text(
                                      isEn ? 'Month' : 'Tháng',
                                      style: GoogleFonts.plusJakartaSans(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w800,
                                        color: _selectedTab == 1
                                            ? Colors.white
                                            : (isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32)),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 18),

                      // Render body based on selected tab (0 = Tuần, 1 = Tháng)
                      _selectedTab == 0
                          ? _buildWeeklyTabContent(isDark, isEn)
                          : _buildMonthlyTabContent(isDark, isEn),

                      const SizedBox(height: 40),
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

  // ==========================================
  // WEEKLY TAB CONTENT (TUẦN)
  // ==========================================
  Widget _buildWeeklyTabContent(bool isDark, bool isEn) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Top Card: Đã sử dụng (18 món)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF19271E) : const Color(0xFFEAF5E1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
                color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFC8E6C9),
                width: 1),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF233629) : const Color(0xFF4CAF50),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.restaurant_rounded,
                  color: isDark ? const Color(0xFF81C784) : Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isEn ? 'Used' : 'Đã sử dụng',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isEn ? '18 items' : '18 món',
                    style: GoogleFonts.outfit(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: isDark ? Colors.white : const Color(0xFF006428),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Row of 2 Cards: Bị bỏ phí (2 món) & Lãng phí (~85.000đ)
        Row(
          children: [
            // Left Card: Bị bỏ phí
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2D1C1C) : const Color(0xFFFEEBEE),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: isDark ? const Color(0xFF5C2525) : const Color(0xFFFFCDD2),
                      width: 1),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: const BoxDecoration(
                        color: Color(0xFFEF5350),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.delete_outline_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      isEn ? 'Discarded' : 'Bị bỏ phí',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? const Color(0xFFFF8A80) : const Color(0xFFD32F2F),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isEn ? '2 items' : '2 món',
                      style: GoogleFonts.outfit(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: isDark ? const Color(0xFFFF8A80) : const Color(0xFFB71C1C),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 14),
            // Right Card: Lãng phí (~85.000đ)
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2D281C) : const Color(0xFFFFF8E1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: isDark ? const Color(0xFF5C4E25) : const Color(0xFFFFE082),
                      width: 1),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFFB74D),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.savings_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      isEn ? 'Wasted' : 'Lãng phí',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? const Color(0xFFFFD54F) : const Color(0xFFE65100),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isEn ? '~\$3.5' : '~85.000đ',
                      style: GoogleFonts.outfit(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: isDark ? const Color(0xFFFFD54F) : const Color(0xFFBF360C),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 18),

        // 2. Insight từ Friggy Card (Dark Green Box)
        _buildFriggyInsightCard(isDark, isEn),

        const SizedBox(height: 22),

        // 3. Section: Được sử dụng nhiều (Top 4)
        _buildTopUsedSection(isDark, isEn),

        const SizedBox(height: 22),

        // 4. Section: Bị bỏ quên nhiều (Cần chú ý)
        _buildNeglectedSection(isDark, isEn),
      ],
    );
  }

  // ==========================================
  // MONTHLY TAB CONTENT (THÁNG)
  // ==========================================
  Widget _buildMonthlyTabContent(bool isDark, bool isEn) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Monthly Usage Trend Bar Chart Card (Xu hướng dùng)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF19271E) : Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: isDark
                ? Border.all(color: const Color(0xFF2E4D36), width: 1)
                : null,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row: Month title & Trending Percentage Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isEn ? 'October, 2023' : 'Tháng 10, 2023',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isEn ? 'Usage Trend' : 'Xu hướng dùng',
                        style: GoogleFonts.outfit(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF006428),
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Icon(
                        Icons.trending_up_rounded,
                        color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                        size: 18,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '+12%',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Bar Chart Representation
              SizedBox(
                height: 165,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _buildBarItem(isEn ? 'Jul' : 'T.7', 0.52, isSelected: false, isDark: isDark),
                    _buildBarItem(isEn ? 'Aug' : 'T.8', 0.70, isSelected: false, isDark: isDark),
                    _buildBarItem(isEn ? 'Sep' : 'T.9', 0.62, isSelected: false, isDark: isDark),
                    _buildBarItem(isEn ? 'Oct' : 'T.10', 0.95, isSelected: true, tooltip: '24kg', isDark: isDark),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // 2. Grid of 2 Cards: Đã sử dụng (84 món) & Lãng phí (5 món)
        Row(
          children: [
            // Left Card: Đã sử dụng
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF19271E) : const Color(0xFFEAF5E1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFC8E6C9),
                      width: 1),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF233629) : Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.restaurant_rounded,
                        color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                        size: 22,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      isEn ? 'Used' : 'Đã sử dụng',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isEn ? '84 items' : '84 món',
                      style: GoogleFonts.outfit(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: isDark ? Colors.white : const Color(0xFF006428),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 14),
            // Right Card: Lãng phí
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2D1C1C) : const Color(0xFFFEEBEE),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: isDark ? const Color(0xFF5C2525) : const Color(0xFFFFCDD2),
                      width: 1),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF381F1F) : Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.delete_outline_rounded,
                        color: isDark ? const Color(0xFFFF8A80) : const Color(0xFFD32F2F),
                        size: 22,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      isEn ? 'Wasted' : 'Lãng phí',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? const Color(0xFFFF8A80) : const Color(0xFFD32F2F),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isEn ? '5 items' : '5 món',
                      style: GoogleFonts.outfit(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: isDark ? const Color(0xFFFF8A80) : const Color(0xFFB71C1C),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        // 3. Savings Banner: Tiết kiệm ước tính (1.250.000đ)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF19271E) : Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: isDark
                ? Border.all(color: const Color(0xFF2E4D36), width: 1)
                : null,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isEn ? 'Estimated savings vs last month' : 'Tiết kiệm ước tính so với tháng trước',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      isEn ? '~\$50' : '1.250.000đ',
                      style: GoogleFonts.outfit(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        color: isDark ? const Color(0xFFFFD54F) : const Color(0xFF4A3800),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isEn ? 'ⓘ Based on average food value' : 'ⓘ Dựa trên giá trị trung bình thực phẩm',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF888888),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF382E1C) : const Color(0xFFFFF59D),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.savings_rounded,
                  color: Color(0xFFF57F17),
                  size: 34,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 22),

        // 4. Section: So với tháng trước
        Text(
          isEn ? 'Compared to last month' : 'So với tháng trước',
          style: GoogleFonts.outfit(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: isDark ? Colors.white : const Color(0xFF006428),
          ),
        ),

        const SizedBox(height: 14),

        // Card 1: Chỉ số "Sống Xanh"
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF19271E) : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: isDark
                ? Border.all(color: const Color(0xFF2E4D36), width: 1)
                : null,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF233629) : const Color(0xFFE8EAF6),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  Icons.eco_rounded,
                  color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isEn ? '"Eco Living" Score' : 'Chỉ số "Sống Xanh"',
                      style: GoogleFonts.outfit(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF006428),
                      ),
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: LinearProgressIndicator(
                        value: 0.75,
                        minHeight: 8,
                        backgroundColor: isDark ? const Color(0xFF233629) : const Color(0xFFE8F5E9),
                        valueColor: AlwaysStoppedAnimation<Color>(
                            isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              Text(
                '+15%',
                style: GoogleFonts.outfit(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // Card 2: Tần suất mua sắm
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF19271E) : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: isDark
                ? Border.all(color: const Color(0xFF2E4D36), width: 1)
                : null,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF382E1C) : const Color(0xFFEFEBE9),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  Icons.shopping_bag_outlined,
                  color: isDark ? const Color(0xFFFFB74D) : const Color(0xFF8D6E63),
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isEn ? 'Shopping Frequency' : 'Tần suất mua sắm',
                      style: GoogleFonts.outfit(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF006428),
                      ),
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: LinearProgressIndicator(
                        value: 0.4,
                        minHeight: 8,
                        backgroundColor: isDark ? const Color(0xFF233629) : const Color(0xFFE8F5E9),
                        valueColor: AlwaysStoppedAnimation<Color>(
                            isDark ? const Color(0xFFFFB74D) : const Color(0xFF8D6E63)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              Text(
                '-8%',
                style: GoogleFonts.outfit(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: isDark ? const Color(0xFFFFB74D) : const Color(0xFF8D6E63),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 22),

        // 5. Insight từ Friggy Card (Dark Green Box)
        _buildFriggyInsightCard(isDark, isEn),

        const SizedBox(height: 22),

        // 6. Section: Được sử dụng nhiều (Top 4)
        _buildTopUsedSection(isDark, isEn),

        const SizedBox(height: 22),

        // 7. Section: Bị bỏ quên nhiều (Cần chú ý)
        _buildNeglectedSection(isDark, isEn),
      ],
    );
  }

  // Bar Item Widget for Usage Trend Chart
  Widget _buildBarItem(String label, double heightFactor,
      {required bool isSelected, String? tooltip, bool isDark = false}) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        if (tooltip != null) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.15),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Text(
              tooltip,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
                color: isDark ? const Color(0xFF19271E) : Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 6),
        ] else ...[
          const SizedBox(height: 27),
        ],
        Container(
          width: 54,
          height: 100 * heightFactor,
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32))
                : (isDark ? const Color(0xFF233629) : const Color(0xFFDCEDC8)),
            borderRadius: BorderRadius.circular(12),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: (isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32))
                          .withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ]
                : null,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
            color: isSelected
                ? (isDark ? const Color(0xFF81C784) : const Color(0xFF006428))
                : (isDark ? const Color(0xFF9DA8A0) : const Color(0xFF666666)),
          ),
        ),
      ],
    );
  }

  // Insight từ Friggy Box (High-contrast, crisp readable styling)
  Widget _buildFriggyInsightCard(bool isDark, bool isEn) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF19271E) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C),
          width: 1.4,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.08),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row: Smart Robot Icon Badge + "Insight từ Friggy" Title
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF233629) : const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.smart_toy_rounded,
                  color: isDark ? const Color(0xFF81C784) : const Color(0xFF008435),
                  size: 22,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                isEn ? 'Friggy Insights' : 'Insight từ Friggy',
                style: GoogleFonts.outfit(
                  fontSize: 19,
                  fontWeight: FontWeight.w900,
                  color: isDark ? Colors.white : const Color(0xFF006428),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Body Text with High-Contrast Dark Text & Highlighted Green Words
          RichText(
            text: TextSpan(
              style: GoogleFonts.plusJakartaSans(
                fontSize: 15.0,
                color: isDark ? const Color(0xFFD0D7D1) : const Color(0xFF2C3E35),
                height: 1.5,
                fontWeight: FontWeight.w500,
              ),
              children: isEn
                  ? [
                      TextSpan(
                        text: 'Friggy gentle reminder!\nThis week ',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : const Color(0xFF19221C),
                        ),
                      ),
                      TextSpan(
                        text: 'eggs',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          color: isDark ? const Color(0xFF81C784) : const Color(0xFF008435),
                        ),
                      ),
                      const TextSpan(text: ' and '),
                      TextSpan(
                        text: 'tomatoes',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          color: isDark ? const Color(0xFF81C784) : const Color(0xFF008435),
                        ),
                      ),
                      const TextSpan(text: ' appeared quite often 👀\nLet\'s '),
                      TextSpan(
                        text: 'switch up your menu with a diverse and balanced diet',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                        ),
                      ),
                      const TextSpan(text: ' for next week!'),
                    ]
                  : [
                      TextSpan(
                        text: 'Friggy nhắc nhẹ nè!\nTuần này ',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : const Color(0xFF19221C),
                        ),
                      ),
                      TextSpan(
                        text: 'trứng',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          color: isDark ? const Color(0xFF81C784) : const Color(0xFF008435),
                        ),
                      ),
                      const TextSpan(text: ' và '),
                      TextSpan(
                        text: 'cà chua',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          color: isDark ? const Color(0xFF81C784) : const Color(0xFF008435),
                        ),
                      ),
                      const TextSpan(text: ' xuất hiện hơi nhiều đó 👀\nCùng '),
                      TextSpan(
                        text: 'đổi vị với thực đơn đa dạng và cân bằng hơn',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                        ),
                      ),
                      const TextSpan(text: ' cho tuần tới nhé!'),
                    ],
            ),
          ),

          const SizedBox(height: 18),

          // Action Button: Solid Green Button with Crisp White Text
          GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const RecipeSuggestionsScreen(),
                ),
              );
            },
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 13),
              decoration: BoxDecoration(
                color: const Color(0xFF008435),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF008435).withValues(alpha: 0.25),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    isEn ? 'Explore now!' : 'Cùng khám phá nhé!',
                    style: GoogleFonts.outfit(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Icon(
                    Icons.arrow_forward_rounded,
                    color: Colors.white,
                    size: 18,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Top Used Section
  Widget _buildTopUsedSection(bool isDark, bool isEn) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              isEn ? 'Most Used' : 'Được sử dụng nhiều',
              style: GoogleFonts.outfit(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: isDark ? Colors.white : const Color(0xFF006428),
              ),
            ),
            Text(
              'Top 4',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF19271E) : Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: isDark
                ? Border.all(color: const Color(0xFF2E4D36), width: 1)
                : null,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            children: [
              _buildUsageProgressItem(
                isEn ? 'Eggs' : 'Trứng',
                isEn ? '8 units' : '8 đơn vị',
                0.85,
                isDark,
              ),
              const SizedBox(height: 14),
              _buildUsageProgressItem(
                isEn ? 'Tomatoes' : 'Cà chua',
                isEn ? '6 units' : '6 đơn vị',
                0.65,
                isDark,
              ),
              const SizedBox(height: 14),
              _buildUsageProgressItem(
                isEn ? 'Green Onion' : 'Hành lá',
                isEn ? '5 units' : '5 đơn vị',
                0.55,
                isDark,
              ),
              const SizedBox(height: 14),
              _buildUsageProgressItem(
                isEn ? 'Fresh Milk' : 'Sữa tươi',
                isEn ? '4 units' : '4 đơn vị',
                0.45,
                isDark,
              ),
            ],
          ),
        ),
      ],
    );
  }

  // Neglected Section
  Widget _buildNeglectedSection(bool isDark, bool isEn) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              isEn ? 'Most Neglected' : 'Bị bỏ quên nhiều',
              style: GoogleFonts.outfit(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: isDark ? Colors.white : const Color(0xFF006428),
              ),
            ),
            Text(
              isEn ? 'Needs Attention' : 'Cần chú ý',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: isDark ? const Color(0xFFFF8A80) : const Color(0xFFD32F2F),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _buildNeglectedCard(
          name: isEn ? 'Tomatoes' : 'cà chua',
          subtitle: isEn ? '7 days in fridge' : 'Để trong tủ 7 ngày',
          tagText: isEn ? 'Expiring soon' : 'Sắp hỏng',
          tagBgColor: isDark ? const Color(0xFF2D1C1C) : const Color(0xFFFFEBEE),
          tagTextColor: isDark ? const Color(0xFFFF8A80) : const Color(0xFFD32F2F),
          imagePath: 'assets/images/recipe_tomato_egg.png',
          fallbackIcon: Icons.circle_outlined,
          isDark: isDark,
        ),
        const SizedBox(height: 12),
        _buildNeglectedCard(
          name: isEn ? 'Lettuce' : 'Xà lách',
          subtitle: isEn ? '5 days in fridge' : 'Để trong tủ 5 ngày',
          tagText: isEn ? 'Neglected' : 'Bỏ quên',
          tagBgColor: isDark ? const Color(0xFF381F1F) : const Color(0xFFEF9A9A),
          tagTextColor: isDark ? const Color(0xFFFF8A80) : const Color(0xFFB71C1C),
          imagePath: 'assets/images/recipe_salad.png',
          fallbackIcon: Icons.eco_outlined,
          isDark: isDark,
        ),
      ],
    );
  }

  // Progress Bar Item Helper
  Widget _buildUsageProgressItem(
      String title, String countText, double progress, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: GoogleFonts.outfit(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: isDark ? Colors.white : const Color(0xFF006428),
              ),
            ),
            Text(
              countText,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
                color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 10,
            backgroundColor: isDark ? const Color(0xFF233629) : const Color(0xFFF1F8E9),
            valueColor: AlwaysStoppedAnimation<Color>(
                isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32)),
          ),
        ),
      ],
    );
  }

  // Neglected Card Helper
  Widget _buildNeglectedCard({
    required String name,
    required String subtitle,
    required String tagText,
    required Color tagBgColor,
    required Color tagTextColor,
    required String imagePath,
    required IconData fallbackIcon,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF19271E) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: isDark
            ? Border.all(color: const Color(0xFF2E4D36), width: 1)
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.asset(
              imagePath,
              width: 48,
              height: 48,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  width: 48,
                  height: 48,
                  color: isDark ? const Color(0xFF233629) : const Color(0xFFF1F8E9),
                  child: Icon(fallbackIcon,
                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32)),
                );
              },
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF19221C),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF666666),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: tagBgColor,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              tagText,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
                color: tagTextColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
