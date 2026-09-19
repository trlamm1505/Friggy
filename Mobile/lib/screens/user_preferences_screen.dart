import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/models/user_models.dart';
import '../data/services/api_exception.dart';
import '../data/services/api_service.dart';
import '../l10n/app_localizations.dart';

class UserPreferencesScreen extends StatefulWidget {
  const UserPreferencesScreen({super.key});

  @override
  State<UserPreferencesScreen> createState() => _UserPreferencesScreenState();
}

class _UserPreferencesScreenState extends State<UserPreferencesScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  bool _isSaving = false;

  final _weeklyBudgetController = TextEditingController();
  final _calorieController = TextEditingController();
  final _maxCookTimeController = TextEditingController();
  final _householdSizeController = TextEditingController();
  final _heightController = TextEditingController();
  final _weightController = TextEditingController();

  String _dietaryStyle = 'omnivore';
  String _skillLevel = 'beginner';
  String _aiPersonalityMode = 'friendly';
  String _primaryGoal = 'save_money';
  String _cookingFrequency = 'daily';
  String _activityLevel = 'moderate';
  bool _preferSimpleRecipes = false;

  @override
  void initState() {
    super.initState();
    _fetchPreferences();
  }

  Future<void> _fetchPreferences() async {
    try {
      final res = await _apiService.getPreferences();
      if (res != null && mounted) {
        final prefs = UserPreferenceModel.fromJson(res);
        setState(() {
          _weeklyBudgetController.text = prefs.weeklyBudget?.toString() ?? '';
          _calorieController.text = prefs.dailyCalorieTarget?.toString() ?? '';
          _maxCookTimeController.text = prefs.maxCookTimeMinutes?.toString() ?? '';
          _householdSizeController.text = prefs.householdSize.toString();
          _heightController.text = prefs.height?.toString() ?? '';
          _weightController.text = prefs.weight?.toString() ?? '';

          _dietaryStyle = prefs.dietaryStyle ?? 'omnivore';
          _skillLevel = prefs.skillLevel;
          _aiPersonalityMode = prefs.aiPersonalityMode;
          _primaryGoal = prefs.primaryGoal ?? 'save_money';
          _cookingFrequency = prefs.cookingFrequency ?? 'daily';
          _activityLevel = prefs.activityLevel ?? 'moderate';
          _preferSimpleRecipes = prefs.preferSimpleRecipes;
        });
      }
    } catch (e) {
      debugPrint('[UserPreferencesScreen] Error fetching preferences: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _savePreferences() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _isSaving = true;
    });

    try {
      final data = <String, dynamic>{
        'dietaryStyle': _dietaryStyle,
        'skillLevel': _skillLevel,
        'aiPersonalityMode': _aiPersonalityMode,
        'primaryGoal': _primaryGoal,
        'cookingFrequency': _cookingFrequency,
        'activityLevel': _activityLevel,
        'preferSimpleRecipes': _preferSimpleRecipes,
        'householdSize': int.tryParse(_householdSizeController.text.trim()) ?? 1,
      };

      if (_weeklyBudgetController.text.trim().isNotEmpty) {
        data['weeklyBudget'] = int.tryParse(_weeklyBudgetController.text.trim());
      }
      if (_calorieController.text.trim().isNotEmpty) {
        data['dailyCalorieTarget'] = int.tryParse(_calorieController.text.trim());
      }
      if (_maxCookTimeController.text.trim().isNotEmpty) {
        data['maxCookTimeMinutes'] = int.tryParse(_maxCookTimeController.text.trim());
      }
      if (_heightController.text.trim().isNotEmpty) {
        data['height'] = int.tryParse(_heightController.text.trim());
      }
      if (_weightController.text.trim().isNotEmpty) {
        data['weight'] = int.tryParse(_weightController.text.trim());
      }

      await _apiService.updatePreferences(data);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Đã cập nhật tùy chọn cá nhân thành công!'),
            backgroundColor: const Color(0xFF008435),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        );
        Navigator.pop(context);
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
            content: Text('Đã xảy ra lỗi khi lưu tùy chọn'),
            backgroundColor: Color(0xFFD32F2F),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _weeklyBudgetController.dispose();
    _calorieController.dispose();
    _maxCookTimeController.dispose();
    _householdSizeController.dispose();
    _heightController.dispose();
    _weightController.dispose();
    super.dispose();
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
                      isEn ? 'Culinary & Dietary Preferences' : 'Tùy chọn ăn uống & Kỹ năng',
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
                    : SingleChildScrollView(
                        physics: const BouncingScrollPhysics(),
                        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 1. Primary Goal
                            _buildSectionHeader(isEn ? 'Primary Goal' : 'Mục tiêu chính của bạn', isDark),
                            const SizedBox(height: 8),
                            _buildSelectCard(
                              cardBg: cardBg,
                              cardBorder: cardBorder,
                              options: {
                                'save_money': isEn ? 'Save Money 💰' : 'Tiết kiệm chi phí thực phẩm 💰',
                                'reduce_waste': isEn ? 'Reduce Food Waste ♻️' : 'Giảm thiểu lãng phí thức ăn ♻️',
                                'eat_healthy': isEn ? 'Eat Healthy 🥗' : 'Ăn uống lành mạnh & khoa học 🥗',
                                'convenience': isEn ? 'Quick & Easy Cooking ⚡' : 'Nấu ăn nhanh chóng & tiện lợi ⚡',
                              },
                              selectedValue: _primaryGoal,
                              onSelect: (val) => setState(() => _primaryGoal = val),
                              isDark: isDark,
                            ),

                            const SizedBox(height: 20),

                            // 2. Cooking Frequency
                            _buildSectionHeader(isEn ? 'Cooking Frequency' : 'Tần suất nấu ăn', isDark),
                            const SizedBox(height: 8),
                            _buildSelectCard(
                              cardBg: cardBg,
                              cardBorder: cardBorder,
                              options: {
                                'daily': isEn ? 'Daily 🍳' : 'Hàng ngày 🍳',
                                'few_times_week': isEn ? 'A few times a week 🍲' : 'Vài lần một tuần 🍲',
                                'weekends': isEn ? 'Weekends only 🍕' : 'Chỉ nấu cuối tuần 🍕',
                                'rarely': isEn ? 'Rarely 🥡' : 'Hiếm khi nấu ăn 🥡',
                              },
                              selectedValue: _cookingFrequency,
                              onSelect: (val) => setState(() => _cookingFrequency = val),
                              isDark: isDark,
                            ),

                            const SizedBox(height: 20),

                            // 3. Dietary Style
                            _buildSectionHeader(isEn ? 'Dietary Style' : 'Chế độ ăn uống', isDark),
                            const SizedBox(height: 8),
                            _buildSelectCard(
                              cardBg: cardBg,
                              cardBorder: cardBorder,
                              options: {
                                'omnivore': isEn ? 'Omnivore (Eat Everything)' : 'Ăn đa dạng (Tất cả món)',
                                'vegetarian': isEn ? 'Vegetarian' : 'Ăn chay có trứng/sữa',
                                'vegan': isEn ? 'Strict Vegan' : 'Ăn chay thuần',
                                'keto': isEn ? 'Keto Low-Carb' : 'Keto (Ít tinh bột)',
                                'halal': isEn ? 'Halal' : 'Chế độ Halal',
                              },
                              selectedValue: _dietaryStyle,
                              onSelect: (val) => setState(() => _dietaryStyle = val),
                              isDark: isDark,
                            ),

                            const SizedBox(height: 20),

                            // 4. Cooking Skill Level
                            _buildSectionHeader(isEn ? 'Cooking Skill Level' : 'Kỹ năng nấu ăn', isDark),
                            const SizedBox(height: 8),
                            _buildSelectCard(
                              cardBg: cardBg,
                              cardBorder: cardBorder,
                              options: {
                                'beginner': isEn ? 'Beginner (Basic recipes)' : 'Mới bắt đầu (Món đơn giản)',
                                'intermediate': isEn ? 'Intermediate' : 'Trung bình (Biết nấu thường ngày)',
                                'advanced': isEn ? 'Advanced (Complex dishes)' : 'Thành thạo (Món phức tạp)',
                              },
                              selectedValue: _skillLevel,
                              onSelect: (val) => setState(() => _skillLevel = val),
                              isDark: isDark,
                            ),

                            const SizedBox(height: 20),

                            // 5. Activity Level
                            _buildSectionHeader(isEn ? 'Daily Activity Level' : 'Mức độ vận động', isDark),
                            const SizedBox(height: 8),
                            _buildSelectCard(
                              cardBg: cardBg,
                              cardBorder: cardBorder,
                              options: {
                                'sedentary': isEn ? 'Sedentary 🛋️' : 'Ít vận động (Ngồi nhiều) 🛋️',
                                'light': isEn ? 'Lightly Active 🚶' : 'Vận động nhẹ (Đi bộ) 🚶',
                                'moderate': isEn ? 'Moderately Active 🏃' : 'Vận động vừa (Tập 3-5 ngày/tuần) 🏃',
                                'active': isEn ? 'Very Active 🚴' : 'Năng động / Thể thao 🚴',
                              },
                              selectedValue: _activityLevel,
                              onSelect: (val) => setState(() => _activityLevel = val),
                              isDark: isDark,
                            ),

                            const SizedBox(height: 20),

                            // 6. AI Assistant Personality
                            _buildSectionHeader(isEn ? 'AI Assistant Personality' : 'Tính cách trợ lý AI', isDark),
                            const SizedBox(height: 8),
                            _buildSelectCard(
                              cardBg: cardBg,
                              cardBorder: cardBorder,
                              options: {
                                'friendly': isEn ? 'Friendly & Warm 🌟' : 'Thân thiện & Ấm áp 🌟',
                                'professional': isEn ? 'Professional & Precise 👨‍🍳' : 'Chuyên nghiệp & Chuẩn xác 👨‍🍳',
                                'coach': isEn ? 'Nutritional Coach 💪' : 'HLV Dinh dưỡng 💪',
                              },
                              selectedValue: _aiPersonalityMode,
                              onSelect: (val) => setState(() => _aiPersonalityMode = val),
                              isDark: isDark,
                            ),

                            const SizedBox(height: 20),

                            // 7. Simple Recipes Preference Toggle
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                color: cardBg,
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(color: cardBorder, width: 1.2),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          isEn ? 'Prefer Simple Recipes' : 'Ưu tiên công thức nấu ăn đơn giản',
                                          style: GoogleFonts.outfit(
                                            fontSize: 15,
                                            fontWeight: FontWeight.bold,
                                            color: isDark ? Colors.white : const Color(0xFF19221C),
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          isEn ? 'AI will favor quick & easy 15-20 min recipes' : 'AI sẽ ưu tiên các món ngon chế biến nhanh 15-20 phút',
                                          style: GoogleFonts.plusJakartaSans(
                                            fontSize: 12,
                                            color: isDark ? Colors.white60 : Colors.black54,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Switch(
                                    value: _preferSimpleRecipes,
                                    activeTrackColor: const Color(0xFF4CAF50),
                                    onChanged: (val) => setState(() => _preferSimpleRecipes = val),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 20),

                            // 4. Budget & Calorie Targets
                            _buildSectionHeader(isEn ? 'Budget & Calories' : 'Ngân sách & Calo', isDark),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                color: cardBg,
                                borderRadius: BorderRadius.circular(22),
                                border: Border.all(color: cardBorder, width: 1.2),
                              ),
                              child: Column(
                                children: [
                                  _buildInputField(
                                    label: isEn ? 'Weekly Budget (VND)' : 'Ngân sách đi chợ tuần (VND)',
                                    controller: _weeklyBudgetController,
                                    icon: Icons.account_balance_wallet_rounded,
                                    hint: 'VD: 500000',
                                    isDark: isDark,
                                  ),
                                  const SizedBox(height: 14),
                                  _buildInputField(
                                    label: isEn ? 'Daily Calorie Target (kcal)' : 'Mục tiêu Calo hàng ngày (kcal)',
                                    controller: _calorieController,
                                    icon: Icons.local_fire_department_rounded,
                                    hint: 'VD: 2000',
                                    isDark: isDark,
                                  ),
                                  const SizedBox(height: 14),
                                  _buildInputField(
                                    label: isEn ? 'Max Cooking Time (minutes)' : 'Thời gian nấu tối đa (phút)',
                                    controller: _maxCookTimeController,
                                    icon: Icons.timer_rounded,
                                    hint: 'VD: 30',
                                    isDark: isDark,
                                  ),
                                  const SizedBox(height: 14),
                                  _buildInputField(
                                    label: isEn ? 'Household Size' : 'Số người ăn trong gia đình',
                                    controller: _householdSizeController,
                                    icon: Icons.family_restroom_rounded,
                                    hint: 'VD: 2',
                                    isDark: isDark,
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 20),

                            // 5. Body Metrics (Height & Weight)
                            _buildSectionHeader(isEn ? 'Body Metrics' : 'Chỉ số cơ thể (Tùy chọn)', isDark),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                color: cardBg,
                                borderRadius: BorderRadius.circular(22),
                                border: Border.all(color: cardBorder, width: 1.2),
                              ),
                              child: Column(
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: _buildInputField(
                                          label: isEn ? 'Height (cm)' : 'Chiều cao (cm)',
                                          controller: _heightController,
                                          icon: Icons.height_rounded,
                                          hint: 'VD: 170',
                                          isDark: isDark,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: _buildInputField(
                                          label: isEn ? 'Weight (kg)' : 'Cân nặng (kg)',
                                          controller: _weightController,
                                          icon: Icons.monitor_weight_rounded,
                                          hint: 'VD: 65',
                                          isDark: isDark,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 28),

                            // Save Button
                            SizedBox(
                              width: double.infinity,
                              height: 52,
                              child: ElevatedButton(
                                onPressed: _isSaving ? null : _savePreferences,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
                                ),
                                child: _isSaving
                                    ? const SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                                      )
                                    : Text(
                                        isEn ? 'Save Preferences' : 'Lưu tùy chọn cá nhân',
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w900,
                                          color: isDark ? const Color(0xFF0E1611) : Colors.white,
                                        ),
                                      ),
                              ),
                            ),

                            const SizedBox(height: 24),
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

  Widget _buildSectionHeader(String title, bool isDark) {
    return Text(
      title,
      style: GoogleFonts.outfit(
        fontSize: 16,
        fontWeight: FontWeight.w800,
        color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
      ),
    );
  }

  Widget _buildSelectCard({
    required Color cardBg,
    required Color cardBorder,
    required Map<String, String> options,
    required String selectedValue,
    required ValueChanged<String> onSelect,
    required bool isDark,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: cardBorder, width: 1.2),
      ),
      child: Column(
        children: options.entries.map((entry) {
          final isSelected = selectedValue == entry.key;
          return Column(
            children: [
              ListTile(
                onTap: () => onSelect(entry.key),
                title: Text(
                  entry.value,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14.5,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    color: isSelected
                        ? (isDark ? const Color(0xFF81C784) : const Color(0xFF008435))
                        : (isDark ? Colors.white : const Color(0xFF19221C)),
                  ),
                ),
                trailing: isSelected
                    ? Icon(
                        Icons.check_circle_rounded,
                        color: isDark ? const Color(0xFF81C784) : const Color(0xFF008435),
                      )
                    : null,
              ),
              if (entry.key != options.keys.last)
                Divider(
                  height: 1,
                  color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFE8F5E9),
                  indent: 16,
                  endIndent: 16,
                ),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildInputField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    required String hint,
    required bool isDark,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.outfit(
            fontSize: 13.5,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white : const Color(0xFF006428),
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white : const Color(0xFF19221C),
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.plusJakartaSans(
              color: isDark ? const Color(0xFF758579) : const Color(0xFF9E9E9E),
            ),
            prefixIcon: Icon(
              icon,
              color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
              size: 20,
            ),
            filled: true,
            fillColor: isDark ? const Color(0xFF0E1611) : const Color(0xFFF5FCF4),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5D6A7),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5D6A7),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                width: 1.8,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
