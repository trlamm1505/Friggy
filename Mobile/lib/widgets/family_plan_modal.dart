import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/models/user_models.dart';
import '../data/services/api_service.dart';
import '../l10n/app_localizations.dart';

void showFamilySubscriptionModal(BuildContext context, {VoidCallback? onSuccess}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => _FamilySubscriptionModalContent(onSuccess: onSuccess),
  );
}

class _FamilySubscriptionModalContent extends StatefulWidget {
  final VoidCallback? onSuccess;
  const _FamilySubscriptionModalContent({this.onSuccess});

  @override
  State<_FamilySubscriptionModalContent> createState() =>
      __FamilySubscriptionModalContentState();
}

class __FamilySubscriptionModalContentState
    extends State<_FamilySubscriptionModalContent> {
  final ApiService _apiService = ApiService();
  bool _isLoadingPlans = true;
  bool _isLoading = false;
  SubscriptionPlanModel? _familyPlan;

  @override
  void initState() {
    super.initState();
    _fetchFamilyPlan();
  }

  Future<void> _fetchFamilyPlan() async {
    try {
      final plansJson = await _apiService.getSubscriptionPlans();
      final parsedPlans = plansJson
          .map((e) => SubscriptionPlanModel.fromJson(e as Map<String, dynamic>))
          .toList();

      SubscriptionPlanModel? found;
      for (final p in parsedPlans) {
        if (p.id == 3 ||
            p.name.toLowerCase().contains('family') ||
            p.displayName.toLowerCase().contains('gia đình')) {
          found = p;
          break;
        }
      }

      if (mounted) {
        setState(() {
          _familyPlan = found;
          _isLoadingPlans = false;
        });
      }
    } catch (e) {
      debugPrint('[FamilyPlanModal] Error fetching family plan: $e');
      if (mounted) {
        setState(() => _isLoadingPlans = false);
      }
    }
  }

  String _formatPrice(int priceVnd) {
    if (priceVnd == 0) return '0 VNĐ';
    final str = priceVnd.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]}.',
        );
    return '$str VNĐ';
  }

  Future<void> _handleSubscribeFamily() async {
    final targetId = _familyPlan?.id ?? 3;
    setState(() => _isLoading = true);

    Future<SubscribeResponseModel?> fetchLatestPending() async {
      try {
        final historyRes = await _apiService.getMyPaymentTransactions(page: 1, limit: 1);
        final dataList = historyRes['data'] as List<dynamic>? ?? [];
        if (dataList.isNotEmpty) {
          final item = dataList.first;
          if (item is Map<String, dynamic> && item['status'] == 'pending') {
            final paymentRef = item['paymentRef'] as String?;
            if (paymentRef != null && paymentRef.isNotEmpty) {
              final detail = await _apiService.checkPaymentTransaction(paymentRef);
              if (detail['status'] == 'pending') {
                final model = SubscribeResponseModel.fromJson(detail);
                if (model.qrCodeUrl.isNotEmpty) return model;
              }
            }
          }
        }
      } catch (_) {}
      return null;
    }

    try {
      // 1. Kiểm tra xem giao dịch mới nhất có phải pending không
      final pendingModel = await fetchLatestPending();
      if (pendingModel != null) {
        if (mounted) {
          setState(() => _isLoading = false);
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('⚡ Đã khôi phục mã QR thanh toán đang chờ xử lý...'),
              backgroundColor: Color(0xFF2E7D32),
              behavior: SnackBarBehavior.floating,
            ),
          );
          _showQrPaymentModal(pendingModel);
        }
        return;
      }

      final res = await _apiService.subscribePlan(targetId);
      final subscribeData = SubscribeResponseModel.fromJson(res);
      if (mounted) {
        setState(() => _isLoading = false);
        Navigator.pop(context);
        _showQrPaymentModal(subscribeData);
      }
    } catch (e) {
      debugPrint('[FamilyPlanModal] Error subscribing family plan: $e');

      final pendingModel = await fetchLatestPending();
      if (pendingModel != null && mounted) {
        setState(() => _isLoading = false);
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('⚡ Đã khôi phục mã QR thanh toán đang chờ xử lý...'),
            backgroundColor: Color(0xFF2E7D32),
            behavior: SnackBarBehavior.floating,
          ),
        );
        _showQrPaymentModal(pendingModel);
        return;
      }

      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('ApiException: ', '')),
            backgroundColor: const Color(0xFFE53935),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showQrPaymentModal(SubscribeResponseModel data) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';
    bool isChecking = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        Timer? pollTimer;

        // Auto-poll payment status every 3 seconds via transaction status & subscription
        pollTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
          try {
            final tx = await _apiService.checkPaymentTransaction(data.paymentRef);
            final txStatus = tx['status'] as String?;

            if (txStatus == 'paid') {
              timer.cancel();
              if (context.mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('🎉 Kích hoạt thành công Gói Gia Đình!'),
                    backgroundColor: Color(0xFF2E7D32),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
                widget.onSuccess?.call();
              }
              return;
            }

            final subJson = await _apiService.getMySubscription();
            final sub = UserSubscriptionModel.fromJson(subJson);
            if (sub.status == 'active' && sub.plan.name.toLowerCase().contains('family')) {
              timer.cancel();
              if (context.mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('🎉 Kích hoạt thành công Gói Gia Đình!'),
                    backgroundColor: Color(0xFF2E7D32),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
                widget.onSuccess?.call();
              }
            }
          } catch (_) {}
        });

        return StatefulBuilder(
          builder: (context, setModalState) {
            return PopScope(
              onPopInvokedWithResult: (didPop, result) {
                if (didPop) {
                  pollTimer?.cancel();
                }
              },
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF19271E) : Colors.white,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                ),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFE2E8E4),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(height: 18),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.qr_code_2_rounded, color: Color(0xFF4CAF50), size: 28),
                          const SizedBox(width: 8),
                          Text(
                            isEn ? 'Payment QR Code' : 'Mã QR Thanh Toán PayOS',
                            style: GoogleFonts.outfit(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : const Color(0xFF006428),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      Text(
                        isEn
                            ? 'Scan the VietQR code below with your Mobile Banking / MoMo / VNPay app to subscribe Gói Gia Đình'
                            : 'Quét mã QR bên dưới bằng ứng dụng Ngân hàng / MoMo / VNPay để thanh toán Gói Gia Đình',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13.5,
                          color: isDark ? const Color(0xFFD0D7D1) : const Color(0xFF6B786F),
                        ),
                      ),
                      const SizedBox(height: 16),

                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: _buildQrCodeWidget(data.qrCodeUrl),
                      ),
                      const SizedBox(height: 18),

                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF233629) : const Color(0xFFF1F8E9),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C),
                          ),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  isEn ? 'Amount:' : 'Số tiền thanh toán:',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? const Color(0xFFD0D7D1) : const Color(0xFF616161),
                                  ),
                                ),
                                Text(
                                  _formatPrice(data.amount),
                                  style: GoogleFonts.outfit(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w900,
                                    color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  isEn ? 'Payment Ref:' : 'Mã tham chiếu:',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? const Color(0xFFD0D7D1) : const Color(0xFF616161),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    data.paymentRef,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w800,
                                      color: isDark ? Colors.white : const Color(0xFF19221C),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: isChecking
                              ? null
                              : () async {
                                  setModalState(() => isChecking = true);
                                  try {
                                    final tx = await _apiService.checkPaymentTransaction(data.paymentRef);
                                    final txStatus = tx['status'] as String?;

                                    if (txStatus == 'paid') {
                                      pollTimer?.cancel();
                                      if (context.mounted) {
                                        setModalState(() => isChecking = false);
                                        Navigator.pop(context);
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('🎉 Kích hoạt thành công Gói Gia Đình!'),
                                            backgroundColor: Color(0xFF2E7D32),
                                            behavior: SnackBarBehavior.floating,
                                          ),
                                        );
                                        widget.onSuccess?.call();
                                      }
                                      return;
                                    }

                                    final subJson = await _apiService.getMySubscription();
                                    final sub = UserSubscriptionModel.fromJson(subJson);

                                    if (context.mounted) {
                                      setModalState(() => isChecking = false);
                                      if (sub.status == 'active') {
                                        pollTimer?.cancel();
                                        Navigator.pop(context);
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('🎉 Kích hoạt thành công Gói Gia Đình!'),
                                            backgroundColor: Color(0xFF2E7D32),
                                            behavior: SnackBarBehavior.floating,
                                          ),
                                        );
                                        widget.onSuccess?.call();
                                      } else {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('Hệ thống chưa nhận được thanh toán. Vui lòng quét mã QR bằng App Ngân hàng và thử lại!'),
                                            backgroundColor: Color(0xFFE65100),
                                            behavior: SnackBarBehavior.floating,
                                          ),
                                        );
                                      }
                                    }
                                  } catch (e) {
                                    if (context.mounted) {
                                      setModalState(() => isChecking = false);
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text('Không thể kiểm tra: $e'),
                                          backgroundColor: const Color(0xFFE53935),
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                    }
                                  }
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF008435),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(24),
                            ),
                          ),
                          child: isChecking
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.published_with_changes_rounded, size: 20),
                                    const SizedBox(width: 6),
                                    Flexible(
                                      child: Text(
                                        isEn
                                            ? 'I Have Paid (Check Status)'
                                            : 'Tôi đã thanh toán (Kiểm tra ngay)',
                                        overflow: TextOverflow.ellipsis,
                                        maxLines: 1,
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';

    final defaultFeatures = [
      isEn ? 'All Individual Plan features included' : 'Tất cả tính năng của gói Cá Nhân',
      isEn ? 'Share fridges up to 5 family members' : 'Tối đa 5 thành viên dùng chung tủ lạnh',
      isEn ? 'Manage multiple family fridges' : 'Quản lý nhiều tủ lạnh gia đình',
      isEn ? 'Unlimited AI weekly meal planning' : 'Lập thực đơn AI tuần không giới hạn',
      isEn ? 'Smart barcode, receipt & photo scan' : 'Scan ảnh, mã vạch & hóa đơn không giới hạn',
    ];

    final displayTitle = _familyPlan?.displayName ?? (isEn ? 'Family Plan' : 'Gói Gia Đình');
    final displayPrice = _familyPlan != null ? _formatPrice(_familyPlan!.priceVnd) : '10.000 VNĐ';
    final displayFeatures = (_familyPlan != null && _familyPlan!.features.isNotEmpty)
        ? _familyPlan!.features
        : defaultFeatures;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.80,
      ),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF142017) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 5,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2E4D36) : Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 20),

            Row(
              children: [
                Icon(
                  Icons.workspace_premium_rounded,
                  color: isDark ? Colors.white : const Color(0xFF006428),
                  size: 28,
                ),
                const SizedBox(width: 10),
                Text(
                  isEn ? 'Friggy Service Plans' : 'Các gói dịch vụ Friggy',
                  style: GoogleFonts.outfit(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: isDark ? Colors.white : const Color(0xFF006428),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            if (_isLoadingPlans)
              const Padding(
                padding: EdgeInsets.all(40.0),
                child: Center(
                  child: CircularProgressIndicator(color: Color(0xFF008435)),
                ),
              )
            else
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E3A25) : const Color(0xFFF1F8E9),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: const Color(0xFF4CAF50),
                    width: 2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF4CAF50).withValues(alpha: 0.15),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                displayTitle,
                                style: GoogleFonts.outfit(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  color: isDark ? Colors.white : const Color(0xFF006428),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                isEn
                                    ? 'Unlimited AI features for up to 5 family members'
                                    : 'Đầy đủ tính năng AI không giới hạn cho tối đa 5 người dùng',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 13,
                                  color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF616161),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              displayPrice,
                              style: GoogleFonts.outfit(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                              ),
                            ),
                            Text(
                              isEn ? '/ month' : '/ tháng',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11.5,
                                color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF757575),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    ...displayFeatures.map(
                      (feat) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.check_circle_rounded,
                              color: Color(0xFF4CAF50),
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                feat,
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.white : const Color(0xFF19221C),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 18),

                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _handleSubscribeFamily,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF008435),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : Text(
                                isEn ? 'Upgrade $displayTitle' : 'Nâng cấp $displayTitle',
                                style: GoogleFonts.outfit(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildQrCodeWidget(String qrCodeStr) {
    final cleanStr = qrCodeStr.trim();
    if (cleanStr.isEmpty) {
      return const Icon(
        Icons.qr_code_rounded,
        size: 140,
        color: Colors.grey,
      );
    }

    if (cleanStr.startsWith('data:image') || cleanStr.contains('base64,')) {
      try {
        final base64Clean = cleanStr.contains('base64,')
            ? cleanStr.split('base64,').last
            : cleanStr;
        final bytes = base64Decode(base64Clean);
        return Image.memory(
          bytes,
          width: 200,
          height: 200,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) => const Icon(
            Icons.qr_code_rounded,
            size: 140,
            color: Colors.grey,
          ),
        );
      } catch (e) {
        debugPrint('Base64 QR Decode error: $e');
      }
    }

    final String imageUrl =
        (cleanStr.startsWith('http://') || cleanStr.startsWith('https://'))
            ? cleanStr
            : 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${Uri.encodeComponent(cleanStr)}';

    return Image.network(
      imageUrl,
      width: 200,
      height: 200,
      fit: BoxFit.contain,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return const SizedBox(
          width: 200,
          height: 200,
          child: Center(child: CircularProgressIndicator()),
        );
      },
      errorBuilder: (context, error, stackTrace) {
        if (!cleanStr.startsWith('http://') &&
            !cleanStr.startsWith('https://')) {
          final fallbackUrl =
              'https://quickchart.io/qr?text=${Uri.encodeComponent(cleanStr)}&size=300';
          return Image.network(
            fallbackUrl,
            width: 200,
            height: 200,
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) => const Icon(
              Icons.qr_code_rounded,
              size: 140,
              color: Colors.grey,
            ),
          );
        }
        return const Icon(
          Icons.qr_code_rounded,
          size: 140,
          color: Colors.grey,
        );
      },
    );
  }
}
