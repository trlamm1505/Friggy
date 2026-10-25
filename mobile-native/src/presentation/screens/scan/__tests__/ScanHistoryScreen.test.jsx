/** Test cho ScanHistoryScreen — nhánh có/không dữ liệu và nhánh lỗi. */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ScanHistoryScreen } from '../ScanHistoryScreen';

const mockGetScanHistory = jest.fn();

jest.mock('../../../../data/ServiceProvider', () => ({
  useServices: () => ({ fridgeService: { getScanHistory: (...args) => mockGetScanHistory(...args) } }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'vi' },
  }),
}));

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ goBack: jest.fn() }),
    // Chạy 1 lần như focus thật — mock useEffect([fn]) sẽ lặp vì `load`
    // đổi identity mỗi render (services mock trả object mới).
    useFocusEffect: (fn) => React.useEffect(() => { fn(); }, []),
  };
});

describe('ScanHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hiện danh sách các lần scan kèm số món xác nhận', async () => {
    mockGetScanHistory.mockResolvedValue([
      {
        id: 's1',
        scanType: 'image',
        status: 'success',
        detectedCount: 3,
        confirmedCount: 2,
        createdAt: new Date().toISOString(),
      },
      {
        id: 's2',
        scanType: 'receipt',
        status: 'failed',
        detectedCount: 0,
        confirmedCount: null,
        createdAt: new Date().toISOString(),
      },
    ]);

    const view = await render(<ScanHistoryScreen />);

    await waitFor(() => {
      expect(view.getByText(/2\/3 món/)).toBeTruthy();
    });
    expect(view.getByText('Thất bại')).toBeTruthy();
    expect(mockGetScanHistory).toHaveBeenCalledTimes(1);
  });

  it('chưa scan lần nào -> hiện EmptyState gợi ý quét', async () => {
    mockGetScanHistory.mockResolvedValue([]);

    const view = await render(<ScanHistoryScreen />);

    await waitFor(() => {
      expect(view.getByText('Chưa có lần quét nào')).toBeTruthy();
    });
  });

  it('BE lỗi -> hiện ErrorState và bấm thử lại gọi lại service', async () => {
    mockGetScanHistory
      .mockRejectedValueOnce(new Error('Mất mạng'))
      .mockResolvedValueOnce([]);

    const view = await render(<ScanHistoryScreen />);

    await waitFor(() => {
      expect(view.getByText(/Mất mạng/)).toBeTruthy();
    });

    const retry = view.getByText('home.retry');
    fireEvent.press(retry);

    await waitFor(() => {
      expect(mockGetScanHistory).toHaveBeenCalledTimes(2);
    });
  });
});
