/**
 * markdownText
 *
 * Parse markdown NHẸ cho chat AI (React Native) — KHÔNG dùng thư viện ngoài.
 *
 * ── VÌ SAO CẦN ────────────────────────────────────────────────────────────
 * AI (LLM) trả lời theo kiểu markdown: `**tiêu đề**`, `*nghiêng*`, `` `code` ``,
 * `## Heading`, `- gạch đầu dòng`... Nhưng RN render message bằng `<Text>`
 * thuần -> user thấy nguyên ký tự `**` (bug "hiện luôn cả ***").
 *
 * Repo này CỐ TÌNH không cài markdown lib nào (không có `react-native-markdown-display`,
 * `markdown-it`, `marked`...). Theo convention sẵn có (`aiDishSuggestions.js`,
 * `mealPlanWeek.js`...), ta tự viết pure function + test riêng.
 *
 * ── PHẠM VI HỖ TRỢ ───────────────────────────────────────────────────────
 *   Inline : `**bold**`, `*italic*`, `***bold+italic***`, `` `code` ``, `_italic_`
 *   Block  : `# / ## / ###` heading, `- / * / 1.` list, ``` fenced code ```,
 *            đoạn văn, và dòng `**Tiêu đề**` đứng một mình -> block "title".
 *
 * ── "FLANKING RULE" (đơn giản hoá từ CommonMark) ─────────────────────────
 *   - "2 * 3 * 4"      -> `*` không mở vì đứng sau khoảng trắng.
 *   - "5*10*50"        -> `*` không đóng vì đứng trước chữ -> giữ nguyên text.
 *   - "user_name_var"  -> `_` không mở/đóng giữa chữ.
 *   - "**bold**text"   -> `**` ĐƯỢC đóng intraword (đúng như user mong đợi).
 */

/**
 * @typedef {Object} InlineToken
 * @property {string} text
 * @property {boolean} bold
 * @property {boolean} italic
 * @property {boolean} code
 */

/**
 * @typedef {Object} MarkdownBlock
 * @property {'paragraph'|'title'|'heading'|'list'|'code'} type
 * @property {InlineToken[]} [tokens]  — paragraph / title / heading
 * @property {number} [level]           — heading: 1..6
 * @property {Array<{marker:string, ordered:boolean, indent:number, tokens:InlineToken[]}>} [items] — list
 * @property {string} [code]            — fenced code: nội dung raw
 */

// `forbidOpenAfterWord`  : marker KHÔNG được mở khi đứng ngay sau chữ/số/gạch dưới.
// `forbidCloseBeforeWord`: marker KHÔNG được đóng khi đứng ngay trước chữ/số/gạch dưới.
const INLINE_MARKERS = [
  { open: '***', bold: true, italic: true, len: 3 },
  { open: '**', bold: true, italic: false, len: 2 },
  { open: '*', bold: false, italic: true, len: 1, forbidCloseBeforeWord: true },
  {
    open: '_',
    bold: false,
    italic: true,
    len: 1,
    forbidOpenAfterWord: true,
    forbidCloseBeforeWord: true,
  },
  { open: '`', bold: false, italic: false, code: true, len: 1 },
];

const isSpace = (ch) => typeof ch === 'string' && /\s/.test(ch);
const isWordChar = (ch) => typeof ch === 'string' && /[A-Za-z0-9_]/.test(ch);

/**
 * Marker có thể MỞ ở vị trí `i` không?
 *
 * @param {string} src
 * @param {number} i
 * @param {{open:string, len:number, forbidOpenAfterWord?:boolean}} marker
 * @returns {boolean}
 */
const canOpenMarker = (src, i, marker) => {
  const prev = i > 0 ? src[i - 1] : '';
  const next = src[i + marker.len];

  // Phải có ký tự sau marker, và ký tự sau không phải khoảng trắng.
  // -> "2 * 3" : `*` sau khoảng trắng -> KHÔNG mở.
  if (next === undefined || isSpace(next)) return false;

  // Marker không được mở intraword ("user_name_var").
  if (marker.forbidOpenAfterWord && isWordChar(prev)) return false;

  return true;
};

