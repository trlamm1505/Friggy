import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class RecipeIngredientDetail {
  final String name;
  final String quantity;
  final bool isAvailable;
  final bool isExpiringSoon;

  const RecipeIngredientDetail({
    required this.name,
    required this.quantity,
    this.isAvailable = true,
    this.isExpiringSoon = false,
  });
}

class RecipeModel {
  final String id;
  final String title;
  final String englishTitle;
  final String imagePath;
  final int? matchPercent; // e.g. 95, 88, 75 or null if not returned
  final String? matchText; // e.g. "95% phù hợp" or null
  final String timeText; // e.g. "10 phút"
  final String difficultyText; // e.g. "Dễ", "Rất dễ"
  final String servingsText; // e.g. "2 người"
  final List<String> tags; // e.g. ["# Trứng", "# Cà chua", "# Hành lá"]
  final bool isFavorite;
  final bool isPremium;
  final String? friggyTip;
  final List<RecipeIngredientDetail>? detailedIngredients;
  final List<String>? steps;

  const RecipeModel({
    required this.id,
    required this.title,
    required this.englishTitle,
    required this.imagePath,
    this.matchPercent,
    this.matchText,
    required this.timeText,
    required this.difficultyText,
    required this.servingsText,
    required this.tags,
    this.isFavorite = false,
    this.isPremium = false,
    this.friggyTip,
    this.detailedIngredients,
    this.steps,
  });

  factory RecipeModel.fromJson(Map<String, dynamic> json) => RecipeModel.fromApi(json);

  factory RecipeModel.fromApi(Map<String, dynamic> json) {
    final id = json['id']?.toString() ?? '';
    final title = json['title']?.toString() ?? 'Công thức món ăn';
    final matchScore = (json['matchScore'] as num?)?.toInt();
    final matchTextStr = matchScore != null ? '$matchScore% phù hợp' : null;
    final cookTime = json['cookTimeMinutes']?.toString() ?? '15';
    final servings = json['servings']?.toString() ?? '2';

    String diffText = 'Dễ';
    final diffLevel = json['difficultyLevel']?.toString().toLowerCase() ?? '';
    if (diffLevel == 'very_easy' || diffLevel == 'very easy' || diffLevel == 'rất dễ') {
      diffText = 'Rất dễ';
    } else if (diffLevel == 'medium' || diffLevel == 'vừa') {
      diffText = 'Vừa';
    } else if (diffLevel == 'hard' || diffLevel == 'khó') {
      diffText = 'Khó';
    } else {
      diffText = 'Dễ';
    }

    final List<String> tagList = [];
    if (json['tags'] is List) {
      for (var t in (json['tags'] as List)) {
        if (t is Map && t['name'] != null) {
          tagList.add('# ${t['name']}');
        } else if (t is Map && t['tag'] is Map && t['tag']['name'] != null) {
          tagList.add('# ${t['tag']['name']}');
        } else if (t is String) {
          tagList.add('# $t');
        }
      }
    }
    if (tagList.isEmpty) {
      tagList.add('# Đồ sắp hết hạn');
      if (title.isNotEmpty) {
        tagList.add('# $title');
      }
    }

    String imagePath = json['thumbnailPath']?.toString() ?? json['imagePath']?.toString() ?? '';
    if (imagePath == 'null') {
      imagePath = '';
    }

    List<RecipeIngredientDetail>? detailedIngredients;
    if (json['ingredients'] is List) {
      detailedIngredients = (json['ingredients'] as List).map((ing) {
        final name = ing['ingredientName']?.toString() ??
            ing['ingredient']?['name']?.toString() ??
            ing['name']?.toString() ??
            '';
        final qtyNum = ing['quantity']?.toString() ?? '';
        final unit = ing['unit']?.toString() ?? '';
        final qtyStr = '$qtyNum $unit'.trim();
        final inFridge = ing['inFridge'] == true || ing['isAvailable'] == true;
        return RecipeIngredientDetail(
          name: name,
          quantity: qtyStr.isNotEmpty ? qtyStr : 'Vừa đủ',
          isAvailable: inFridge,
        );
      }).toList();
    }

    List<String>? steps;
    if (json['steps'] is List) {
      steps = (json['steps'] as List).map((s) {
        if (s is Map) {
          return s['instruction']?.toString() ?? '';
        }
        return s.toString();
      }).where((s) => s.isNotEmpty).toList();
    }

    return RecipeModel(
      id: id,
      title: title,
      englishTitle: title,
      imagePath: imagePath,
      matchPercent: matchScore,
      matchText: matchTextStr,
      timeText: '$cookTime phút',
      difficultyText: diffText,
      servingsText: '$servings người',
      tags: tagList,
      friggyTip: json['description']?.toString(),
      detailedIngredients: detailedIngredients,
      steps: steps,
    );
  }

