import 'package:flutter/material.dart';
import '../data/models/ingredient_model.dart';

class IngredientAvatarWidget extends StatelessWidget {
  final IngredientModel item;
  final double size;

  const IngredientAvatarWidget({
    super.key,
    required this.item,
    this.size = 52,
  });

  bool _hasWord(String text, String word) {
    return RegExp(r'\b' + RegExp.escape(word) + r'\b', caseSensitive: false).hasMatch(text);
  }

  @override
  Widget build(BuildContext context) {
    final lower = item.name.toLowerCase();
    final catLower = item.category.toLowerCase();

    final path = item.imagePath.trim();
    final bool hasImage = path.isNotEmpty &&
        path != 'assets/images/available_veggies.png' &&
        path != 'null';

    if (hasImage) {
      Widget imageWidget;
      if (path.startsWith('http://') || path.startsWith('https://')) {
        imageWidget = Image.network(
          path,
          fit: BoxFit.cover,
          width: size,
          height: size,
          errorBuilder: (context, error, stackTrace) => _buildFallbackEmojiAvatar(lower, catLower),
        );
      } else if (path.startsWith('/')) {
        imageWidget = Image.network(
          'http://10.0.2.2:6969$path',
          fit: BoxFit.cover,
          width: size,
          height: size,
          errorBuilder: (context, error, stackTrace) => _buildFallbackEmojiAvatar(lower, catLower),
        );
      } else if (path.startsWith('assets/')) {
        imageWidget = Image.asset(
          path,
          fit: BoxFit.cover,
          width: size,
          height: size,
          errorBuilder: (context, error, stackTrace) => _buildFallbackEmojiAvatar(lower, catLower),
        );
      } else {
        imageWidget = Image.network(
          'http://10.0.2.2:6969/$path',
          fit: BoxFit.cover,
          width: size,
          height: size,
          errorBuilder: (context, error, stackTrace) => _buildFallbackEmojiAvatar(lower, catLower),
        );
      }

      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(size * 0.28),
          color: const Color(0xFFF0F7F1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(size * 0.28),
          child: imageWidget,
        ),
      );
    }

