/**
 * Test cho `PaymentHistoryScreen` — màn "Lịch sử thanh toán" trong Profile.
 *
 * Bao phủ 4 nhánh: có dữ liệu / rỗng / lỗi + retry / phân trang (load-more).
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PaymentHistoryScreen } from '../PaymentHistoryScreen';

const mockGetPaymentHistory = jest.fn();

// ⚠️ Phải trả CÙNG một object cho mọi lần render — nếu tạo object mới mỗi lần,
// `load` (useCallback deps [userService]) đổi identity -> useFocusEffect chạy lại
// -> render lặp -> test chậm / dễ timeout khi CI chạy nhiều worker.
const mockServices = {
  userService: {
    getPaymentHistory: (...args) => mockGetPaymentHistory(...args),
  },
};

jest.mock('../../../../data/ServiceProvider', () => ({
  useServices: () => mockServices,
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
    useFocusEffect: (fn) =>
      React.useEffect(() => {
        fn();
      }, []),
  };
});

const buildTx = (overrides = {}) => ({
  id: 'tx-1',
  paymentRef: 'FRIGGY-1727000000000',
  type: 'subscribe',
  planName: 'Gói Cá Nhân',
  amount: 79000,
  status: 'paid',
  checkoutUrl: 'https://payos.vn/abc',
  expiredAt: '2026-09-24T02:30:00.000Z',
  paidAt: '2026-09-24T02:12:00.000Z',
  createdAt: '2026-09-24T02:05:00.000Z',
  ...overrides,
});

describe('PaymentHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hiện danh sách giao dịch: tên gói, số tiền, trạng thái, mã tham chiếu', async () => {
    mockGetPaymentHistory.mockResolvedValue({
      items: [
        buildTx(),
        buildTx({
          id: 'tx-2',
          type: 'renew',
          planName: 'Gói Gia Đình',
          amount: 149000,
          status: 'pending',
          paymentRef: 'FRIGGY-1727100000000',
          paidAt: null,
        }),
      ],
      total: 2,
      page: 1,
      limit: 20,
    });

    const view = await render(<PaymentHistoryScreen />);

    await waitFor(() => {
      expect(view.getByText('Gói Cá Nhân')).toBeTruthy();
    });

    expect(view.getByText('79.000 ₫')).toBeTruthy();
    expect(view.getByText('149.000 ₫')).toBeTruthy();
    expect(view.getByText('paymentHistory.status.paid')).toBeTruthy();
    expect(view.getByText('paymentHistory.status.pending')).toBeTruthy();
    // Loại giao dịch nằm chung dòng với thời gian -> so khớp một phần.
    expect(view.getByText(/paymentHistory\.typeSubscribe/)).toBeTruthy();
    expect(view.getByText(/paymentHistory\.typeRenew/)).toBeTruthy();
    expect(view.getByText(/FRIGGY-1727000000000/)).toBeTruthy();
    expect(mockGetPaymentHistory).toHaveBeenCalledWith(1, 20);
  }, 20000);

  it('chưa có giao dịch nào -> hiện EmptyState', async () => {
    mockGetPaymentHistory.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    const view = await render(<PaymentHistoryScreen />);

    await waitFor(() => {
      expect(view.getByText('paymentHistory.emptyTitle')).toBeTruthy();
    });
    expect(view.getByText('paymentHistory.emptyHint')).toBeTruthy();
  });

  it('BE lỗi -> hiện ErrorState và bấm thử lại gọi lại service', async () => {
    mockGetPaymentHistory
      .mockRejectedValueOnce(new Error('Mất mạng'))
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 20 });

    const view = await render(<PaymentHistoryScreen />);

    await waitFor(() => {
      expect(view.getByText(/Mất mạng/)).toBeTruthy();
    });

    fireEvent.press(view.getByText('home.retry'));

    await waitFor(() => {
      expect(mockGetPaymentHistory).toHaveBeenCalledTimes(2);
    });
  });

  it('có nhiều trang -> gọi trang 2 khi cuộn tới cuối', async () => {
    mockGetPaymentHistory.mockImplementation(async (page) => ({
      items:
        page === 1
          ? [buildTx({ id: 'tx-1' })]
          : [buildTx({ id: 'tx-2', paymentRef: 'FRIGGY-PAGE-2' })],
      total: 2,
      page,
      limit: 20,
    }));

    const view = await render(<PaymentHistoryScreen />);

    await waitFor(() => {
      expect(view.getByText('Gói Cá Nhân')).toBeTruthy();
    });

    // Bấm nút "Xem thêm" ở cuối danh sách -> gọi trang 2.
    fireEvent.press(view.getByTestId('payment-history-load-more'));

    await waitFor(() => {
      expect(mockGetPaymentHistory).toHaveBeenCalledWith(2, 20);
    });
    expect(view.getByText(/FRIGGY-PAGE-2/)).toBeTruthy();
  });
});
