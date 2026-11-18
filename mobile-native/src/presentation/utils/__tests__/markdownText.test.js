/**
 * Test cho `markdownText` — parser markdown nhẹ dùng cho chat AI.
 *
 * MỤC ĐÍCH:
 *   AI trả lời bằng markdown (`**Tiêu đề**`, `*nghiêng*`, `## Heading`,
 *   `- list`...). Trước khi có `MarkdownText`, RN render text thuần nên user
 *   thấy nguyên ký tự `**`. Bộ test này chốt lại hành vi của parser:
 *   - parse inline đúng (bold / italic / code)
 *   - parse block đúng (heading / list / title / code fence)
 *   - flanking rules: không bị "nuốt" nhầm phép tính `2 * 3 * 4`
 *   - streaming: marker chưa đóng phải được ẩn (không nhấp nháy ký tự thô)
 */

import {
  parseInline,
  parseMarkdown,
  stripUnclosedMarkers,
} from '../markdownText';

/** Gom text của token -> chuỗi thô (để assert nội dung). */
const plain = (tokens) => tokens.map((t) => t.text).join('');

/** Token bold đầu tiên (nếu có). */
const firstBold = (tokens) => tokens.find((t) => t.bold);
const firstItalic = (tokens) => tokens.find((t) => t.italic);
const firstCode = (tokens) => tokens.find((t) => t.code);

describe('markdownText: parseInline — bold', () => {
  it('parse **bold** thành token bold', () => {
    const tokens = parseInline('**Tiêu đề**');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].bold).toBe(true);
    expect(tokens[0].italic).toBe(false);
    expect(tokens[0].text).toBe('Tiêu đề');
  });

  it('parse bold giữa câu', () => {
    const tokens = parseInline('Xin chào **Friggy**, hôm nay ăn gì?');
    expect(plain(tokens)).toBe('Xin chào Friggy, hôm nay ăn gì?');
    expect(firstBold(tokens).text).toBe('Friggy');
  });

  it('parse ***bold italic*** thành cả bold lẫn italic', () => {
    const tokens = parseInline('***vừa đậm vừa nghiêng***');
    expect(tokens[0].bold).toBe(true);
    expect(tokens[0].italic).toBe(true);
    expect(tokens[0].text).toBe('vừa đậm vừa nghiêng');
  });

  it('giữ nguyên ** khi không có marker đóng', () => {
    const tokens = parseInline('**chưa đóng');
    expect(plain(tokens)).toBe('**chưa đóng');
  });
});

describe('markdownText: parseInline — italic', () => {
  it('parse *italic*', () => {
    const tokens = parseInline('*nghiêng*');
    expect(tokens[0].italic).toBe(true);
    expect(tokens[0].bold).toBe(false);
    expect(tokens[0].text).toBe('nghiêng');
  });

  it('parse _italic_', () => {
    const tokens = parseInline('_nghiêng_');
    expect(tokens[0].italic).toBe(true);
    expect(tokens[0].text).toBe('nghiêng');
  });

  it('KHÔNG parse intraword underscore (snake_case_name)', () => {
    const tokens = parseInline('biến user_name_var thành đậm');
    expect(plain(tokens)).toBe('biến user_name_var thành đậm');
    expect(tokens.some((t) => t.italic)).toBe(false);
  });

  it('KHÔNG parse phép tính 2 * 3 * 4', () => {
    const tokens = parseInline('2 * 3 * 4 = 24');
    expect(plain(tokens)).toBe('2 * 3 * 4 = 24');
    expect(tokens.some((t) => t.italic)).toBe(false);
  });

  it('KHÔNG parse 5*10*50 thành italic', () => {
    const tokens = parseInline('5*10*50');
    expect(plain(tokens)).toBe('5*10*50');
    expect(tokens.some((t) => t.italic)).toBe(false);
  });

  it('KHÔNG parse marker đứng sau khoảng trắng', () => {
    const tokens = parseInline('a * b');
    expect(plain(tokens)).toBe('a * b');
  });
});

describe('markdownText: parseInline — code', () => {
  it('parse `code` inline', () => {
    const tokens = parseInline('dùng `npm install` nhé');
    expect(plain(tokens)).toBe('dùng npm install nhé');
    expect(firstCode(tokens).text).toBe('npm install');
  });

  it('giữ nguyên backtick khi không đóng', () => {
    const tokens = parseInline('`chưa đóng');
    expect(plain(tokens)).toBe('`chưa đóng');
  });
});

describe('markdownText: parseInline — escape', () => {
  it('escape \\* thành *', () => {
    const tokens = parseInline('2 \\* 3');
    expect(plain(tokens)).toBe('2 * 3');
    expect(tokens.some((t) => t.bold || t.italic)).toBe(false);
  });

  it('escape \\` thành `', () => {
    const tokens = parseInline('a \\` b');
    expect(plain(tokens)).toBe('a ` b');
  });
});

