/**
 * `chat-session-title.util` — unit test cho `buildSessionTitle`.
 *
 * ⚠️ VÌ SAO CẦN TEST:
 *   `buildSessionTitle` quyết định TÊN hiển thị của phiên chat trong danh
 *   sách LỊCH SỬ TRÒ CHUYỆN. Nếu cắt sai (dính chữ, quá dài, sai khoảng
 *   trắng) thì danh sách lịch sử hiển thị rác -> user không phân biệt được
 *   các cuộc trò chuyện.
 *
 * Quy tắc:
 *   - Chuẩn hoá khoảng trắng (nhiều space / newline -> 1 space).
 *   - Cắt ở ranh giới TỪ (không dính chữ, không cắt giữa từ).
 *   - Tối đa 80 ký tự (khớp `AI_CHAT_TITLE_MAX_LENGTH`).
 *   - Chuỗi rỗng -> trả '' (không set title).
 */

import {
  buildSessionTitle,
  AI_CHAT_TITLE_MAX_LENGTH,
} from './chat-session-title.util';

describe('buildSessionTitle', () => {
  it('trả về nguyên văn nếu ngắn và đã sạch khoảng trắng', () => {
    expect(buildSessionTitle('Tôi có thể nấu gì hôm nay?')).toBe(
      'Tôi có thể nấu gì hôm nay?',
    );
  });

  it('chuẩn hoá nhiều khoảng trắng / newline về 1 space', () => {
    expect(buildSessionTitle('  Tôi   có\n\nthể  nấu  gì?  ')).toBe(
      'Tôi có thể nấu gì?',
    );
  });

  it('trả chuỗi rỗng khi content rỗng hoặc chỉ khoảng trắng', () => {
    expect(buildSessionTitle('')).toBe('');
    expect(buildSessionTitle('   \n\t  ')).toBe('');
  });

  it('cắt ở ranh giới từ khi vượt giới hạn (không dính chữ)', () => {
    const long = 'a'.repeat(50) + ' ' + 'b'.repeat(50);
    const title = buildSessionTitle(long);

    expect(title.length).toBeLessThanOrEqual(AI_CHAT_TITLE_MAX_LENGTH);
    // Không được dính "aaabbb" -> phải cắt ở khoảng trắng.
    expect(title.endsWith('a')).toBe(true);
    expect(title).not.toContain('b');
  });

  it('không cắt nếu chuỗi vừa đúng giới hạn', () => {
    const exact = 'x'.repeat(AI_CHAT_TITLE_MAX_LENGTH);
    expect(buildSessionTitle(exact)).toBe(exact);
  });

  it('cắt thẳng khi không có khoảng trắng nào (một từ rất dài)', () => {
    const oneWord = 'y'.repeat(200);
    const title = buildSessionTitle(oneWord);

    expect(title.length).toBe(AI_CHAT_TITLE_MAX_LENGTH);
  });

  it('giữ nguyên ký tự tiếng Việt có dấu', () => {
    expect(buildSessionTitle('Cách bảo quản rau củ đúng cách?')).toBe(
      'Cách bảo quản rau củ đúng cách?',
    );
  });
});
