import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../l10n/app_localizations.dart';

class PersonalInfoScreen extends StatefulWidget {
  const PersonalInfoScreen({super.key});

  @override
  State<PersonalInfoScreen> createState() => _PersonalInfoScreenState();
}

class _PersonalInfoScreenState extends State<PersonalInfoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController(text: 'Trần Quốc Lâm');
  final _emailController = TextEditingController(text: 'lam.tran@friggy.app');
  final _phoneController = TextEditingController(text: '0912 345 678');
  final _dobController = TextEditingController(text: '15/08/1995');
  String _selectedGender = 'Nam';

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _dobController.dispose();
    super.dispose();
  }

  void _saveChanges() {
    FocusScope.of(context).unfocus();
    if (_formKey.currentState?.validate() ?? false) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Đã cập nhật thông tin cá nhân thành công!'),
          backgroundColor: const Color(0xFF008435),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          duration: const Duration(seconds: 2),
        ),
      );
      Navigator.pop(context);
    }
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
                  ],
            stops: isDark ? const [0.0, 0.5, 1.0] : const [0.0, 0.3, 0.7, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Top Bar Header
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
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
                    const SizedBox(width: 14),
                    Text(
                      isEn ? 'Personal Information' : 'Thông tin cá nhân',
                      style: GoogleFonts.outfit(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: isDark ? Colors.white : const Color(0xFF006428),
                      ),
                    ),
                  ],
                ),
              ),

              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20.0,
                    vertical: 12.0,
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        const SizedBox(height: 8),

                        // Profile Avatar (Clean without camera icon per profile tab style)
                        Center(
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                                width: 3,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.08),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: CircleAvatar(
                              radius: 46,
                              backgroundColor: isDark ? const Color(0xFF233629) : const Color(0xFFE8F5E9),
                              backgroundImage: const AssetImage(
                                'assets/images/cute_mascot.png',
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 24),

                        // Form Container with Field Validation
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF19271E) : Colors.white,
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(
                              color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C),
                              width: 1.2,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildValidatedField(
                                label: isEn ? 'Full Name' : 'Họ và tên',
                                controller: _nameController,
                                icon: Icons.person_rounded,
                                validator: (val) {
                                  if (val == null || val.trim().isEmpty) {
                                    return isEn ? 'Please enter full name' : 'Vui lòng nhập họ và tên';
                                  }
                                  if (val.trim().length < 2) {
                                    return isEn ? 'Full name must be at least 2 characters' : 'Họ và tên phải có ít nhất 2 ký tự';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),
                              _buildValidatedField(
                                label: 'Email',
                                controller: _emailController,
                                icon: Icons.email_rounded,
                                keyboardType: TextInputType.emailAddress,
                                validator: (val) {
                                  if (val == null || val.trim().isEmpty) {
                                    return isEn ? 'Please enter email' : 'Vui lòng nhập email';
                                  }
                                  final emailRegex = RegExp(
                                    r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$',
                                  );
                                  if (!emailRegex.hasMatch(val.trim())) {
                                    return isEn ? 'Invalid email format (e.g. example@domain.com)' : 'Email không đúng định dạng (VD: example@domain.com)';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),
                              _buildValidatedField(
                                label: isEn ? 'Phone Number' : 'Số điện thoại',
                                controller: _phoneController,
                                icon: Icons.phone_rounded,
                                keyboardType: TextInputType.phone,
                                validator: (val) {
                                  if (val == null || val.trim().isEmpty) {
                                    return isEn ? 'Please enter phone number' : 'Vui lòng nhập số điện thoại';
                                  }
                                  final cleanPhone =
                                      val.replaceAll(RegExp(r'\s+'), '');
                                  if (!RegExp(r'^0[0-9]{9}$')
                                      .hasMatch(cleanPhone)) {
                                    return isEn ? 'Phone number must be 10 digits starting with 0' : 'Số điện thoại phải gồm 10 chữ số bắt đầu bằng số 0';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),
                              _buildValidatedField(
                                label: isEn ? 'Date of Birth' : 'Ngày sinh',
                                controller: _dobController,
                                icon: Icons.calendar_today_rounded,
                                validator: (val) {
                                  if (val == null || val.trim().isEmpty) {
                                    return isEn ? 'Please enter date of birth' : 'Vui lòng nhập ngày sinh';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),

                              // Gender Radio selection
                              Text(
                                isEn ? 'Gender' : 'Giới tính',
                                style: GoogleFonts.outfit(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? Colors.white : const Color(0xFF006428),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: (isEn ? ['Male', 'Female', 'Other'] : ['Nam', 'Nữ', 'Khác']).map((gender) {
                                  final isSelected = _selectedGender == gender ||
                                      (gender == 'Male' && _selectedGender == 'Nam') ||
                                      (gender == 'Female' && _selectedGender == 'Nữ') ||
                                      (gender == 'Other' && _selectedGender == 'Khác');
                                  return GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        _selectedGender = gender;
                                      });
                                    },
                                    child: Container(
                                      margin: const EdgeInsets.only(right: 12),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 18,
                                        vertical: 10,
                                      ),
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? (isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50))
                                            : (isDark ? const Color(0xFF0E1611) : const Color(0xFFF1F8E9)),
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(
                                          color: isSelected
                                              ? (isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50))
                                              : (isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5D6A7)),
                                        ),
                                      ),
                                      child: Text(
                                        gender,
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w700,
                                          color: isSelected
                                              ? (isDark ? const Color(0xFF0E1611) : Colors.white)
                                              : (isDark ? Colors.white : const Color(0xFF006428)),
                                        ),
                                      ),
                                    ),
                                  );
                                }).toList(),
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
                            onPressed: _saveChanges,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                              elevation: 2,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(28),
                              ),
                            ),
                            child: Text(
                              isEn ? 'Save Changes' : 'Lưu thay đổi',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                                color: isDark ? const Color(0xFF0E1611) : Colors.white,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
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

  Widget _buildValidatedField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    required String? Function(String?) validator,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.outfit(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF006428),
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          validator: validator,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14.5,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white : const Color(0xFF19221C),
          ),
          decoration: InputDecoration(
            prefixIcon: Icon(
              icon,
              color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
              size: 20,
            ),
            filled: true,
            fillColor: isDark ? const Color(0xFF0E1611) : const Color(0xFFF5FCF4),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5D6A7),
                width: 1.2,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5D6A7),
                width: 1.2,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                width: 1.8,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: Color(0xFFD32F2F), width: 1.5),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: Color(0xFFD32F2F), width: 1.8),
            ),
            errorStyle: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: const Color(0xFFD32F2F),
            ),
          ),
        ),
      ],
    );
  }
}
