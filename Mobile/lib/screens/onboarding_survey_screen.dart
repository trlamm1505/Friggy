import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/services/api_service.dart';
import '../l10n/app_localizations.dart';
import 'home_screen.dart';

class OnboardingSurveyScreen extends StatefulWidget {
  const OnboardingSurveyScreen({super.key});

  @override
  State<OnboardingSurveyScreen> createState() => _OnboardingSurveyScreenState();
}

class _OnboardingSurveyScreenState extends State<OnboardingSurveyScreen> {
  final ApiService _apiService = ApiService();
  final PageController _pageController = PageController();

  int _currentStep = 0;
  bool _isSubmitting = false;

  // Survey Data matching BE OnboardingDto
  String _primaryGoal = 'save_money';
  String _cookingFrequency = 'daily';
  String _dietaryStyle = 'omnivore';
  String _activityLevel = 'moderate';
  int _householdSize = 2;
  final TextEditingController _heightController = TextEditingController(text: '170');
  final TextEditingController _weightController = TextEditingController(text: '65');

  @override
  void dispose() {
    _pageController.dispose();
    _heightController.dispose();
    _weightController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentStep < 3) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOutCubic,
      );
    } else {
      _submitOnboarding();
    }
  }

  void _previousPage() {
    if (_currentStep > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOutCubic,
      );
    }
  }

  Future<void> _submitOnboarding() async {
    setState(() => _isSubmitting = true);

    try {
      final heightVal = int.tryParse(_heightController.text.trim()) ?? 170;
      final weightVal = int.tryParse(_weightController.text.trim()) ?? 65;

      final onboardingData = <String, dynamic>{
        'primaryGoal': _primaryGoal,
        'cookingFrequency': _cookingFrequency,
        'dietaryStyle': _dietaryStyle,
        'activityLevel': _activityLevel,
        'householdSize': _householdSize,
        'height': heightVal,
        'weight': weightVal,
      };

      await _apiService.completeOnboarding(onboardingData);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: const [
                Icon(Icons.check_circle_rounded, color: Colors.white),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Chào mừng bạn đến với Friggy!',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF008435),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        );

        Navigator.of(context).pushReplacement(
          PageRouteBuilder(
            transitionDuration: const Duration(milliseconds: 400),
            pageBuilder: (context, animation, secondaryAnimation) => const HomeScreen(),
            transitionsBuilder: (context, animation, secondaryAnimation, child) {
              return FadeTransition(opacity: animation, child: child);
            },
          ),
        );
      }
    } catch (e) {
      debugPrint('[OnboardingSurveyScreen] Error submitting onboarding: $e');
      if (mounted) {
        // Fallback to HomeScreen if offline or backend error
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const HomeScreen()),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';

    final bgColor1 = isDark ? const Color(0xFF0E1611) : const Color(0xFFFFFFFF);
    final bgColor2 = isDark ? const Color(0xFF142017) : const Color(0xFFF5FCF4);
    final bgColor3 = isDark ? const Color(0xFF1B2E21) : const Color(0xFFC7EFC2);

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [bgColor1, bgColor2, bgColor3],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Top Bar Header & Progress
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                child: Row(
                  children: [
                    if (_currentStep > 0)
                      GestureDetector(
                        onTap: _previousPage,
                        child: Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF19271E) : Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C),
                            ),
                          ),
                          child: Icon(
                            Icons.arrow_back_rounded,
                            color: isDark ? Colors.white : const Color(0xFF006428),
                            size: 20,
                          ),
                        ),
                      )
                    else
                      const SizedBox(width: 38),

                    Expanded(
                      child: Column(
                        children: [
                          Text(
                            isEn ? 'Personalize Friggy' : 'Tùy chỉnh khảo sát',
                            style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Bước ${_currentStep + 1} / 4',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isDark ? Colors.white70 : Colors.black54,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 38),
                  ],
                ),
              ),

              // Progress Bar Indicator
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 4.0),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: LinearProgressIndicator(
                    value: (_currentStep + 1) / 4,
                    minHeight: 6,
                    backgroundColor: isDark ? const Color(0xFF233629) : const Color(0xFFE0E0E0),
                    color: const Color(0xFF4CAF50),
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Survey Steps View
              Expanded(
                child: PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  onPageChanged: (step) {
                    setState(() => _currentStep = step);
                  },
                  children: [
                    _buildStep1Goal(isDark, isEn),
                    _buildStep2Cooking(isDark, isEn),
                    _buildStep3Diet(isDark, isEn),
                    _buildStep4Health(isDark, isEn),
                  ],
                ),
              ),

              // Bottom Action Button
              Padding(
                padding: const EdgeInsets.all(20.0),
                child: SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _nextPage,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF008435),
                      foregroundColor: Colors.white,
                      elevation: 4,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _currentStep == 3
                                    ? (isEn ? 'Complete Survey' : 'Hoàn tất & Khám phá Friggy')
                                    : (isEn ? 'Continue' : 'Tiếp tục'),
                                style: GoogleFonts.outfit(
                                  fontSize: 17,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Icon(
                                _currentStep == 3
                                    ? Icons.rocket_launch_rounded
                                    : Icons.arrow_forward_rounded,
                                size: 20,
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --------------------------------------------------------------------------
  // STEP 1: Primary Goal
  // --------------------------------------------------------------------------
  Widget _buildStep1Goal(bool isDark, bool isEn) {
    final goals = [
      {
        'id': 'save_money',
        'title': isEn ? 'Save Money' : 'Tiết kiệm chi phí thực phẩm',
        'desc': isEn ? 'Optimize shopping & reduce unnecessary expenses' : 'Tối ưu hóa mua sắm và quản lý chi tiêu ăn uống',
        'icon': '💰',
      },
      {
        'id': 'reduce_waste',
        'title': isEn ? 'Reduce Food Waste' : 'Giảm thiểu lãng phí thức ăn',
        'desc': isEn ? 'Get reminders before items expire in fridge' : 'Nhắc nhở hết hạn, tận dụng tối đa đồ trong tủ lạnh',
        'icon': '♻️',
      },
      {
        'id': 'eat_healthy',
        'title': isEn ? 'Eat Healthy' : 'Ăn uống lành mạnh & khoa học',
        'desc': isEn ? 'Nutritious meal plans & balanced calorie suggestions' : 'Đề xuất thực đơn đủ chất, cân bằng dinh dưỡng',
        'icon': '🥗',
      },
      {
        'id': 'convenience',
        'title': isEn ? 'Quick & Easy Cooking' : 'Nấu ăn nhanh chóng & tiện lợi',
        'desc': isEn ? 'Quick recipes based on what you already have' : 'Gợi ý món ngon dễ làm từ nguyên liệu sẵn có',
        'icon': '⚡',
      },
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isEn ? 'What is your primary goal?' : 'Mục tiêu chính của bạn là gì?',
            style: GoogleFonts.outfit(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF006428),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            isEn
                ? 'Friggy will customize AI meal plans & fridge alerts for you.'
                : 'Friggy sẽ dựa vào mục tiêu này để đưa ra gợi ý AI phù hợp nhất.',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 13.5,
              color: isDark ? Colors.white70 : Colors.black87,
            ),
          ),
          const SizedBox(height: 20),

          ...goals.map((g) {
            final isSelected = _primaryGoal == g['id'];
            return GestureDetector(
              onTap: () => setState(() => _primaryGoal = g['id'] as String),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isSelected
                      ? (isDark ? const Color(0xFF1E3A26) : const Color(0xFFE8F5E9))
                      : (isDark ? const Color(0xFF19271E) : Colors.white),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF4CAF50) : (isDark ? const Color(0xFF2E4D36) : const Color(0xFFE0E0E0)),
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Text(g['icon'] as String, style: const TextStyle(fontSize: 28)),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            g['title'] as String,
                            style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : const Color(0xFF19221C),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            g['desc'] as String,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12.5,
                              color: isDark ? Colors.white60 : Colors.black54,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (isSelected)
                      const Icon(Icons.check_circle_rounded, color: Color(0xFF4CAF50), size: 24),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // STEP 2: Cooking Frequency & Household Size
  // --------------------------------------------------------------------------
  Widget _buildStep2Cooking(bool isDark, bool isEn) {
    final frequencies = [
      {'id': 'daily', 'title': isEn ? 'Daily' : 'Hàng ngày', 'icon': '🍳'},
      {'id': 'few_times_week', 'title': isEn ? 'A few times a week' : 'Vài lần một tuần', 'icon': '🍲'},
      {'id': 'weekends', 'title': isEn ? 'Weekends only' : 'Chỉ nấu cuối tuần', 'icon': '🍕'},
      {'id': 'rarely', 'title': isEn ? 'Rarely' : 'Hiếm khi nấu ăn', 'icon': '🥡'},
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isEn ? 'Cooking & Household' : 'Tần suất nấu ăn & Gia đình',
            style: GoogleFonts.outfit(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF006428),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            isEn
                ? 'How often do you cook and for how many people?'
                : 'Bạn thường nấu ăn với tần suất như thế nào và cho mấy người?',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 13.5,
              color: isDark ? Colors.white70 : Colors.black87,
            ),
          ),
          const SizedBox(height: 20),

          Text(
            isEn ? 'Cooking Frequency' : 'Tần suất nấu ăn',
            style: GoogleFonts.outfit(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
            ),
          ),
          const SizedBox(height: 10),

          ...frequencies.map((f) {
            final isSelected = _cookingFrequency == f['id'];
            return GestureDetector(
              onTap: () => setState(() => _cookingFrequency = f['id'] as String),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: isSelected
                      ? (isDark ? const Color(0xFF1E3A26) : const Color(0xFFE8F5E9))
                      : (isDark ? const Color(0xFF19271E) : Colors.white),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF4CAF50) : (isDark ? const Color(0xFF2E4D36) : const Color(0xFFE0E0E0)),
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Text(f['icon'] as String, style: const TextStyle(fontSize: 22)),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        f['title'] as String,
                        style: GoogleFonts.outfit(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : const Color(0xFF19221C),
                        ),
                      ),
                    ),
                    if (isSelected)
                      const Icon(Icons.check_circle_rounded, color: Color(0xFF4CAF50), size: 22),
                  ],
                ),
              ),
            );
          }),

          const SizedBox(height: 20),

          // Household Size Picker
          Text(
            isEn ? 'Household Members' : 'Số người trong gia đình',
            style: GoogleFonts.outfit(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
            ),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF19271E) : Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFE0E0E0)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.people_alt_rounded, color: Color(0xFF4CAF50), size: 24),
                    const SizedBox(width: 12),
                    Text(
                      '$_householdSize ${isEn ? 'people' : 'thành viên'}',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : const Color(0xFF19221C),
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    IconButton(
                      onPressed: _householdSize > 1
                          ? () => setState(() => _householdSize--)
                          : null,
                      icon: const Icon(Icons.remove_circle_outline_rounded),
                      color: const Color(0xFF4CAF50),
                    ),
                    Text(
                      '$_householdSize',
                      style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      onPressed: _householdSize < 15
                          ? () => setState(() => _householdSize++)
                          : null,
                      icon: const Icon(Icons.add_circle_outline_rounded),
                      color: const Color(0xFF4CAF50),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // STEP 3: Dietary Style & Activity Level
  // --------------------------------------------------------------------------
  Widget _buildStep3Diet(bool isDark, bool isEn) {
    final diets = [
      {'id': 'omnivore', 'title': isEn ? 'Omnivore' : 'Ăn tạp / Thông thường', 'icon': '🥩'},
      {'id': 'vegetarian', 'title': isEn ? 'Vegetarian' : 'Ăn chay (Trứng/Sữa)', 'icon': '🥦'},
      {'id': 'vegan', 'title': isEn ? 'Vegan' : 'Ăn chay thuần thực vật', 'icon': '🌿'},
      {'id': 'keto', 'title': isEn ? 'Keto / Low-carb' : 'Keto / Giảm Carb', 'icon': '🥑'},
    ];

    final activities = [
      {'id': 'sedentary', 'title': isEn ? 'Sedentary' : 'Ít vận động (Ngồi nhiều)', 'icon': '🛋️'},
      {'id': 'light', 'title': isEn ? 'Lightly Active' : 'Vận động nhẹ (Đi bộ)', 'icon': '🚶'},
      {'id': 'moderate', 'title': isEn ? 'Moderately Active' : 'Vận động vừa (Tập 3-5 ngày/tuần)', 'icon': '🏃'},
      {'id': 'active', 'title': isEn ? 'Very Active' : 'Năng động / Thể thao', 'icon': '🚴'},
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isEn ? 'Diet & Activity Level' : 'Chế độ ăn & Vận động',
            style: GoogleFonts.outfit(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF006428),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            isEn
                ? 'Select your dietary preferences and daily physical activity level.'
                : 'Lựa chọn chế độ ăn thích hợp để Friggy đề xuất món ăn tối ưu.',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 13.5,
              color: isDark ? Colors.white70 : Colors.black87,
            ),
          ),
          const SizedBox(height: 18),

          Text(
            isEn ? 'Dietary Preference' : 'Chế độ ăn chính',
            style: GoogleFonts.outfit(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
            ),
          ),
          const SizedBox(height: 8),

          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: diets.map((d) {
              final isSelected = _dietaryStyle == d['id'];
              return ChoiceChip(
                label: Text('${d['icon']} ${d['title']}'),
                selected: isSelected,
                selectedColor: const Color(0xFF4CAF50),
                backgroundColor: isDark ? const Color(0xFF19271E) : Colors.white,
                labelStyle: TextStyle(
                  color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
                  fontWeight: FontWeight.bold,
                ),
                onSelected: (selected) {
                  if (selected) setState(() => _dietaryStyle = d['id'] as String);
                },
              );
            }).toList(),
          ),

          const SizedBox(height: 22),

          Text(
            isEn ? 'Daily Activity Level' : 'Mức độ vận động hàng ngày',
            style: GoogleFonts.outfit(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
            ),
          ),
          const SizedBox(height: 10),

          ...activities.map((a) {
            final isSelected = _activityLevel == a['id'];
            return GestureDetector(
              onTap: () => setState(() => _activityLevel = a['id'] as String),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: isSelected
                      ? (isDark ? const Color(0xFF1E3A26) : const Color(0xFFE8F5E9))
                      : (isDark ? const Color(0xFF19271E) : Colors.white),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF4CAF50) : (isDark ? const Color(0xFF2E4D36) : const Color(0xFFE0E0E0)),
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Text(a['icon'] as String, style: const TextStyle(fontSize: 20)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        a['title'] as String,
                        style: GoogleFonts.outfit(
                          fontSize: 14.5,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : const Color(0xFF19221C),
                        ),
                      ),
                    ),
                    if (isSelected)
                      const Icon(Icons.check_circle_rounded, color: Color(0xFF4CAF50), size: 20),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // STEP 4: Body Metrics (Optional)
  // --------------------------------------------------------------------------
  Widget _buildStep4Health(bool isDark, bool isEn) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isEn ? 'Body Metrics (Optional)' : 'Chỉ số sức khỏe (Tùy chọn)',
            style: GoogleFonts.outfit(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF006428),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            isEn
                ? 'Providing your height and weight helps AI compute accurate daily calories.'
                : 'Chiều cao & cân nặng giúp AI tính toán chính xác lượng calo phù hợp mỗi ngày cho bạn.',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 13.5,
              color: isDark ? Colors.white70 : Colors.black87,
            ),
          ),
          const SizedBox(height: 24),

          // Height Field
          Text(
            isEn ? 'Height (cm)' : 'Chiều cao (cm)',
            style: GoogleFonts.outfit(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF006428),
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _heightController,
            keyboardType: TextInputType.number,
            style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontWeight: FontWeight.bold),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.height_rounded, color: Color(0xFF4CAF50)),
              filled: true,
              fillColor: isDark ? const Color(0xFF19271E) : Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFE0E0E0)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFE0E0E0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Color(0xFF4CAF50), width: 2),
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Weight Field
          Text(
            isEn ? 'Weight (kg)' : 'Cân nặng (kg)',
            style: GoogleFonts.outfit(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF006428),
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _weightController,
            keyboardType: TextInputType.number,
            style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontWeight: FontWeight.bold),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.monitor_weight_rounded, color: Color(0xFF4CAF50)),
              filled: true,
              fillColor: isDark ? const Color(0xFF19271E) : Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFE0E0E0)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFE0E0E0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Color(0xFF4CAF50), width: 2),
              ),
            ),
          ),

          const SizedBox(height: 30),

          Center(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF19271E) : const Color(0xFFE8F5E9),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF4CAF50).withValues(alpha: 0.4)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.auto_awesome_rounded, color: Color(0xFF4CAF50)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      isEn
                          ? 'All set! Tap the button below to finish onboarding.'
                          : 'Tất cả đã sẵn sàng! Bấm nút bên dưới để hoàn tất khảo sát.',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white70 : const Color(0xFF1B5E20),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
