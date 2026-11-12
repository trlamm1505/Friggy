/**
 * MealPlanCreateSection — test cho nút "Tạo meal plan theo tuần" ở Home.
 *
 * VÌ SAO CẦN TEST NÀY:
 *   Đây là luồng AI DUY NHẤT ở Home gọi `POST /meal-planning/plans/generate`
 *   (luồng `generate-from-expiring` nằm ở màn thực đơn tuần tới).
 *   Rủi ro chính:
 *     1. Gửi `weekStartDate` KHÔNG phải Thứ 2 -> cả thực đơn 7 ngày lệch 1 ngày.
 *     2. Budget không phải số nguyên -> BE `@IsInt()` reject 400.
 *     3. Không bắt được event `completed` -> modal treo vô hạn.
 *     4. 429 (hết lượt AI) phải hiện message riêng, không phải lỗi chung.
 *
 * CÁCH TEST:
 *   `@testing-library/react-native` v14 -> `render` VÀ `fireEvent` đều ASYNC.
 *   Bỏ `await` -> "overlapping act() calls" và assertion chạy trước lúc
 *   state cập nhật -> test FAIL giả.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockGeneratePlan = jest.fn();
const mockStreamPlanProgress = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('../../../../data/ServiceProvider', () => ({
  useServices: () => ({
    recipeService: {
      generatePlan: (...args) => mockGeneratePlan(...args),
      streamPlanProgress: (...args) => mockStreamPlanProgress(...args),
    },
  }),
}));

jest.mock('../../../utils/helpers', () => ({
  showSuccess: (...args) => mockShowSuccess(...args),
  showError: (...args) => mockShowError(...args),
  showInfo: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key),
    i18n: { language: 'vi' },
  }),
}));

const { MealPlanCreateSection } = require('../MealPlanCreateSection');

// Lần render ĐẦU file phải nạp `lucide-react-native` + `react-native-svg`
// (rất nặng trong môi trường Node) -> có thể vượt timeout mặc định 5s.
jest.setTimeout(30000);

/** Drain microtask + 1 macrotask. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Bấm 1 phần tử + chờ mọi state update settle. */
const press = async (element) => {
  await fireEvent.press(element);
  await act(async () => {
    await flush();
  });
};

/**
 * Generator SSE giả: yield các event rồi kết thúc.
 *
 * @param {Array<{event:string, data:any}>} events
 */
const fakeStream = (events) =>
  (async function* gen() {
    for (const evt of events) {
      yield evt;
    }
  })();

beforeEach(() => {
  jest.clearAllMocks();
  mockGeneratePlan.mockResolvedValue({
    jobId: 'job-1',
    status: 'queued',
    streamUrl: '/meal-planning/plans/generate/job-1/stream',
  });
  mockStreamPlanProgress.mockImplementation(() =>
    fakeStream([{ event: 'completed', data: { message: 'Xong' } }])
  );
});

describe('MealPlanCreateSection: hiển thị', () => {
  it('render banner với tiêu đề + mô tả', async () => {
    const view = await render(<MealPlanCreateSection />);

    expect(view.getByTestId('home-create-meal-plan')).toBeTruthy();
    expect(view.getByText('home.mealPlanCreateTitle')).toBeTruthy();
    expect(view.getByText('home.mealPlanCreateSubtitle')).toBeTruthy();
  });

  it('chưa bấm -> CHƯA gọi API', async () => {
    await render(<MealPlanCreateSection />);

    expect(mockGeneratePlan).not.toHaveBeenCalled();
  });
});

