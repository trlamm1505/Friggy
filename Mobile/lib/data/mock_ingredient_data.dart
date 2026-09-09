import 'package:flutter/material.dart';

class IngredientModel {
  final String id;
  final String fridgeId; // 'family', 'roommates', 'personal'
  final String fridgeName; // "Family Home Fridge", etc.
  final String name; // e.g. "Cà chua"
  final String englishName;
  final String quantity;
  final String category; // "Vegetables", "Fruit", "Dairy", "Meat"
  final String storageArea; // "Fridge", "Freezer", "Pantry"
  final int daysUntilExpiry; // positive for valid, negative for expired
  final String expiryText;
  final String imagePath;
  final Color badgeBgColor;
  final Color badgeTextColor;

  const IngredientModel({
    required this.id,
    required this.fridgeId,
    required this.fridgeName,
    required this.name,
    required this.englishName,
    required this.quantity,
    required this.category,
    required this.storageArea,
    required this.daysUntilExpiry,
    required this.expiryText,
    required this.imagePath,
    required this.badgeBgColor,
    required this.badgeTextColor,
  });

  bool get isExpired => daysUntilExpiry < 0;
  bool get isExpiringSoon => daysUntilExpiry >= 0 && daysUntilExpiry <= 2;

  String displayName(bool isEn) {
    if (!isEn) return name;
    if (englishName.isNotEmpty) return englishName;
    return name;
  }

  String expiryStatusText(bool isEn) {
    if (!isEn) return expiryText;
    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry == 0) return 'Expires today';
    if (daysUntilExpiry == 1) return '1 day left';
    return '$daysUntilExpiry days left';
  }

  IngredientModel copyWith({
    String? id,
    String? fridgeId,
    String? fridgeName,
    String? name,
    String? englishName,
    String? quantity,
    String? category,
    String? storageArea,
    int? daysUntilExpiry,
    String? expiryText,
    String? imagePath,
    Color? badgeBgColor,
    Color? badgeTextColor,
  }) {
    return IngredientModel(
      id: id ?? this.id,
      fridgeId: fridgeId ?? this.fridgeId,
      fridgeName: fridgeName ?? this.fridgeName,
      name: name ?? this.name,
      englishName: englishName ?? this.englishName,
      quantity: quantity ?? this.quantity,
      category: category ?? this.category,
      storageArea: storageArea ?? this.storageArea,
      daysUntilExpiry: daysUntilExpiry ?? this.daysUntilExpiry,
      expiryText: expiryText ?? this.expiryText,
      imagePath: imagePath ?? this.imagePath,
      badgeBgColor: badgeBgColor ?? this.badgeBgColor,
      badgeTextColor: badgeTextColor ?? this.badgeTextColor,
    );
  }
}