  String get safeTitle => title.isNotEmpty ? title : 'Món ăn gợi ý';
  String get safeTimeText => timeText.isNotEmpty ? timeText : '10 phút';
  String get safeDifficultyText => difficultyText.isNotEmpty ? difficultyText : 'Dễ';
  String get safeServingsText => servingsText.isNotEmpty ? servingsText : '2 người';
  String get safeMatchText => matchText ?? (matchPercent != null ? '$matchPercent% phù hợp' : '');

  String displayTitle(bool isEn) => (isEn && englishTitle.isNotEmpty) ? englishTitle : safeTitle;
  String displayMatchText(bool isEn) => isEn ? '$matchPercent% match' : safeMatchText;
  String displayTimeText(bool isEn) {
    if (!isEn) return safeTimeText;
    final mins = cookingTimeMinutes;
    return '$mins mins';
  }

  String displayDifficultyText(bool isEn) {
    if (!isEn) return safeDifficultyText;
    if (difficultyText.contains('Rất dễ')) return 'Very easy';
    if (difficultyText.contains('Dễ')) return 'Easy';
    if (difficultyText.contains('Vừa')) return 'Medium';
    if (difficultyText.contains('Khó')) return 'Hard';
    return 'Easy';
  }

  String displayServingsText(bool isEn) {
    if (!isEn) return safeServingsText;
    final numStr = safeServingsText.replaceAll(RegExp(r'[^0-9]'), '');
    if (numStr.isNotEmpty) return '$numStr servings';
    return '2 servings';
  }

