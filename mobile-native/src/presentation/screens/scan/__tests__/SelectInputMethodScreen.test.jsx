/**
 * SelectInputMethodScreen — test trạng thái disabled của 2 phương pháp scan.
 *
 * Yêu cầu nghiệp vụ (19/11):
 *   - "Quét mã vạch / QR" và "Quét hóa đơn" phải ở trạng thái DISABLED
 *     với nội dung "Đang phát triển" (BE + ai-service chưa hoàn chỉnh).
 *   - Bấm vào 2 mục đó KHÔNG được điều hướng đi đâu cả.
 *   - Các phương pháp khác (thủ công, chụp ảnh, lịch sử) vẫn hoạt động.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SelectInputMethodScreen } from '../SelectInputMethodScreen';

const mockReplace = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'vi' },
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), replace: (...a) => mockReplace(...a) }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

jest.mock('../../../theme/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SelectInputMethodScreen', () => {
  it('hiện đủ 5 phương pháp nhập', async () => {
    const { getByText } = await render(<SelectInputMethodScreen />);

    expect(getByText('scan.manualAdd')).toBeTruthy();
    expect(getByText('scan.scanFood')).toBeTruthy();
    expect(getByText('scan.scanReceipt')).toBeTruthy();
    expect(getByText('scan.scanBarcode')).toBeTruthy();
    expect(getByText('scan.scanHistory')).toBeTruthy();
  });

  it('2 phương pháp đang phát triển hiện nội dung "Đang phát triển"', async () => {
    const { getAllByText } = await render(<SelectInputMethodScreen />);

    // 2 mục bị disabled -> mỗi mục hiện badge + desc = 2 lần "Đang phát triển".
    expect(getAllByText('scan.inDevelopment').length).toBeGreaterThanOrEqual(2);
  });

  it('bấm "Quét hóa đơn" (disabled) -> KHÔNG điều hướng', async () => {
    const { getByText } = await render(<SelectInputMethodScreen />);

    fireEvent.press(getByText('scan.scanReceipt'));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('bấm "Quét mã vạch" (disabled) -> KHÔNG điều hướng', async () => {
    const { getByText } = await render(<SelectInputMethodScreen />);

    fireEvent.press(getByText('scan.scanBarcode'));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('bấm "Thêm thủ công" -> vẫn điều hướng bình thường', async () => {
    const { getByText } = await render(<SelectInputMethodScreen />);

    fireEvent.press(getByText('scan.manualAdd'));
    expect(mockReplace).toHaveBeenCalledWith('ManualAddIngredient');
  });

  it('bấm "Quét thực phẩm" -> vẫn điều hướng bình thường', async () => {
    const { getByText } = await render(<SelectInputMethodScreen />);

    fireEvent.press(getByText('scan.scanFood'));
    expect(mockReplace).toHaveBeenCalledWith('ScanFoodPhoto');
  });
});
