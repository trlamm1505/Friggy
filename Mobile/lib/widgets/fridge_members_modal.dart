import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class FridgeMemberModel {
  final String id;
  final String name;
  final String emailOrPhone;
  final String role; // 'Chủ tủ' vs 'Thành viên'
  final bool isOwner;
  final Color avatarBgColor;

  FridgeMemberModel({
    required this.id,
    required this.name,
    required this.emailOrPhone,
    required this.role,
    this.isOwner = false,
    this.avatarBgColor = const Color(0xFF4CAF50),
  });
}

void showFridgeMembersModal(
  BuildContext context, {
  required String fridgeName,
  required List<FridgeMemberModel> members,
  required Function(FridgeMemberModel) onAddMember,
  required Function(String) onRemoveMember,
}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  final inviteInputController = TextEditingController();

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) {
      return StatefulBuilder(
        builder: (context, setModalState) {
          void handleAddMember() {
            final text = inviteInputController.text.trim();
            if (text.isEmpty) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text(
                    'Vui lòng nhập Email hoặc Số điện thoại thành viên!',
                  ),
                  backgroundColor: const Color(0xFFD32F2F),
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              );
              return;
            }

            final isEmail = text.contains('@');
            final newMemberName = isEmail
                ? text.split('@').first.toUpperCase()
                : (text.length >= 4
                    ? 'Thành viên ${text.substring(text.length - 4)}'
                    : text);

            final newMember = FridgeMemberModel(
              id: 'member_${DateTime.now().millisecondsSinceEpoch}',
              name: newMemberName,
              emailOrPhone: text,
              role: 'Thành viên',
              isOwner: false,
              avatarBgColor: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
            );

            onAddMember(newMember);
            inviteInputController.clear();
            FocusScope.of(context).unfocus();

            setModalState(() {});

            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Đã thêm thành viên mới "$newMemberName" vào tủ!',
                ),
                backgroundColor: const Color(0xFF008435),
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                duration: const Duration(seconds: 2),
              ),
            );
          }

          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom,
            ),
            child: Container(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.82,
              ),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF19271E) : Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                border: isDark
                    ? const Border(top: BorderSide(color: Color(0xFF2E4D36), width: 1.2))
                    : null,
              ),
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top Drag Indicator
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

                    const SizedBox(height: 18),

                    // Header Title (Clean without member count)
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF233629) : const Color(0xFFE8F5E9),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.group_rounded,
                            color: isDark ? const Color(0xFF81C784) : const Color(0xFF006428),
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Thành viên dùng chung',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                  color: isDark ? Colors.white : const Color(0xFF006428),
                                ),
                              ),
                              Text(
                                fridgeName,
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? const Color(0xFF81C784) : const Color(0xFF558B2F),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // Section 1: Current Members List
                    Text(
                      'Danh sách thành viên',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF006428),
                      ),
                    ),
                    const SizedBox(height: 10),

                    Container(
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF0E1611) : const Color(0xFFF5FCF4),
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(
                          color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C),
                          width: 1.2,
                        ),
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: members.length,
                        separatorBuilder: (context, index) => Container(
                          margin: const EdgeInsets.symmetric(horizontal: 16),
                          height: 1,
                          color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFE8F5E9),
                        ),
                        itemBuilder: (context, index) {
                          final member = members[index];
                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 4,
                            ),
                            leading: Stack(
                              children: [
                                CircleAvatar(
                                  radius: 22,
                                  backgroundColor: member.avatarBgColor,
                                  child: Text(
                                    member.name.characters.first.toUpperCase(),
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                                if (member.isOwner)
                                  Positioned(
                                    right: -2,
                                    top: -2,
                                    child: Container(
                                      padding: const EdgeInsets.all(2),
                                      decoration: const BoxDecoration(
                                        color: Color(0xFFFFB74D),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.star_rounded,
                                        size: 12,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            title: Row(
                              children: [
                                Text(
                                  member.name,
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? Colors.white : const Color(0xFF19221C),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: member.isOwner
                                        ? (isDark ? const Color(0xFF3E2C17) : const Color(0xFFFFF3E0))
                                        : (isDark ? const Color(0xFF233629) : const Color(0xFFE8F5E9)),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: member.isOwner
                                          ? const Color(0xFFFFB74D)
                                          : (isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C)),
                                    ),
                                  ),
                                  child: Text(
                                    member.role,
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: member.isOwner
                                          ? (isDark ? const Color(0xFFFFB74D) : const Color(0xFFE65100))
                                          : (isDark ? const Color(0xFF81C784) : const Color(0xFF006428)),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            subtitle: Text(
                              member.emailOrPhone,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 12.5,
                                color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF757575),
                              ),
                            ),
                            trailing: !member.isOwner
                                ? IconButton(
                                    icon: Icon(
                                      Icons.remove_circle_outline_rounded,
                                      color: isDark ? const Color(0xFFE57373) : const Color(0xFFE53935),
                                      size: 20,
                                    ),
                                    onPressed: () {
                                      onRemoveMember(member.id);
                                      setModalState(() {});
                                      ScaffoldMessenger.of(context)
                                          .showSnackBar(
                                        SnackBar(
                                          content: Text(
                                            'Đã xóa "${member.name}" khỏi tủ!',
                                          ),
                                          backgroundColor:
                                              const Color(0xFFD32F2F),
                                          duration:
                                              const Duration(seconds: 1),
                                        ),
                                      );
                                    },
                                  )
                                : null,
                          );
                        },
                      ),
                    ),

                    const SizedBox(height: 22),

                    // Section 2: Add New Member Form
                    Text(
                      'Thêm thành viên mới',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF006428),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Input Field & Direct Add Button Row
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF0E1611) : const Color(0xFFF5FCF4),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isDark ? const Color(0xFF2E4D36) : const Color(0xFFA5E69C),
                                width: 1.2,
                              ),
                            ),
                            child: TextField(
                              controller: inviteInputController,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.white : const Color(0xFF19221C),
                              ),
                              decoration: InputDecoration(
                                hintText: 'Nhập Email hoặc SĐT...',
                                hintStyle: GoogleFonts.plusJakartaSans(
                                  fontSize: 13,
                                  color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFF9E9E9E),
                                ),
                                prefixIcon: Icon(
                                  Icons.person_add_alt_1_rounded,
                                  color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                                  size: 20,
                                ),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 13,
                                ),
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(width: 10),

                        // Direct Add Button
                        ElevatedButton.icon(
                          onPressed: handleAddMember,
                          icon: Icon(
                            Icons.add_rounded,
                            color: isDark ? const Color(0xFF0E1611) : Colors.white,
                            size: 20,
                          ),
                          label: Text(
                            'Thêm',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: isDark ? const Color(0xFF0E1611) : Colors.white,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 14,
                            ),
                            elevation: 2,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(18),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),
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
