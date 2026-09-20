import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/models/recipe_model.dart';
import '../data/services/api_service.dart';
import '../l10n/app_localizations.dart';
import '../screens/recipe_detail_screen.dart';

class DailyMealSlotData {
  final String id;
  final String mealType; // 'breakfast', 'lunch', 'dinner'
  final String recipeId;
  final String recipeTitle;
  final int servings;
  final int cookTimeMinutes;
  final bool isCompleted;

  const DailyMealSlotData({
    required this.id,
    required this.mealType,
    required this.recipeId,
    required this.recipeTitle,
    this.servings = 1,
    this.cookTimeMinutes = 20,
    this.isCompleted = false,
  });

  DailyMealSlotData copyWith({
    String? id,
    String? mealType,
    String? recipeId,
    String? recipeTitle,
    int? servings,
    int? cookTimeMinutes,
    bool? isCompleted,
  }) {
    return DailyMealSlotData(
      id: id ?? this.id,
      mealType: mealType ?? this.mealType,
      recipeId: recipeId ?? this.recipeId,
      recipeTitle: recipeTitle ?? this.recipeTitle,
      servings: servings ?? this.servings,
      cookTimeMinutes: cookTimeMinutes ?? this.cookTimeMinutes,
      isCompleted: isCompleted ?? this.isCompleted,
    );
  }
}

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

class _CookingSuggestionsSectionState extends State<CookingSuggestionsSection> {
  bool _isLoading = true;
  String? _loadingMealType;
  List<DailyMealSlotData> _dailySlots = [];
  int _dayOfWeek = 1; // 1 = Thứ 2, ..., 7 = Chủ nhật

  // Alternative recipes pool for AI swap fallback
  final Map<String, List<Map<String, dynamic>>> _alternativeRecipes = {
    'breakfast': [
      {'title': 'Cháo cánh gà nấm kim châm', 'time': 15, 'servings': 1},
      {'title': 'Trứng cuộn phô mai & rau củ', 'time': 10, 'servings': 1},
      {'title': 'Bún gà măng tươi thanh nhẹ', 'time': 20, 'servings': 1},
      {'title': 'Bánh mì ốp la bơ tươi & cà chua', 'time': 12, 'servings': 1},
    ],
    'lunch': [
      {'title': 'Lẩu nấm gà thanh ngọt cuối tuần', 'time': 25, 'servings': 1},
      {'title': 'Cơm gà kho sả ớt đậm đà', 'time': 20, 'servings': 1},
      {'title': 'Thịt heo kho trứng nước dừa', 'time': 30, 'servings': 1},
      {'title': 'Mì xào hải sản rau củ giòn ngọt', 'time': 18, 'servings': 1},
    ],
    'dinner': [
      {'title': 'Gà kho sả ớt đậm đà', 'time': 20, 'servings': 1},
      {'title': 'Canh chua cá thát lát lá giang', 'time': 25, 'servings': 1},
      {'title': 'Sườn nướng sả mật ong mềm mọng', 'time': 35, 'servings': 1},
      {'title': 'Bò lúc lắc xào ớt chuông hạt nêm', 'time': 22, 'servings': 1},
    ],
  };

  @override
  void initState() {
    super.initState();
    _dayOfWeek = DateTime.now().weekday;
    _initDefaultSlots();
    _loadTodayMealPlan();
  }

  void _initDefaultSlots() {
    _dailySlots = [
      const DailyMealSlotData(
        id: 'slot_bk_1',
        mealType: 'breakfast',
        recipeId: 'rec_bk_1',
        recipeTitle: 'Cháo cánh gà nấm kim châm',
        servings: 1,
        cookTimeMinutes: 15,
        isCompleted: false,
      ),
      const DailyMealSlotData(
        id: 'slot_lc_1',
        mealType: 'lunch',
        recipeId: 'rec_lc_1',
        recipeTitle: 'Lẩu nấm gà thanh ngọt cuối tuần',
        servings: 1,
        cookTimeMinutes: 25,
        isCompleted: false,
      ),
      const DailyMealSlotData(
        id: 'slot_dn_1',
        mealType: 'dinner',
        recipeId: 'rec_dn_1',
        recipeTitle: 'Gà kho sả ớt đậm đà',
        servings: 1,
        cookTimeMinutes: 20,
        isCompleted: false,
      ),
    ];
  }

