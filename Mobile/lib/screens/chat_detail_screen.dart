import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../data/mock_chat_data.dart';
import 'camera_preview_screen.dart';

class SingleChatMessageModel {
  final String id;
  final String senderName;
  final String senderAvatar;
  final String text;
  final String time;
  final bool isMe;
  final String? imagePath;
  final File? localImageFile;
  final bool isVoice;
  final String? voiceDuration;

  SingleChatMessageModel({
    required this.id,
    required this.senderName,
    required this.senderAvatar,
    required this.text,
    required this.time,
    required this.isMe,
    this.imagePath,
    this.localImageFile,
    this.isVoice = false,
    this.voiceDuration,
  });
}

class ChatDetailScreen extends StatefulWidget {
  final ChatGroupModel chat;

  const ChatDetailScreen({
    super.key,
    required this.chat,
  });

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _inputFocusNode = FocusNode();
  final ImagePicker _picker = ImagePicker();

  late List<SingleChatMessageModel> _messages;

  // Emoji Picker & Keyboard Toggle State
  bool _showEmojiPicker = false;
  int _selectedEmojiCategory = 0;

  // Voice recording simulation state
  bool _isRecording = false;
  int _recordSeconds = 0;
  Timer? _recordTimer;

  // Curated Emojis List
  final List<List<String>> _emojiCategories = [
    // 0: Food & Groceries
    [
      '🍲', '🥗', '🍅', '🥦', '🥩', '🥑', '🍳', '🥕', '🧀', '🍊',
      '🥛', '🍕', '🍔', '🍓', '🍎', '🍉', '🍇', '🍞', '🥞', '🥐',
      '🍜', '🍱', '🍙', '🍦', '🍩', '🍪', '☕', '🧃', '🥤', '🍷'
    ],
    // 1: Reactions & Smiles
    [
      '😊', '😂', '😋', '🤤', '😍', '👍', '❤️', '🔥', '🎉', '🙏',
      '🥳', '😎', '👏', '💯', '🤔', '🥰', '🤩', '😃', '😁', '😄',
      '🥹', '😉', '😜', '💖', '✨', '⭐', '🙌', '👌', '✌️', '💪'
    ],
  ];

  @override
  void initState() {
    super.initState();
    _messages = [
      SingleChatMessageModel(
        id: '1',
        senderName: 'Mẹ',
        senderAvatar: 'assets/images/cute_mascot.png',
        text: 'Tủ còn cà chua với thịt heo xay không con?',
        time: '10:42 AM',
        isMe: false,
      ),
      SingleChatMessageModel(
        id: '2',
        senderName: 'Bạn',
        senderAvatar: 'assets/images/goodmorning-Photoroom.png',
        text: 'Dạ còn 300g cà chua với 200g thịt heo xay ạ!',
        time: '10:43 AM',
        isMe: true,
      ),
      SingleChatMessageModel(
        id: '3',
        senderName: 'Trang',
        senderAvatar: 'assets/images/available_veggies.png',
        text: 'Tối nay làm món trứng chiên cà chua với canh rau cải nha 🍲',
        time: '10:44 AM',
        isMe: false,
      ),
      SingleChatMessageModel(
        id: '4',
        senderName: 'Mẹ',
        senderAvatar: 'assets/images/cute_mascot.png',
        text: 'Ok con, để mẹ đi chợ mua thêm ít hoa quả tươi nhé!',
        time: '10:45 AM',
        isMe: false,
      ),
    ];

    _inputFocusNode.addListener(() {
      if (_inputFocusNode.hasFocus) {
        setState(() {
          _showEmojiPicker = false;
        });
      }
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _inputFocusNode.dispose();
    _recordTimer?.cancel();
    super.dispose();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add(
        SingleChatMessageModel(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          senderName: 'Bạn',
          senderAvatar: 'assets/images/goodmorning-Photoroom.png',
          text: text,
          time: 'Vừa xong',
          isMe: true,
        ),
      );
      _messageController.clear();
    });

    _scrollToBottom();
  }

