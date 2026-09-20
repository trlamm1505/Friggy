import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/models/recipe_model.dart';
import '../l10n/app_localizations.dart';
import '../widgets/friggy_app_bar.dart';
import 'recipe_detail_screen.dart';

class RecipeSuggestionsScreen extends StatefulWidget {
  final List<String> availableIngredients;

  const RecipeSuggestionsScreen({
    super.key,
    this.availableIngredients = const ['Tomatoes', 'Bok Choy', 'Minced Pork'],
  });

  @override
  State<RecipeSuggestionsScreen> createState() =>
      _RecipeSuggestionsScreenState();
}

class _RecipeSuggestionsScreenState extends State<RecipeSuggestionsScreen>
    with SingleTickerProviderStateMixin {
  List<RecipeModel> _recipes = [];
  bool _isLoading = true;
  String _loadingStepMessage = '🤖 AI Friggy đang khởi tạo...';
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseAnimation =
        Tween<double>(begin: 0.9, end: 1.1).animate(_pulseController);
    _loadRecipes();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _loadRecipes() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _loadingStepMessage = '🤖 AI Friggy đang kết nối hệ thống...';
    });

    try {
      // Fetch AI recipes using POST /meal-planning/plans/generate-from-expiring
      final list = await RecipeRepository.fetchCookingSuggestions(
        onProgress: (msg) {
          if (mounted) {
            setState(() {
              _loadingStepMessage = msg;
            });
          }
        },
      );

      if (mounted) {
        setState(() {
          _recipes = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('[RecipeSuggestionsScreen] Error: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
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
                    Color(0xFFE8F5E9),
                    Color(0xFFA5D6A7),
                    Color(0xFF81C784),
                  ],
            stops: const [0.0, 0.5, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Top Header using reusable FriggyAppBar
              const FriggyAppBar(),

              if (!_isLoading) ...[
                const SizedBox(height: 4),

                // Title Section
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isEn ? 'AI Recipe Suggestions' : 'Gợi Ý Món Ăn AI',
                        style: GoogleFonts.outfit(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF006428),
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isEn
                            ? 'Prioritizing expiring ingredients'
                            : 'Ưu tiên giải cứu nguyên liệu sắp hết hạn',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? const Color(0xFF81C784)
                              : const Color(0xFF1B5E20),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),
              ],

              // Body Content: AI Loading, Empty State or Recipes List
              Expanded(
                child: _isLoading
                    ? _buildAiLoadingState(isDark, isEn)
                    : _recipes.isEmpty
                        ? _buildEmptyState(isDark, isEn)
                        : ListView.separated(
                            physics: const BouncingScrollPhysics(),
                            padding:
                                const EdgeInsets.symmetric(horizontal: 20.0),
                            itemCount: _recipes.length,
                            separatorBuilder: (context, index) =>
                                const SizedBox(height: 18),
                            itemBuilder: (context, index) {
                              final recipe = _recipes[index];
                              return _buildRecipeCard(recipe, isDark, isEn);
                            },
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // WOW AI Loading State Widget with pulsing animation and dynamic messages
  Widget _buildAiLoadingState(bool isDark, bool isEn) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32.0),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF19271E) : Colors.white,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: isDark
                  ? const Color(0xFF2E4D36)
                  : const Color(0xFFA5D6A7),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ScaleTransition(
                scale: _pulseAnimation,
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF4CAF50), Color(0xFF2E7D32)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF4CAF50).withValues(alpha: 0.4),
                        blurRadius: 16,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.auto_awesome_rounded,
                    color: Colors.white,
                    size: 38,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                _loadingStepMessage,
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : const Color(0xFF006428),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                isEn
                    ? 'AI is generating recipes from expiring food...'
                    : 'Hệ thống đang lập món ăn tiết kiệm nguyên liệu cho bạn...',
                textAlign: TextAlign.center,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: isDark
                      ? const Color(0xFF9DA8A0)
                      : const Color(0xFF666666),
                ),
              ),
              const SizedBox(height: 20),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: const SizedBox(
                  width: 180,
                  child: LinearProgressIndicator(
                    minHeight: 6,
                    backgroundColor: Color(0xFFC8E6C9),
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF2E7D32)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Empty State Widget when no recipes returned
  Widget _buildEmptyState(bool isDark, bool isEn) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32.0),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF19271E) : Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: isDark
                  ? const Color(0xFF2E4D36)
                  : const Color(0xFFC8E6C9),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: isDark
                      ? const Color(0xFF233629)
                      : const Color(0xFFE8F5E9),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.soup_kitchen_outlined,
                  size: 32,
                  color: isDark
                      ? const Color(0xFF81C784)
                      : const Color(0xFF2E7D32),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                isEn ? 'No Recipe Suggestions Yet' : 'Chưa có gợi ý món ăn',
                style: GoogleFonts.outfit(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : const Color(0xFF006428),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                isEn
                    ? 'Try adding ingredients to your fridge or check back in a moment.'
                    : 'Chưa tìm thấy món ăn từ thực phẩm sắp hết hạn. Vui lòng thêm thực phẩm vào tủ lạnh!',
                textAlign: TextAlign.center,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark
                      ? const Color(0xFF9DA8A0)
                      : const Color(0xFF666666),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _loadRecipes,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: Text(
                  isEn ? 'Retry' : 'Thử lại',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2E7D32),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCardImage(RecipeModel recipe, bool isDark) {
    final path = recipe.imagePath;

    Widget fallbackWidget() {
      return Container(
        height: 185,
        color: isDark ? const Color(0xFF233629) : const Color(0xFFC8E6C9),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.restaurant_rounded,
                size: 56,
                color: isDark
                    ? const Color(0xFF81C784)
                    : const Color(0xFF008435),
              ),
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Text(
                  recipe.title,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: isDark
                        ? const Color(0xFF81C784)
                        : const Color(0xFF008435),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return Image.network(
        path,
        width: double.infinity,
        height: 185,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => fallbackWidget(),
      );
    }

    if (path.startsWith('/')) {
      final fullUrl = 'http://10.0.2.2:6969$path';
      return Image.network(
        fullUrl,
        width: double.infinity,
        height: 185,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => fallbackWidget(),
      );
    }

    return Image.asset(
      path.isNotEmpty ? path : 'assets/images/recipe_tomato_egg.png',
      width: double.infinity,
      height: 185,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) {
        return Image.asset(
          'assets/images/recipe_tomato_egg.png',
          width: double.infinity,
          height: 185,
          fit: BoxFit.cover,
          errorBuilder: (c, e, s) => fallbackWidget(),
        );
      },
    );
  }

  Widget _buildRecipeCard(RecipeModel recipe, bool isDark, bool isEn) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => RecipeDetailScreen(recipe: recipe),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF19271E) : Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: isDark
              ? Border.all(color: const Color(0xFF2E4D36), width: 1.5)
              : null,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.08),
              blurRadius: 14,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Banner Image Container with Badges
            Stack(
              children: [
                // Recipe Photo Banner
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(22),
                  ),
                  child: _buildCardImage(recipe, isDark),
                ),

                // Top Left Green Match Badge (e.g. ✔ 95% phù hợp / 95% match)
                Positioned(
                  top: 14,
                  left: 14,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: isDark
                          ? const Color(0xFF233629)
                          : const Color(0xFFA5D6A7),
                      borderRadius: BorderRadius.circular(20),
                      border: isDark
                          ? Border.all(
                              color: const Color(0xFF2E4D36), width: 1)
                          : null,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black
                              .withValues(alpha: isDark ? 0.2 : 0.15),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.check_circle_rounded,
                          color: isDark
                              ? const Color(0xFF81C784)
                              : const Color(0xFF006428),
                          size: 18,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          recipe.displayMatchText(isEn),
                          style: GoogleFonts.outfit(
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            color: isDark
                                ? const Color(0xFF81C784)
                                : const Color(0xFF006428),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Bottom Content Area
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Dish Title
                  Text(
                    recipe.displayTitle(isEn),
                    style: GoogleFonts.outfit(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: isDark ? Colors.white : const Color(0xFF006428),
                      letterSpacing: -0.2,
                    ),
                  ),

                  const SizedBox(height: 8),

                  // Meta Info Row (Cooking time, difficulty, servings)
                  Row(
                    children: [
                      Icon(
                        Icons.access_time_rounded,
                        size: 16,
                        color: isDark
                            ? const Color(0xFF81C784)
                            : const Color(0xFF4CAF50),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        recipe.displayTimeText(isEn),
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? const Color(0xFF81C784)
                              : const Color(0xFF43A047),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Icon(
                        Icons.restaurant_menu_rounded,
                        size: 16,
                        color: isDark
                            ? const Color(0xFF81C784)
                            : const Color(0xFF4CAF50),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        recipe.displayDifficultyText(isEn),
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? const Color(0xFF81C784)
                              : const Color(0xFF43A047),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Icon(
                        Icons.people_alt_rounded,
                        size: 16,
                        color: isDark
                            ? const Color(0xFF81C784)
                            : const Color(0xFF4CAF50),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        recipe.displayServingsText(isEn),
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? const Color(0xFF81C784)
                              : const Color(0xFF43A047),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Hashtag Pills Row (# Trứng, # Cà chua, # Hành lá)
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: recipe.displayTags(isEn).map((tag) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF233629)
                              : const Color(0xFFE8F5E9),
                          borderRadius: BorderRadius.circular(14),
                          border: isDark
                              ? Border.all(
                                  color: const Color(0xFF2E4D36), width: 1)
                              : null,
                        ),
                        child: Text(
                          tag,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: isDark
                                ? const Color(0xFF81C784)
                                : const Color(0xFF008435),
                          ),
                        ),
                      );
                    }).toList(),
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
