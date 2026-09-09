import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../l10n/app_localizations.dart';
import '../widgets/friggy_app_bar.dart';

class ShoppingItemModel {
  String id;
  String name;
  String? quantity;
  bool isChecked;

  ShoppingItemModel({
    required this.id,
    required this.name,
    this.quantity,
    this.isChecked = false,
  });
}

class SuggestedPurchaseModel {
  String name;
  String imagePath;

  SuggestedPurchaseModel({
    required this.name,
    required this.imagePath,
  });
}

class ShoppingReminderScreen extends StatefulWidget {
  const ShoppingReminderScreen({super.key});

  @override
  State<ShoppingReminderScreen> createState() => _ShoppingReminderScreenState();
}

class _ShoppingReminderScreenState extends State<ShoppingReminderScreen> {
  final TextEditingController _addItemController = TextEditingController();

  // Master Shopping List
  final List<ShoppingItemModel> _shoppingList = [
    ShoppingItemModel(
      id: '1',
      name: 'Sữa tươi',
      quantity: '1 lít',
      isChecked: false,
    ),
    ShoppingItemModel(
      id: '2',
      name: 'Cà chua',
      isChecked: false,
    ),
    ShoppingItemModel(
      id: '3',
      name: 'Cá hồi',
      quantity: '500g',
      isChecked: false,
    ),
    ShoppingItemModel(
      id: '4',
      name: 'Trứng gà',
      isChecked: true,
    ),
  ];

  // Suggested Items to Buy
  final List<SuggestedPurchaseModel> _suggestedPurchases = [
    SuggestedPurchaseModel(
      name: 'Rau xanh',
      imagePath: 'assets/images/food_bokchoy.png',
    ),
    SuggestedPurchaseModel(
      name: 'Bơ',
      imagePath: 'assets/images/food_tomato.png',
    ),
    SuggestedPurchaseModel(
      name: 'Nấm',
      imagePath: 'assets/images/recipe_veggie_soup.png',
    ),
    SuggestedPurchaseModel(
      name: 'Thịt heo',
      imagePath: 'assets/images/food_pork.png',
    ),
  ];

  String _translateItemName(String name, bool isEn) {
    if (!isEn) return name;
    final map = {
      'Sữa tươi': 'Fresh Milk',
      'Cà chua': 'Tomatoes',
      'Cá hồi': 'Salmon',
      'Trứng gà': 'Eggs',
      'Rau xanh': 'Greens',
      'Bơ': 'Avocado',
      'Nấm': 'Mushrooms',
      'Thịt heo': 'Pork',
    };
    return map[name] ?? name;
  }

  String _translateQuantity(String? qty, bool isEn) {
    if (qty == null) return '';
    if (!isEn) return qty;
    return qty.replaceAll('lít', 'liter');
  }

  @override
  void dispose() {
    _addItemController.dispose();
    super.dispose();
  }