describe('MealPlanCreateSection: tạo thực đơn', () => {
  it('bấm banner -> mở modal cấu hình', async () => {
    const view = await render(<MealPlanCreateSection />);

    await press(view.getByTestId('home-create-meal-plan'));

    expect(view.getByText('home.mealPlanCreateDesc')).toBeTruthy();
    expect(view.getByText('home.mealPlanBudgetLabel')).toBeTruthy();
  });

  it('gửi weekStartDate là THỨ 2 của tuần hiện tại', async () => {
    const view = await render(<MealPlanCreateSection />);
    await press(view.getByTestId('home-create-meal-plan'));
    await press(view.getByText('home.mealPlanCreateCta'));

    await waitFor(() => expect(mockGeneratePlan).toHaveBeenCalledTimes(1));

    const [params] = mockGeneratePlan.mock.calls[0];
    expect(params.weekStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Kiểm tra đúng là Thứ 2: `new Date(yyyy-mm-dd).getDay()` phải === 1.
    const [y, m, d] = params.weekStartDate.split('-').map(Number);
    expect(new Date(y, m - 1, d).getDay()).toBe(1);
  });

  it('gửi budget dạng SỐ NGUYÊN (BE @IsInt)', async () => {
    const view = await render(<MealPlanCreateSection />);
    await press(view.getByTestId('home-create-meal-plan'));
    await press(view.getByText('home.mealPlanCreateCta'));

    await waitFor(() => expect(mockGeneratePlan).toHaveBeenCalledTimes(1));

    const [params] = mockGeneratePlan.mock.calls[0];
    expect(Number.isInteger(params.budget)).toBe(true);
    expect(params.budget).toBe(500000);
  });

  it('bấm CTA -> mở SSE đúng path của BE', async () => {
    const view = await render(<MealPlanCreateSection />);
    await press(view.getByTestId('home-create-meal-plan'));
    await press(view.getByText('home.mealPlanCreateCta'));

    await waitFor(() => expect(mockStreamPlanProgress).toHaveBeenCalledTimes(1));

    const [path] = mockStreamPlanProgress.mock.calls[0];
    expect(path).toBe('/meal-planning/plans/generate/job-1/stream');
  });

  it('nhận event `completed` -> báo thành công + gọi onCreated + onPressPlan', async () => {
    const onCreated = jest.fn();
    const onPressPlan = jest.fn();
    const view = await render(
      <MealPlanCreateSection onCreated={onCreated} onPressPlan={onPressPlan} />
    );

    await press(view.getByTestId('home-create-meal-plan'));
    await press(view.getByText('home.mealPlanCreateCta'));

    await waitFor(() => expect(mockShowSuccess).toHaveBeenCalledWith('home.mealPlanCreated'));
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onPressPlan).toHaveBeenCalledTimes(1);
  });

  it('nhận event `failed` -> hiện lỗi, KHÔNG coi là thành công', async () => {
    mockStreamPlanProgress.mockImplementation(() =>
      fakeStream([{ event: 'failed', data: { message: 'AI lỗi rồi' } }])
    );

    const onCreated = jest.fn();
    const view = await render(<MealPlanCreateSection onCreated={onCreated} />);

    await press(view.getByTestId('home-create-meal-plan'));
    await press(view.getByText('home.mealPlanCreateCta'));

    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith('AI lỗi rồi'));
    expect(mockShowSuccess).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('stream đóng mà KHÔNG có event `completed` -> báo lỗi chung', async () => {
    mockStreamPlanProgress.mockImplementation(() => fakeStream([]));

    const view = await render(<MealPlanCreateSection />);

    await press(view.getByTestId('home-create-meal-plan'));
    await press(view.getByText('home.mealPlanCreateCta'));

    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith('home.aiError'));
  });

  it('BE trả 429 (hết lượt AI) -> hiện message riêng', async () => {
    const err = new Error('Bạn đã dùng hết lượt AI');
    err.statusCode = 429;
    mockGeneratePlan.mockRejectedValue(err);

    const view = await render(<MealPlanCreateSection />);

    await press(view.getByTestId('home-create-meal-plan'));
    await press(view.getByText('home.mealPlanCreateCta'));

    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith('home.aiLimitReached'));
  });

  it('API lỗi khác -> hiện message thật của BE', async () => {
    mockGeneratePlan.mockRejectedValue(new Error('Máy chủ bận'));

    const view = await render(<MealPlanCreateSection />);

    await press(view.getByTestId('home-create-meal-plan'));
    await press(view.getByText('home.mealPlanCreateCta'));

    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith('Máy chủ bận'));
  });
});