    return _buildFallbackEmojiAvatar(lower, catLower);
  }

  Widget _buildFallbackEmojiAvatar(String lower, String catLower) {
    // Default icon & gradient pastel theme
    String emoji = '🥗';
    List<Color> gradientColors = [const Color(0xFFE8F5E9), const Color(0xFFC8E6C9)];

    // 1. High priority specific ingredient keyword checks
    if (lower.contains('gà') || lower.contains('vịt') || lower.contains('chim')) {
      emoji = '🍗';
      gradientColors = [const Color(0xFFFFF3E0), const Color(0xFFFFCC80)];
    } else if (lower.contains('trứng')) {
      emoji = '🥚';
      gradientColors = [const Color(0xFFFFF8E1), const Color(0xFFFFE082)];
    } else if (lower.contains('tôm')) {
      emoji = '🦐';
      gradientColors = [const Color(0xFFFFF3E0), const Color(0xFFFFCC80)];
    } else if (lower.contains('mực') || lower.contains('bạch tuộc')) {
      emoji = '🦑';
      gradientColors = [const Color(0xFFE0F7FA), const Color(0xFF80DEEA)];
    } else if (lower.contains('cua') || lower.contains('ghẹ')) {
      emoji = '🦀';
      gradientColors = [const Color(0xFFFFEBEE), const Color(0xFFFF8A80)];
    } else if (_hasWord(lower, 'cá') || lower.contains('hồi') || lower.contains('basa') || lower.contains('lươn')) {
      emoji = '🐟';
      gradientColors = [const Color(0xFFE0F7FA), const Color(0xFFB2EBF2)];
    } else if (lower.contains('bò') || lower.contains('heo') || lower.contains('lợn') || lower.contains('thịt') || lower.contains('sườn') || lower.contains('ba chỉ') || lower.contains('chả')) {
      emoji = '🥩';
      gradientColors = [const Color(0xFFFFEBEE), const Color(0xFFFFCDD2)];
    } else if (lower.contains('đậu')) {
      emoji = '🧈';
      gradientColors = [const Color(0xFFFFFDE7), const Color(0xFFFFF59D)];
    } else if (lower.contains('nấm')) {
      emoji = '🍄';
      gradientColors = [const Color(0xFFEFEBE9), const Color(0xFFD7CCC8)];
    } else if (lower.contains('sữa') || lower.contains('phô mai') || lower.contains('bơ')) {
      emoji = '🥛';
      gradientColors = [const Color(0xFFE3F2FD), const Color(0xFFBBDEFB)];
    } else if (lower.contains('cà chua')) {
      emoji = '🍅';
      gradientColors = [const Color(0xFFFFEBEE), const Color(0xFFFFCDD2)];
    } else if (lower.contains('cà rốt')) {
      emoji = '🥕';
      gradientColors = [const Color(0xFFFFF3E0), const Color(0xFFFFE0B2)];
    } else if (lower.contains('khoai')) {
      emoji = '🥔';
      gradientColors = [const Color(0xFFFFF8E1), const Color(0xFFFFECB3)];
    } else if (lower.contains('bắp') || lower.contains('ngô')) {
      emoji = '🌽';
      gradientColors = [const Color(0xFFFFFDE7), const Color(0xFFFFF59D)];
    } else if (lower.contains('dưa leo') || lower.contains('dưa chuột')) {
      emoji = '🥒';
      gradientColors = [const Color(0xFFE8F5E9), const Color(0xFFA5D6A7)];
    } else if (lower.contains('hành') || lower.contains('tỏi') || lower.contains('sả') || lower.contains('gừng')) {
      emoji = '🧄';
      gradientColors = [const Color(0xFFF3E5F5), const Color(0xFFE1BEE7)];
    } else if (lower.contains('ớt')) {
      emoji = '🌶️';
      gradientColors = [const Color(0xFFFFEBEE), const Color(0xFFFFCDD2)];
    } else if (lower.contains('rau') || lower.contains('cải') || lower.contains('xà lách') || lower.contains('muống') || lower.contains('ngò')) {
      emoji = '🥦';
      gradientColors = [const Color(0xFFE8F5E9), const Color(0xFFA5D6A7)];
    } else if (lower.contains('táo') || lower.contains('cam') || lower.contains('chuối') || lower.contains('nho') || lower.contains('dưa hấu') || lower.contains('xoài')) {
      emoji = '🍎';
      gradientColors = [const Color(0xFFFFF3E0), const Color(0xFFFFE0B2)];
    } else if (lower.contains('gạo') || lower.contains('bún') || lower.contains('mì') || lower.contains('bột') || lower.contains('phở')) {
      emoji = '🌾';
      gradientColors = [const Color(0xFFFFFDE7), const Color(0xFFFFF9C4)];
    } else if (lower.contains('mắm') || lower.contains('dầu') || lower.contains('xì dầu') || lower.contains('tương') || lower.contains('dấm') || lower.contains('muối') || lower.contains('đường')) {
      emoji = '🥫';
      gradientColors = [const Color(0xFFFBE9E7), const Color(0xFFFFCCBC)];
    }
    // 2. Category Fallbacks for any new/unknown ingredients
    else if (catLower.contains('meat') || catLower.contains('thịt')) {
      emoji = '🥩';
      gradientColors = [const Color(0xFFFFEBEE), const Color(0xFFFFCDD2)];
    } else if (catLower.contains('seafood') || catLower.contains('hải sản')) {
      emoji = '🐟';
      gradientColors = [const Color(0xFFE0F7FA), const Color(0xFFB2EBF2)];
    } else if (catLower.contains('vegetable') || catLower.contains('rau')) {
      emoji = '🥦';
      gradientColors = [const Color(0xFFE8F5E9), const Color(0xFFA5D6A7)];
    } else if (catLower.contains('fruit') || catLower.contains('trái cây')) {
      emoji = '🍎';
      gradientColors = [const Color(0xFFFFF3E0), const Color(0xFFFFE0B2)];
    } else if (catLower.contains('dairy') || catLower.contains('sữa')) {
      emoji = '🥛';
      gradientColors = [const Color(0xFFE3F2FD), const Color(0xFFBBDEFB)];
    }

    // High quality distinct pastel icon avatar
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(size * 0.28),
        boxShadow: [
          BoxShadow(
            color: gradientColors[1].withValues(alpha: 0.35),
            blurRadius: 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Center(
        child: Text(
          emoji,
          style: TextStyle(fontSize: size * 0.46),
        ),
      ),
    );
  }
}