class IngredientRepository {
  /// Central master ingredient dataset across all fridges
  static final List<IngredientModel> _masterIngredients = [
    // --- Family Home Fridge (Multiple Valid Items across Categories) ---
    const IngredientModel(
      id: 'ing_tomato',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Cà chua tươi',
      englishName: 'Tomatoes',
      quantity: '300 g',
      category: 'Vegetables',
      storageArea: 'Fridge',
      daysUntilExpiry: 1,
      expiryText: 'Còn 1 ngày',
      imagePath: 'assets/images/food_tomato.png',
      badgeBgColor: Color(0xFFFFF3E0),
      badgeTextColor: Color(0xFFE65100),
    ),
    const IngredientModel(
      id: 'ing_bokchoy',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Rau cải xanh',
      englishName: 'Bok Choy',
      quantity: '200 g',
      category: 'Vegetables',
      storageArea: 'Fridge',
      daysUntilExpiry: 3,
      expiryText: 'Còn 3 ngày',
      imagePath: 'assets/images/food_bokchoy.png',
      badgeBgColor: Color(0xFFE8F5E9),
      badgeTextColor: Color(0xFF2E7D32),
    ),
    const IngredientModel(
      id: 'ing_lettuce',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Xà lách xoăn',
      englishName: 'Lettuce',
      quantity: '250 g',
      category: 'Vegetables',
      storageArea: 'Fridge',
      daysUntilExpiry: 4,
      expiryText: 'Còn 4 ngày',
      imagePath: 'assets/images/available_veggies.png',
      badgeBgColor: Color(0xFFE8F5E9),
      badgeTextColor: Color(0xFF2E7D32),
    ),
    const IngredientModel(
      id: 'ing_bellpepper',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Ớt chuông Đà Lạt',
      englishName: 'Bell Peppers',
      quantity: '3 quả',
      category: 'Vegetables',
      storageArea: 'Fridge',
      daysUntilExpiry: 5,
      expiryText: 'Còn 5 ngày',
      imagePath: 'assets/images/recipe_veggie_soup.png',
      badgeBgColor: Color(0xFFE8F5E9),
      badgeTextColor: Color(0xFF2E7D32),
    ),
    const IngredientModel(
      id: 'ing_pork',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Thịt heo xay',
      englishName: 'Minced Pork',
      quantity: '200 g',
      category: 'Meat',
      storageArea: 'Freezer',
      daysUntilExpiry: 3,
      expiryText: 'Còn 3 ngày',
      imagePath: 'assets/images/food_pork.png',
      badgeBgColor: Color(0xFFE0F2F1),
      badgeTextColor: Color(0xFF00695C),
    ),
    const IngredientModel(
      id: 'ing_beef',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Thịt bò bít tết',
      englishName: 'Beef Steak',
      quantity: '400 g',
      category: 'Meat',
      storageArea: 'Freezer',
      daysUntilExpiry: 6,
      expiryText: 'Còn 6 ngày',
      imagePath: 'assets/images/food_pork.png',
      badgeBgColor: Color(0xFFE0F2F1),
      badgeTextColor: Color(0xFF00695C),
    ),
    const IngredientModel(
      id: 'ing_chicken',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Ức gà phi lê',
      englishName: 'Chicken Breast',
      quantity: '500 g',
      category: 'Meat',
      storageArea: 'Freezer',
      daysUntilExpiry: 4,
      expiryText: 'Còn 4 ngày',
      imagePath: 'assets/images/food_pork.png',
      badgeBgColor: Color(0xFFE0F2F1),
      badgeTextColor: Color(0xFF00695C),
    ),
    const IngredientModel(
      id: 'ing_salmon',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Cá hồi Na Uy',
      englishName: 'Fresh Salmon',
      quantity: '300 g',
      category: 'Seafood',
      storageArea: 'Freezer',
      daysUntilExpiry: 2,
      expiryText: 'Còn 2 ngày',
      imagePath: 'assets/images/food_pork.png',
      badgeBgColor: Color(0xFFFFF3E0),
      badgeTextColor: Color(0xFFE65100),
    ),
    const IngredientModel(
      id: 'ing_apple',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Táo đỏ Mỹ',
      englishName: 'Red Apples',
      quantity: '6 quả',
      category: 'Fruit',
      storageArea: 'Fridge',
      daysUntilExpiry: 7,
      expiryText: 'Còn 7 ngày',
      imagePath: 'assets/images/expired_tomato.png',
      badgeBgColor: Color(0xFFE8F5E9),
      badgeTextColor: Color(0xFF2E7D32),
    ),
    const IngredientModel(
      id: 'ing_banana',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Chuối chín Laba',
      englishName: 'Bananas',
      quantity: '1 nải',
      category: 'Fruit',
      storageArea: 'Pantry',
      daysUntilExpiry: 4,
      expiryText: 'Còn 4 ngày',
      imagePath: 'assets/images/expired_tomato.png',
      badgeBgColor: Color(0xFFE8F5E9),
      badgeTextColor: Color(0xFF2E7D32),
    ),
    const IngredientModel(
      id: 'ing_strawberry',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Dâu tây Đà Lạt',
      englishName: 'Strawberries',
      quantity: '1 hộp',
      category: 'Fruit',
      storageArea: 'Fridge',
      daysUntilExpiry: 2,
      expiryText: 'Còn 2 ngày',
      imagePath: 'assets/images/expired_tomato.png',
      badgeBgColor: Color(0xFFFFF3E0),
      badgeTextColor: Color(0xFFE65100),
    ),
    const IngredientModel(
      id: 'ing_egg',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Trứng gà sạch',
      englishName: 'Eggs',
      quantity: '10 quả',
      category: 'Dairy',
      storageArea: 'Fridge',
      daysUntilExpiry: 12,
      expiryText: 'Còn 12 ngày',
      imagePath: 'assets/images/recipe_tomato_egg.png',
      badgeBgColor: Color(0xFFE8F5E9),
      badgeTextColor: Color(0xFF2E7D32),
    ),
    const IngredientModel(
      id: 'ing_cheese',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Phô mai lát',
      englishName: 'Cheese Slices',
      quantity: '200 g',
      category: 'Dairy',
      storageArea: 'Fridge',
      daysUntilExpiry: 15,
      expiryText: 'Còn 15 ngày',
      imagePath: 'assets/images/food_milk.png',
      badgeBgColor: Color(0xFFE8F5E9),
      badgeTextColor: Color(0xFF2E7D32),
    ),
    const IngredientModel(
      id: 'ing_bread',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Bánh mì sandwich',
      englishName: 'Sandwich Bread',
      quantity: '1 túi',
      category: 'Others',
      storageArea: 'Pantry',
      daysUntilExpiry: 3,
      expiryText: 'Còn 3 ngày',
      imagePath: 'assets/images/available_veggies.png',
      badgeBgColor: Color(0xFFE8F5E9),
      badgeTextColor: Color(0xFF2E7D32),
    ),
    const IngredientModel(
      id: 'ing_milk',
      fridgeId: 'family',
      fridgeName: 'Tủ Lạnh Gia Đình',
      name: 'Sữa tươi',
      englishName: 'Fresh Milk',
      quantity: '1 lít',
      category: 'Dairy',
      storageArea: 'Fridge',
      daysUntilExpiry: -1,
      expiryText: 'Hết hạn',
      imagePath: 'assets/images/food_milk.png',
      badgeBgColor: Color(0xFFFFEBEE),
      badgeTextColor: Color(0xFFD32F2F),
    ),

    // --- Roommates Fridge (2 valid, 1 expired) ---
    const IngredientModel(
      id: 'ing_apple',
      fridgeId: 'roommates',
      fridgeName: 'Tủ Lạnh Phòng Trọ',
      name: 'Táo đỏ Mỹ',
      englishName: 'Red Apples',
      quantity: '1.5 kg',
      category: 'Fruit',
      storageArea: 'Fridge',
      daysUntilExpiry: 5,
      expiryText: 'Còn 5 ngày',
      imagePath: 'assets/images/food_tomato.png',
      badgeBgColor: Color(0xFFE8F5E9),
      badgeTextColor: Color(0xFF2E7D32),
    ),
    const IngredientModel(
      id: 'ing_eggs',
      fridgeId: 'roommates',
      fridgeName: 'Tủ Lạnh Phòng Trọ',
      name: 'Trứng gà',
      englishName: 'Chicken Eggs',
      quantity: '10 quả',
      category: 'Others',
      storageArea: 'Fridge',
      daysUntilExpiry: 6,
      expiryText: 'Còn 6 ngày',
      imagePath: 'assets/images/recipe_tomato_egg.png',
      badgeBgColor: Color(0xFFE8F5E9),
      badgeTextColor: Color(0xFF2E7D32),
    ),
    const IngredientModel(
      id: 'ing_yogurt',
      fridgeId: 'roommates',
      fridgeName: 'Tủ Lạnh Phòng Trọ',
      name: 'Sữa chua dầm',
      englishName: 'Yogurt',
      quantity: '2 hộp',
      category: 'Dairy',
      storageArea: 'Fridge',
      daysUntilExpiry: -2,
      expiryText: 'Hết hạn',
      imagePath: 'assets/images/food_milk.png',
      badgeBgColor: Color(0xFFFFEBEE),
      badgeTextColor: Color(0xFFD32F2F),
    ),

    // --- Personal Mini Fridge (2 valid, 0 expired) ---
    const IngredientModel(
      id: 'ing_salmon',
      fridgeId: 'personal',
      fridgeName: 'Tủ Lạnh Cá Nhân',
      name: 'Cá hồi Na Uy',
      englishName: 'Fresh Salmon',
      quantity: '500 g',
      category: 'Seafood',
      storageArea: 'Freezer',
      daysUntilExpiry: 7,
      expiryText: 'Còn 7 ngày',
      imagePath: 'assets/images/food_pork.png',
      badgeBgColor: Color(0xFFE8F5E9),
      badgeTextColor: Color(0xFF2E7D32),
    ),
    const IngredientModel(
      id: 'ing_juice',
      fridgeId: 'personal',
      fridgeName: 'Tủ Lạnh Cá Nhân',
      name: 'Nước ép cam',
      englishName: 'Orange Juice',
      quantity: '1 lít',
      category: 'Others',
      storageArea: 'Fridge',
      daysUntilExpiry: 4,
      expiryText: 'Còn 4 ngày',
      imagePath: 'assets/images/food_milk.png',
      badgeBgColor: Color(0xFFE8F5E9),
      badgeTextColor: Color(0xFF2E7D32),
    ),
  ];

  /// Get ingredients for a specific fridge
  static List<IngredientModel> getIngredientsByFridge(String fridgeId) {
    return _masterIngredients.where((i) => i.fridgeId == fridgeId).toList();
  }

  /// Get ALL valid available ingredients across all fridges
  static List<IngredientModel> getAllAvailableIngredients() {
    return _masterIngredients.where((i) => !i.isExpired).toList();
  }

  /// Get ALL expired ingredients across all fridges
  static List<IngredientModel> getAllExpiredIngredients() {
    return _masterIngredients.where((i) => i.isExpired).toList();
  }

  /// Get counts for a specific fridge: {validCount, expiredCount}
  static Map<String, int> getCountsForFridge(String fridgeId) {
    final list = getIngredientsByFridge(fridgeId);
    final validCount = list.where((i) => !i.isExpired).length;
    final expiredCount = list.where((i) => i.isExpired).length;
    return {
      'valid': validCount,
      'expired': expiredCount,
      'total': list.length,
    };
  }

  /// Fetch all ingredients
  static Future<List<IngredientModel>> fetchIngredients() async {
    await Future.delayed(const Duration(milliseconds: 30));
    return _masterIngredients;
  }
}
