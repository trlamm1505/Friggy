import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/mock_recipe_data.dart';
import '../l10n/app_localizations.dart';
import '../screens/recipe_suggestions_screen.dart';

class CookingSuggestionsSection extends StatefulWidget {
  final VoidCallback? onUpgradeTap;
  final ValueChanged<RecipeModel>? onRecipeTap;

  const CookingSuggestionsSection({
    super.key,
    this.onUpgradeTap,
    this.onRecipeTap,
  });

  @override
  State<CookingSuggestionsSection> createState() =>
      _CookingSuggestionsSectionState();
}

class _CookingSuggestionsSectionState
    extends State<CookingSuggestionsSection> {
  late Future<List<RecipeModel>> _recipesFuture;

  @override
  void initState() {
    super.initState();
    _recipesFuture = RecipeRepository.fetchCookingSuggestions();
  }

  String _translateIngredient(String raw, bool isEn) {
    if (!isEn) return raw;
    final map = {
      'Trứng': 'Egg',
      'Cà chua': 'Tomato',
      'Hành lá': 'Green Onion',
      'Dưa chuột': 'Cucumber',
      'Cà chua bi': 'Cherry Tomato',
      'Xà lách': 'Lettuce',
      'Ngô': 'Corn',
      'Cà rốt': 'Carrot',
      'Súp lơ': 'Broccoli',
      'Bắp cải': 'Cabbage',
      'Thịt heo': 'Pork',
      'Thịt bò': 'Beef',
      'Tôm': 'Shrimp',
      'Cá': 'Fish',
      'Tỏi': 'Garlic',
      'Hành tây': 'Onion',
    };
    return map[raw] ?? raw;
  }

  void _openRecipeSuggestions() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const RecipeSuggestionsScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Title Row: "Cooking Suggestions For You" + "Xem tất cả ›"
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            GestureDetector(
              onTap: _openRecipeSuggestions,
              child: Text(
                isEn ? 'Suggested Recipes For You' : 'Gợi Ý Món Ăn Cho Bạn',
                style: GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: 0.2,
                ),
              ),
            ),
            GestureDetector(
              onTap: _openRecipeSuggestions,
              child: Row(
                children: [
                  Text(
                    isEn ? 'See all' : 'Xem tất cả',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: Colors.white.withValues(alpha: 0.95),
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: Colors.white,
                    size: 18,
                  ),
                ],
              ),
            ),
          ],
        ),

        const SizedBox(height: 6),

        // 2. Yellow PREMIUM Badge & Subtitle
        Row(
          children: [
            GestureDetector(
              onTap: widget.onUpgradeTap,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFC107),
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 4,
                      offset: const Offset(0, 1.5),
                    ),
                  ],
                ),
                child: Text(
                  'PREMIUM',
                  style: GoogleFonts.outfit(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF1B5E20),
                    letterSpacing: 0.4,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _openRecipeSuggestions,
              child: Text(
                isEn ? 'Upgrade to Premium to view all' : 'Nâng cấp Premium để xem tất cả',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  fontStyle: FontStyle.italic,
                  fontWeight: FontWeight.w500,
                  color: Colors.white.withValues(alpha: 0.85),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        // 4. Horizontal Scrollable List of Recipe Cards
        SizedBox(
          height: 226,
          child: FutureBuilder<List<RecipeModel>>(
            future: _recipesFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(
                  child: CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 2.5,
                  ),
                );
              }

              final recipes = snapshot.data ?? [];

              return ListView.separated(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: EdgeInsets.zero,
                clipBehavior: Clip.none,
                itemCount: recipes.length,
                separatorBuilder: (context, index) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  return _buildRecipeCard(recipes[index], isDark, isEn);
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRecipeCard(RecipeModel recipe, bool isDark, bool isEn) {
    final titleText = isEn && recipe.englishTitle.isNotEmpty ? recipe.englishTitle : recipe.title;

    return GestureDetector(
      onTap: () => widget.onRecipeTap?.call(recipe),
      child: Container(
        width: 235,
        height: 222,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF19271E) : Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: isDark
              ? Border.all(color: const Color(0xFF2E4D36), width: 1)
              : null,
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
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top Image Section with Cooking Time Badge
            SizedBox(
              height: 138,
              child: Stack(
                children: [
                  // Recipe Image
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                    child: Image.asset(
                      recipe.imagePath,
                      width: 235,
                      height: 138,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          width: 235,
                          height: 138,
                          color: isDark
                              ? const Color(0xFF233629)
                              : const Color(0xFFE8F5E9),
                          child: Icon(
                            Icons.restaurant_menu_rounded,
                            size: 44,
                            color: isDark
                                ? const Color(0xFF81C784)
                                : const Color(0xFF2E7D32),
                          ),
                        );
                      },
                    ),
                  ),

                  // Floating Cooking Time Badge (Bottom Left)
                  Positioned(
                    bottom: 10,
                    left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.48),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.access_time_rounded,
                            color: Colors.white,
                            size: 14,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${recipe.cookingTimeMinutes} mins',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Bottom Content Section: Recipe Title & Ingredient Chips
            Padding(
              padding: const EdgeInsets.only(left: 12, top: 10, right: 12, bottom: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    titleText,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.outfit(
                      fontSize: 16.5,
                      fontWeight: FontWeight.w900,
                      color: isDark ? Colors.white : const Color(0xFF008435),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          physics: const NeverScrollableScrollPhysics(),
                          child: Row(
                            children: [
                              ...recipe.ingredients.map(
                                (ingredient) => Padding(
                                  padding: const EdgeInsets.only(right: 5.0),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 9,
                                      vertical: 3.5,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isDark
                                          ? const Color(0xFF233629)
                                          : const Color(0xFFF1F8E9),
                                      borderRadius: BorderRadius.circular(9),
                                    ),
                                    child: Text(
                                      _translateIngredient(ingredient, isEn),
                                      style: GoogleFonts.plusJakartaSans(
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w700,
                                        color: isDark
                                            ? const Color(0xFF81C784)
                                            : const Color(0xFF2E7D32),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              if (recipe.extraIngredientsCount > 0)
                                Text(
                                  '+${recipe.extraIngredientsCount}',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: isDark
                                        ? const Color(0xFF81C784)
                                        : const Color(0xFF55A44B),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ],
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
