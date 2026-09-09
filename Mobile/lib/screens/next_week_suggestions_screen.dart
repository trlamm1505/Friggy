import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/mock_recipe_data.dart';
import '../l10n/app_localizations.dart';
import '../widgets/friggy_app_bar.dart';
import 'recipe_detail_screen.dart';

class NextWeekSuggestionsScreen extends StatelessWidget {
  const NextWeekSuggestionsScreen({super.key});

  String _translateIngredientTitle(String title, bool isEn) {
    if (!isEn) return title;
    final map = {
      'Rau xanh': 'Greens',
      'Bơ': 'Avocado',
      'Nấm': 'Mushrooms',
      'Cá hồi': 'Salmon',
    };
    return map[title] ?? title;
  }

  String _translateDayText(String day, bool isEn) {
    if (!isEn) return day;
    final map = {
      'Thứ 2': 'Mon',
      'Thứ 3': 'Tue',
      'Thứ 4': 'Wed',
      'Thứ 5': 'Thu',
    };
    return map[day] ?? day;
  }

  String _translateDishTitle(String dish, bool isEn) {
    if (!isEn) return dish;
    final map = {
      'Canh rau củ': 'Vegetable Soup',
      'Cá hồi áp chảo rau xanh': 'Seared Salmon & Greens',
      'Bò xào bông cải': 'Beef & Broccoli Stir-Fry',
      'Trứng chiên cà chua': 'Tomato Scrambled Eggs',
    };
    return map[dish] ?? dish;
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
                    Color(0xFFFFFFFF), // Pure white at top header
                    Color(0xFFF5FCF4), // Soft white tint
                    Color(0xFFC7EFC2), // Fresh light green
                    Color(0xFF86D978), // Vibrant green lower section
                    Color(0xFF4CB93E), // Rich green at bottom
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
                        isEn ? 'Suggestions for Next Week' : 'Gợi ý cho tuần tới',
                        style: GoogleFonts.outfit(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF006428),
                          letterSpacing: -0.3,
                        ),
                      ),

                      const SizedBox(height: 16),

                      // 1. Nhận xét tổng quan Card with suggest.png mascot
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
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header Row: Icon + "Nhận xét tổng quan"
                            Row(
                              children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: isDark ? const Color(0xFF233629) : const Color(0xFF2E7D32),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    Icons.bar_chart_rounded,
                                    color: isDark ? const Color(0xFF81C784) : Colors.white,
                                    size: 22,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Text(
                                  isEn ? 'General Overview' : 'Nhận xét tổng quan',
                                  style: GoogleFonts.outfit(
                                    fontSize: 21,
                                    fontWeight: FontWeight.w900,
                                    color: isDark ? Colors.white : const Color(0xFF006428),
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 16),

                            // Body Content Row: Text on left + Mascot Image (suggest.png) on right
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      RichText(
                                        text: TextSpan(
                                          style: GoogleFonts.plusJakartaSans(
                                            fontSize: 15.5,
                                            color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF558B2F),
                                            fontWeight: FontWeight.w600,
                                            height: 1.45,
                                          ),
                                          children: isEn
                                              ? [
                                                  const TextSpan(text: 'This week you used a lot of '),
                                                  TextSpan(
                                                    text: 'eggs',
                                                    style: TextStyle(
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.w900,
                                                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                                                    ),
                                                  ),
                                                  const TextSpan(text: ' and '),
                                                  TextSpan(
                                                    text: 'tomatoes',
                                                    style: TextStyle(
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.w900,
                                                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                                                    ),
                                                  ),
                                                  const TextSpan(text: ', lacking '),
                                                  TextSpan(
                                                    text: 'greens',
                                                    style: TextStyle(
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.w900,
                                                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                                                    ),
                                                  ),
                                                  const TextSpan(text: ' and foods rich in '),
                                                  TextSpan(
                                                    text: 'omega-3',
                                                    style: TextStyle(
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.w900,
                                                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                                                    ),
                                                  ),
                                                  const TextSpan(text: '.'),
                                                ]
                                              : [
                                                  const TextSpan(text: 'Tuần này bạn dùng nhiều '),
                                                  TextSpan(
                                                    text: 'trứng',
                                                    style: TextStyle(
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.w900,
                                                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                                                    ),
                                                  ),
                                                  const TextSpan(text: ' và '),
                                                  TextSpan(
                                                    text: 'cà chua',
                                                    style: TextStyle(
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.w900,
                                                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                                                    ),
                                                  ),
                                                  const TextSpan(text: ', thiếu '),
                                                  TextSpan(
                                                    text: 'rau xanh',
                                                    style: TextStyle(
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.w900,
                                                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                                                    ),
                                                  ),
                                                  const TextSpan(text: ' và thực phẩm giàu '),
                                                  TextSpan(
                                                    text: 'omega-3',
                                                    style: TextStyle(
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.w900,
                                                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                                                    ),
                                                  ),
                                                  const TextSpan(text: '.'),
                                                ],
                                        ),
                                      ),
                                      const SizedBox(height: 14),
                                      Container(
                                        height: 1,
                                        color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFC8E6C9),
                                      ),
                                      const SizedBox(height: 12),
                                      Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.center,
                                        children: [
                                          Icon(
                                            Icons.favorite_rounded,
                                            color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                                            size: 18,
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              isEn
                                                  ? 'Let\'s balance nutrition for next week!'
                                                  : 'Cùng cân bằng dinh dưỡng cho tuần tới nhé!',
                                              style:
                                                  GoogleFonts.plusJakartaSans(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w800,
                                                color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                                                height: 1.3,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                // Mascot Image using suggest.png (Larger, Scaled & Shifted Up)
                                Transform.translate(
                                  offset: const Offset(8, -12),
                                  child: Transform.scale(
                                    scale: 1.25,
                                    alignment: Alignment.centerRight,
                                    child: Image.asset(
                                      'assets/images/suggest.png',
                                      width: 130,
                                      height: 160,
                                      fit: BoxFit.contain,
                                      errorBuilder: (context, error, stackTrace) {
                                        return Container(
                                          width: 130,
                                          height: 160,
                                          color: isDark ? const Color(0xFF233629) : const Color(0xFFE8F5E9),
                                          child: Icon(
                                            Icons.smart_toy_rounded,
                                            size: 70,
                                            color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                                          ),
                                        );
                                      },
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 22),

                      // 2. Section: Gợi ý thực phẩm cho tuần tới
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF19271E) : Colors.white,
                          borderRadius: BorderRadius.circular(30),
                          border: Border.all(
                            color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                            width: 1.5,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF233629) : const Color(0xFF2E7D32),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                Icons.restaurant_rounded,
                                color: isDark ? const Color(0xFF81C784) : Colors.white,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isEn ? 'Food Suggestions for Next Week' : 'Gợi ý thực phẩm cho tuần tới',
                                  style: GoogleFonts.outfit(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w900,
                                    color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                                  ),
                                ),
                                Text(
                                  isEn ? 'Convenient & Nutritious' : 'Tiện lợi và dinh dưỡng',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF55A44B),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 14),

                      // Horizontal List of Suggested Ingredients
                      SizedBox(
                        height: 145,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          children: [
                            _buildIngredientCard(
                              title: _translateIngredientTitle('Rau xanh', isEn),
                              imagePath: 'assets/images/food_bokchoy.png',
                              fallbackIcon: Icons.eco_outlined,
                              isDark: isDark,
                            ),
                            const SizedBox(width: 12),
                            _buildIngredientCard(
                              title: _translateIngredientTitle('Bơ', isEn),
                              imagePath: 'assets/images/recipe_salad.png',
                              fallbackIcon: Icons.eco_rounded,
                              isDark: isDark,
                            ),
                            const SizedBox(width: 12),
                            _buildIngredientCard(
                              title: _translateIngredientTitle('Nấm', isEn),
                              imagePath: 'assets/images/recipe_veggie_soup.png',
                              fallbackIcon: Icons.soup_kitchen_rounded,
                              isDark: isDark,
                            ),
                            const SizedBox(width: 12),
                            _buildIngredientCard(
                              title: _translateIngredientTitle('Cá hồi', isEn),
                              imagePath: 'assets/images/recipe_salad.png',
                              fallbackIcon: Icons.set_meal_outlined,
                              isDark: isDark,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // 3. Section: Gợi ý thực đơn cho tuần tới
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF19271E) : Colors.white,
                          borderRadius: BorderRadius.circular(30),
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
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isEn ? 'Menu Suggestions for Next Week' : 'Gợi ý thực đơn cho tuần tới',
                              style: GoogleFonts.outfit(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: isDark ? Colors.white : const Color(0xFF006428),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              isEn
                                  ? 'Simple, easy to cook, and balanced menu!'
                                  : 'Thực đơn đơn giản, dễ nấu và đủ chất!',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: isDark ? const Color(0xFF81C784) : const Color(0xFF55A44B),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 14),

                      // Horizontal List of Daily Meal Plan Cards
                      SizedBox(
                        height: 235,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          children: [
                            _buildMealPlanCard(
                              context: context,
                              dayText: _translateDayText('Thứ 2', isEn),
                              dishTitle: _translateDishTitle('Canh rau củ', isEn),
                              imagePath: 'assets/images/recipe_veggie_soup.png',
                              recipeId: 'rec_veggie_soup',
                              isDark: isDark,
                            ),
                            const SizedBox(width: 14),
                            _buildMealPlanCard(
                              context: context,
                              dayText: _translateDayText('Thứ 3', isEn),
                              dishTitle: _translateDishTitle('Cá hồi áp chảo rau xanh', isEn),
                              imagePath: 'assets/images/recipe_salad.png',
                              recipeId: 'rec_salad_mix',
                              isDark: isDark,
                            ),
                            const SizedBox(width: 14),
                            _buildMealPlanCard(
                              context: context,
                              dayText: _translateDayText('Thứ 4', isEn),
                              dishTitle: _translateDishTitle('Bò xào bông cải', isEn),
                              imagePath: 'assets/images/food_bokchoy.png',
                              recipeId: 'rec_bokchoy_pork',
                              isDark: isDark,
                            ),
                            const SizedBox(width: 14),
                            _buildMealPlanCard(
                              context: context,
                              dayText: _translateDayText('Thứ 5', isEn),
                              dishTitle: _translateDishTitle('Trứng chiên cà chua', isEn),
                              imagePath: 'assets/images/recipe_tomato_egg.png',
                              recipeId: 'rec_tomato_egg',
                              isDark: isDark,
                            ),
                          ],
                        ),
                      ),

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

  // Ingredient Card Helper
  Widget _buildIngredientCard({
    required String title,
    required String imagePath,
    required IconData fallbackIcon,
    bool isDark = false,
  }) {
    return Container(
      width: 115,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF19271E) : Colors.white,
        borderRadius: BorderRadius.circular(20),
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
      child: Column(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.asset(
              imagePath,
              width: 95,
              height: 75,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  width: 95,
                  height: 75,
                  color: isDark ? const Color(0xFF233629) : const Color(0xFFF1F8E9),
                  child: Icon(fallbackIcon, color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32)),
                );
              },
            ),
          ),
          const Spacer(),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.shopping_cart_rounded,
                color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                size: 16,
              ),
              const SizedBox(width: 4),
              Text(
                title,
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : const Color(0xFF006428),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
        ],
      ),
    );
  }

  // Daily Meal Plan Card Helper
  Widget _buildMealPlanCard({
    required BuildContext context,
    required String dayText,
    required String dishTitle,
    required String imagePath,
    required String recipeId,
    bool isDark = false,
  }) {
    return Container(
      width: 135,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF19271E) : const Color(0xFFEAF5E1),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
            color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFC8E6C9),
            width: 1),
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
          // Day Title & Sun Icon
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                dayText,
                style: GoogleFonts.outfit(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                ),
              ),
              const SizedBox(width: 4),
              const Icon(
                Icons.wb_sunny_rounded,
                color: Color(0xFFFFB74D),
                size: 18,
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Dish Circular Photo
          ClipOval(
            child: Image.asset(
              imagePath,
              width: 88,
              height: 88,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  width: 88,
                  height: 88,
                  color: isDark ? const Color(0xFF233629) : const Color(0xFFC8E6C9),
                  child: Icon(
                    Icons.restaurant_rounded,
                    size: 40,
                    color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: 10),

          // Dish Title
          SizedBox(
            height: 38,
            child: Center(
              child: Text(
                dishTitle,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.outfit(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : const Color(0xFF006428),
                  height: 1.2,
                ),
              ),
            ),
          ),

          const Spacer(),

          // Circular Chevron Action Button -> opens RecipeDetailScreen
          GestureDetector(
            onTap: () async {
              final recipes =
                  await RecipeRepository.fetchCookingSuggestions();
              final match = recipes.firstWhere(
                (r) => r.id == recipeId,
                orElse: () => recipes.first,
              );
              if (context.mounted) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => RecipeDetailScreen(recipe: match),
                  ),
                );
              }
            },
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF233629) : const Color(0xFFA5D6A7),
                shape: BoxShape.circle,
                border: isDark
                    ? Border.all(color: const Color(0xFF2E4D36), width: 1)
                    : null,
              ),
              child: Icon(
                Icons.chevron_right_rounded,
                color: isDark ? const Color(0xFF81C784) : const Color(0xFF1B5E20),
                size: 22,
              ),
            ),
          ),
          const SizedBox(height: 2),
        ],
      ),
    );
  }
}
