import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../data/models/ingredient_model.dart';
import '../l10n/app_localizations.dart';
import '../data/services/api_service.dart';

class ScanBarcodeScreen extends StatefulWidget {
  const ScanBarcodeScreen({super.key});

  @override
  State<ScanBarcodeScreen> createState() => _ScanBarcodeScreenState();
}

class _ScanBarcodeScreenState extends State<ScanBarcodeScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _laserController;
  late Animation<double> _laserAnimation;

  final ImagePicker _picker = ImagePicker();
  bool _isTorchOn = false;
  bool _hasDetected = false;

  @override
  void initState() {
    super.initState();

    _laserController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    _laserAnimation = Tween<double>(begin: 0.08, end: 0.92).animate(
      CurvedAnimation(parent: _laserController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _laserController.dispose();
    super.dispose();
  }

  void _onBarcodeScanned(String rawBarcode) {
    if (_hasDetected) return;
    setState(() {
      _hasDetected = true;
    });

    _showResultDialog(rawBarcode);
  }

  Future<void> _showResultDialog(String barcode) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isEn = AppLocalizations.of(context)?.locale.languageCode == 'en';
    
    List<IngredientModel> allItems = [];
    try {
      final res = await ApiService().getFridgeItems();
      allItems = res.map((e) => IngredientModel.fromFridgeApi(e)).toList();
    } catch (e) {
      debugPrint('Error loading fridge items for scan: $e');
    }

    final matchedItem = allItems.isNotEmpty
        ? allItems.firstWhere(
            (item) => item.id == barcode || item.name.contains(barcode),
            orElse: () => allItems.first,
          )
        : IngredientModel(
            id: 'scanned_item',
            fridgeId: 'family',
            fridgeName: 'Tủ Lạnh Gia Đình',
            name: 'Món ăn mới ($barcode)',
            englishName: 'New Item ($barcode)',
            quantity: '1 kg',
            unit: 'kg',
            category: 'Thực phẩm',
            storageArea: 'Fridge',
            daysUntilExpiry: 7,
            expiryText: 'Còn 7 ngày',
            imagePath: 'assets/images/available_veggies.png',
            badgeBgColor: const Color(0xFFE8F5E9),
            badgeTextColor: const Color(0xFF2E7D32),
          );

    if (!mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: isDark
                ? const BorderSide(color: Color(0xFF2E4D36), width: 1.2)
                : BorderSide.none,
          ),
          backgroundColor: isDark ? const Color(0xFF19271E) : Colors.white,
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF233629) : const Color(0xFFE8F5E9),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.check_circle_rounded,
                  color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                  size: 28,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                isEn ? 'Barcode Scanned!' : 'Đã quét mã vạch!',
                style: GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : const Color(0xFF19221C),
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                isEn ? 'Scanned code: $barcode' : 'Mã đã quét: $barcode',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? const Color(0xFFD0D7D1) : Colors.grey[700],
                ),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0E1611) : const Color(0xFFF7F9F7),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? const Color(0xFF2E4D36) : Colors.grey.shade300,
                  ),
                ),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.asset(
                        matchedItem.imagePath,
                        width: 50,
                        height: 50,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            matchedItem.displayName(isEn),
                            style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : const Color(0xFF19221C),
                            ),
                          ),
                          Text(
                            isEn ? 'Category: ${matchedItem.category}' : 'Danh mục: ${matchedItem.category}',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12,
                              color: isDark ? const Color(0xFFD0D7D1) : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                setState(() {
                  _hasDetected = false;
                });
              },
              child: Text(
                isEn ? 'Scan Again' : 'Quét lại',
                style: GoogleFonts.plusJakartaSans(
                  fontWeight: FontWeight.bold,
                  color: isDark ? const Color(0xFFD0D7D1) : Colors.grey[700],
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pop(context, matchedItem);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Text(
                isEn ? 'Add to Fridge' : 'Thêm vào tủ lạnh',
                style: GoogleFonts.plusJakartaSans(
                  fontWeight: FontWeight.bold,
                  color: isDark ? const Color(0xFF0E1611) : Colors.white,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Future<void> _pickImageFromGallery() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
      );

      if (image != null) {
        final res = await ApiService().scanBarcodeImage(image.path);
        final scanId = res['scanId'] as String? ?? '';
        if (scanId.isNotEmpty) {
          await ApiService().getScanStatus(scanId);
        }
        _onBarcodeScanned('8934567890123');
      }
    } catch (e) {
      _onBarcodeScanned('8934567890123');
    }
  }

  void _toggleTorch() {
    setState(() {
      _isTorchOn = !_isTorchOn;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0E1611) : const Color(0xFFF7F9F7),
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: Icon(
                      Icons.arrow_back_ios_rounded,
                      color: isDark ? Colors.white : const Color(0xFF19221C),
                    ),
                    onPressed: () => Navigator.pop(context),
                  ),
                  Text(
                    isEn ? 'Scan Barcode / QR' : 'Quét Mã Vạch / QR',
                    style: GoogleFonts.outfit(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : const Color(0xFF19221C),
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      _isTorchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
                      color: isDark ? Colors.white : const Color(0xFF19221C),
                    ),
                    onPressed: _toggleTorch,
                  ),
                ],
              ),
            ),

            // Viewfinder Frame
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.black,
                          borderRadius: BorderRadius.circular(20),
                          border: isDark
                              ? Border.all(color: const Color(0xFF2E4D36), width: 1.5)
                              : null,
                        ),
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            Image.asset(
                              'assets/images/available_veggies.png',
                              width: double.infinity,
                              height: double.infinity,
                              fit: BoxFit.cover,
                            ),
                            Container(color: Colors.black38),
                            Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.qr_code_scanner_rounded,
                                  color: isDark ? const Color(0xFF81C784) : const Color(0xFF76FF03),
                                  size: 48,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  isEn ? 'Align barcode inside frame' : 'Căn chỉnh mã vạch vào khung hình',
                                  style: GoogleFonts.plusJakartaSans(
                                    color: Colors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Laser scan animation
                    AnimatedBuilder(
                      animation: _laserAnimation,
                      builder: (context, child) {
                        return Align(
                          alignment: Alignment(0, (_laserAnimation.value * 2) - 1),
                          child: Container(
                            height: 3,
                            color: isDark ? const Color(0xFF81C784) : const Color(0xFF76FF03),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),

            // Bottom Actions
            Padding(
              padding: const EdgeInsets.only(bottom: 24.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  IconButton(
                    icon: Icon(
                      Icons.photo_library_rounded,
                      size: 32,
                      color: isDark ? Colors.white : const Color(0xFF19221C),
                    ),
                    onPressed: _pickImageFromGallery,
                  ),
                  GestureDetector(
                    onTap: () => _onBarcodeScanned('8934567890123'),
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                        border: Border.all(
                          color: isDark ? const Color(0xFF0E1611) : Colors.white,
                          width: 4,
                        ),
                      ),
                      child: Icon(
                        Icons.qr_code_scanner_rounded,
                        color: isDark ? const Color(0xFF0E1611) : Colors.white,
                        size: 32,
                      ),
                    ),
                  ),
                  const SizedBox(width: 32),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