/**
 * Tìm marker ĐÓNG tương ứng, bắt đầu từ `from`.
 *
 * @param {string} src
 * @param {number} from
 * @param {{open:string, len:number, forbidCloseBeforeWord?:boolean}} marker
 * @returns {number} index của marker đóng, hoặc -1 nếu không có
 */
const findClosingMarker = (src, from, marker) => {
  const len = marker.len;
  let idx = src.indexOf(marker.open, from);

  while (idx !== -1) {
    const before = idx > 0 ? src[idx - 1] : '';
    const after = idx + len < src.length ? src[idx + len] : '';

    // Marker đóng không được đứng ngay sau khoảng trắng.
    if (!isSpace(before)) {
      // Marker đóng không được đứng ngay trước chữ
      // -> tránh "5*10*50" bị hiểu thành "5<italic>10</italic>50".
      const ok = !marker.forbidCloseBeforeWord || !isWordChar(after);
      if (ok) return idx;
    }

    idx = src.indexOf(marker.open, idx + len);
  }

  return -1;
};

/**
 * Parse text (1 hoặc nhiều dòng) thành các token inline.
 *
 * ⚠️ Marker CHƯA đóng:
 *    - `hideUnclosed = false` (mặc định): giữ nguyên như text thường.
 *    - `hideUnclosed = true` (dùng khi STREAMING): bỏ hẳn marker đang mở
 *      để user không thấy ký tự thô `**` nhấp nháy. Khi chunk sau về đủ
 *      marker, cả đoạn sẽ tự lên đậm.
 *
 * @param {string} text
 * @param {{hideUnclosed?:boolean}} [options]
 * @returns {InlineToken[]}
 */
export const parseInline = (text, options = {}) => {
  const { hideUnclosed = false } = options;
  const src = typeof text === 'string' ? text : '';
  /** @type {InlineToken[]} */
  const tokens = [];

  let buffer = '';
  let i = 0;

  const flush = () => {
    if (!buffer) return;
    tokens.push({ text: buffer, bold: false, italic: false, code: false });
    buffer = '';
  };

  while (i < src.length) {
    const ch = src[i];

    // Escape: \* -> *
    if (ch === '\\' && i + 1 < src.length) {
      buffer += src[i + 1];
      i += 2;
      continue;
    }

    const marker = INLINE_MARKERS.find((m) => src.startsWith(m.open, i));

    if (!marker) {
      buffer += ch;
      i += 1;
      continue;
    }

    if (!canOpenMarker(src, i, marker)) {
      buffer += marker.open;
      i += marker.len;
      continue;
    }

    const closeIdx = findClosingMarker(src, i + marker.len, marker);

    if (closeIdx === -1) {
      // Chưa đóng.
      if (!hideUnclosed) buffer += marker.open;
      i += marker.len;
      continue;
    }

    const inner = src.slice(i + marker.len, closeIdx);

    if (!inner) {
      if (!hideUnclosed) buffer += marker.open;
      i += marker.len;
      continue;
    }

    flush();
    tokens.push({
      text: inner,
      bold: !!marker.bold,
      italic: !!marker.italic,
      code: !!marker.code,
    });
    i = closeIdx + marker.len;
  }

  flush();
  return tokens;
};

/**
 * Dòng có phải list item không?
 * `- ` / `* ` / `+ ` / `1. ` / `1) `
 */
