import 'dart:convert';
import 'package:flutter/material.dart';
import '../data/local/storage_service.dart';
import '../theme/app_theme.dart';
import '../widgets/home_header.dart';
import '../widgets/custom_bottom_nav_bar.dart';
import '../widgets/greeting_banner.dart';
import '../widgets/fridge_summary_cards.dart';
import '../widgets/premium_banner.dart';
import '../widgets/weekly_statistics_section.dart';
import '../widgets/cooking_suggestions_section.dart';
import 'select_input_method_screen.dart';
import 'manual_add_ingredient_screen.dart';
import 'scan_food_photo_screen.dart';
import 'scan_receipt_screen.dart';
import 'scan_barcode_screen.dart';
import 'my_fridges_screen.dart';
import 'all_expired_items_screen.dart';
import 'all_available_items_screen.dart';
import 'messages_screen.dart';
import 'recipe_detail_screen.dart';
import 'ingredient_statistics_screen.dart';
import 'next_week_suggestions_screen.dart';
import 'shopping_reminder_screen.dart';
import 'user_profile_screen.dart';
import 'notifications_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  int _selectedIndex = 0;
  final TextEditingController _searchController = TextEditingController();
  String _userName = 'Trần Quốc Lâm';

  late AnimationController _animController;
  late Animation<double> _headerFade;
  late Animation<Offset> _headerSlide;
  late Animation<double> _bodyFade;
  late Animation<Offset> _bodySlide;
  late Animation<double> _bottomNavFade;
  late Animation<Offset> _bottomNavSlide;

  @override
  void initState() {
    super.initState();
    _loadUserData();

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _headerFade = CurvedAnimation(
      parent: _animController,
      curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
    );
    _headerSlide = Tween<Offset>(
      begin: const Offset(0.0, -0.15),
      end: Offset.zero,
    ).animate(_headerFade);

    _bodyFade = CurvedAnimation(
      parent: _animController,
      curve: const Interval(0.15, 0.75, curve: Curves.easeOut),
    );
    _bodySlide = Tween<Offset>(
      begin: const Offset(0.0, 0.08),
      end: Offset.zero,
    ).animate(_bodyFade);

    _bottomNavFade = CurvedAnimation(
      parent: _animController,
      curve: const Interval(0.3, 0.85, curve: Curves.easeOut),
    );
    _bottomNavSlide = Tween<Offset>(
      begin: const Offset(0.0, 0.2),
      end: Offset.zero,
    ).animate(_bottomNavFade);

    _animController.forward();
  }

  Future<void> _loadUserData() async {
    try {
      final storage = await StorageService.getInstance();
      final userDataStr = storage.getUserData();
      if (userDataStr != null && userDataStr.isNotEmpty) {
        final Map<String, dynamic> userMap = jsonDecode(userDataStr);
        final String? name = userMap['name'] ?? userMap['fullName'];
        final String? googleEmail = userMap['googleEmail'] ?? userMap['email'];
        final String? phone = userMap['phone'] ?? userMap['emailOrPhone'];

        String parsedName = 'Người dùng Friggy';
        if (name != null && name.trim().isNotEmpty) {
          parsedName = name.trim();
        } else if (googleEmail != null && googleEmail.trim().isNotEmpty) {
          parsedName = googleEmail.split('@').first;
        } else if (phone != null && phone.trim().isNotEmpty) {
          parsedName = phone.trim();
        }

        if (mounted) {
          setState(() {
            _userName = parsedName;
          });
        }
      }
    } catch (e) {
      debugPrint('[HomeScreen] Error loading user data: $e');
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _animController.dispose();
    super.dispose();
  }

  void _onItemTapped(int index) {
    if (index == 2) {
      SelectInputMethodScreen.show(
        context,
        onMethodSelected: (methodId) {
          Widget targetScreen;
          switch (methodId) {
            case 'manual':
              targetScreen = const ManualAddIngredientScreen();
              break;
            case 'scan_photo':
              targetScreen = const ScanFoodPhotoScreen();
              break;
            case 'scan_receipt':
              targetScreen = const ScanReceiptScreen();
              break;
            case 'scan_barcode':
              targetScreen = const ScanBarcodeScreen();
              break;
            default:
              targetScreen = const ManualAddIngredientScreen();
          }

          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => targetScreen,
            ),
          );
        },
      );
      return;
    }
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : const Color(0xFFF4FAF2),
      body: Container(
        decoration: BoxDecoration(
          gradient: AppGradients.getBackground(isDark),
        ),
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // 1. Top Header with Logo, Notification Badge, and Search Input (Shown only on Home Tab)
              if (_selectedIndex == 0)
                FadeTransition(
                  opacity: _headerFade,
                  child: SlideTransition(
                    position: _headerSlide,
                    child: HomeHeader(
                      searchController: _searchController,
                      onNotificationTap: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const NotificationsScreen(),
                          ),
                        );
                        if (mounted) {
                          setState(() {});
                        }
                      },
                      onFilterTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Filter tapped'),
                            duration: Duration(seconds: 1),
                          ),
                        );
                      },
                    ),
                  ),
                ),

              // 2. Middle Content Area (Slides up & fades in)
              Expanded(
                child: FadeTransition(
                  opacity: _bodyFade,
                  child: SlideTransition(
                    position: _bodySlide,
                    child: IndexedStack(
                      index: _selectedIndex == 2 ? 0 : _selectedIndex,
                      children: [
                        // Index 0: Home Dashboard
                        SingleChildScrollView(
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 20.0),
                          child: Column(
                            children: [
                              const SizedBox(height: 8),
                              GreetingBanner(userName: _userName),
                              const SizedBox(height: 16),

                              // 2 Summary Cards (Expired & Available Ingredients)
                              FridgeSummaryCards(
                                onExpiringTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          const AllExpiredItemsScreen(),
                                    ),
                                  );
                                },
                                onAvailableTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          const AllAvailableItemsScreen(),
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(height: 16),

                              // Premium Friggy Upgrade Banner
                              PremiumBanner(
                                onTryNowTap: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Try Now Premium tapped!'),
                                      duration: Duration(seconds: 1),
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(height: 18),
                              WeeklyStatisticsSection(
                                onDetailTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          const IngredientStatisticsScreen(),
                                    ),
                                  );
                                },
                                onMealSuggestionsTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          const NextWeekSuggestionsScreen(),
                                    ),
                                  );
                                },
                                onShoppingReminderTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          const ShoppingReminderScreen(),
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(height: 24),
                              CookingSuggestionsSection(
                                onUpgradeTap: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Upgrade to Premium tapped!'),
                                      duration: Duration(seconds: 1),
                                    ),
                                  );
                                },
                                onRecipeTap: (recipe) {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          RecipeDetailScreen(recipe: recipe),
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(height: 28),
                            ],
                          ),
                        ),

                        // Index 1: My Fridges List Screen
                        const MyFridgesScreen(),

                        // Index 2: Placeholder for Add (modal triggered)
                        const SizedBox.shrink(),

                        // Index 3: Messages & Chat Groups Screen
                        const MessagesScreen(),

                        // Index 4: Profile & Settings Screen
                        const UserProfileScreen(),
                      ],
                    ),
                  ),
                ),
              ),

              // 3. Custom 5-Item Bottom Navigation Bar (Slides up & fades in)
              FadeTransition(
                opacity: _bottomNavFade,
                child: SlideTransition(
                  position: _bottomNavSlide,
                  child: CustomBottomNavigationBar(
                    selectedIndex: _selectedIndex,
                    onItemTapped: _onItemTapped,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
