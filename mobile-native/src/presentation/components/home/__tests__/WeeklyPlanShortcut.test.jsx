/**
 * WeeklyPlanShortcut — test cho nút tắt "Xem thực đơn tuần" ở Home.
 *
 * VÌ SAO CẦN TEST NÀY:
 *   Đây là entry point DUY NHẤT để mở lại màn "Thực đơn tuần tới" sau khi
 *   user đã bấm Back (trước đó không có đường vào lại — chỉ tạo được thực
 *   đơn MỚI). Nếu component này hỏng, user mất đường truy cập thực đơn.
 *
 *   Rủi ro chính:
 *     1. Đếm sai số bữa (đếm theo ngày thay vì theo slot).
 *     2. `getNextWeekPlan()` lỗi -> phải KHÔNG crash, vẫn bấm được.
 *     3. Bấm nút -> phải gọi `onPress`.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockGetNextWeekPlan = jest.fn();

jest.mock('../../../../data/ServiceProvider', () => ({
  useServices: () => ({
    recipeService: {
      getNextWeekPlan: (...args) => mockGetNextWeekPlan(...args),
    },
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key),
    i18n: { language: 'vi' },
  }),
}));

const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (...args) => mockUseFocusEffect(...args),
}));

const { WeeklyPlanShortcut } = require('../WeeklyPlanShortcut');

// Lần render ĐẦU file phải nạp `lucide-react-native` + `react-native-svg` -> có
// thể vượt timeout mặc định 5s.
jest.setTimeout(30000);

/** Drain microtask + 1 macrotask. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const planWith = (slotCount) => ({
  id: 'plan-1',
  weekStart: '2026-11-09',
  days: Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i + 1,
    date: '2026-11-09',
    slots: Array.from({ length: i < 2 ? slotCount : 0 }, (_, j) => ({
      id: `slot-${i}-${j}`,
      recipeId: 'r1',
      name: 'Bún lúc lắc khoai tây',
      mealType: 'breakfast',
      cooked: false,
    })),
  })),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetNextWeekPlan.mockResolvedValue(planWith(3));
});

describe('WeeklyPlanShortcut: hiển thị', () => {
  it('render nút với tiêu đề', async () => {
    const view = await render(<WeeklyPlanShortcut onPress={jest.fn()} />);

    expect(view.getByTestId('home-weekly-plan-shortcut')).toBeTruthy();
    expect(view.getByText('home.weekPlanViewTitle')).toBeTruthy();
  });

  it('có thực đơn -> hiện số bữa đã lập', async () => {
    const view = await render(<WeeklyPlanShortcut onPress={jest.fn()} />);

    await waitFor(() => expect(view.getByText(/home.weekPlanViewSubtitle/)).toBeTruthy());
    // 2 ngày x 3 bữa = 6 bữa
    expect(view.getByText(/count/)).toBeTruthy();
  });

  it('chưa có thực đơn -> hiện empty, không crash', async () => {
    mockGetNextWeekPlan.mockResolvedValue(null);
    const view = await render(<WeeklyPlanShortcut onPress={jest.fn()} />);

    await waitFor(() => expect(view.getByText('home.weekPlanViewEmpty')).toBeTruthy());
  });

  it('API lỗi -> KHÔNG crash, vẫn hiện empty', async () => {
    mockGetNextWeekPlan.mockRejectedValue(new Error('Mạng lỗi'));
    const view = await render(<WeeklyPlanShortcut onPress={jest.fn()} />);

    await waitFor(() => expect(view.getByText('home.weekPlanViewEmpty')).toBeTruthy());
  });
});

describe('WeeklyPlanShortcut: điều hướng', () => {
  it('bấm nút -> gọi onPress', async () => {
    const onPress = jest.fn();
    const view = await render(<WeeklyPlanShortcut onPress={onPress} />);

    await act(async () => {
      await fireEvent.press(view.getByTestId('home-weekly-plan-shortcut'));
      await flush();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