const LIST_RE = /^(\s*)(?:([-*+])|(\d+)[.)])\s+(.*)$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const FENCE_RE = /^\s*```/;
/** Dòng chỉ gồm `**Tiêu đề**` -> coi như block title. */
const TITLE_RE = /^\*\*([^*]+)\*\*$/;

/**
 * Parse markdown thành các block để UI render.
 *
 * @param {string} text
 * @param {{hideUnclosed?:boolean}} [options]
 * @returns {MarkdownBlock[]}
 */
export const parseMarkdown = (text, options = {}) => {
  const { hideUnclosed = false } = options;
  const src = typeof text === 'string' ? text : '';
  if (!src.trim()) return [];

  const lines = src.replace(/\r\n/g, '\n').split('\n');
  /** @type {MarkdownBlock[]} */
  const blocks = [];

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code ────────────────────────────────────────────────────────
    if (FENCE_RE.test(line)) {
      const buf = [];
      i += 1;
      while (i < lines.length && !FENCE_RE.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // bỏ dấu ``` đóng (nếu có)
      blocks.push({ type: 'code', code: buf.join('\n') });
      continue;
    }

    // ── Heading ────────────────────────────────────────────────────────────
    const heading = line.match(HEADING_RE);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        tokens: parseInline(heading[2], { hideUnclosed }),
      });
      i += 1;
      continue;
    }

    // ── List ───────────────────────────────────────────────────────────────
    if (LIST_RE.test(line)) {
      /** @type {Array<{marker:string, ordered:boolean, indent:number, tokens:InlineToken[]}>} */
      const items = [];

      while (i < lines.length) {
        const m = lines[i].match(LIST_RE);
        if (!m) break;

        const indent = m[1].replace(/\t/g, '  ').length;
        const ordered = !!m[3];

        // ⚠️ Mỗi dòng list = 1 item riêng (KHÔNG gộp các dòng cùng cấp vào
        //   1 item — nếu gộp thì "Món một\nMón hai" sẽ thành 1 bullet dài).
        items.push({
          marker: ordered ? `${m[3]}.` : '•',
          ordered,
          indent,
          tokens: parseInline(m[4], { hideUnclosed }),
        });
        i += 1;
      }

      blocks.push({ type: 'list', items });
      continue;
    }

    // ── Paragraph (gom các dòng liên tiếp cho tới khi gặp blank/dòng đặc biệt)
    const buf = [];
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) break;
      if (HEADING_RE.test(l) || FENCE_RE.test(l) || LIST_RE.test(l)) break;
      buf.push(l);
      i += 1;
    }

    if (!buf.length) {
      // Dòng trống -> bỏ qua.
      i += 1;
      continue;
    }

    const joined = buf.join('\n');
    const title = buf.length === 1 ? joined.match(TITLE_RE) : null;

    if (title) {
      blocks.push({
        type: 'title',
        tokens: [{ text: title[1], bold: true, italic: false, code: false }],
      });
    } else {
      blocks.push({
        type: 'paragraph',
        tokens: parseInline(joined, { hideUnclosed }),
      });
    }
  }

  return blocks;
};

/**
 * Bỏ các marker markdown đang MỞ nhưng chưa đóng (dùng khi streaming).
 *
 * Ví dụ chunk hiện tại là "**Tiêu đ" -> bỏ `**` để user không thấy ký tự
 * thô nhấp nháy; chunk sau tới "ề**" -> cả đoạn sẽ lên đậm.
 *
 * @param {string} text
 * @returns {string}
 */
export const stripUnclosedMarkers = (text) => {
  if (typeof text !== 'string') return '';

  let out = '';
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (ch === '\\' && i + 1 < text.length) {
      out += text[i + 1];
      i += 2;
      continue;
    }

    const marker = INLINE_MARKERS.find((m) => text.startsWith(m.open, i));

    if (!marker) {
      out += ch;
      i += 1;
      continue;
    }

    if (!canOpenMarker(text, i, marker)) {
      out += marker.open;
      i += marker.len;
      continue;
    }

    const closeIdx = findClosingMarker(text, i + marker.len, marker);

    if (closeIdx === -1) {
      // Marker đang mở -> bỏ hẳn.
      i += marker.len;
      continue;
    }

    out += text.slice(i, closeIdx + marker.len);
    i = closeIdx + marker.len;
  }

  return out;
};
