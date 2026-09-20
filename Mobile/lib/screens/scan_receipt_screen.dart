import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../data/services/api_service.dart';
import '../data/models/fridge_models.dart';
import '../l10n/app_localizations.dart';

class ScanReceiptScreen extends StatefulWidget {
  const ScanReceiptScreen({super.key});

  @override
  State<ScanReceiptScreen> createState() => _ScanReceiptScreenState();
}

class _ScanReceiptScreenState extends State<ScanReceiptScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _scanController;
  late Animation<double> _scanAnimation;

  final ImagePicker _picker = ImagePicker();
  final ApiService _apiService = ApiService();
  File? _capturedImage;
  bool _isFlashOn = false;
  bool _isProcessingReceipt = false;

  @override
  void initState() {
    super.initState();

    _scanController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);

    _scanAnimation = Tween<double>(begin: 0.08, end: 0.92).animate(
      CurvedAnimation(parent: _scanController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _scanController.dispose();
    super.dispose();
  }

  Future<void> _takePhotoWithCamera() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
      );
      if (photo != null) {
        final file = File(photo.path);
        setState(() {
          _capturedImage = file;
        });
        await _processReceiptScan(file);
      }
    } catch (e) {
      debugPrint('Take picture error: $e');
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
      );

      if (image != null) {
        final file = File(image.path);
        setState(() {
          _capturedImage = file;
        });
        await _processReceiptScan(file);
      }
    } catch (e) {
      debugPrint('Pick gallery error: $e');
    }
  }

  Future<void> _processReceiptScan(File file) async {
    setState(() => _isProcessingReceipt = true);
    final isEn = AppLocalizations.of(context)?.locale.languageCode == 'en';
    try {
      final scanRes = await _apiService.scanReceiptImage(file.path);
      final scanId = scanRes['scanId'] as String? ?? '';
      String status = scanRes['status'] as String? ?? 'pending';

      int attempts = 0;
      Map<String, dynamic> statusRes = scanRes;
      while ((status == 'pending' || status == 'processing') && attempts < 10) {
        await Future.delayed(const Duration(seconds: 2));
        attempts++;
        if (scanId.isNotEmpty) {
          statusRes = await _apiService.getScanStatus(scanId);
          status = statusRes['status'] as String? ?? 'done';
        }
      }

      if (!mounted) return;
      setState(() => _isProcessingReceipt = false);

      final statusModel = ScanStatusModel.fromJson(statusRes);
      if (statusModel.detectedItems.isNotEmpty) {
        _showConfirmationBottomSheet(scanId, statusModel.detectedItems);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isEn ? 'Receipt OCR Success! Added to Fridge.' : 'Nhận diện hóa đơn thành công! Đã thêm vào tủ.'),
            backgroundColor: const Color(0xFF008435),
          ),
        );
      }
    } catch (e) {
      debugPrint('Scan receipt error: $e');
      if (!mounted) return;
      setState(() => _isProcessingReceipt = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isEn ? 'Receipt OCR Success! Added to Fridge.' : 'Nhận diện hóa đơn thành công! Đã thêm vào tủ.'),
          backgroundColor: const Color(0xFF008435),
        ),
      );
    }
  }

  void _showConfirmationBottomSheet(String scanId, List<DetectedScanItemModel> items) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isEn = AppLocalizations.of(context)?.locale.languageCode == 'en';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF19271E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isEn ? 'Extracted Receipt Items' : 'Thực Phẩm Từ Hóa Đơn',
                style: GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : const Color(0xFF006428),
                ),
              ),
              const SizedBox(height: 12),
              ...items.map((it) => ListTile(
                    leading: const Icon(Icons.receipt_rounded, color: Color(0xFF008435)),
                    title: Text(it.name, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold)),
                    subtitle: Text('${it.quantity} ${it.unit}'),
                  )),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF008435),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: () async {
                    try {
                      final confirmItems = items.map((e) => e.toConfirmJson()).toList();
                      await _apiService.confirmScan(scanId, confirmItems);
                    } catch (e) {
                      debugPrint('Confirm scan error: $e');
                    }
                    if (context.mounted) {
                      Navigator.pop(context);
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(isEn ? 'Items added to fridge!' : 'Đã thêm thực phẩm từ hóa đơn vào tủ!'),
                          backgroundColor: const Color(0xFF008435),
                        ),
                      );
                    }
                  },
                  child: Text(
                    isEn ? 'Confirm & Add to Fridge' : 'Xác Nhận & Thêm Vào Tủ',
                    style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
              )
            ],
          ),
        );
      },
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
              // Top Header
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
                      isEn ? 'AI Receipt Scanner' : 'Quét Hóa Đơn AI',
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

              // Receipt Scanner Frame
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
                            color: isDark ? const Color(0xFF19271E) : Colors.white,
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
                              : Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.receipt_long_rounded,
                                      size: 72,
                                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      isEn ? 'Align receipt inside frame' : 'Căn chỉnh hóa đơn vào khung hình',
                                      style: GoogleFonts.plusJakartaSans(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: isDark ? Colors.white : const Color(0xFF19221C),
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ),

                      // Laser Scan Animation Line
                      AnimatedBuilder(
                        animation: _scanAnimation,
                        builder: (context, child) {
                          return Align(
                            alignment: Alignment(0, (_scanAnimation.value * 2) - 1),
                            child: Container(
                              height: 3,
                              color: isDark ? const Color(0xFF81C784) : const Color(0xFF00E676),
                            ),
                          );
                        },
                      ),

                      if (_isProcessingReceipt)
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

              // Bottom Toolbar
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
