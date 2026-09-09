import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/mock_chat_data.dart';
import '../l10n/app_localizations.dart';
import 'chat_detail_screen.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<ChatGroupModel> _chats = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadChats();
  }

  Future<void> _loadChats() async {
    final list = await ChatRepository.fetchChats();
    if (mounted) {
      setState(() {
        _chats = list;
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final loc = AppLocalizations.of(context);
    final isEn = loc?.locale.languageCode == 'en';

    final query = _searchController.text.trim().toLowerCase();
    final filteredChats = _chats.where((chat) {
      return query.isEmpty ||
          chat.name.toLowerCase().contains(query) ||
          chat.lastMessage.toLowerCase().contains(query);
    }).toList();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 12),

          // Header Title
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              RichText(
                text: TextSpan(
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -0.5,
                  ),
                  children: isEn
                      ? [
                          TextSpan(
                            text: 'Mess',
                            style: TextStyle(
                              color: isDark ? Colors.white : const Color(0xFF19221C),
                            ),
                          ),
                          TextSpan(
                            text: 'ages',
                            style: TextStyle(
                              color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                            ),
                          ),
                        ]
                      : [
                          TextSpan(
                            text: 'Tin ',
                            style: TextStyle(
                              color: isDark ? Colors.white : const Color(0xFF19221C),
                            ),
                          ),
                          TextSpan(
                            text: 'nhắn',
                            style: TextStyle(
                              color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                            ),
                          ),
                        ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // 2. Search Bar right below Title
          Container(
            height: 46,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF19271E) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? const Color(0xFF2E4D36) : const Color(0xFF81C784),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: TextField(
              controller: _searchController,
              onChanged: (val) => setState(() {}),
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : const Color(0xFF19221C),
              ),
              decoration: InputDecoration(
                hintText: isEn ? 'Search conversations, groups...' : 'Tìm kiếm trò chuyện, nhóm...',
                hintStyle: GoogleFonts.plusJakartaSans(
                  fontSize: 13.5,
                  color: isDark ? const Color(0xFF9DA8A0) : const Color(0xFFA5D6A7),
                ),
                prefixIcon: Icon(
                  Icons.search_rounded,
                  color: isDark ? const Color(0xFF81C784) : const Color(0xFF4CAF50),
                  size: 22,
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 11),
              ),
            ),
          ),

          const SizedBox(height: 14),

          // 3. Online Members Story Avatars Row
          SizedBox(
            height: 64,
            child: ListView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              children: [
                _buildOnlineStoryAvatar(
                    'Thy', 'assets/images/cute_mascot.png'),
                _buildOnlineStoryAvatar(
                    'Linh', 'assets/images/available_veggies.png'),
                _buildOnlineStoryAvatar('Tuấn', 'assets/images/mascot.png'),
                _buildOnlineStoryAvatar('Nam', 'assets/images/left.png'),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // 4. Conversations & Groups List
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      color: Color(0xFF008435),
                    ),
                  )
                : filteredChats.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.chat_bubble_outline_rounded,
                              size: 56,
                              color: Colors.white.withValues(alpha: 0.6),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'No chat groups found',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF1B5E20),
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        physics: const BouncingScrollPhysics(),
                        itemCount: filteredChats.length,
                        separatorBuilder: (context, index) =>
                            const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final chat = filteredChats[index];

                          return GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) =>
                                      ChatDetailScreen(chat: chat),
                                ),
                              );
                            },
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF19271E) : Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isDark ? const Color(0xFF2E4D36) : const Color(0xFF81C784),
                                  width: 1,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Row(
                                children: [
                                  // Chat Avatar with Group Badge
                                  Stack(
                                    children: [
                                      Container(
                                        width: 54,
                                        height: 54,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: const Color(0xFF4CAF50),
                                            width: 1.5,
                                          ),
                                        ),
                                        child: ClipRRect(
                                          borderRadius:
                                              BorderRadius.circular(27),
                                          child: Image.asset(
                                            chat.isGroup
                                                ? 'assets/images/cute_mascot.png'
                                                : chat.avatarPath,
                                            width: 54,
                                            height: 54,
                                            fit: BoxFit.cover,
                                            errorBuilder:
                                                (context, error, stackTrace) {
                                              return Container(
                                                color: isDark
                                                    ? const Color(0xFF233629)
                                                    : const Color(0xFFE8F5E9),
                                                child: Icon(
                                                  Icons.group_rounded,
                                                  color: isDark
                                                      ? const Color(0xFF81C784)
                                                      : const Color(0xFF008435),
                                                ),
                                              );
                                            },
                                          ),
                                        ),
                                      ),
                                      if (chat.isGroup)
                                        Positioned(
                                          right: 0,
                                          bottom: 0,
                                          child: Container(
                                            padding: const EdgeInsets.all(3),
                                            decoration: const BoxDecoration(
                                              color: Color(0xFF008435),
                                              shape: BoxShape.circle,
                                            ),
                                            child: const Icon(
                                              Icons.groups_rounded,
                                              color: Colors.white,
                                              size: 11,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),

                                  const SizedBox(width: 14),

                                  // Chat Name & Last Message Subtitle
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                chat.name,
                                                style: GoogleFonts.outfit(
                                                  fontSize: 17,
                                                  fontWeight: FontWeight.w800,
                                                  color: isDark
                                                      ? Colors.white
                                                      : const Color(0xFF006428),
                                                ),
                                                overflow:
                                                    TextOverflow.ellipsis,
                                              ),
                                            ),
                                            const SizedBox(width: 6),
                                            Text(
                                              chat.lastMessageTime,
                                              style:
                                                  GoogleFonts.plusJakartaSans(
                                                fontSize: 11.5,
                                                fontWeight: FontWeight.w600,
                                                color: const Color(0xFF81C784),
                                              ),
                                            ),
                                          ],
                                        ),

                                        const SizedBox(height: 4),

                                        // Last Sender Name + Message Snippet
                                        Row(
                                          children: [
                                            Expanded(
                                              child: RichText(
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                text: TextSpan(
                                                  style: GoogleFonts
                                                      .plusJakartaSans(
                                                    fontSize: 13,
                                                    color: isDark
                                                        ? const Color(0xFF9DA8A0)
                                                        : const Color(0xFF6B786F),
                                                  ),
                                                  children: [
                                                    TextSpan(
                                                      text:
                                                          '${chat.lastSenderName}: ',
                                                      style: TextStyle(
                                                        fontWeight:
                                                            FontWeight.w700,
                                                        color: isDark
                                                            ? const Color(0xFF81C784)
                                                            : const Color(0xFF19221C),
                                                      ),
                                                    ),
                                                    TextSpan(
                                                      text: chat.lastMessage,
                                                      style: TextStyle(
                                                        fontWeight: chat
                                                                    .unreadCount >
                                                                0
                                                            ? FontWeight.w700
                                                            : FontWeight.w400,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ),
                                            if (chat.unreadCount > 0)
                                              Container(
                                                margin: const EdgeInsets.only(
                                                    left: 6),
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                  horizontal: 7,
                                                  vertical: 3,
                                                ),
                                                decoration: const BoxDecoration(
                                                  color: Color(0xFFD32F2F),
                                                  shape: BoxShape.circle,
                                                ),
                                                child: Text(
                                                  '${chat.unreadCount}',
                                                  style: GoogleFonts.outfit(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w900,
                                                    color: Colors.white,
                                                  ),
                                                ),
                                              ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildOnlineStoryAvatar(String name, String imagePath) {
    return Padding(
      padding: const EdgeInsets.only(right: 14.0),
      child: Column(
        children: [
          Stack(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: const Color(0xFF77C033),
                    width: 1.8,
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(22),
                  child: Image.asset(
                    imagePath,
                    width: 44,
                    height: 44,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: const Color(0xFF00E676),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 3),
          Text(
            name,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF006428),
            ),
          ),
        ],
      ),
    );
  }
}