  void _addNewItem(String name) {
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';
    final trimmed = name.trim();
    if (trimmed.isEmpty) return;

    // Hide keyboard
    FocusScope.of(context).unfocus();

    setState(() {
      _shoppingList.insert(
        0,
        ShoppingItemModel(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          name: trimmed,
          isChecked: false,
        ),
      );
      _addItemController.clear();
    });

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(isEn ? 'Added "$trimmed" to shopping list!' : 'Đã thêm "$trimmed" vào danh sách cần mua!'),
        backgroundColor: const Color(0xFF008435),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _toggleCheckItem(ShoppingItemModel item) {
    setState(() {
      item.isChecked = !item.isChecked;
    });
  }

  void _deleteItem(ShoppingItemModel item) {
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';
    setState(() {
      _shoppingList.removeWhere((element) => element.id == item.id);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(isEn ? 'Deleted "${_translateItemName(item.name, isEn)}" from list!' : 'Đã xóa "${item.name}" khỏi danh sách!'),
        backgroundColor: const Color(0xFFD32F2F),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _addSuggestedToShoppingList(SuggestedPurchaseModel suggestion) {
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';
    final sName = _translateItemName(suggestion.name, isEn);

    final exists = _shoppingList.any(
      (item) => item.name.toLowerCase() == suggestion.name.toLowerCase(),
    );

    if (exists) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isEn ? '"$sName" is already in list!' : '"${suggestion.name}" đã có trong danh sách!'),
          backgroundColor: const Color(0xFFFFA000),
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }

    setState(() {
      _shoppingList.insert(
        0,
        ShoppingItemModel(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          name: suggestion.name,
          isChecked: false,
        ),
      );
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(isEn ? 'Added "$sName" to shopping list!' : 'Đã thêm "${suggestion.name}" vào danh sách mua sắm!'),
        backgroundColor: const Color(0xFF008435),
        duration: const Duration(seconds: 2),
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
                    Color(0xFF4CB93E),
                  ],
            stops: isDark ? const [0.0, 0.5, 1.0] : const [0.0, 0.24, 0.42, 0.72, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // 1. Reusable Top Header FriggyAppBar
              const FriggyAppBar(),

              // 2. Main Scrollable Content
              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 6),

                      // Title Header Block: "Nhắc đi chợ"
                      Text(
                        isEn ? 'Shopping Reminder' : 'Nhắc đi chợ',
                        style: GoogleFonts.outfit(
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF006428),
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isEn
                            ? 'Create your shopping list for next week with Friggy!'
                            : 'Lên danh sách mua sắm cho tuần tới cùng Friggy nhé!',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          fontStyle: FontStyle.italic,
                          color: isDark
                              ? const Color(0xFF9DA8A0)
                              : const Color(0xFF1B5E20),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // 3. Combined Top Banner & Narrowed Input Field with Extra Large Popping Mascot
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          // Left Content Column (Green Card + Narrow Input Field)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 12),

                              // Base Green Container Card
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.only(
                                  left: 18,
                                  right: 105,
                                  top: 22,
                                  bottom: 22,
                                ),
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? const Color(0xFF1E3A25)
                                      : const Color(0xFF52B756),
                                  borderRadius: BorderRadius.circular(24),
                                  border: isDark
                                      ? Border.all(
                                          color: const Color(0xFF2E4D36),
                                          width: 1.5)
                                      : null,
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black
                                          .withValues(alpha: isDark ? 0.2 : 0.08),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Text(
                                  isEn
                                      ? 'Friggy prepared a few\nshopping suggestions for you!'
                                      : 'Friggy đã chuẩn bị vài gợi ý\nmua thêm cho bạn nè!',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                    height: 1.35,
                                  ),
                                ),
                              ),

                              const SizedBox(height: 16),

                              // Add Item Label ("Nhập thêm để cập nhật")
                              Text(
                                isEn ? 'Add to update' : 'Nhập thêm để cập nhật',
                                style: GoogleFonts.outfit(
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? Colors.white : const Color(0xFF006428),
                                ),
                              ),
                              const SizedBox(height: 8),

                              // Narrow Input Bar + Add Button (Right margin 96px leaves clear room for mascot!)
                              Padding(
                                padding: const EdgeInsets.only(right: 96.0),
                                child: Container(
                                  height: 48,
                                  padding: const EdgeInsets.only(
                                      left: 14, right: 4),
                                  decoration: BoxDecoration(
                                    color: isDark
                                        ? const Color(0xFF19271E)
                                        : Colors.white,
                                    borderRadius: BorderRadius.circular(28),
                                    border: Border.all(
                                      color: isDark
                                          ? const Color(0xFF2E4D36)
                                          : const Color(0xFF81C784),
                                      width: 1.2,
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black
                                            .withValues(alpha: isDark ? 0.2 : 0.04),
                                        blurRadius: 8,
                                        offset: const Offset(0, 3),
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: TextField(
                                          controller: _addItemController,
                                          onSubmitted: _addNewItem,
                                          style: GoogleFonts.plusJakartaSans(
                                            fontSize: 13.5,
                                            fontWeight: FontWeight.w600,
                                            color: isDark ? Colors.white : const Color(0xFF19221C),
                                          ),
                                          decoration: InputDecoration(
                                            hintText: isEn
                                                ? 'Enter item you want to buy'
                                                : 'Nhập thực phẩm bạn muốn mua',
                                            hintStyle:
                                                GoogleFonts.plusJakartaSans(
                                              fontSize: 12.5,
                                              color: isDark
                                                  ? const Color(0xFF9DA8A0)
                                                  : const Color(0xFFA5D6A7),
                                            ),
                                            border: InputBorder.none,
                                            contentPadding:
                                                const EdgeInsets.symmetric(
                                                    vertical: 10),
                                          ),
                                        ),
                                      ),
                                      // Green Add Button (+) with smooth touch inkwell
                                      Material(
                                        color: Colors.transparent,
                                        child: InkWell(
                                          onTap: () => _addNewItem(
                                              _addItemController.text),
                                          borderRadius:
                                              BorderRadius.circular(20),
                                          child: Container(
                                            width: 40,
                                            height: 40,
                                            decoration: const BoxDecoration(
                                              color: Color(0xFF4CAF50),
                                              shape: BoxShape.circle,
                                            ),
                                            child: const Icon(
                                              Icons.add_rounded,
                                              color: Colors.white,
                                              size: 26,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),

                          // Mascot Image (suggest.png) positioned lower and slightly smaller
                          Positioned(
                            right: -2,
                            top: -2,
                            bottom: -18,
                            width: 136,
                            child: Image.asset(
                              'assets/images/suggest.png',
                              fit: BoxFit.contain,
                              alignment: Alignment.centerRight,
                              errorBuilder: (context, error, stackTrace) =>
                                  const Icon(
                                Icons.shopping_bag_rounded,
                                size: 64,
                                color: Colors.white30,
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 22),

                      // 5. Shopping List Header ("Danh sách cần mua")
                      Text(
                        isEn ? 'Shopping List' : 'Danh sách cần mua',
                        style: GoogleFonts.outfit(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF006428),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Items List Cards
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _shoppingList.length,
                        separatorBuilder: (context, index) =>
                            const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final item = _shoppingList[index];
                          return _buildShoppingItemCard(item, isDark, isEn);
                        },
                      ),

                      const SizedBox(height: 24),

                      // 6. Suggested Items Section ("Gợi ý nên mua 🍃")
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Text(
                                isEn ? 'Suggested to buy' : 'Gợi ý nên mua',
                                style: GoogleFonts.outfit(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  color: isDark ? Colors.white : const Color(0xFF006428),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(
                                Icons.eco_rounded,
                                color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                                size: 18,
                              ),
                            ],
                          ),
                          GestureDetector(
                            onTap: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(isEn ? 'View all shopping suggestions' : 'Xem tất cả gợi ý mua sắm'),
                                  duration: const Duration(seconds: 1),
                                ),
                              );
                            },
                            child: Row(
                              children: [
                                Text(
                                  isEn ? 'View all' : 'Xem tất cả',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? const Color(0xFF81C784) : const Color(0xFF1B5E20),
                                  ),
                                ),
                                Icon(
                                  Icons.chevron_right_rounded,
                                  color: isDark ? const Color(0xFF81C784) : const Color(0xFF1B5E20),
                                  size: 18,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 12),

                      // Horizontal Scrollable Suggestions Cards Row
                      SizedBox(
                        height: 125,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          itemCount: _suggestedPurchases.length,
                          separatorBuilder: (context, index) =>
                              const SizedBox(width: 14),
                          itemBuilder: (context, index) {
                            final suggestion = _suggestedPurchases[index];
                            return _buildSuggestionCard(suggestion, isDark, isEn);
                          },
                        ),
                      ),

                      const SizedBox(height: 18),

                      // 7. Bottom Mascot Image (assets/images/market.png) - Equal top and bottom spacing
                      Center(
                        child: Image.asset(
                          'assets/images/market.png',
                          width: double.infinity,
                          height: 210,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) =>
                              const Icon(
                            Icons.storefront_rounded,
                            size: 100,
                            color: Colors.white30,
                          ),
                        ),
                      ),

                      const SizedBox(height: 18),
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

  // Shopping Item White Card Widget matching design
  Widget _buildShoppingItemCard(ShoppingItemModel item, bool isDark, bool isEn) {
    final displayName = _translateItemName(item.name, isEn);
    final displayQty = _translateQuantity(item.quantity, isEn);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF19271E) : Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: isDark
              ? const Color(0xFF2E4D36)
              : (item.isChecked
                  ? const Color(0xFFA5D6A7)
                  : const Color(0xFF81C784)),
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
      child: Row(
        children: [
          // Radio / Checkbox Indicator Circle
          GestureDetector(
            onTap: () => _toggleCheckItem(item),
            child: Container(
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: item.isChecked
                    ? const Color(0xFF4CAF50)
                    : Colors.transparent,
                border: Border.all(
                  color: item.isChecked
                      ? const Color(0xFF4CAF50)
                      : (isDark ? const Color(0xFF6B786F) : const Color(0xFF9E9E9E)),
                  width: 2,
                ),
              ),
              child: item.isChecked
                  ? const Icon(
                      Icons.check_rounded,
                      size: 16,
                      color: Colors.white,
                    )
                  : null,
            ),
          ),
          const SizedBox(width: 14),

          // Item Name (with strikethrough if checked)
          Expanded(
            child: Text(
              displayName,
              style: GoogleFonts.outfit(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: item.isChecked
                    ? (isDark ? const Color(0xFF6B786F) : const Color(0xFF757575))
                    : (isDark ? Colors.white : const Color(0xFF19221C)),
                decoration:
                    item.isChecked ? TextDecoration.lineThrough : null,
              ),
            ),
          ),

          // Optional Quantity Badge Pill
          if (displayQty.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF233629) : const Color(0xFFE8F5E9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                displayQty,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],

          // 3-Dots Action Menu
          PopupMenuButton<String>(
            icon: Icon(
              Icons.more_vert_rounded,
              color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF757575),
              size: 20,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            onSelected: (val) {
              if (val == 'delete') {
                _deleteItem(item);
              } else if (val == 'toggle') {
                _toggleCheckItem(item);
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'toggle',
                child: Text(
                  item.isChecked
                      ? (isEn ? 'Mark as unbought' : 'Đánh dấu chưa mua')
                      : (isEn ? 'Mark as bought' : 'Đánh dấu đã mua'),
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              PopupMenuItem(
                value: 'delete',
                child: Text(
                  isEn ? 'Remove from list' : 'Xóa khỏi danh sách',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFFD32F2F),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Suggestion Card Widget matching Next Week Suggestions screen design
  Widget _buildSuggestionCard(SuggestedPurchaseModel suggestion, bool isDark, bool isEn) {
    final sName = _translateItemName(suggestion.name, isEn);

    return GestureDetector(
      onTap: () => _addSuggestedToShoppingList(suggestion),
      child: Container(
        width: 112,
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF19271E) : Colors.white,
          borderRadius: BorderRadius.circular(22),
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
            // Top Image with rounded corners taking top space
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.asset(
                  suggestion.imagePath,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    color: isDark ? const Color(0xFF233629) : const Color(0xFFE8F5E9),
                    child: Icon(
                      Icons.eco_rounded,
                      size: 36,
                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Bottom Row: Shopping Cart Icon + Name in SAME Row centered
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.shopping_cart_rounded,
                  color: isDark ? const Color(0xFF81C784) : const Color(0xFF008435),
                  size: 15,
                ),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    sName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.outfit(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                      color: isDark ? Colors.white : const Color(0xFF006428),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
          ],
        ),
      ),
    );
  }
}
