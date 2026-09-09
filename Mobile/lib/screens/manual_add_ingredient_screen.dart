import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../l10n/app_localizations.dart';

class ManualAddIngredientScreen extends StatefulWidget {
  const ManualAddIngredientScreen({super.key});

  @override
  State<ManualAddIngredientScreen> createState() =>
      _ManualAddIngredientScreenState();
}

class _ManualAddIngredientScreenState
    extends State<ManualAddIngredientScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _quantityController =
      TextEditingController(text: '0');
  final TextEditingController _notesController = TextEditingController();

  String _selectedCategory = 'Trái cây';
  String _selectedUnit = 'kg';
  String _selectedStorageArea = 'Fridge'; // 'Fridge', 'Freezer', 'Pantry'
  DateTime? _selectedExpirationDate;

  final Map<String, IconData> _categoryIcons = {
    'Trái cây': Icons.apple_rounded,
    'Rau củ': Icons.eco_rounded,
    'Thịt': Icons.set_meal_rounded,
    'Hải sản': Icons.phishing_rounded,
    'Sữa & Trứng': Icons.local_drink_rounded,
    'Đồ uống': Icons.local_cafe_rounded,
    'Khác': Icons.category_rounded,
  };

  final List<String> _categories = [
    'Trái cây',
    'Rau củ',
    'Thịt',
    'Hải sản',
    'Sữa & Trứng',
    'Đồ uống',
    'Khác',
  ];

  final List<String> _units = [
    'kg',
    'g',
    'lbs',
    'pcs',
    'box',
    'bottle',
    'pack',
  ];

  String _translateCategoryName(String cat, bool isEn) {
    if (!isEn) return cat;
    final map = {
      'Trái cây': 'Fruit',
      'Rau củ': 'Vegetables',
      'Thịt': 'Meat',
      'Hải sản': 'Seafood',
      'Sữa & Trứng': 'Dairy & Eggs',
      'Đồ uống': 'Beverages',
      'Khác': 'Other',
    };
    return map[cat] ?? cat;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _quantityController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  // Beautiful Custom Modal for Category Selection
  void _showCategoryPicker(bool isEn) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        return Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF19271E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            border: isDark ? Border.all(color: const Color(0xFF2E4D36), width: 1.2) : null,
          ),
          padding: const EdgeInsets.only(
            left: 20,
            right: 20,
            top: 14,
            bottom: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top Drag Handle Bar
              Center(
                child: Container(
                  width: 38,
                  height: 4.5,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFC8E6C9),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Title Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isEn ? 'Select Category' : 'Chọn Danh Mục',
                    style: GoogleFonts.outfit(
                      fontSize: 21,
                      fontWeight: FontWeight.w800,
                      color: isDark ? Colors.white : const Color(0xFF006428),
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.close_rounded,
                      color: isDark ? Colors.white : const Color(0xFF6B786F),
                    ),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Category Items List
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const BouncingScrollPhysics(),
                  itemCount: _categories.length,
                  separatorBuilder: (context, index) => Divider(
                    height: 1,
                    color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFF0F4F1),
                  ),
                  itemBuilder: (context, index) {
                    final category = _categories[index];
                    final isSelected = category == _selectedCategory;
                    final icon = _categoryIcons[category] ?? Icons.category_rounded;

                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedCategory = category;
                        });
                        Navigator.pop(context);
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? (isDark ? const Color(0xFF233629) : const Color(0xFFE8F5E9))
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? (isDark ? const Color(0xFF81C784) : const Color(0xFF008435))
                                    : (isDark ? const Color(0xFF0E1611) : const Color(0xFFF1F8E9)),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                icon,
                                size: 20,
                                color: isSelected
                                    ? (isDark ? const Color(0xFF0E1611) : Colors.white)
                                    : (isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32)),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Text(
                                _translateCategoryName(category, isEn),
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 16,
                                  fontWeight: isSelected
                                      ? FontWeight.w800
                                      : FontWeight.w600,
                                  color: isSelected
                                      ? (isDark ? const Color(0xFF81C784) : const Color(0xFF008435))
                                      : (isDark ? Colors.white : const Color(0xFF19221C)),
                                ),
                              ),
                            ),
                            if (isSelected)
                              Icon(
                                Icons.check_circle_rounded,
                                color: isDark ? const Color(0xFF81C784) : const Color(0xFF008435),
                                size: 22,
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // Beautiful Custom Modal for Unit Selection
  void _showUnitPicker(bool isEn) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        return Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF19271E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            border: isDark ? Border.all(color: const Color(0xFF2E4D36), width: 1.2) : null,
          ),
          padding: const EdgeInsets.only(
            left: 20,
            right: 20,
            top: 14,
            bottom: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top Drag Handle Bar
              Center(
                child: Container(
                  width: 38,
                  height: 4.5,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFC8E6C9),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Title Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isEn ? 'Select Unit' : 'Chọn Đơn Vị',
                    style: GoogleFonts.outfit(
                      fontSize: 21,
                      fontWeight: FontWeight.w800,
                      color: isDark ? Colors.white : const Color(0xFF006428),
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.close_rounded,
                      color: isDark ? Colors.white : const Color(0xFF6B786F),
                    ),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Unit Chips Grid
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  childAspectRatio: 2.2,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                ),
                itemCount: _units.length,
                itemBuilder: (context, index) {
                  final unit = _units[index];
                  final isSelected = unit == _selectedUnit;

                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedUnit = unit;
                      });
                      Navigator.pop(context);
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? (isDark ? const Color(0xFF81C784) : const Color(0xFF008435))
                            : (isDark ? const Color(0xFF0E1611) : const Color(0xFFF1F8E9)),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected
                              ? (isDark ? const Color(0xFF81C784) : const Color(0xFF008435))
                              : (isDark ? const Color(0xFF2E4D36) : const Color(0xFF81C784)),
                          width: 1.2,
                        ),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: const Color(0xFF008435)
                                      .withValues(alpha: isDark ? 0.4 : 0.25),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                )
                              ]
                            : [],
                      ),
                      child: Text(
                        unit,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: isSelected
                              ? (isDark ? const Color(0xFF0E1611) : Colors.white)
                              : (isDark ? Colors.white : const Color(0xFF008435)),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  // Beautiful Custom On-Screen Keypad & Quantity Picker Modal
  void _showQuantityPickerModal(bool isEn) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            void updateVal(String newVal) {
              setModalState(() {});
              setState(() {
                _quantityController.text = newVal;
              });
            }

            final currentText = _quantityController.text.trim();

            return Container(
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF19271E) : Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                border: isDark ? Border.all(color: const Color(0xFF2E4D36), width: 1.2) : null,
              ),
              padding: const EdgeInsets.only(
                left: 20,
                right: 20,
                top: 14,
                bottom: 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Top Drag Handle Bar
                  Center(
                    child: Container(
                      width: 38,
                      height: 4.5,
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFC8E6C9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Title Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isEn ? 'Select Quantity' : 'Chọn Số Lượng',
                        style: GoogleFonts.outfit(
                          fontSize: 21,
                          fontWeight: FontWeight.w800,
                          color: isDark ? Colors.white : const Color(0xFF006428),
                        ),
                      ),
                      IconButton(
                        icon: Icon(
                          Icons.close_rounded,
                          color: isDark ? Colors.white : const Color(0xFF6B786F),
                        ),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),

                  const SizedBox(height: 10),

                  // Large Display Number Box
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0E1611) : const Color(0xFFF1F8E9),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isDark ? const Color(0xFF2E4D36) : const Color(0xFF81C784),
                        width: 1.4,
                      ),
                    ),
                    child: Text(
                      currentText.isEmpty ? '0' : currentText,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.outfit(
                        fontSize: 34,
                        fontWeight: FontWeight.w900,
                        color: isDark ? const Color(0xFF81C784) : const Color(0xFF008435),
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Quick Preset Chips (1, 2, 3, 5, 10, 12, 20)
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.center,
                    children:
                        ['1', '2', '3', '5', '10', '12', '20'].map((numStr) {
                      final isSel = currentText == numStr;
                      return GestureDetector(
                        onTap: () => updateVal(numStr),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 15,
                            vertical: 7,
                          ),
                          decoration: BoxDecoration(
                            color: isSel
                                ? (isDark ? const Color(0xFF81C784) : const Color(0xFF008435))
                                : (isDark ? const Color(0xFF233629) : const Color(0xFFE8F5E9)),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Text(
                            numStr,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w700,
                              color: isSel
                                  ? (isDark ? const Color(0xFF0E1611) : Colors.white)
                                  : (isDark ? Colors.white : const Color(0xFF008435)),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 18),

                  // On-Screen Keypad Grid (1-9, Backspace, 0, Done)
                  GridView.count(
                    shrinkWrap: true,
                    crossAxisCount: 3,
                    childAspectRatio: 2.2,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      ...'123456789'.split('').map((digit) {
                        return GestureDetector(
                          onTap: () {
                            if (currentText == '0') {
                              updateVal(digit);
                            } else {
                              updateVal(currentText + digit);
                            }
                          },
                          child: Container(
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF0E1611) : const Color(0xFFF4F7F4),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Center(
                              child: Text(
                                digit,
                                style: GoogleFonts.outfit(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? Colors.white : const Color(0xFF19221C),
                                ),
                              ),
                            ),
                          ),
                        );
                      }),

                      // Backspace ⌫
                      GestureDetector(
                        onTap: () {
                          if (currentText.isNotEmpty) {
                            final nextText = currentText.substring(
                              0,
                              currentText.length - 1,
                            );
                            updateVal(nextText.isEmpty ? '0' : nextText);
                          }
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF3E1D22) : const Color(0xFFFFEBEE),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Center(
                            child: Icon(
                              Icons.backspace_outlined,
                              color: isDark ? const Color(0xFFE57373) : const Color(0xFFD32F2F),
                              size: 22,
                            ),
                          ),
                        ),
                      ),

                      // 0
                      GestureDetector(
                        onTap: () {
                          if (currentText != '0') {
                            updateVal('${currentText}0');
                          }
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF0E1611) : const Color(0xFFF4F7F4),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Center(
                            child: Text(
                              '0',
                              style: GoogleFonts.outfit(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: isDark ? Colors.white : const Color(0xFF19221C),
                              ),
                            ),
                          ),
                        ),
                      ),

                      // Done ✔ Button
                      GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: Container(
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF81C784) : const Color(0xFF008435),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Center(
                            child: Icon(
                              Icons.check_rounded,
                              color: isDark ? const Color(0xFF0E1611) : Colors.white,
                              size: 26,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // Date Picker
  Future<void> _pickExpirationDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedExpirationDate ?? now.add(const Duration(days: 7)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365 * 3)),
      builder: (context, child) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: isDark
                ? const ColorScheme.dark(
                    primary: Color(0xFF81C784),
                    onPrimary: Color(0xFF0E1611),
                    surface: Color(0xFF19271E),
                    onSurface: Colors.white,
                  )
                : const ColorScheme.light(
                    primary: Color(0xFF008435),
                    onPrimary: Colors.white,
                    surface: Colors.white,
                    onSurface: Color(0xFF19221C),
                  ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedExpirationDate = picked;
      });
    }
  }

  void _saveIngredient() {
    final isEn = AppLocalizations.of(context)?.locale.languageCode == 'en';
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isEn ? 'Please enter ingredient name' : 'Vui lòng nhập tên nguyên liệu'),
          backgroundColor: Colors.red.shade700,
        ),
      );
      return;
    }

    final qtyNum = _quantityController.text.trim();
    final fullQtyStr = '$qtyNum $_selectedUnit';

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          isEn ? 'Added $name ($fullQtyStr) to fridge!' : 'Đã thêm $name ($fullQtyStr) vào tủ lạnh thành công!',
        ),
        backgroundColor: const Color(0xFF008435),
      ),
    );

    Navigator.pop(context);
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
            children: [
              // 1. Top Bar Header (Back Icon + Friggy Logo)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF19271E) : Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C),
                            width: 1.2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                        child: Icon(
                          Icons.arrow_back_rounded,
                          color: isDark ? Colors.white : const Color(0xFF006428),
                          size: 22,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Friggy Brand Title with Leaf
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Row(
                        children: [
                          RichText(
                            text: TextSpan(
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 26,
                                fontWeight: FontWeight.w900,
                                letterSpacing: -0.5,
                              ),
                              children: [
                                TextSpan(
                                  text: 'Fri',
                                  style: TextStyle(
                                    color: isDark ? Colors.white : const Color(0xFF19221C),
                                  ),
                                ),
                                TextSpan(
                                  text: 'ggy',
                                  style: TextStyle(
                                    color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.eco_rounded,
                            color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                            size: 20,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // 2. Main Scrollable Form Area
              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 12),

                      // Mascot Greeting Card Banner
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E3A25) : const Color(0xFF52B756),
                          borderRadius: BorderRadius.circular(22),
                          border: isDark
                              ? Border.all(color: const Color(0xFF2E4D36), width: 1.2)
                              : null,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.08),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            // Mascot Image (assets/images/QR.png)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: Image.asset(
                                'assets/images/QR.png',
                                width: 80,
                                height: 80,
                                fit: BoxFit.contain,
                                errorBuilder: (context, error, stackTrace) {
                                  return Container(
                                    width: 80,
                                    height: 80,
                                    color: Colors.white24,
                                    child: const Icon(
                                      Icons.face_rounded,
                                      size: 40,
                                      color: Colors.white,
                                    ),
                                  );
                                },
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Text(
                                isEn ? 'Add quickly, let Friggy handle the rest!' : 'Nhập nhanh chóng, để Friggy lo phần còn lại!',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                  height: 1.35,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      // 1. Ingredient Name Field
                      _buildFieldTitle(isEn ? 'Ingredient Name' : 'Tên Nguyên Liệu'),
                      const SizedBox(height: 6),
                      _buildTextField(
                        controller: _nameController,
                        hintText: isEn ? 'e.g. Red Apple, Fresh Milk...' : 'vd: Táo đỏ, Sữa tươi...',
                      ),

                      const SizedBox(height: 16),

                      // 2. Row: Category & Quantity
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildFieldTitle(isEn ? 'Category' : 'Danh Mục'),
                                const SizedBox(height: 6),
                                _buildSelectField(
                                  value: _translateCategoryName(_selectedCategory, isEn),
                                  icon: _categoryIcons[_selectedCategory],
                                  onTap: () => _showCategoryPicker(isEn),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildFieldTitle(isEn ? 'Quantity' : 'Số Lượng'),
                                const SizedBox(height: 6),
                                _buildQuantityStepperField(isEn),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // 3. Row: Unit & Expiration Date
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildFieldTitle(isEn ? 'Unit' : 'Đơn Vị'),
                                const SizedBox(height: 6),
                                _buildSelectField(
                                  value: _selectedUnit,
                                  onTap: () => _showUnitPicker(isEn),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildFieldTitle(isEn ? 'Expiry Date' : 'Ngày Hết Hạn'),
                                const SizedBox(height: 6),
                                GestureDetector(
                                  onTap: _pickExpirationDate,
                                  child: Container(
                                    height: 52,
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isDark ? const Color(0xFF19271E) : Colors.white,
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: isDark ? const Color(0xFF2E4D36) : const Color(0xFF81C784),
                                        width: 1.2,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            _selectedExpirationDate == null
                                                ? 'mm/dd/yyyy'
                                                : '${_selectedExpirationDate!.month.toString().padLeft(2, '0')}/${_selectedExpirationDate!.day.toString().padLeft(2, '0')}/${_selectedExpirationDate!.year}',
                                            style: GoogleFonts.plusJakartaSans(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w600,
                                              color: _selectedExpirationDate == null
                                                  ? (isDark ? const Color(0xFF9DA8A0) : const Color(0xFFA5D6A7))
                                                  : (isDark ? Colors.white : const Color(0xFF19221C)),
                                            ),
                                          ),
                                        ),
                                        Icon(
                                          Icons.calendar_today_rounded,
                                          size: 18,
                                          color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // 4. Storage Area (Pills: Fridge, Freezer, Pantry)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.start,
                        children: [
                          _buildFieldTitle(isEn ? 'Storage Area' : 'Vị Trí Lưu Trữ'),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: _buildStoragePill('Fridge', isEn ? 'Cooler' : 'Ngăn mát'),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _buildStoragePill('Freezer', isEn ? 'Freezer' : 'Ngăn đông'),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _buildStoragePill('Pantry', isEn ? 'Pantry' : 'Tủ khô'),
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // 5. Notes Field
                      _buildFieldTitle(isEn ? 'Notes' : 'Ghi Chú'),
                      const SizedBox(height: 6),
                      _buildTextField(
                        controller: _notesController,
                        hintText: isEn ? 'Add notes about freshness, origin...' : 'Thêm ghi chú về độ tươi, nguồn gốc...',
                        maxLines: 3,
                      ),

                      const SizedBox(height: 28),

                      // 6. Save / Add Button
                      GestureDetector(
                        onTap: _saveIngredient,
                        child: Container(
                          width: double.infinity,
                          height: 56,
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF81C784) : const Color(0xFF008435),
                            borderRadius: BorderRadius.circular(28),
                            boxShadow: [
                              BoxShadow(
                                color: (isDark ? const Color(0xFF81C784) : const Color(0xFF008435))
                                    .withValues(alpha: 0.3),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.add_circle_outline_rounded,
                                color: isDark ? const Color(0xFF0E1611) : Colors.white,
                                size: 24,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                isEn ? 'Add to Fridge' : 'Thêm Vào Tủ Lạnh',
                                style: GoogleFonts.outfit(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? const Color(0xFF0E1611) : Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 32),
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

  Widget _buildFieldTitle(String title) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Text(
      title,
      style: GoogleFonts.outfit(
        fontSize: 15.5,
        fontWeight: FontWeight.w800,
        color: isDark ? Colors.white : const Color(0xFF006428),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hintText,
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF19271E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF2E4D36) : const Color(0xFF81C784),
          width: 1.2,
        ),
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        maxLines: maxLines,
        style: GoogleFonts.plusJakartaSans(
          fontSize: 14.5,
          fontWeight: FontWeight.w600,
          color: isDark ? Colors.white : const Color(0xFF19221C),
        ),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFFA5D6A7),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
          border: InputBorder.none,
        ),
      ),
    );
  }

  void _incrementQuantity() {
    final current = int.tryParse(_quantityController.text.trim()) ?? 0;
    setState(() {
      _quantityController.text = (current + 1).toString();
    });
  }

  void _decrementQuantity() {
    final current = int.tryParse(_quantityController.text.trim()) ?? 0;
    if (current > 0) {
      setState(() {
        _quantityController.text = (current - 1).toString();
      });
    }
  }

  Widget _buildQuantityStepperField(bool isEn) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: 52,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF19271E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF2E4D36) : const Color(0xFF81C784),
          width: 1.2,
        ),
      ),
      child: Row(
        children: [
          // Minus Button (-)
          GestureDetector(
            onTap: _decrementQuantity,
            child: Container(
              width: 34,
              height: 34,
              margin: const EdgeInsets.only(left: 6),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF233629) : const Color(0xFFF1F8E9),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.remove_rounded,
                size: 18,
                color: isDark ? const Color(0xFF81C784) : const Color(0xFF008435),
              ),
            ),
          ),

          // Tapping middle area opens Custom On-Screen Keypad & Quantity Picker Modal
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => _showQuantityPickerModal(isEn),
              child: Container(
                height: 52,
                alignment: Alignment.center,
                child: Text(
                  _quantityController.text.isEmpty
                      ? '0'
                      : _quantityController.text,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF19221C),
                  ),
                ),
              ),
            ),
          ),

          // Plus Button (+)
          GestureDetector(
            onTap: _incrementQuantity,
            child: Container(
              width: 34,
              height: 34,
              margin: const EdgeInsets.only(right: 6),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF233629) : const Color(0xFFF1F8E9),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.add_rounded,
                size: 18,
                color: isDark ? const Color(0xFF81C784) : const Color(0xFF008435),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectField({
    required String value,
    required VoidCallback onTap,
    IconData? icon,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 52,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF19271E) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? const Color(0xFF2E4D36) : const Color(0xFF81C784),
            width: 1.2,
          ),
        ),
        child: Row(
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 20,
                color: isDark ? const Color(0xFF81C784) : const Color(0xFF008435),
              ),
              const SizedBox(width: 8),
            ],
            Expanded(
              child: Text(
                value,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : const Color(0xFF19221C),
                ),
              ),
            ),
            Icon(
              Icons.keyboard_arrow_down_rounded,
              color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
              size: 22,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStoragePill(String key, String label) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isSelected = _selectedStorageArea == key;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedStorageArea = key;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? const Color(0xFF81C784) : const Color(0xFF008435))
              : (isDark ? const Color(0xFF19271E) : Colors.white),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: isSelected
                ? (isDark ? const Color(0xFF81C784) : const Color(0xFF008435))
                : (isDark ? const Color(0xFF2E4D36) : const Color(0xFF81C784)),
            width: 1.4,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF008435)
                        .withValues(alpha: isDark ? 0.4 : 0.25),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  )
                ]
              : [],
        ),
        child: Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 13.5,
            fontWeight: FontWeight.w700,
            color: isSelected
                ? (isDark ? const Color(0xFF0E1611) : Colors.white)
                : (isDark ? Colors.white : const Color(0xFF008435)),
          ),
        ),
      ),
    );
  }
}