  void _insertEmoji(String emoji) {
    final text = _messageController.text;
    final selection = _messageController.selection;
    if (selection.start >= 0 && selection.end >= selection.start) {
      final newText = text.replaceRange(selection.start, selection.end, emoji);
      _messageController.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(
            offset: selection.start + emoji.length),
      );
    } else {
      _messageController.text = text + emoji;
    }
  }

  void _toggleEmojiPicker() {
    if (_showEmojiPicker) {
      _inputFocusNode.requestFocus();
      setState(() {
        _showEmojiPicker = false;
      });
    } else {
      _inputFocusNode.unfocus();
      setState(() {
        _showEmojiPicker = true;
      });
    }
  }

  // 📷 Pick Image from Camera
  Future<void> _pickImageFromCamera() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const CameraPreviewScreen(),
      ),
    );

    if (result == null) return;

    if (result == 'GALLERY') {
      _pickImageFromGallery();
      return;
    }

    if (result is File) {
      setState(() {
        _messages.add(
          SingleChatMessageModel(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            senderName: 'Bạn',
            senderAvatar: 'assets/images/goodmorning-Photoroom.png',
            text: 'Đã chụp 1 hình ảnh 📸',
            localImageFile: result,
            time: 'Vừa xong',
            isMe: true,
          ),
        );
      });
      _scrollToBottom();
    } else if (result is String) {
      setState(() {
        _messages.add(
          SingleChatMessageModel(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            senderName: 'Bạn',
            senderAvatar: 'assets/images/goodmorning-Photoroom.png',
            text: 'Đã gửi 1 ảnh nguyên liệu 📸',
            imagePath: result,
            time: 'Vừa xong',
            isMe: true,
          ),
        );
      });
      _scrollToBottom();
    }
  }

  // 🖼️ Pick Image from Gallery
  Future<void> _pickImageFromGallery() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );

      if (image != null) {
        setState(() {
          _messages.add(
            SingleChatMessageModel(
              id: DateTime.now().millisecondsSinceEpoch.toString(),
              senderName: 'Bạn',
              senderAvatar: 'assets/images/goodmorning-Photoroom.png',
              text: 'Đã chọn 1 ảnh từ thư viện 🖼️',
              localImageFile: File(image.path),
              time: 'Vừa xong',
              isMe: true,
            ),
          );
        });
        _scrollToBottom();
      }
    } catch (e) {
      setState(() {
        _messages.add(
          SingleChatMessageModel(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            senderName: 'Bạn',
            senderAvatar: 'assets/images/goodmorning-Photoroom.png',
            text: 'Đã chọn 1 ảnh từ thư viện 🖼️',
            imagePath: 'assets/images/available_veggies.png',
            time: 'Vừa xong',
            isMe: true,
          ),
        );
      });
      _scrollToBottom();
    }
  }

  // 🎙️ Voice Recording Toggle
  void _toggleRecording() {
    if (_isRecording) {
      _recordTimer?.cancel();
      final durationStr = '00:${_recordSeconds.toString().padLeft(2, '0')}';

      setState(() {
        _isRecording = false;
        _messages.add(
          SingleChatMessageModel(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            senderName: 'Bạn',
            senderAvatar: 'assets/images/goodmorning-Photoroom.png',
            text: 'Tin nhắn thoại ($durationStr)',
            isVoice: true,
            voiceDuration: durationStr,
            time: 'Vừa xong',
            isMe: true,
          ),
        );
        _recordSeconds = 0;
      });
      _scrollToBottom();
    } else {
      setState(() {
        _showEmojiPicker = false;
        _isRecording = true;
        _recordSeconds = 0;
      });

      _recordTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        setState(() {
          _recordSeconds++;
        });
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0E1611) : const Color(0xFFF7F9F7),
      body: SafeArea(
        child: Column(
          children: [
            // 1. Header Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF19271E) : Colors.white,
                border: isDark
                    ? const Border(
                        bottom: BorderSide(color: Color(0xFF2E4D36), width: 1))
                    : null,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(
                      Icons.chevron_left_rounded,
                      size: 32,
                      color: isDark ? Colors.white : const Color(0xFF19221C),
                    ),
                    onPressed: () => Navigator.pop(context),
                  ),
                  Stack(
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: const Color(0xFF4CAF50),
                            width: 1.5,
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(21),
                          child: Image.asset(
                            widget.chat.avatarPath,
                            width: 42,
                            height: 42,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                Container(
                              color: isDark
                                  ? const Color(0xFF233629)
                                  : const Color(0xFFE8F5E9),
                              child: Icon(
                                Icons.groups_rounded,
                                color: isDark
                                    ? const Color(0xFF81C784)
                                    : const Color(0xFF4CAF50),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: Container(
                          width: 11,
                          height: 11,
                          decoration: BoxDecoration(
                            color: const Color(0xFF4CAF50),
                            shape: BoxShape.circle,
                            border: Border.all(
                                color: isDark
                                    ? const Color(0xFF19271E)
                                    : Colors.white,
                                width: 2),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.chat.name,
                          style: GoogleFonts.outfit(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : const Color(0xFF19221C),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 1),
                        Text(
                          widget.chat.isGroup
                              ? '${widget.chat.memberCount} thành viên đang hoạt động'
                              : 'Đang hoạt động',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: isDark ? const Color(0xFF81C784) : const Color(0xFF77C033),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.call_rounded,
                      color: isDark ? Colors.white : const Color(0xFF19221C),
                      size: 22,
                    ),
                    onPressed: () {},
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.videocam_rounded,
                      color: isDark ? Colors.white : const Color(0xFF19221C),
                      size: 24,
                    ),
                    onPressed: () {},
                  ),
                ],
              ),
            ),

            // 2. Chat Messages Stream List
            Expanded(
              child: GestureDetector(
                onTap: () {
                  _inputFocusNode.unfocus();
                  setState(() {
                    _showEmojiPicker = false;
                  });
                },
                child: ListView.builder(
                  controller: _scrollController,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    final msg = _messages[index];
                    return _buildMessageBubble(msg);
                  },
                ),
              ),
            ),

            // 3. Bottom Media & Input Bar Toolbar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF19271E) : Colors.white,
                border: isDark
                    ? const Border(
                        top: BorderSide(color: Color(0xFF2E4D36), width: 1))
                    : null,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -3),
                  ),
                ],
              ),
              child: _isRecording
                  ? _buildRecordingBar()
                  : Row(
                      children: [
                        // 📷 Camera Button
                        IconButton(
                          icon: Icon(
                            Icons.camera_alt_outlined,
                            color: isDark ? const Color(0xFF81C784) : const Color(0xFF77C033),
                            size: 25,
                          ),
                          onPressed: _pickImageFromCamera,
                        ),

                        // 🖼️ Gallery Button
                        IconButton(
                          icon: Icon(
                            Icons.image_outlined,
                            color: isDark ? const Color(0xFF81C784) : const Color(0xFF77C033),
                            size: 25,
                          ),
                          onPressed: _pickImageFromGallery,
                        ),

                        // 🎙️ Voice Recorder Button
                        IconButton(
                          icon: Icon(
                            Icons.mic_none_rounded,
                            color: isDark ? const Color(0xFF81C784) : const Color(0xFF77C033),
                            size: 25,
                          ),
                          onPressed: _toggleRecording,
                        ),

                        const SizedBox(width: 4),

                        // Message Input Box with Focus & Emoji Toggle
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              _inputFocusNode.requestFocus();
                              setState(() {
                                _showEmojiPicker = false;
                              });
                            },
                            child: Container(
                              height: 42,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 14),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? const Color(0xFF233629)
                                    : const Color(0xFFF1F5F1),
                                borderRadius: BorderRadius.circular(22),
                                border: isDark
                                    ? Border.all(
                                        color: const Color(0xFF2E4D36),
                                        width: 1)
                                    : null,
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: TextField(
                                      controller: _messageController,
                                      focusNode: _inputFocusNode,
                                      style: GoogleFonts.plusJakartaSans(
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.w500,
                                        color: isDark
                                            ? Colors.white
                                            : const Color(0xFF19221C),
                                      ),
                                      decoration: InputDecoration(
                                        hintText: 'Aa',
                                        hintStyle: GoogleFonts.plusJakartaSans(
                                          fontSize: 15,
                                          color: isDark
                                              ? const Color(0xFF9DA8A0)
                                              : Colors.grey[500],
                                        ),
                                        border: InputBorder.none,
                                        isDense: true,
                                        contentPadding: EdgeInsets.zero,
                                      ),
                                      onSubmitted: (val) => _sendMessage(),
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: _toggleEmojiPicker,
                                    child: Icon(
                                      _showEmojiPicker
                                          ? Icons.keyboard_rounded
                                          : Icons.sentiment_satisfied_alt_rounded,
                                      color: isDark
                                          ? const Color(0xFF81C784)
                                          : const Color(0xFF77C033),
                                      size: 24,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(width: 8),

                        // 🚀 Send Button
                        GestureDetector(
                          onTap: _sendMessage,
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: const BoxDecoration(
                              color: Color(0xFF77C033),
                              shape: BoxShape.circle,
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.send_rounded,
                                color: Colors.white,
                                size: 19,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
            ),

            // 4. Interactive Emoji Picker Grid Sheet
            if (_showEmojiPicker) _buildEmojiPickerPanel(),
          ],
        ),
      ),
    );
  }

  // Interactive Emoji Picker Panel Widget
  Widget _buildEmojiPickerPanel() {
    final emojis = _emojiCategories[_selectedEmojiCategory];

    return Container(
      height: 240,
      color: const Color(0xFFF1F5F1),
      child: Column(
        children: [
          // Emoji Category Tabs
          Container(
            height: 38,
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _buildCategoryTab(0, '🍲 Thức ăn & Tủ lạnh'),
                const SizedBox(width: 16),
                _buildCategoryTab(1, '😊 Biểu cảm & Cảm xúc'),
              ],
            ),
          ),
          const Divider(height: 1, color: Colors.black12),

          // Emoji Grid View
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(12),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 7,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
              ),
              itemCount: emojis.length,
              itemBuilder: (context, index) {
                final emoji = emojis[index];
                return GestureDetector(
                  onTap: () => _insertEmoji(emoji),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        emoji,
                        style: const TextStyle(fontSize: 22),
                      ),
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

  Widget _buildCategoryTab(int index, String title) {
    final isSelected = _selectedEmojiCategory == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedEmojiCategory = index;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isSelected ? const Color(0xFF77C033) : Colors.transparent,
              width: 2.5,
            ),
          ),
        ),
        child: Text(
          title,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 12.5,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
            color: isSelected ? const Color(0xFF77C033) : Colors.grey[600],
          ),
        ),
      ),
    );
  }

  Widget _buildRecordingBar() {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: const BoxDecoration(
            color: Color(0xFFE53935),
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          'Đang ghi âm... 00:${_recordSeconds.toString().padLeft(2, '0')}',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: const Color(0xFFE53935),
          ),
        ),
        const Spacer(),
        TextButton(
          onPressed: () {
            _recordTimer?.cancel();
            setState(() {
              _isRecording = false;
              _recordSeconds = 0;
            });
          },
          child: Text(
            'Hủy',
            style: GoogleFonts.plusJakartaSans(
              color: Colors.grey[600],
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        ElevatedButton.icon(
          onPressed: _toggleRecording,
          icon: const Icon(Icons.send_rounded, size: 16, color: Colors.white),
          label: Text(
            'Gửi',
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF4CAF50),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMessageBubble(SingleChatMessageModel msg) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (msg.isMe) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.end,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const SizedBox(width: 40),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if (msg.localImageFile != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6.0),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.file(
                          msg.localImageFile!,
                          width: 200,
                          height: 150,
                          fit: BoxFit.cover,
                        ),
                      ),
                    )
                  else if (msg.imagePath != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6.0),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.asset(
                          msg.imagePath!,
                          width: 200,
                          height: 150,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [
                          Color(0xFF77C033),
                          Color(0xFF5CA320),
                        ],
                      ),
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(18),
                        topRight: Radius.circular(18),
                        bottomLeft: Radius.circular(18),
                        bottomRight: Radius.circular(4),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF77C033).withValues(alpha: 0.20),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: (msg.isVoice == true)
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.play_arrow_rounded,
                                color: Colors.white,
                                size: 22,
                              ),
                              const SizedBox(width: 6),
                              Container(
                                width: 80,
                                height: 4,
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.8),
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                msg.voiceDuration ?? '00:05',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          )
                        : Text(
                            msg.text,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: Colors.white,
                            ),
                          ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    msg.time,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 10.5,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    } else {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.asset(
                msg.senderAvatar,
                width: 32,
                height: 32,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  width: 32,
                  height: 32,
                  color: const Color(0xFFE8F5E9),
                  child: const Icon(
                    Icons.person_rounded,
                    color: Color(0xFF4CAF50),
                    size: 18,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    msg.senderName,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF6B786F),
                    ),
                  ),
                  const SizedBox(height: 3),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF19271E) : Colors.white,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(4),
                        topRight: Radius.circular(18),
                        bottomLeft: Radius.circular(18),
                        bottomRight: Radius.circular(18),
                      ),
                      border: Border.all(
                        color: isDark
                            ? const Color(0xFF2E4D36)
                            : Colors.grey.withValues(alpha: 0.2),
                        width: 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Text(
                      msg.text,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: isDark ? Colors.white : const Color(0xFF19221C),
                      ),
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    msg.time,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 10.5,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }
  }
}