  Future<void> _loadTodayMealPlan() async {
    try {
      final plans = await ApiService().getMealPlans();
      if (plans.isNotEmpty) {
        plans.sort((a, b) {
          final dateA = DateTime.tryParse((a as Map)['createdAt']?.toString() ?? '') ?? DateTime(1970);
          final dateB = DateTime.tryParse((b as Map)['createdAt']?.toString() ?? '') ?? DateTime(1970);
          return dateB.compareTo(dateA);
        });

        final firstPlan = plans.first as Map<String, dynamic>;
        if (firstPlan['id'] != null) {
          final detail = await ApiService().getMealPlanDetail(firstPlan['id'].toString());
          final dailyPlans = (detail['dailyPlans'] as List<dynamic>?)
                  ?.map((e) => Map<String, dynamic>.from(e as Map))
                  .toList() ??
              [];

          Map<String, dynamic>? todayPlan;
          for (final item in dailyPlans) {
            final rawDay = item['dayOfWeek'];
            final dOfWeek = rawDay is int
                ? rawDay
                : (int.tryParse(rawDay?.toString() ?? '') ?? 1);
            if (dOfWeek == _dayOfWeek) {
              todayPlan = item;
              break;
            }
          }
          if (todayPlan == null && dailyPlans.isNotEmpty) {
            todayPlan = dailyPlans.first;
          }

          if (todayPlan != null && todayPlan['mealSlots'] is List) {
            final slotsList = todayPlan['mealSlots'] as List<dynamic>;
            final List<DailyMealSlotData> loadedSlots = [];

            for (final s in slotsList) {
              final slotMap = s as Map<String, dynamic>;
              final slotId = slotMap['id']?.toString() ?? '';
              final mType = slotMap['mealType']?.toString().toLowerCase() ?? 'lunch';
              final recipeName = slotMap['recipeName']?.toString() ??
                  slotMap['recipe']?['title']?.toString() ??
                  'Món ăn AI';
              final recId = slotMap['recipeId']?.toString() ?? 'rec_default';
              final servings = (slotMap['servings'] as num?)?.toInt() ?? 1;
              final isCompleted = slotMap['completedAt'] != null || slotMap['completed'] == true;

              loadedSlots.add(DailyMealSlotData(
                id: slotId,
                mealType: mType,
                recipeId: recId,
                recipeTitle: recipeName,
                servings: servings,
                cookTimeMinutes: mType == 'breakfast' ? 15 : (mType == 'lunch' ? 25 : 20),
                isCompleted: isCompleted,
              ));
            }

            if (loadedSlots.isNotEmpty && mounted) {
              // Ensure we have breakfast, lunch, dinner in order
              loadedSlots.sort((a, b) {
                final order = {'breakfast': 0, 'lunch': 1, 'dinner': 2, 'snack': 3};
                return (order[a.mealType] ?? 99).compareTo(order[b.mealType] ?? 99);
              });

              setState(() {
                _dailySlots = loadedSlots.take(3).toList();
                _isLoading = false;
              });
              return;
            }
          }
        }
      }
    } catch (e) {
      debugPrint('[CookingSuggestionsSection] Error loading today plan: $e');
    }

    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _toggleMealCompletion(int index) async {
    final targetSlot = _dailySlots[index];
    final newStatus = !targetSlot.isCompleted;

    setState(() {
      _dailySlots[index] = targetSlot.copyWith(isCompleted: newStatus);
    });

    if (targetSlot.id.isNotEmpty && !targetSlot.id.startsWith('slot_')) {
      try {
        await ApiService().updateMealSlot(
          slotId: targetSlot.id,
          completed: newStatus,
        );
      } catch (e) {
        debugPrint('[CookingSuggestionsSection] Error toggling status: $e');
      }
    }
  }

  Future<void> _swapDishWithAi(int index) async {
    final targetSlot = _dailySlots[index];
    final mType = targetSlot.mealType;

    setState(() {
      _loadingMealType = mType;
    });

    try {
      if (targetSlot.id.isNotEmpty && !targetSlot.id.startsWith('slot_')) {
        final res = await ApiService().regenerateSlot(slotId: targetSlot.id);
        final newName = res['recipeName']?.toString() ?? res['recipe']?['title']?.toString();
        final newRecipeId = res['recipeId']?.toString() ?? targetSlot.recipeId;

        if (newName != null && mounted) {
          setState(() {
            _dailySlots[index] = targetSlot.copyWith(
              recipeTitle: newName,
              recipeId: newRecipeId,
            );
            _loadingMealType = null;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✨ AI đã đổi món thành công: $newName'),
              backgroundColor: const Color(0xFF008435),
              duration: const Duration(seconds: 2),
            ),
          );
          return;
        }
      }
    } catch (e) {
      debugPrint('[CookingSuggestionsSection] Error regenerating slot: $e');
    }

    // Local fallback swap
    final pool = _alternativeRecipes[mType] ?? _alternativeRecipes['lunch']!;
    final currentIndex = pool.indexWhere((item) => item['title'] == targetSlot.recipeTitle);
    final nextItem = pool[(currentIndex + 1) % pool.length];

    if (mounted) {
      setState(() {
        _dailySlots[index] = targetSlot.copyWith(
          recipeTitle: nextItem['title'] as String,
          cookTimeMinutes: nextItem['time'] as int,
          servings: nextItem['servings'] as int,
        );
        _loadingMealType = null;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✨ AI đã gợi ý món mới: ${nextItem['title']}'),
          backgroundColor: const Color(0xFF008435),
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }

    if (mounted) {
      setState(() {
        _loadingMealType = null;
      });
    }
  }

  void _openRecipeDetail(DailyMealSlotData slot) {
    final recipe = RecipeModel(
      id: slot.recipeId,
      title: slot.recipeTitle,
      englishTitle: slot.recipeTitle,
      imagePath: '',
      timeText: '${slot.cookTimeMinutes} phút',
      difficultyText: 'Dễ',
      servingsText: '${slot.servings} người',
      tags: ['# Món ngon hôm nay', '# AI gợi ý'],
      friggyTip: 'Món ăn cân bằng dinh dưỡng, chế biến nhanh từ nguyên liệu trong tủ lạnh.',
    );

    if (widget.onRecipeTap != null) {
      widget.onRecipeTap!(recipe);
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => RecipeDetailScreen(recipe: recipe),
        ),
      );
    }
  }

  String _getDayOfWeekName(bool isEn) {
    final names = isEn
        ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        : ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    final idx = (_dayOfWeek - 1).clamp(0, 6);
    return names[idx];
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';
    final dayName = _getDayOfWeekName(isEn);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Header Title Row: "Gợi Ý Món Ăn Hôm Nay" + "✨ 3 bữa ăn" (NO Premium badge, NO Xem tất cả)
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              isEn ? "Today's Meal Suggestions" : 'Gợi Ý Món Ăn Hôm Nay',
              style: GoogleFonts.outfit(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: 0.2,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.auto_awesome_rounded,
                    color: Color(0xFFFFD54F),
                    size: 14,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    isEn ? '3 meals' : '3 bữa ăn',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),

        const SizedBox(height: 14),

        // 2. Main Daily Meals Card Container
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF19271E) : Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: isDark
                  ? const Color(0xFF2E4D36)
                  : const Color(0xFFE2E8F0),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.07),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Title inside Card
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF233629)
                              : const Color(0xFFE8F5E9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Icons.restaurant_menu_rounded,
                          size: 18,
                          color: isDark
                              ? const Color(0xFF81C784)
                              : const Color(0xFF008435),
                        ),
                      ),
                      const SizedBox(width: 9),
                      Text(
                        isEn ? 'Meals for $dayName' : 'Các bữa ăn trong $dayName',
                        style: GoogleFonts.outfit(
                          fontSize: 16.5,
                          fontWeight: FontWeight.w800,
                          color: isDark ? Colors.white : const Color(0xFF1B5E20),
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 3.5,
                    ),
                    decoration: BoxDecoration(
                      color: isDark
                          ? const Color(0xFF233629)
                          : const Color(0xFFE8F5E9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      isEn ? '3 meals' : '3 bữa ăn',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: isDark
                            ? const Color(0xFF81C784)
                            : const Color(0xFF008435),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24.0),
                  child: Center(
                    child: CircularProgressIndicator(
                      color: Color(0xFF008435),
                      strokeWidth: 2.5,
                    ),
                  ),
                )
              else
                // 3 Meal Slot Items (Bữa Sáng, Bữa Trưa, Bữa Tối)
                ...List.generate(_dailySlots.length, (index) {
                  final slot = _dailySlots[index];
                  return _buildMealSlotCard(
                    slot: slot,
                    index: index,
                    isDark: isDark,
                    isEn: isEn,
                  );
                }),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMealSlotCard({
    required DailyMealSlotData slot,
    required int index,
    required bool isDark,
    required bool isEn,
  }) {
    final isRegenerating = _loadingMealType == slot.mealType;

    String mealLabel = 'Bữa Trưa';
    IconData mealIcon = Icons.wb_sunny_rounded;
    Color mealTagColor = const Color(0xFFEA580C);
    Color mealBgColor = isDark ? const Color(0xFF3E2723) : const Color(0xFFFFF3E0);

    if (slot.mealType == 'breakfast') {
      mealLabel = isEn ? 'Breakfast' : 'Bữa Sáng';
      mealIcon = Icons.wb_twilight_rounded;
      mealTagColor = const Color(0xFFD97706);
      mealBgColor = isDark ? const Color(0xFF3E2723) : const Color(0xFFFFF8E1);
    } else if (slot.mealType == 'lunch') {
      mealLabel = isEn ? 'Lunch' : 'Bữa Trưa';
      mealIcon = Icons.wb_sunny_rounded;
      mealTagColor = const Color(0xFFEA580C);
      mealBgColor = isDark ? const Color(0xFF3E2723) : const Color(0xFFFFF3E0);
    } else if (slot.mealType == 'dinner') {
      mealLabel = isEn ? 'Dinner' : 'Bữa Tối';
      mealIcon = Icons.nights_stay_rounded;
      mealTagColor = const Color(0xFF7C3AED);
      mealBgColor = isDark ? const Color(0xFF1A237E) : const Color(0xFFF3E8FF);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: slot.isCompleted
            ? (isDark ? const Color(0xFF1B2E21) : const Color(0xFFEAF5E1))
            : (isDark ? const Color(0xFF233629) : const Color(0xFFF8FAFC)),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: slot.isCompleted
              ? const Color(0xFF008435)
              : (isDark ? const Color(0xFF2E4D36) : const Color(0xFFCBD5E1)),
          width: slot.isCompleted ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top row: Meal Tag + Status toggle
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Meal Type Tag
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: mealBgColor,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(mealIcon, size: 14, color: mealTagColor),
                    const SizedBox(width: 4),
                    Text(
                      mealLabel,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: mealTagColor,
                      ),
                    ),
                  ],
                ),
              ),

              // Status Toggle Button (Nấu xong / Chưa nấu)
              InkWell(
                onTap: () => _toggleMealCompletion(index),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: slot.isCompleted
                        ? const Color(0xFF008435)
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: slot.isCompleted
                          ? const Color(0xFF008435)
                          : (isDark ? const Color(0xFF558B2F) : const Color(0xFF4CAF50)),
                      width: 1.2,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        slot.isCompleted
                            ? Icons.check_circle_rounded
                            : Icons.radio_button_unchecked_rounded,
                        size: 14,
                        color: slot.isCompleted
                            ? Colors.white
                            : (isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32)),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isEn
                            ? (slot.isCompleted ? 'Cooked' : 'Pending')
                            : (slot.isCompleted ? 'Nấu xong' : 'Chưa nấu'),
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: slot.isCompleted
                              ? Colors.white
                              : (isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 9),

          // Recipe Title
          Text(
            slot.recipeTitle,
            style: GoogleFonts.outfit(
              fontSize: 16.5,
              fontWeight: FontWeight.w800,
              color: isDark ? Colors.white : const Color(0xFF1E293B),
            ),
          ),

          const SizedBox(height: 2),

          // Servings info
          Text(
            isEn
                ? '${slot.servings} serving • ${slot.cookTimeMinutes} mins'
                : '${slot.servings} người ăn • ${slot.cookTimeMinutes} phút',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),

          const SizedBox(height: 10),

          // Action Buttons: [📖 Xem công thức]  [🔄 Đổi món AI]
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _openRecipeDetail(slot),
                  icon: const Icon(Icons.menu_book_rounded, size: 14),
                  label: Text(
                    isEn ? 'Recipe' : 'Xem công thức',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: isDark
                        ? const Color(0xFF81C784)
                        : const Color(0xFF008435),
                    side: BorderSide(
                      color: isDark
                          ? const Color(0xFF2E4D36)
                          : const Color(0xFF008435).withValues(alpha: 0.4),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 7),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: isRegenerating ? null : () => _swapDishWithAi(index),
                  icon: isRegenerating
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.sync_rounded, size: 14),
                  label: Text(
                    isRegenerating
                        ? (isEn ? 'Swapping...' : 'Đang đổi...')
                        : (isEn ? 'AI Swap' : 'Đổi món AI'),
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF008435),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 7),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
