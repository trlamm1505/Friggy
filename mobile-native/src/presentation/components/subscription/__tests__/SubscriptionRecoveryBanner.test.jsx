/**
 * SubscriptionRecoveryBanner - test cảnh báo "đã thanh toán nhưng gói bị mất".
 *
 * ⚠️ Mục tiêu: user KHÔNG được thấy màn "Gói của tôi" hiển thị "Gói Miễn Phí"
 *    một cách im lặng khi họ đã trả tiền (bug 19/11).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SubscriptionRecoveryBanner } from '../SubscriptionRecoveryBanner';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key),
    i18n: { language: 'vi' },
  }),
}));

jest.mock('../../../theme/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const PENDING_NOTICE = {
  kind: 'payment_pending',
  planDisplayName: 'Gói Cá Nhân',
  amount: 79000,
  paymentRef: 'FRIGGY-1',
  type: 'subscribe',
  paidAt: null,
  daysAgo: 0,
};

const REVERTED_NOTICE = {
  kind: 'reverted_to_free',
  planDisplayName: 'Gói Cá Nhân',
  amount: 79000,
  paymentRef: 'FRIGGY-2',
  type: 'subscribe',
  paidAt: '2026-11-17T00:00:00.000Z',
  daysAgo: 2,
};

describe('SubscriptionRecoveryBanner', () => {
  it('KHÔNG hiện gì khi không có notice', async () => {
    const { toJSON } = await render(<SubscriptionRecoveryBanner notice={null} />);
    expect(toJSON()).toBeNull();
  });

  it('giao dịch đang chờ -> hiện cảnh báo + nút mở lại QR', async () => {
    const onResume = jest.fn();
    const { getByText } = await render(
      <SubscriptionRecoveryBanner notice={PENDING_NOTICE} canResume onResume={onResume} />
    );

    expect(getByText('subscription.recoveryTitle')).toBeTruthy();
    expect(getByText(/subscription.recoveryPending/)).toBeTruthy();
    expect(getByText('subscription.recoveryResumeCta')).toBeTruthy();
  });

  it('giao dịch đang chờ nhưng quá hạn -> dùng message "đã quá hạn"', async () => {
    const { getByText } = await render(
      <SubscriptionRecoveryBanner
        notice={{ ...PENDING_NOTICE, daysAgo: 5 }}
        canResume
        onResume={jest.fn()}
      />
    );
    expect(getByText(/subscription.recoveryPendingExpired/)).toBeTruthy();
  });

  it('đã thanh toán nhưng gói bị về free -> KHÔNG có nút mở QR, có message hỗ trợ', async () => {
    const { getByText, queryByText } = await render(
      <SubscriptionRecoveryBanner notice={REVERTED_NOTICE} canResume={false} />
    );
    expect(getByText(/subscription.recoveryReverted/)).toBeTruthy();
    expect(queryByText('subscription.recoveryResumeCta')).toBeNull();
  });

  it('sub pending + đã trả tiền -> dùng message "chưa kích hoạt"', async () => {
    const { getByText } = await render(
      <SubscriptionRecoveryBanner
        notice={{ ...REVERTED_NOTICE, kind: 'payment_not_applied' }}
      />
    );
    expect(getByText(/subscription.recoveryNotApplied/)).toBeTruthy();
  });

  it('bấm nút mở lại QR -> gọi onResume', async () => {
    const onResume = jest.fn();
    const { getByText } = await render(
      <SubscriptionRecoveryBanner notice={PENDING_NOTICE} canResume onResume={onResume} />
    );
    fireEvent.press(getByText('subscription.recoveryResumeCta'));
    expect(onResume).toHaveBeenCalled();
  });

  it('hiện số tiền khi có amount', async () => {
    const { getByText } = await render(<SubscriptionRecoveryBanner notice={REVERTED_NOTICE} />);
    expect(getByText(/subscription.recoveryAmount/)).toBeTruthy();
  });
});
