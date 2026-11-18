/**
 * MyPackagesScreen — test màn "Gói của tôi" (mở từ Profile).
 *
 * Yêu cầu nghiệp vụ (19/11):
 *   1. Hiển thị TOÀN BỘ gói đang có INLINE (không cần mở bottom sheet).
 *   2. Gói đang dùng -> badge "Đang sử dụng" + nút gia hạn (khi đã tắt
 *      gia hạn tự động) hoặc nút hủy gia hạn (khi đang bật).
 *   3. Gói khác -> nút "Chọn gói này" -> gọi `POST /subscriptions/subscribe`.
 *   4. Nút "Gia hạn gói (+1 tháng)" -> `POST /subscriptions/renew`.
 *
 * Chỉ test logic KHÔNG NHÌN THẤY (quy tắc chung của repo):
 *   - Danh sách gói hiển thị đủ, đúng tên.
 *   - Call service đúng endpoint (subscribe / renew), KHÔNG gọi nhầm.
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { MyPackagesScreen } from '../MyPackagesScreen';

const mockGetAvailablePackages = jest.fn();
const mockGetMySubscription = jest.fn();
const mockGetPaymentHistory = jest.fn();
const mockSubscribe = jest.fn();
const mockRenewSubscription = jest.fn();
const mockCancelAutoRenewal = jest.fn();
const mockFindPendingPayment = jest.fn();

const mockServices = {
  userService: {
    getAvailablePackages: (...a) => mockGetAvailablePackages(...a),
    getMySubscription: (...a) => mockGetMySubscription(...a),
    getPaymentHistory: (...a) => mockGetPaymentHistory(...a),
    subscribe: (...a) => mockSubscribe(...a),
    renewSubscription: (...a) => mockRenewSubscription(...a),
    cancelAutoRenewal: (...a) => mockCancelAutoRenewal(...a),
    findPendingPayment: (...a) => mockFindPendingPayment(...a),
  },
};

jest.mock('../../../../data/ServiceProvider', () => ({
  useServices: () => mockServices,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key),
    i18n: { language: 'vi' },
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

jest.mock('../../../theme/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('../../../utils/helpers', () => ({
  showError: jest.fn(),
  showSuccess: jest.fn(),
}));

const FREE = {
  id: 'plan-free',
  name: 'free',
  displayName: 'Gói Miễn Phí',
  price: 0,
  period: 'forever',
  aiUsagePerWeek: 5,
  features: ['Tối đa 5 lượt AI/tuần'],
};

const INDIVIDUAL = {
  id: 'plan-individual',
  name: 'individual',
  displayName: 'Gói Cá Nhân',
  price: 79000,
  period: 'monthly',
  aiUsagePerWeek: 15,
  features: ['Tối đa 15 lượt AI/tuần'],
};

const FAMILY = {
  id: 'plan-family',
  name: 'family',
  displayName: 'Gói Gia Đình',
  price: 149000,
  period: 'monthly',
  aiUsagePerWeek: -1,
  features: ['AI không giới hạn'],
};

const sub = (over = {}) => ({
  plan: FREE,
  status: 'active',
  startDate: '2026-11-01',
  endDate: '2026-12-01',
  autoRenew: false,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAvailablePackages.mockResolvedValue([FREE, INDIVIDUAL, FAMILY]);
  mockGetMySubscription.mockResolvedValue(sub());
  mockGetPaymentHistory.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
  mockFindPendingPayment.mockResolvedValue(null);
  mockSubscribe.mockResolvedValue({
    checkoutUrl: 'https://payos.vn/x',
    qrCode: 'data:image/png;base64,AAA',
    paymentRef: 'ref-1',
    amount: 79000,
    expireAt: '2026-11-19T05:00:00.000Z',
    status: 'pending',
  });
  mockRenewSubscription.mockResolvedValue({
    checkoutUrl: 'https://payos.vn/y',
    qrCode: 'data:image/png;base64,BBB',
    paymentRef: 'ref-2',
    amount: 79000,
    expireAt: '2026-11-19T05:00:00.000Z',
    status: 'pending',
  });
});

describe('MyPackagesScreen', () => {
  it('hiển thị TOÀN BỘ gói inline (không cần mở sheet)', async () => {
    const { getByText, getAllByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getByText('Gói Cá Nhân')).toBeTruthy());
    expect(getByText('Gói Gia Đình')).toBeTruthy();
    // "Gói Miễn Phí" xuất hiện 2 lần: card gói hiện tại + card trong danh sách.
    expect(getAllByText('Gói Miễn Phí').length).toBeGreaterThan(0);
    // Giá lấy từ API, không hardcode.
    expect(getByText('79.000 VNĐ')).toBeTruthy();
    expect(getByText('149.000 VNĐ')).toBeTruthy();
  });

  it('gói đang dùng (free, active) -> badge + KHÔNG cho mua lại gói free đó', async () => {
    const { getByText, getAllByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getByText('Gói Cá Nhân')).toBeTruthy());
    // Gói free đang active -> nút "Gói mặc định hiện tại" (disabled).
    expect(getAllByText('subscription.currentDefaultPlan').length).toBeGreaterThan(0);
    // Gói khác -> nút "Chọn gói này".
    expect(getAllByText('subscription.chooseThisPlan').length).toBe(2);
  });

  it('bấm "Chọn gói này" -> gọi subscribe với đúng planId', async () => {
    const { getAllByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getAllByText('subscription.chooseThisPlan').length).toBe(2));
    fireEvent.press(getAllByText('subscription.chooseThisPlan')[0]);

    await waitFor(() => expect(mockSubscribe).toHaveBeenCalledWith('plan-individual'));
    expect(mockRenewSubscription).not.toHaveBeenCalled();
  });

  it('bấm "Gia hạn gói (+1 tháng)" -> gọi renew, KHÔNG gọi subscribe', async () => {
    mockGetMySubscription.mockResolvedValue(
      sub({ plan: INDIVIDUAL, autoRenew: false })
    );
    const { getAllByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getAllByText('subscription.renewOneMonth').length).toBeGreaterThan(0));
    fireEvent.press(getAllByText('subscription.renewOneMonth')[0]);

    await waitFor(() => expect(mockRenewSubscription).toHaveBeenCalled());
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('gói đang bật gia hạn tự động -> hiện nút hủy gia hạn (không hiện nút gia hạn)', async () => {
    mockGetMySubscription.mockResolvedValue(
      sub({ plan: INDIVIDUAL, autoRenew: true })
    );
    const { getAllByText, queryByText } = await render(<MyPackagesScreen />);

    await waitFor(() =>
      expect(getAllByText('subscription.cancelAutoRenewShort').length).toBeGreaterThan(0)
    );
    expect(queryByText('subscription.renewOneMonth')).toBeNull();
  });

  // ─────────────────────────────────────────────────────────
  // FIX "QR SAI GÓI" (19/11)
  //
  // Bug: chọn gói 5.000đ nhưng QR hiển thị QR 149.000đ (giao dịch pending cũ
  // của gói khác bị "khôi phục" nhầm, và `POST /subscribe` KHÔNG được gọi).
  // ─────────────────────────────────────────────────────────

  it('tra cứu pending PHẢI lọc theo gói đang chọn (không dùng QR của gói khác)', async () => {
    const { getAllByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getAllByText('subscription.chooseThisPlan').length).toBe(2));
    fireEvent.press(getAllByText('subscription.chooseThisPlan')[0]);

    await waitFor(() => expect(mockFindPendingPayment).toHaveBeenCalled());
    const filters = mockFindPendingPayment.mock.calls[0][0];
    // Filter phải chứa thông tin gói đang mua để service lọc đúng.
    expect(filters).toMatchObject({
      planDisplayName: 'Gói Cá Nhân',
      planName: 'individual',
      amount: 79000,
      type: 'subscribe',
    });
  });

  it('giao dịch pending của GÓI KHÁC -> gọi subscribe tạo giao dịch MỚI (không mở QR cũ)', async () => {
    // Service đã lọc -> trả null (không có pending đúng gói).
    mockFindPendingPayment.mockResolvedValue(null);

    const { getAllByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getAllByText('subscription.chooseThisPlan').length).toBe(2));
    fireEvent.press(getAllByText('subscription.chooseThisPlan')[0]);

    await waitFor(() => expect(mockSubscribe).toHaveBeenCalledWith('plan-individual'));
  });

  it('giao dịch pending ĐÚNG gói -> khôi phục QR cũ, KHÔNG gọi subscribe lần nữa', async () => {
    mockFindPendingPayment.mockResolvedValue({
      checkoutUrl: 'https://payos.vn/old',
      qrCode: 'data:image/png;base64,OLD',
      paymentRef: 'old-ref',
      amount: 79000,
      expireAt: '2026-11-19T05:00:00.000Z',
      status: 'pending',
      planName: 'Gói Cá Nhân',
      type: 'subscribe',
    });

    const { getAllByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getAllByText('subscription.chooseThisPlan').length).toBe(2));
    fireEvent.press(getAllByText('subscription.chooseThisPlan')[0]);

    await waitFor(() => expect(mockFindPendingPayment).toHaveBeenCalled());
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────
  // FIX "GIA HẠN BÁO KHÔNG CÓ GÓI ĐANG HOẠT ĐỘNG" (19/11)
  //
  // BE `POST /subscriptions/renew` (`subscriptions.service.ts:319-323`) chỉ tìm
  // `userSubscription` có `status = 'active'` -> nếu sub là `pending` /
  // `cancelled` / `expired` thì BE trả 404 "Không có gói đang hoạt động".
  // => FE không được hiện nút gia hạn khi status !== 'active'.
  // ─────────────────────────────────────────────────────────

  it('gói KHÔNG active (pending) -> bấm gia hạn KHÔNG gọi API (BE chắc chắn 404)', async () => {
    mockGetMySubscription.mockResolvedValue(
      sub({ plan: INDIVIDUAL, status: 'pending', autoRenew: false })
    );
    // Không có giao dịch pending nào khớp -> không có đường thoát QR cũ.
    mockFindPendingPayment.mockResolvedValue(null);

    const { getAllByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getAllByText('Gói Cá Nhân').length).toBeGreaterThan(0));
    fireEvent.press(getAllByText('subscription.renewOneMonth')[0]);

    await waitFor(() => expect(mockFindPendingPayment).toHaveBeenCalled());
    expect(mockRenewSubscription).not.toHaveBeenCalled();
  });

  it('gói KHÔNG active + còn giao dịch pending -> mở lại QR cũ (đường thoát)', async () => {
    mockGetMySubscription.mockResolvedValue(
      sub({ plan: INDIVIDUAL, status: 'pending', autoRenew: false })
    );
    mockFindPendingPayment.mockResolvedValue({
      checkoutUrl: 'https://payos.vn/pending',
      qrCode: 'data:image/png;base64,PENDING',
      paymentRef: 'pending-ref',
      amount: 79000,
      expireAt: '2026-11-19T05:00:00.000Z',
      status: 'pending',
      planName: 'Gói Cá Nhân',
      type: 'renew',
    });

    const { getAllByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getAllByText('Gói Cá Nhân').length).toBeGreaterThan(0));
    fireEvent.press(getAllByText('subscription.renewOneMonth')[0]);

    await waitFor(() => expect(mockFindPendingPayment).toHaveBeenCalled());
    // Mở được QR cũ, KHÔNG gọi renew (BE sẽ 404).
    expect(mockRenewSubscription).not.toHaveBeenCalled();
  });

  it('gói active + trả phí -> VẪN hiện nút gia hạn và gọi renew', async () => {
    mockGetMySubscription.mockResolvedValue(
      sub({ plan: INDIVIDUAL, status: 'active', autoRenew: false })
    );

    const { getAllByText, queryByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getAllByText('subscription.renewOneMonth').length).toBeGreaterThan(0));
    expect(queryByText('subscription.renewNotActive')).toBeNull();

    fireEvent.press(getAllByText('subscription.renewOneMonth')[0]);
    await waitFor(() => expect(mockRenewSubscription).toHaveBeenCalled());
  });

  // ─────────────────────────────────────────────────────────
  // FIX "ĐÃ THANH TOÁN NHƯNG VỀ GÓI FREE" (19/11)
  //
  // BE `GET /subscriptions/me` -> `assignFreePlan()` GHI ĐÈ `planId` về free
  // khi webhook PayOS không về -> user thấy "Gói Miễn Phí" dù đã trả tiền.
  // => Màn phải CẢNH BÁO dựa trên `GET /payment-transactions/me`.
  // ─────────────────────────────────────────────────────────

  it('đã thanh toán nhưng gói về free -> hiện cảnh báo (KHÔNG im lặng)', async () => {
    mockGetMySubscription.mockResolvedValue(sub({ plan: FREE, status: 'active' }));
    mockGetPaymentHistory.mockResolvedValue({
      items: [
        {
          id: 'tx-1',
          paymentRef: 'FRIGGY-777',
          type: 'subscribe',
          planName: 'Gói Cá Nhân',
          amount: 79000,
          status: 'paid',
          paidAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    const { getByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getByText('subscription.recoveryTitle')).toBeTruthy());
    expect(getByText(/subscription.recoveryReverted/)).toBeTruthy();
  });

  it('giao dịch đang chờ + gói free -> hiện cảnh báo có nút mở lại QR', async () => {
    mockGetMySubscription.mockResolvedValue(sub({ plan: FREE, status: 'active' }));
    mockGetPaymentHistory.mockResolvedValue({
      items: [
        {
          id: 'tx-2',
          paymentRef: 'FRIGGY-888',
          type: 'subscribe',
          planName: 'Gói Cá Nhân',
          amount: 79000,
          status: 'pending',
          paidAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    const { getByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getByText('subscription.recoveryResumeCta')).toBeTruthy());
    expect(getByText(/subscription.recoveryPending/)).toBeTruthy();
  });

  it('bấm "Mở lại mã QR" -> tra cứu pending theo đúng gói và mở sheet QR', async () => {
    mockGetMySubscription.mockResolvedValue(sub({ plan: FREE, status: 'active' }));
    mockGetPaymentHistory.mockResolvedValue({
      items: [
        {
          id: 'tx-3',
          paymentRef: 'FRIGGY-999',
          type: 'subscribe',
          planName: 'Gói Cá Nhân',
          amount: 79000,
          status: 'pending',
          paidAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    mockFindPendingPayment.mockResolvedValue({
      checkoutUrl: 'https://payos.vn/resume',
      qrCode: 'data:image/png;base64,RESUME',
      paymentRef: 'FRIGGY-999',
      amount: 79000,
      expireAt: '2026-11-19T05:00:00.000Z',
      status: 'pending',
      planName: 'Gói Cá Nhân',
      type: 'subscribe',
    });

    const { getByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getByText('subscription.recoveryResumeCta')).toBeTruthy());
    fireEvent.press(getByText('subscription.recoveryResumeCta'));

    await waitFor(() => expect(mockFindPendingPayment).toHaveBeenCalled());
    const filters = mockFindPendingPayment.mock.calls[0][0];
    expect(filters).toMatchObject({
      planDisplayName: 'Gói Cá Nhân',
      planName: 'individual',
      amount: 79000,
      type: 'subscribe',
    });
  });

  it('mọi thứ khớp (gói active trả phí + giao dịch paid) -> KHÔNG hiện cảnh báo', async () => {
    mockGetMySubscription.mockResolvedValue(
      sub({ plan: INDIVIDUAL, status: 'active', autoRenew: false })
    );
    mockGetPaymentHistory.mockResolvedValue({
      items: [
        {
          id: 'tx-4',
          paymentRef: 'FRIGGY-111',
          type: 'subscribe',
          planName: 'Gói Cá Nhân',
          amount: 79000,
          status: 'paid',
          paidAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    const { queryByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(queryByText('subscription.recoveryTitle')).toBeNull());
  });

  // ─────────────────────────────────────────────────────────
  // DÒNG TRẠNG THÁI (19/11)
  //
  // Màn "Gói của tôi" trước đây KHÔNG hiện trạng thái gói -> user ở gói
  // `pending` (đã bấm mua, chưa thanh toán xong) chỉ thấy tên + giá ->
  // tưởng đã mua xong. Khớp với màn "Thông tin gói dịch vụ".
  // ─────────────────────────────────────────────────────────

  it('hiện dòng trạng thái gói hiện tại (active)', async () => {
    const { getByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getByText('subscription.statusLabel')).toBeTruthy());
    expect(getByText('subscription.statusActive')).toBeTruthy();
  });

  it('gói pending -> hiện "Đang chờ thanh toán" (KHÔNG báo đã dùng)', async () => {
    mockGetMySubscription.mockResolvedValue(sub({ plan: INDIVIDUAL, status: 'pending' }));

    const { getByText, queryByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getByText('subscription.statusPending')).toBeTruthy());
    expect(queryByText('subscription.statusActive')).toBeNull();
  });

  it('gói cancelled -> hiện "Đã hủy"', async () => {
    mockGetMySubscription.mockResolvedValue(sub({ plan: INDIVIDUAL, status: 'cancelled' }));

    const { getByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getByText('subscription.statusCancelled')).toBeTruthy());
  });

  it('status lạ -> fallback "Đã hết hạn" (KHÔNG lộ raw enum)', async () => {
    mockGetMySubscription.mockResolvedValue(sub({ plan: INDIVIDUAL, status: 'weird_status' }));

    const { getByText } = await render(<MyPackagesScreen />);

    await waitFor(() => expect(getByText('subscription.statusExpired')).toBeTruthy());
  });
});
