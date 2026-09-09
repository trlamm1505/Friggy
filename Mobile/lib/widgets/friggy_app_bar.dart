import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../screens/notifications_screen.dart';

class FriggyAppBar extends StatelessWidget implements PreferredSizeWidget {
  final bool showBackButton;
  final VoidCallback? onBackTap;
  final VoidCallback? onNotificationTap;
  final bool hasUnreadNotifications;
  final int unreadCount;
  final Color? backgroundColor;

  const FriggyAppBar({
    super.key,
    this.showBackButton = true,
    this.onBackTap,
    this.onNotificationTap,
    this.hasUnreadNotifications = true,
    this.unreadCount = 3,
    this.backgroundColor,
  });

  @override
  Size get preferredSize => const Size.fromHeight(60.0);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      color: backgroundColor ?? Colors.transparent,
      padding: EdgeInsets.symmetric(
        horizontal: showBackButton ? 16.0 : 0.0,
        vertical: 4.0,
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Left Side: Optional Back Button + Friggy Logo
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (showBackButton) ...[
                  IconButton(
                    icon: Icon(
                      Icons.chevron_left_rounded,
                      size: 32,
                      color: isDark ? Colors.white : const Color(0xFF19221C),
                    ),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 36,
                      minHeight: 36,
                    ),
                    onPressed: () {
                      if (onBackTap != null) {
                        onBackTap!();
                      } else {
                        Navigator.maybePop(context);
                      }
                    },
                  ),
                  const SizedBox(width: 4),
                ],

                // Friggy Brand Logo with Leaf Badge
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    RichText(
                      text: TextSpan(
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          letterSpacing: -0.5,
                        ),
                        children: [
                          TextSpan(
                            text: 'Fri',
                            style: TextStyle(
                              color: isDark ? Colors.white : const Color(0xFF19221C),
                            ),
                          ),
                          TextSpan(
                            text: 'ggy',
                            style: TextStyle(
                              color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 5),
                    Container(
                      padding: const EdgeInsets.all(4.5),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.eco_rounded,
                        color: isDark ? const Color(0xFF0E1611) : Colors.white,
                        size: 16,
                      ),
                    ),
                  ],
                ),
              ],
            ),

            // Right Side: Notification Icon with Unread Count Badge
            GestureDetector(
              onTap: onNotificationTap ??
                  () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const NotificationsScreen(),
                      ),
                    );
                  },
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF19271E) : Colors.white,
                  shape: BoxShape.circle,
                  border: isDark
                      ? Border.all(color: const Color(0xFF2E4D36), width: 1.2)
                      : null,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.06),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Icon(
                      Icons.notifications_none_rounded,
                      color: isDark ? const Color(0xFF81C784) : const Color(0xFF2E7D32),
                      size: 24,
                    ),
                    if (hasUnreadNotifications && unreadCount > 0)
                      Positioned(
                        top: 4,
                        right: 4,
                        child: Container(
                          padding: const EdgeInsets.all(2.5),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE53935),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isDark ? const Color(0xFF19271E) : Colors.white,
                              width: 1.5,
                            ),
                          ),
                          constraints: const BoxConstraints(
                            minWidth: 17,
                            minHeight: 17,
                          ),
                          child: Center(
                            child: Text(
                              '$unreadCount',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                height: 1.0,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
