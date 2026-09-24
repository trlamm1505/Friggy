import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/models/user_models.dart';
import '../data/services/api_exception.dart';
import '../data/services/api_service.dart';
import '../l10n/app_localizations.dart';

class UserAllergiesScreen extends StatefulWidget {
  const UserAllergiesScreen({super.key});

  @override
  State<UserAllergiesScreen> createState() => _UserAllergiesScreenState();
}

class _UserAllergiesScreenState extends State<UserAllergiesScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<AllergyModel> _allergies = [];

  @override
  void initState() {
    super.initState();
    _fetchAllergies();
  }

  Future<void> _fetchAllergies() async {
    try {
      final list = await _apiService.getAllergies();
      if (mounted) {
        setState(() {
          _allergies = list.map((item) => AllergyModel.fromJson(item)).toList();
        });
      }
    } catch (e) {
      debugPrint('[UserAllergiesScreen] Error fetching allergies: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _removeAllergy(AllergyModel allergy) async {
    try {
      await _apiService.removeAllergy(allergy.id);
      setState(() {
        _allergies.removeWhere((a) => a.id == allergy.id);
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã xóa "${allergy.ingredientName}" khỏi danh sách dị ứng'),
            backgroundColor: const Color(0xFF008435),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không thể xóa dị ứng. Vui lòng thử lại'),
            backgroundColor: Color(0xFFD32F2F),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showAddAllergyModal() {
    showModalBottomSheet<AllergyModel>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return const _AddAllergyModal();
      },
    ).then((newAllergy) {
      if (newAllergy != null && mounted) {
        setState(() {
          _allergies.add(newAllergy);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã thêm dị ứng "${newAllergy.ingredientName}" thành công!'),
            backgroundColor: const Color(0xFF008435),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';

    final titleColor = isDark ? const Color(0xFF81C784) : const Color(0xFF006428);
    final cardBg = isDark ? const Color(0xFF19271E) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C);

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddAllergyModal,
        backgroundColor: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
        icon: Icon(Icons.add_rounded, color: isDark ? const Color(0xFF0E1611) : Colors.white),
        label: Text(
          isEn ? 'Add Allergy' : 'Thêm dị ứng',
          style: GoogleFonts.plusJakartaSans(
            fontWeight: FontWeight.w800,
            color: isDark ? const Color(0xFF0E1611) : Colors.white,
          ),
        ),
      ),
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? const [Color(0xFF0E1611), Color(0xFF142017), Color(0xFF1B2E21)]
                : const [Color(0xFFFFFFFF), Color(0xFFF5FCF4), Color(0xFFC7EFC2), Color(0xFF86D978)],
            stops: isDark ? const [0.0, 0.5, 1.0] : const [0.0, 0.3, 0.7, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
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
                          color: cardBg,
                          shape: BoxShape.circle,
                          border: Border.all(color: cardBorder, width: 1.2),
                        ),
                        child: Icon(
                          Icons.arrow_back_rounded,
                          color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                          size: 22,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Text(
                      isEn ? 'Food Allergies' : 'Dị ứng thực phẩm',
                      style: GoogleFonts.outfit(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: titleColor,
                      ),
                    ),
                  ],
                ),
              ),

              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF4CAF50)))
                    : _allergies.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.shield_outlined,
                                  size: 64,
                                  color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5D6A7),
                                ),
                                const SizedBox(height: 14),
                                Text(
                                  isEn ? 'No food allergies recorded' : 'Chưa ghi nhận dị ứng thực phẩm nào',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? Colors.white70 : const Color(0xFF424242),
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 32.0),
                                  child: Text(
                                    isEn
                                        ? 'Add ingredients you are allergic to so Friggy can filter recipes for you!'
                                        : 'Bấm nút "Thêm dị ứng" bên dưới để chọn món dị ứng và được Friggy cảnh báo!',
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 13,
                                      color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF757575),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            physics: const BouncingScrollPhysics(),
                            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                            itemCount: _allergies.length,
                            itemBuilder: (context, index) {
                              final allergy = _allergies[index];
                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: cardBg,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: cardBorder, width: 1.2),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: isDark ? const Color(0xFF3E1E1E) : const Color(0xFFFFEBEE),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.warning_amber_rounded,
                                        color: Color(0xFFD32F2F),
                                        size: 22,
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            allergy.ingredientName,
                                            style: GoogleFonts.plusJakartaSans(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w800,
                                              color: isDark ? Colors.white : const Color(0xFF19221C),
                                            ),
                                          ),
                                          if (allergy.note != null && allergy.note!.isNotEmpty)
                                            Padding(
                                              padding: const EdgeInsets.only(top: 4.0),
                                              child: Text(
                                                allergy.note!,
                                                style: GoogleFonts.plusJakartaSans(
                                                  fontSize: 13,
                                                  color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF757575),
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFD32F2F)),
                                      onPressed: () => _removeAllergy(allergy),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ----------------------------------------------------------------------------
// Ingredient Selector Modal for Adding Allergy
// ----------------------------------------------------------------------------
class _AddAllergyModal extends StatefulWidget {
  const _AddAllergyModal();

  @override
  State<_AddAllergyModal> createState() => _AddAllergyModalState();
}

class _AddAllergyModalState extends State<_AddAllergyModal> {
  final ApiService _apiService = ApiService();
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _noteController = TextEditingController();
  Timer? _debounceTimer;

  bool _isLoadingIngredients = true;
  bool _isSubmitting = false;

  List<dynamic> _allIngredients = [];
  List<dynamic> _filteredIngredients = [];
  Map<String, dynamic>? _selectedIngredient;