describe('markdownText: parseMarkdown — block types', () => {
  it('parse heading # / ## / ###', () => {
    const blocks = parseMarkdown('## Món gợi ý');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('heading');
    expect(blocks[0].level).toBe(2);
    expect(plain(blocks[0].tokens)).toBe('Món gợi ý');
  });

  it('parse dòng **Tiêu đề** đứng riêng thành block title', () => {
    const blocks = parseMarkdown('**Thực đơn hôm nay**');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('title');
    expect(plain(blocks[0].tokens)).toBe('Thực đơn hôm nay');
  });

  it('parse list không thứ tự (- item)', () => {
    const blocks = parseMarkdown('- Món một\n- Món hai');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('list');
    expect(blocks[0].items).toHaveLength(2);
    expect(plain(blocks[0].items[0].tokens)).toBe('Món một');
    expect(plain(blocks[0].items[1].tokens)).toBe('Món hai');
    expect(blocks[0].items[0].marker).toBe('•');
  });

  it('parse list có thứ tự (1. item) với marker đúng', () => {
    const blocks = parseMarkdown('1. Rau\n2. Cải');
    expect(blocks[0].type).toBe('list');
    expect(blocks[0].items[0].marker).toBe('1.');
    expect(blocks[0].items[1].marker).toBe('2.');
  });

  it('parse list thụt lề lồng nhau', () => {
    const blocks = parseMarkdown('- Cấp 1\n  - Cấp 2');
    expect(blocks[0].items).toHaveLength(2);
    expect(blocks[0].items[0].indent).toBe(0);
    expect(blocks[0].items[1].indent).toBe(2);
  });

  it('parse fenced code block', () => {
    const blocks = parseMarkdown('```js\nconst a = 1;\n```');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('code');
    expect(blocks[0].code).toBe('const a = 1;');
  });

  it('parse paragraph có bold lẫn italic', () => {
    const blocks = parseMarkdown('Dùng **cà chua** và *cà rốt* nhé');
    expect(blocks[0].type).toBe('paragraph');
    expect(plain(blocks[0].tokens)).toBe('Dùng cà chua và cà rốt nhé');
    expect(firstBold(blocks[0].tokens).text).toBe('cà chua');
    expect(firstItalic(blocks[0].tokens).text).toBe('cà rốt');
  });

  it('parse nhiều block liên tiếp theo thứ tự', () => {
    const blocks = parseMarkdown(
      '**Tiêu đề**\n\nĐoạn văn.\n\n- A\n- B'
    );
    expect(blocks.map((b) => b.type)).toEqual(['title', 'paragraph', 'list']);
  });

  it('text rỗng -> không có block', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('   ')).toEqual([]);
    expect(parseMarkdown(null)).toEqual([]);
  });
});

describe('markdownText: streaming — marker chưa đóng', () => {
  it('hideUnclosed=true -> ẩn marker ** đang mở', () => {
    const tokens = parseInline('**Tiêu đ', { hideUnclosed: true });
    expect(plain(tokens)).toBe('Tiêu đ');
    expect(tokens.some((t) => t.bold)).toBe(false);
  });

  it('hideUnclosed=true -> marker đã đóng vẫn bold', () => {
    const tokens = parseInline('**Tiêu đề**', { hideUnclosed: true });
    expect(tokens[0].bold).toBe(true);
    expect(tokens[0].text).toBe('Tiêu đề');
  });

  it('hideUnclosed=true -> ẩn backtick đang mở', () => {
    const tokens = parseInline('`npm', { hideUnclosed: true });
    expect(plain(tokens)).toBe('npm');
  });

  it('parseMarkdown với hideUnclosed -> title chưa đóng thành paragraph', () => {
    const blocks = parseMarkdown('**Tiêu đ', { hideUnclosed: true });
    expect(blocks[0].type).toBe('paragraph');
    expect(plain(blocks[0].tokens)).toBe('Tiêu đ');
  });
});

describe('markdownText: stripUnclosedMarkers', () => {
  it('bỏ marker ** đang mở', () => {
    expect(stripUnclosedMarkers('**Tiêu đề')).toBe('Tiêu đề');
  });

  it('giữ nguyên cặp marker đã đóng', () => {
    expect(stripUnclosedMarkers('**Tiêu đề**')).toBe('**Tiêu đề**');
  });

  it('bỏ marker đang mở giữa câu', () => {
    expect(stripUnclosedMarkers('Xin chào **Friggy, hôm nay')).toBe(
      'Xin chào Friggy, hôm nay'
    );
  });

  it('input không hợp lệ -> chuỗi rỗng', () => {
    expect(stripUnclosedMarkers(null)).toBe('');
    expect(stripUnclosedMarkers(undefined)).toBe('');
  });
});
