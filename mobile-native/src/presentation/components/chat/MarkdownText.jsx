/**
 * MarkdownText
 *
 * Render markdown nhẹ cho chat AI (React Native).
 *
 * ── VÌ SAO KHÔNG DÙNG THƯ VIỆN ────────────────────────────────────────────
 *   Repo không cài `react-native-markdown-display` / `markdown-it` / `marked`.
 *   Ta tự viết parser nhẹ (`utils/markdownText.js`) + render bằng `<Text>`
 *   lồng nhau — RN hỗ trợ `<Text>` nested với style khác nhau, không cần
 *   WebView, không tăng bundle size.
 *
 * ── CÁCH HOẠT ĐỘNG ────────────────────────────────────────────────────────
 *   `parseMarkdown(text)` -> mảng block:
 *     - `paragraph` : đoạn văn (có thể chứa **bold**, *italic*, `code`)
 *     - `title`     : dòng `**Tiêu đề**` đứng riêng -> hiện như tiêu đề
 *     - `heading`   : `# / ## / ###`
 *     - `list`      : `- ` / `1. ` (có bullet, thụt lề theo indent)
 *     - `code`      : ``` fenced code ```
 *
 *   Mỗi block -> 1 `<Text>` riêng (để có margin giữa các đoạn).
 *   Mỗi inline token -> 1 `<Text>` con với style tương ứng.
 *
 * ── FONT ──────────────────────────────────────────────────────────────────
 *   Dùng `fontFamily` (biến thể file) thay vì `fontWeight` / `fontStyle`:
 *   - `fontWeight` trên custom font đôi khi không áp dụng trên Android.
 *   - `fontStyle: 'italic'` trên font đã là italic sẽ bị "nghiêng 2 lần".
 *   => Dùng đúng file font: `PlusJakartaSans_700Bold`, `..._Italic`...
 *   Các biến thể italic đã được load ở `App.jsx`.
 */

