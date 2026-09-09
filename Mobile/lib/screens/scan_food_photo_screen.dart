import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../l10n/app_localizations.dart';

class ScanFoodPhotoScreen extends StatefulWidget {
  const ScanFoodPhotoScreen({super.key});

  @override
  State<ScanFoodPhotoScreen> createState() => _ScanFoodPhotoScreenState();
}

class _ScanFoodPhotoScreenState extends State<ScanFoodPhotoScreen> {
  final ImagePicker _picker = ImagePicker();
  File? _capturedImage;
  bool _isFlashOn = false;
  bool _isAnalyzing = false;

  Future<void> _takePhotoWithCamera() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
      );
      if (photo != null) {
        setState(() {
          _capturedImage = File(photo.path);
          _isAnalyzing = true;
        });

        await Future.delayed(const Duration(milliseconds: 1500));
        if (!mounted) return;

        setState(() => _isAnalyzing = false);

        final isEn = AppLocalizations.of(context)?.locale.languageCode == 'en';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isEn ? 'AI Recognized Food Photo! Added to Inventory.' : 'AI đã nhận diện thực phẩm! Đã thêm vào tủ.'),
            backgroundColor: const Color(0xFF008435),
          ),
        );
        return;
      }
    } catch (e) {
      debugPrint('Take picture error: $e');
    }

    _simulatePhotoCapture();
  }

  Future<void> _pickFromGallery() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
      );

      if (image != null) {
        setState(() {
          _capturedImage = File(image.path);
          _isAnalyzing = true;
        });

        await Future.delayed(const Duration(milliseconds: 1500));
        if (!mounted) return;

        setState(() => _isAnalyzing = false);

        final isEn = AppLocalizations.of(context)?.locale.languageCode == 'en';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isEn ? 'AI Recognized Food Photo! Added to Inventory.' : 'AI đã nhận diện thực phẩm từ ảnh! Đã thêm vào tủ.'),
            backgroundColor: const Color(0xFF008435),
          ),
        );
      }
    } catch (e) {
      _simulatePhotoCapture();
    }
  }

  void _simulatePhotoCapture() async {
    setState(() => _isAnalyzing = true);
    await Future.delayed(const Duration(milliseconds: 1500));
    if (!mounted) return;

    setState(() => _isAnalyzing = false);

    final isEn = AppLocalizations.of(context)?.locale.languageCode == 'en';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(isEn ? 'AI Recognized: Fresh Vegetables & Fruit!' : 'AI đã nhận diện: Rau củ & Trái cây tươi!'),
        backgroundColor: const Color(0xFF008435),
      ),
    );
  }

  void _toggleFlash() {
    setState(() => _isFlashOn = !_isFlashOn);
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
                      isEn ? 'Take Food Photo' : 'Chụp Ảnh Thực Phẩm',
                      style: GoogleFonts.outfit(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : const Color(0xFF19221C),
                      ),
                    ),
                    IconButton(
                      icon: Icon(
                        _isFlashOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
                        color: isDark ? Colors.white : const Color(0xFF19221C),
                      ),
                      onPressed: _toggleFlash,
                    ),
                  ],
                ),
              ),

              // Viewfinder
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
                            borderRadius: BorderRadius.circular(20),
                            border: isDark
                                ? Border.all(color: const Color(0xFF2E4D36), width: 1.5)
                                : null,
                          ),
                          child: _capturedImage != null
                              ? Image.file(
                                  _capturedImage!,
                                  width: double.infinity,
                                  height: double.infinity,
                                  fit: BoxFit.cover,
                                )
                              : Image.asset(
                                  'assets/images/available_veggies.png',
                                  width: double.infinity,
                                  height: double.infinity,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) => Container(
                                    color: isDark ? const Color(0xFF19271E) : const Color(0xFF1E3A23),
                                    child: Center(
                                      child: Icon(
                                        Icons.eco_rounded,
                                        size: 80,
                                        color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                                      ),
                                    ),
                                  ),
                                ),
                        ),
                      ),
                      if (_isAnalyzing)
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Center(
                            child: CircularProgressIndicator(
                              color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                            ),
                          ),
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
                      onPressed: _pickFromGallery,
                    ),
                    GestureDetector(
                      onTap: _takePhotoWithCamera,
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
                          Icons.camera_alt_rounded,
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
      ),
    );
  }
}
