/**
 * ShoppingReminderScreen — test hiển thị "nơi cung cấp" (supplier suggestions)
 *
 * Yêu cầu nghiệp vụ:
 *   1. Món CÓ nhà cung cấp đã đăng ký -> hiện khối "nơi cung cấp" (tên công ty,
 *      sản phẩm, giá) để khuyến khích khách hàng mua.
 *   2. Món KHÔNG có nhà cung cấp -> KHÔNG hiện khung nào (UI gốc).
 *
 * Chỉ test logic KHÔNG NHÌN THẤY (quy tắc chung của repo):
 *   - Có render khối supplier hay không (dựa vào testID + tên công ty).
 *   - Không render khối supplier khi mảng rỗng.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { ShoppingReminderScreen } from '../ShoppingReminderScreen';

const mockGetShoppingList = jest.fn();

const mockServices = {
  recipeService: {
    getShoppingList: (...args) => mockGetShoppingList(...args),
    toggleShoppingItemInList: jest.fn(),
    removeShoppingListItem: jest.fn(),
    getActiveShoppingList: jest.fn(),
    addShoppingListItem: jest.fn(),
    updateShoppingListItem: jest.fn(),
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

const baseItem = (over = {}) => ({
  id: 1,
  listId: 'list-1',
  name: 'Thịt bò',
  quantity: 500,
  unit: 'g',
  done: false,
  estimatedPrice: 120000,
  supplierSuggestions: [],
  ...over,
});

describe('ShoppingReminderScreen — nơi cung cấp (supplier)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('món CÓ supplier -> hiện tên công ty + giá', async () => {
    mockGetShoppingList.mockResolvedValue([
      baseItem({
        id: 1,
        supplierSuggestions: [
          {
            supplierIngredientId: 'si-1',
            name: 'Thịt bò Wagyu',
            companyName: 'Công ty ABC',
            price: 150000,
            image: null,
          },
        ],
      }),
    ]);

    const view = await render(<ShoppingReminderScreen />);

    await waitFor(() => {
      expect(view.getByTestId('shopping-suppliers-1')).toBeTruthy();
    });

    expect(view.getByText('Công ty ABC')).toBeTruthy();
    expect(view.getByText('Thịt bò Wagyu')).toBeTruthy();
    expect(view.getByText(/150\.000/)).toBeTruthy();
  });

  it('món KHÔNG có supplier -> KHÔNG hiện khối "nơi cung cấp"', async () => {
    mockGetShoppingList.mockResolvedValue([
      baseItem({ id: 2, name: 'Cà chua', supplierSuggestions: [] }),
    ]);

    const view = await render(<ShoppingReminderScreen />);

    await waitFor(() => {
      expect(view.getByText('Cà chua')).toBeTruthy();
    });

    expect(view.queryByTestId('shopping-suppliers-2')).toBeNull();
  });

  it('món thiếu field supplierSuggestions -> KHÔNG hiện khối, KHÔNG crash', async () => {
    mockGetShoppingList.mockResolvedValue([
      { id: 3, listId: 'list-1', name: 'Hành tây', quantity: 3, unit: 'củ', done: false },
    ]);

    const view = await render(<ShoppingReminderScreen />);

    await waitFor(() => {
      expect(view.getByText('Hành tây')).toBeTruthy();
    });

    expect(view.queryByTestId('shopping-suppliers-3')).toBeNull();
  });

  it('hiện nhiều nhà cung cấp cho cùng 1 món', async () => {
    mockGetShoppingList.mockResolvedValue([
      baseItem({
        id: 4,
        supplierSuggestions: [
          { supplierIngredientId: 'a', name: 'Sản phẩm A', companyName: 'Cty A', price: 10000 },
          { supplierIngredientId: 'b', name: 'Sản phẩm B', companyName: 'Cty B', price: 20000 },
        ],
      }),
    ]);

    const view = await render(<ShoppingReminderScreen />);

    await waitFor(() => {
      expect(view.getByTestId('shopping-suppliers-4')).toBeTruthy();
    });

    expect(view.getByText('Cty A')).toBeTruthy();
    expect(view.getByText('Cty B')).toBeTruthy();
  });
});
