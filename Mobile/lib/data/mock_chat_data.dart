class ChatGroupModel {
  final String id;
  final String name;
  final String avatarPath;
  final String lastSenderName;
  final String lastMessage;
  final String lastMessageTime;
  final int unreadCount;
  final int memberCount;
  final bool isGroup;

  const ChatGroupModel({
    required this.id,
    required this.name,
    required this.avatarPath,
    required this.lastSenderName,
    required this.lastMessage,
    required this.lastMessageTime,
    required this.unreadCount,
    required this.memberCount,
    this.isGroup = true,
  });
}

class ChatRepository {
  static final List<ChatGroupModel> _mockChats = [
    const ChatGroupModel(
      id: 'chat_family',
      name: 'Tủ Lạnh Gia Đình',
      avatarPath: 'assets/images/cute_mascot.png',
      lastSenderName: 'Trần Ngọc Thy',
      lastMessage: 'Tủ còn cà chua với thịt heo xay không?',
      lastMessageTime: '10:45 AM',
      unreadCount: 2,
      memberCount: 3,
      isGroup: true,
    ),
    const ChatGroupModel(
      id: 'chat_roommates',
      name: 'Tủ Lạnh Phòng Trọ',
      avatarPath: 'assets/images/cute_mascot.png',
      lastSenderName: 'Hoàng Anh Tuấn',
      lastMessage: 'Tối nay nấu lẩu nấm nhé mọi người',
      lastMessageTime: '09:20 AM',
      unreadCount: 0,
      memberCount: 2,
      isGroup: true,
    ),
    const ChatGroupModel(
      id: 'chat_personal_friend',
      name: 'Nguyễn Văn Nam',
      avatarPath: 'assets/images/mascot.png',
      lastSenderName: 'Nam',
      lastMessage: 'Đã thêm 2 chai sữa tươi vào tủ chung rồi nhé',
      lastMessageTime: '26/08',
      unreadCount: 0,
      memberCount: 2,
      isGroup: false,
    ),
  ];

  static Future<List<ChatGroupModel>> fetchChats() async {
    await Future.delayed(const Duration(milliseconds: 30));
    return _mockChats;
  }
}