  List<String> displayTags(bool isEn) {
    if (!isEn) return tags;
    final tagMap = {
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
    return tags.map((t) {
      final raw = t.replaceAll('#', '').trim();
      final translated = tagMap[raw] ?? raw;
      return '# $translated';
    }).toList();
  }

  String get safeFriggyTip {
    if (friggyTip != null && friggyTip!.trim().isNotEmpty) {
      return friggyTip!;
    }
    return 'Món ăn này cực kỳ thơm ngon và bổ dưỡng giúp tận dụng nguyên liệu sẵn có!';
  }

  List<RecipeIngredientDetail> get safeDetailedIngredients {
    if (detailedIngredients != null && detailedIngredients!.isNotEmpty) {
      return detailedIngredients!;
    }
    if (tags.isNotEmpty) {
      return tags.map((t) {
        final name = t.replaceAll('#', '').trim();
        return RecipeIngredientDetail(
          name: name,
          quantity: 'Vừa đủ',
          isAvailable: false,
        );
      }).toList();
    }
    return [
      RecipeIngredientDetail(
        name: title.isNotEmpty ? title : 'Nguyên liệu chính',
        quantity: 'Đầy đủ',
        isAvailable: false,
      ),
      const RecipeIngredientDetail(
        name: 'Gia vị',
        quantity: 'Vừa đủ',
        isAvailable: false,
      ),
    ];
  }

  List<String> get safeSteps {
    if (steps != null && steps!.isNotEmpty) {
      return steps!;
    }
    return [
      'Sơ chế sạch các nguyên liệu.',
      'Chế biến và nêm nếm gia vị vừa ăn.',
      'Bày ra đĩa và thưởng thức khi còn nóng.',
    ];
  }

  int get cookingTimeMinutes =>
      int.tryParse(safeTimeText.replaceAll(RegExp(r'[^0-9]'), '')) ?? 15;
  List<String> get ingredients =>
      tags.map((t) => t.replaceAll('#', '').trim()).toList();
  int get extraIngredientsCount => 2;
}

class RecipeRepository {
  /// Fetch list of cooking suggestions generated from POST /meal-planning/plans/generate-from-expiring
  static Future<List<RecipeModel>> fetchCookingSuggestions({
    Function(String message)? onProgress,
  }) async {
    final Set<String> initialSlotIds = {};
    String? targetPlanId;

    try {
      // 1. Get initial meal slot IDs state before starting AI
      onProgress?.call('🤖 AI Friggy đang kết nối hệ thống...');
      final initialPlans = await ApiService().getMealPlans();
      if (initialPlans.isNotEmpty) {
        initialPlans.sort((a, b) {
          final dateA = DateTime.tryParse((a as Map)['createdAt']?.toString() ?? '') ?? DateTime(1970);
          final dateB = DateTime.tryParse((b as Map)['createdAt']?.toString() ?? '') ?? DateTime(1970);
          return dateB.compareTo(dateA);
        });
        targetPlanId = initialPlans.first['id']?.toString();
        if (targetPlanId != null) {
          final detail = await ApiService().getMealPlanDetail(targetPlanId);
          final dailyPlans = detail['dailyPlans'] as List<dynamic>? ?? [];
          for (final d in dailyPlans) {
            final slots = (d as Map<String, dynamic>)['mealSlots'] as List<dynamic>? ?? [];
            for (final s in slots) {
              final sId = (s as Map<String, dynamic>)['id']?.toString();
              if (sId != null) initialSlotIds.add(sId);
            }
          }
        }
      }
    } catch (e) {
      debugPrint('[RecipeRepository] Notice checking initial slot IDs: $e');
    }

    try {
      // 2. Trigger AI plan generation from expiring ingredients (within 3 days, 1 day plan)
      onProgress?.call('🥬 AI đang quét nguyên liệu sắp hết hạn trong 3 ngày...');
      final res = await ApiService().generateFromExpiring(withinDays: 3, days: 1);
      final jobId = res['jobId'] as String?;
      debugPrint('[RecipeRepository] Triggered generateFromExpiring jobId: $jobId');

      // 3. Poll getMealPlanDetail() to wait for AI worker (ExpiringMealPlanConsumer)
      Map<String, dynamic>? updatedPlanDetail;
      const int maxAttempts = 25; // max ~87.5 seconds with 3.5s interval

      for (int i = 0; i < maxAttempts; i++) {
        await Future.delayed(const Duration(milliseconds: 3500));

        if (i == 1) {
          onProgress?.call('🍲 AI đang kết hợp công thức từ đồ sắp hết hạn...');
        } else if (i == 3) {
          onProgress?.call('🍳 AI đang chọn bữa ăn dinh dưỡng và tiết kiệm nhất...');
        } else if (i == 7) {
          onProgress?.call('🔍 AI đang tìm và lập thực đơn mới...');
        } else if (i == 12) {
          onProgress?.call('💾 AI đang lưu thực đơn gợi ý vào hệ thống...');
        }

        try {
          // Fetch target plan ID if not already known
          if (targetPlanId == null) {
            final currentPlans = await ApiService().getMealPlans();
            if (currentPlans.isNotEmpty) {
              currentPlans.sort((a, b) {
                final dateA = DateTime.tryParse((a as Map)['createdAt']?.toString() ?? '') ?? DateTime(1970);
                final dateB = DateTime.tryParse((b as Map)['createdAt']?.toString() ?? '') ?? DateTime(1970);
                return dateB.compareTo(dateA);
              });
              targetPlanId = currentPlans.first['id']?.toString();
            }
          }

          if (targetPlanId != null) {
            final detail = await ApiService().getMealPlanDetail(targetPlanId);
            final dailyPlans = detail['dailyPlans'] as List<dynamic>? ?? [];
            final Set<String> currentSlotIds = {};

            for (final d in dailyPlans) {
              final slots = (d as Map<String, dynamic>)['mealSlots'] as List<dynamic>? ?? [];
              for (final s in slots) {
                final sId = (s as Map<String, dynamic>)['id']?.toString();
                if (sId != null) currentSlotIds.add(sId);
              }
            }

            bool hasNewSlots = false;
            if (initialSlotIds.isEmpty && currentSlotIds.isNotEmpty) {
              hasNewSlots = true;
            } else if (initialSlotIds.isNotEmpty && currentSlotIds.isNotEmpty) {
              for (final sId in currentSlotIds) {
                if (!initialSlotIds.contains(sId)) {
                  hasNewSlots = true;
                  break;
                }
              }
            }

            if (hasNewSlots) {
              onProgress?.call('✅ AI đã lập thực đơn mới thành công!');
              debugPrint('[RecipeRepository] AI completed! Found new slots in plan $targetPlanId');
              updatedPlanDetail = detail;
              break;
            }
          }
        } catch (e) {
          debugPrint('[RecipeRepository] Polling attempt $i error: $e');
        }
      }

      // 4. Fetch the AI generated meal plan details
      final detail = updatedPlanDetail ?? await (() async {
        final plans = await ApiService().getMealPlans();
        if (plans.isNotEmpty) {
          plans.sort((a, b) {
            final dateA = DateTime.tryParse((a as Map)['createdAt']?.toString() ?? '') ?? DateTime(1970);
            final dateB = DateTime.tryParse((b as Map)['createdAt']?.toString() ?? '') ?? DateTime(1970);
            return dateB.compareTo(dateA);
          });
          if (plans.first['id'] != null) {
            return await ApiService().getMealPlanDetail(plans.first['id']);
          }
        }
        return <String, dynamic>{};
      })();

      final dailyPlans = detail['dailyPlans'] as List<dynamic>? ?? [];
      final List<RecipeModel> suggestedRecipes = [];
      final Set<String> seenRecipeIds = {};
      final Set<String> seenTitles = {};

      for (final day in dailyPlans) {
        final mealSlots = (day as Map<String, dynamic>)['mealSlots'] as List<dynamic>? ?? [];
        for (final slot in mealSlots) {
          final slotMap = slot as Map<String, dynamic>;
          final recipeId = slotMap['recipeId'] as String?;
          final recipeName = slotMap['recipeName'] as String? ?? 'Món ăn gợi ý từ AI';

          if (recipeId != null && !seenRecipeIds.contains(recipeId)) {
            seenRecipeIds.add(recipeId);
            final normTitle = recipeName.trim().toLowerCase();
            if (!seenTitles.contains(normTitle)) {
              seenTitles.add(normTitle);

              suggestedRecipes.add(RecipeModel(
                id: recipeId,
                title: recipeName,
                englishTitle: recipeName,
                imagePath: slotMap['recipe']?['thumbnailPath']?.toString() ?? '',
                matchPercent: 95,
                matchText: '95% phù hợp',
                timeText: '20 phút',
                difficultyText: 'Dễ',
                servingsText: '${slotMap['servings'] ?? 2} người',
                tags: ['# Đồ sắp hết hạn', '# AI gợi ý'],
                isFavorite: false,
                isPremium: false,
                friggyTip: 'Gợi ý từ AI ưu tiên giải cứu thực phẩm trong tủ lạnh.',
              ));
            }
          }
        }
      }
      if (suggestedRecipes.isNotEmpty) return suggestedRecipes;
    } catch (e) {
      debugPrint('[RecipeRepository] Error fetching meal plan details: $e');
    }

    return [];
  }

  /// Fetch full detail of a recipe
  static Future<RecipeModel?> fetchRecipeDetail(String id) async {
    try {
      final json = await ApiService().getRecipeDetail(id);
      return RecipeModel.fromJson(json);
    } catch (e) {
      debugPrint('[RecipeRepository] Error fetching recipe detail: $e');
      return null;
    }
  }
}
