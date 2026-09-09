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
  final int matchPercent; // e.g. 95, 88, 75
  final String matchText; // e.g. "95% phù hợp"
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
    required this.matchPercent,
    required this.matchText,
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

  String get safeTitle => title.isNotEmpty ? title : 'Món ăn gợi ý';
  String get safeTimeText => timeText.isNotEmpty ? timeText : '10 phút';
  String get safeDifficultyText => difficultyText.isNotEmpty ? difficultyText : 'Dễ';
  String get safeServingsText => servingsText.isNotEmpty ? servingsText : '2 người';
  String get safeMatchText => matchText.isNotEmpty ? matchText : '$matchPercent% phù hợp';

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
    return [
      RecipeIngredientDetail(
        name: title.isNotEmpty ? title : 'Nguyên liệu chính',
        quantity: 'Đầy đủ',
        isAvailable: true,
      ),
      const RecipeIngredientDetail(
        name: 'Gia vị',
        quantity: 'Vừa đủ',
        isAvailable: true,
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
  /// Mock cooking suggestions sorted in descending match percentage
  static final List<RecipeModel> _mockRecipes = [
    const RecipeModel(
      id: 'rec_salad_mix',
      title: 'Salad dưa chuột cà chua',
      englishTitle: 'Cucumber Tomato Salad',
      imagePath: 'assets/images/recipe_salad.png',
      matchPercent: 82,
      matchText: '82% phù hợp',
      timeText: '10 phút',
      difficultyText: 'Rất dễ',
      servingsText: '1 người',
      tags: ['# Dưa chuột', '# Cà chua bi', '# Xà lách'],
      isFavorite: false,
      isPremium: false,
      friggyTip:
          'Món salad này cực kỳ tốt cho sức khỏe và giúp bạn dùng hết xà lách trong tủ đó!',
      detailedIngredients: [
        RecipeIngredientDetail(
          name: 'Dưa chuột',
          quantity: '1 quả',
          isAvailable: true,
        ),
        RecipeIngredientDetail(
          name: 'Cà chua bi',
          quantity: '5 quả',
          isAvailable: true,
          isExpiringSoon: true,
        ),
        RecipeIngredientDetail(
          name: 'Xà lách',
          quantity: '200g',
          isAvailable: true,
        ),
        RecipeIngredientDetail(
          name: 'Gia Vị',
          quantity: 'Sốt mè rang',
          isAvailable: true,
        ),
        RecipeIngredientDetail(
          name: 'Gia vị',
          quantity: 'Muối, tiêu',
          isAvailable: true,
        ),
      ],
      steps: [
        'Rửa sạch rau củ, để ráo nước.',
        'Cắt dưa chuột thành lát, bổ đôi cà chua bi.',
        'Cho tất cả vào tô lớn, thêm sốt mè rang.',
        'Trộn đều và thưởng thức.',
      ],
    ),
    const RecipeModel(
      id: 'rec_tomato_egg',
      title: 'Trứng chiên cà chua',
      englishTitle: 'Tomato Fried Eggs',
      imagePath: 'assets/images/recipe_tomato_egg.png',
      matchPercent: 95,
      matchText: '95% phù hợp',
      timeText: '10 phút',
      difficultyText: 'Rất dễ',
      servingsText: '2 người',
      tags: ['# Trứng', '# Cà chua', '# Hành lá'],
      isFavorite: true,
      isPremium: false,
      friggyTip:
          'Món trứng chiên cà chua thơm ngon, bổ dưỡng giúp bạn nhanh chóng chuẩn bị bữa ăn đầy đủ chất!',
      detailedIngredients: [
        RecipeIngredientDetail(
          name: 'Trứng gà',
          quantity: '2 quả',
          isAvailable: true,
        ),
        RecipeIngredientDetail(
          name: 'Cà chua bi',
          quantity: '5 quả',
          isAvailable: true,
          isExpiringSoon: true,
        ),
        RecipeIngredientDetail(
          name: 'Hành lá',
          quantity: '50g',
          isAvailable: true,
        ),
        RecipeIngredientDetail(
          name: 'Gia vị',
          quantity: 'Muối, nước mắm, tiêu',
          isAvailable: true,
        ),
      ],
      steps: [
        'Rửa sạch cà chua và hành lá, để ráo nước.',
        'Cắt cà chua thành lát mỏng, thái nhỏ hành lá.',
        'Đập trứng vào bát, nêm một ít gia vị và đánh đều.',
        'Chiên cà chua trước rồi đổ trứng vào chiên chín vàng, rắc hành lá lên trên.',
      ],
    ),
    const RecipeModel(
      id: 'rec_veggie_soup',
      title: 'Canh rau củ hầm',
      englishTitle: 'Stewed Vegetable Soup',
      imagePath: 'assets/images/recipe_veggie_soup.png',
      matchPercent: 88,
      matchText: '88% phù hợp',
      timeText: '25 phút',
      difficultyText: 'Dễ',
      servingsText: '3 người',
      tags: ['# Ngô', '# Cà rốt', '# Súp lơ'],
      isFavorite: false,
      isPremium: false,
      friggyTip:
          'Canh rau củ ngọt thanh, giàu vitamin và chất xơ, rất thích hợp cho bữa ăn gia đình thanh nhẹ!',
      detailedIngredients: [
        RecipeIngredientDetail(
          name: 'Ngô ngọt',
          quantity: '1 bắp',
          isAvailable: true,
        ),
        RecipeIngredientDetail(
          name: 'Cà rốt',
          quantity: '1 củ',
          isAvailable: true,
          isExpiringSoon: true,
        ),
        RecipeIngredientDetail(
          name: 'Súp lơ',
          quantity: '150g',
          isAvailable: true,
        ),
        RecipeIngredientDetail(
          name: 'Gia vị',
          quantity: 'Hạt nêm, hành ngò',
          isAvailable: true,
        ),
      ],
      steps: [
        'Rửa sạch ngô, cà rốt và súp lơ.',
        'Cắt nhỏ các loại rau củ vừa ăn.',
        'Nấu sôi nước, cho ngô và cà rốt vào hầm trước 15 phút.',
        'Thêm súp lơ và nêm nếm vừa ăn rồi tắt bếp.',
      ],
    ),
    const RecipeModel(
      id: 'rec_bokchoy_pork',
      title: 'Rau cải xào thịt heo',
      englishTitle: 'Stir-fried Bok Choy with Pork',
      imagePath: 'assets/images/food_bokchoy.png',
      matchPercent: 78,
      matchText: '78% phù hợp',
      timeText: '15 phút',
      difficultyText: 'Dễ',
      servingsText: '2 người',
      tags: ['# Rau cải', '# Thịt heo', '# Tỏi'],
      isFavorite: false,
      isPremium: false,
      friggyTip:
          'Cải xào giữ nguyên độ giòn ngọt kết hợp cùng thịt heo đậm đà cho bữa cơm tròn vị!',
      detailedIngredients: [
        RecipeIngredientDetail(
          name: 'Rau cải',
          quantity: '300g',
          isAvailable: true,
        ),
        RecipeIngredientDetail(
          name: 'Thịt heo',
          quantity: '150g',
          isAvailable: true,
        ),
        RecipeIngredientDetail(
          name: 'Tỏi',
          quantity: '3 tép',
          isAvailable: true,
          isExpiringSoon: true,
        ),
        RecipeIngredientDetail(
          name: 'Gia vị',
          quantity: 'Dầu ăn, nước mắm, tiêu',
          isAvailable: true,
        ),
      ],
      steps: [
        'Rửa sạch rau cải, thịt heo rửa sạch thái mỏng.',
        'Băm nhỏ tỏi, ướp thịt heo với một ít hạt nêm.',
        'Phi thơm tỏi, xào thịt heo chín tới rồi cho ra đĩa.',
        'Xào rau cải chín giòn, đổ thịt heo vào đảo đều rồi tắt bếp.',
      ],
    ),
  ];

  /// Fetch list of cooking suggestions sorted in descending order of match percentage
  static Future<List<RecipeModel>> fetchCookingSuggestions() async {
    await Future.delayed(const Duration(milliseconds: 50));

    // Sort descending by matchPercent
    final list = List<RecipeModel>.from(_mockRecipes);
    list.sort((a, b) => b.matchPercent.compareTo(a.matchPercent));
    return list;
  }
}