import React, { useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { parseMarkdown } from '../../utils/markdownText';
import { FontFamily, FontSizes } from '../../theme/typography';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';

const CODE_FAMILY = 'monospace';

/**
 * Font family cho từng kiểu inline.
 * ⚠️ `italic` dùng bản `_Italic` của PlusJakartaSans (đã load ở App.jsx).
 */
const fontFor = (bold, italic) => {
  if (bold && italic) return FontFamily.boldItalic;
  if (bold) return FontFamily.bold;
  if (italic) return FontFamily.italic;
  return FontFamily.regular;
};

/**
 * @param {object} props
 * @param {string} props.text        — text thô (đã qua BE/AI)
 * @param {string} props.color       — màu chữ gốc
 * @param {number} [props.fontSize]  — cỡ chữ gốc
 * @param {boolean} [props.isDark]
 * @param {boolean} [props.streaming] — đang stream -> ẩn marker chưa đóng
 * @param {string} [props.cursor]     — ký tự con trỏ nhấp nháy (streaming)
 */
export const MarkdownText = ({
  text,
  color,
  fontSize = sp(14),
  isDark = false,
  streaming = false,
  cursor,
}) => {
  const blocks = useMemo(
    () => parseMarkdown(text, { hideUnclosed: streaming }),
    [text, streaming]
  );

  /**
   * Render 1 mảng inline token thành các `<Text>` con.
   *
   * @param {InlineToken[]} tokens
   * @param {string} keyPrefix
   * @param {number} size — cỡ chữ của block chứa token
   */
  const renderTokens = (tokens, keyPrefix, size, baseFont) =>
    (tokens ?? []).map((token, idx) => {
      if (token.code) {
        return (
          <Text
            key={`${keyPrefix}-${idx}`}
            style={[
              styles.code,
              {
                color: isDark ? AppColors.primaryLight : AppColors.forestAccent,
                backgroundColor: isDark ? '#0E1611' : AppColors.inputBackground,
              },
            ]}
          >
            {token.text}
          </Text>
        );
      }

      const isBold = !!token.bold;
      const isItalic = !!token.italic;

      return (
        <Text
          key={`${keyPrefix}-${idx}`}
          style={{
            color,
            fontSize: size,
            // `baseFont` = font của block chứa token (heading/title -> bold).
            // Token không có bold/italic thì kế thừa font của block.
            fontFamily:
              isBold || isItalic ? fontFor(isBold, isItalic) : baseFont,
          }}
        >
          {token.text}
        </Text>
      );
    });

  if (!blocks.length) {
    // Chưa có nội dung -> chỉ hiện con trỏ (nếu đang stream).
    return streaming && cursor ? <Text style={styles.cursor}>{cursor}</Text> : null;
  }

  return (
    <View>
      {blocks.map((block, bi) => {
        const key = `block-${bi}`;
        const isLast = bi === blocks.length - 1;

        // ── Code block ────────────────────────────────────────────────────
        if (block.type === 'code') {
          return (
            <View
              key={key}
              style={[
                styles.codeBlock,
                {
                  backgroundColor: isDark ? '#0E1611' : AppColors.inputBackground,
                  borderColor: isDark ? AppColors.darkCardBorder : AppColors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.codeBlockText,
                  {
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    fontSize: sp(12),
                  },
                ]}
              >
                {block.code}
              </Text>
            </View>
          );
        }

        // ── List ─────────────────────────────────────────────────────────
        if (block.type === 'list') {
          return (
            <View key={key} style={styles.listBlock}>
              {(block.items ?? []).map((item, ii) => (
                <View
                  key={`${key}-item-${ii}`}
                  style={[styles.listRow, { paddingLeft: sp(item.indent * 0.6) }]}
                >
                  <Text
                    style={[
                      styles.listMarker,
                      {
                        color: isDark ? AppColors.primaryLight : AppColors.forestAccent,
                        fontSize,
                      },
                    ]}
                  >
                    {item.marker}
                  </Text>
                  <Text style={[styles.listText, { color, fontSize }]}>
                    {renderTokens(
                      item.tokens,
                      `${key}-${ii}`,
                      fontSize,
                      FontFamily.regular
                    )}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        // ── Heading ──────────────────────────────────────────────────────
        if (block.type === 'heading') {
          const headingSize =
            block.level === 1
              ? FontSizes.titleSmall
              : block.level === 2
                ? FontSizes.bodyMedium
                : FontSizes.body;
          return (
            <Text
              key={key}
              style={[
                styles.heading,
                {
                  color,
                  fontSize: headingSize,
                  fontFamily: FontFamily.bold,
                },
              ]}
            >
              {renderTokens(block.tokens, key, headingSize, FontFamily.bold)}
            </Text>
          );
        }

        // ── Title (dòng **Tiêu đề** đứng một mình) ──────────────────────
        if (block.type === 'title') {
          const titleSize = FontSizes.bodyMedium;
          return (
            <Text
              key={key}
              style={[
                styles.title,
                {
                  color,
                  fontSize: titleSize,
                  fontFamily: FontFamily.bold,
                },
              ]}
            >
              {renderTokens(block.tokens, key, titleSize, FontFamily.bold)}
            </Text>
          );
        }

        // ── Paragraph ────────────────────────────────────────────────────
        return (
          <Text key={key} style={[styles.paragraph, { color, fontSize }]}>
            {renderTokens(block.tokens, key, fontSize, FontFamily.regular)}
            {/* Con trỏ streaming nằm trong đoạn cuối để không nhảy dòng. */}
            {isLast && streaming && cursor ? (
              <Text style={styles.cursor}>{cursor}</Text>
            ) : null}
          </Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  paragraph: {
    fontFamily: FontFamily.regular,
    lineHeight: sp(20),
    marginBottom: sp(6),
  },
  title: {
    lineHeight: sp(22),
    marginTop: sp(2),
    marginBottom: sp(6),
  },
  heading: {
    lineHeight: sp(22),
    marginTop: sp(6),
    marginBottom: sp(4),
  },
  listBlock: {
    marginBottom: sp(6),
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: sp(3),
  },
  listMarker: {
    fontFamily: FontFamily.semibold,
    width: sp(18),
    lineHeight: sp(20),
  },
  listText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    lineHeight: sp(20),
  },
  code: {
    fontFamily: CODE_FAMILY,
    fontSize: sp(12.5),
    paddingHorizontal: sp(4),
    borderRadius: sp(4),
  },
  codeBlock: {
    borderRadius: sp(8),
    borderWidth: 1,
    padding: sp(10),
    marginBottom: sp(6),
  },
  codeBlockText: {
    fontFamily: CODE_FAMILY,
    lineHeight: sp(17),
  },
  cursor: {
    fontFamily: FontFamily.regular,
    color: AppColors.primary,
  },
});
