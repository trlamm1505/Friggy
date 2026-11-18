/**
 * Test cho component `MarkdownText` — render markdown cho chat AI.
 *
 * MỤC ĐÍCH:
 *   Chốt lại contract hiển thị: AI trả `**bold**` / `*italic*` / `## heading`
 *   / `- list` thì UI phải áp style tương ứng và KHÔNG còn ký tự `**` thô.
 *
 * ⚠️ `@testing-library/react-native` v14 -> `render` là ASYNC.
 *   Bỏ `await` -> "getByText is not a function".
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import { MarkdownText } from '../MarkdownText';
import { FontSizes } from '../../../theme/typography';

const COLOR = '#19221C';

describe('MarkdownText — inline styles', () => {
  it('**bold** -> in đậm, không còn ký tự * trong text render', async () => {
    const { getByText } = await render(
      <MarkdownText text="**Tiêu đề**" color={COLOR} />
    );
    const node = getByText('Tiêu đề');
    expect(node).toBeTruthy();
    expect(node.props.style.fontFamily).toBe('PlusJakartaSans_700Bold');
  });

  it('*italic* -> in nghiêng', async () => {
    const { getByText } = await render(
      <MarkdownText text="*nghiêng*" color={COLOR} />
    );
    const node = getByText('nghiêng');
    expect(node.props.style.fontFamily).toBe('PlusJakartaSans_400Regular_Italic');
  });

  it('***bold italic*** -> font bold italic', async () => {
    const { getByText } = await render(
      <MarkdownText text="***cả hai***" color={COLOR} />
    );
    const node = getByText('cả hai');
    expect(node.props.style.fontFamily).toBe('PlusJakartaSans_700Bold_Italic');
  });

  it('`code` -> font monospace', async () => {
    const { getByText } = await render(
      <MarkdownText text="`npm i`" color={COLOR} />
    );
    const node = getByText('npm i');
    // `style` là array -> flatten để đọc fontFamily.
    const flat = StyleSheet.flatten(node.props.style);
    expect(flat.fontFamily).toBe('monospace');
  });

  it('text thường -> font regular', async () => {
    const { getByText } = await render(
      <MarkdownText text="chào bạn" color={COLOR} />
    );
    expect(getByText('chào bạn').props.style.fontFamily).toBe(
      'PlusJakartaSans_400Regular'
    );
  });
});

describe('MarkdownText — blocks', () => {
  it('render heading với font bold và cỡ chữ lớn hơn', async () => {
    const { getByText } = await render(
      <MarkdownText text="## Món gợi ý" color={COLOR} fontSize={14} />
    );
    const node = getByText('Món gợi ý');
    expect(node.props.style.fontFamily).toBe('PlusJakartaSans_700Bold');
    expect(node.props.style.fontSize).toBeGreaterThan(14);
  });

  it('render dòng **Tiêu đề** đứng riêng thành title (bold)', async () => {
    const { getByText } = await render(
      <MarkdownText text="**Thực đơn**" color={COLOR} fontSize={14} />
    );
    const node = getByText('Thực đơn');
    expect(node.props.style.fontFamily).toBe('PlusJakartaSans_700Bold');
    expect(node.props.style.fontSize).toBe(FontSizes.bodyMedium);
  });

  it('render list với bullet cho mỗi item', async () => {
    const { getByText, getAllByText } = await render(
      <MarkdownText text={'- Món một\n- Món hai'} color={COLOR} />
    );
    expect(getByText('Món một')).toBeTruthy();
    expect(getByText('Món hai')).toBeTruthy();
    expect(getAllByText('•')).toHaveLength(2);
  });

  it('render ordered list với marker "1."', async () => {
    const { getByText } = await render(
      <MarkdownText text={'1. Rau\n2. Cải'} color={COLOR} />
    );
    expect(getByText('1.')).toBeTruthy();
    expect(getByText('2.')).toBeTruthy();
  });

  it('render fenced code block trong View riêng', async () => {
    const { getByText } = await render(
      <MarkdownText text={'```js\nconst a = 1;\n```'} color={COLOR} />
    );
    expect(getByText('const a = 1;')).toBeTruthy();
  });
});

describe('MarkdownText — streaming', () => {
  it('streaming -> ẩn marker ** chưa đóng (không nhấp nháy ký tự thô)', async () => {
    const { queryByText } = await render(
      <MarkdownText text="**Tiêu đ" color={COLOR} streaming />
    );
    expect(queryByText('Tiêu đ')).toBeTruthy();
    expect(queryByText('**Tiêu đ')).toBeNull();
  });

  it('streaming -> hiện con trỏ', async () => {
    const { getByText } = await render(
      <MarkdownText text="đang nói" color={COLOR} streaming cursor="▍" />
    );
    expect(getByText('▍')).toBeTruthy();
  });

  it('không streaming -> không con trỏ', async () => {
    const { queryByText } = await render(
      <MarkdownText text="xong rồi" color={COLOR} cursor="▍" />
    );
    expect(queryByText('▍')).toBeNull();
  });

  it('text rỗng + streaming -> chỉ hiện con trỏ', async () => {
    const { getByText } = await render(
      <MarkdownText text="" color={COLOR} streaming cursor="▍" />
    );
    expect(getByText('▍')).toBeTruthy();
  });
});