  @override
  void initState() {
    super.initState();
    _loadIngredients();
  }

  Future<void> _loadIngredients() async {
    try {
      final list = await _apiService.getIngredients(limit: 100);
      if (mounted) {
        setState(() {
          _allIngredients = list;
          _filteredIngredients = list;
        });
      }
    } catch (e) {
      debugPrint('[_AddAllergyModal] Error loading ingredients: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoadingIngredients = false);
      }
    }
  }

  void _filterIngredients(String query) {
    _debounceTimer?.cancel();
    final q = query.trim();
    if (q.isEmpty) {
      setState(() => _filteredIngredients = _allIngredients);
      return;
    }

    _debounceTimer = Timer(const Duration(milliseconds: 300), () async {
      try {
        final list = await _apiService.getIngredients(search: q, limit: 100);
        if (mounted) {
          setState(() {
            _filteredIngredients = list;
          });
        }
      } catch (e) {
        debugPrint('[_AddAllergyModal] Error searching ingredients: $e');
      }
    });
  }

  Future<void> _submit() async {
    if (_selectedIngredient == null) return;
    final int ingredientId = _selectedIngredient!['id'] as int;

    setState(() => _isSubmitting = true);

    try {
      final result = await _apiService.addAllergy(
        ingredientId,
        _noteController.text.trim(),
      );
      final newAllergy = AllergyModel.fromJson(result);
      if (mounted) {
        Navigator.pop(context, newAllergy);
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.message),
            backgroundColor: const Color(0xFFD32F2F),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không thể thêm dị ứng nguyên liệu. Vui lòng thử lại!'),
            backgroundColor: Color(0xFFD32F2F),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;

    final bgColor = isDark ? const Color(0xFF19271E) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C);

    return Container(
      height: MediaQuery.of(context).size.height * 0.78 + bottomPadding,
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: bottomPadding + 20,
      ),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle indicator
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? Colors.white30 : Colors.black26,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          Text(
            'Thêm dị ứng nguyên liệu',
            style: GoogleFonts.outfit(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF006428),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Chọn nguyên liệu gây dị ứng từ danh sách bên dưới:',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 13,
              color: isDark ? Colors.white70 : Colors.black54,
            ),
          ),
          const SizedBox(height: 14),

          // Search Bar
          TextField(
            controller: _searchController,
            onChanged: _filterIngredients,
            style: TextStyle(color: isDark ? Colors.white : Colors.black87),
            decoration: InputDecoration(
              hintText: 'Tìm tên món / nguyên liệu (VD: Tôm, Trứng, Sữa...)',
              hintStyle: TextStyle(color: isDark ? Colors.white38 : Colors.black38, fontSize: 13.5),
              prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF4CAF50)),
              filled: true,
              fillColor: isDark ? const Color(0xFF0E1611) : const Color(0xFFF5FCF4),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: cardBorder),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: cardBorder),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Color(0xFF4CAF50), width: 1.8),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Ingredients List View
          Expanded(
            child: _isLoadingIngredients
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF4CAF50)))
                : _filteredIngredients.isEmpty
                    ? Center(
                        child: Text(
                          'Không tìm thấy nguyên liệu phù hợp',
                          style: TextStyle(color: isDark ? Colors.white60 : Colors.black54),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _filteredIngredients.length,
                        itemBuilder: (context, index) {
                          final item = _filteredIngredients[index];
                          final String name = item['name'] as String? ?? 'Nguyên liệu';
                          final String? unit = item['defaultUnit'] as String?;
                          final bool isSelected = _selectedIngredient?['id'] == item['id'];

                          return GestureDetector(
                            onTap: () {
                              setState(() {
                                _selectedIngredient = item;
                              });
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 180),
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? (isDark ? const Color(0xFF1E3A26) : const Color(0xFFE8F5E9))
                                    : (isDark ? const Color(0xFF0E1611) : const Color(0xFFF9FBF9)),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isSelected ? const Color(0xFF4CAF50) : cardBorder,
                                  width: isSelected ? 2 : 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.restaurant_rounded, color: Color(0xFF4CAF50), size: 20),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      name,
                                      style: GoogleFonts.plusJakartaSans(
                                        fontSize: 15,
                                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                        color: isDark ? Colors.white : const Color(0xFF19221C),
                                      ),
                                    ),
                                  ),
                                  if (unit != null && unit.isNotEmpty)
                                    Text(
                                      '($unit)',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: isDark ? Colors.white38 : Colors.black38,
                                      ),
                                    ),
                                  if (isSelected) ...[
                                    const SizedBox(width: 10),
                                    const Icon(Icons.check_circle_rounded, color: Color(0xFF4CAF50), size: 22),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),

          const SizedBox(height: 12),

          // Note input
          TextField(
            controller: _noteController,
            style: TextStyle(color: isDark ? Colors.white : Colors.black87),
            decoration: InputDecoration(
              hintText: 'Ghi chú dị ứng (VD: Nổi mề đay, dị ứng nặng...)',
              hintStyle: TextStyle(color: isDark ? Colors.white38 : Colors.black38, fontSize: 13),
              filled: true,
              fillColor: isDark ? const Color(0xFF0E1611) : const Color(0xFFF5FCF4),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: cardBorder),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: cardBorder),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Submit Button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: (_selectedIngredient == null || _isSubmitting) ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF008435),
                disabledBackgroundColor: Colors.grey.withValues(alpha: 0.3),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                    )
                  : Text(
                      _selectedIngredient != null
                          ? 'Thêm dị ứng: ${_selectedIngredient!['name']}'
                          : 'Vui lòng chọn một nguyên liệu',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
