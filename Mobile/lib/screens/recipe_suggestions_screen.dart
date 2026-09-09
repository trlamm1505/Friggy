import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/mock_recipe_data.dart';
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

class _RecipeSuggestionsScreenState extends State<RecipeSuggestionsScreen> {
  List<RecipeModel> _recipes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadRecipes();
  }

  Future<void> _loadRecipes() async {
    final list = await RecipeRepository.fetchCookingSuggestions();
    if (mounted) {
      setState(() {
        _recipes = list;
        _isLoading = false;
      });
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
                          ? 'Sorted by match percentage from available ingredients'
                          : 'Sắp xếp theo tỷ lệ phù hợp từ thực phẩm sẵn có',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                        color: isDark
                            ? const Color(0xFF9DA8A0)
                            : const Color(0xFF1B5E20),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Recipes List matching screenshot card layout
              Expanded(
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFF008435),
                        ),
                      )
                    : ListView.separated(
                        physics: const BouncingScrollPhysics(),
                        padding: const EdgeInsets.symmetric(horizontal: 20.0),
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
                  child: Image.asset(
                    recipe.imagePath,
                    width: double.infinity,
                    height: 185,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        height: 185,
                        color: isDark
                            ? const Color(0xFF233629)
                            : const Color(0xFFC8E6C9),
                        child: Center(
                          child: Icon(
                            Icons.restaurant_rounded,
                            size: 64,
                            color: isDark
                                ? const Color(0xFF81C784)
                                : const Color(0xFF008435),
                          ),
                        ),
                      );
                    },
                  ),
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
