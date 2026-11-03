/**
 * FridgeItemActions — test cho bottom sheet thao tác trên 1 nguyên liệu.
 *
 * VÌ SAO CẦN TEST NÀY:
 *   Đây là nơi DUY NHẤT gọi `updateItem` / `markConsumed` / `deleteItem` —
 *   3 method đã có sẵn trong `RealFridgeService` nhưng trước đó không màn nào
 *   gọi tới (CRUD thực tế chỉ có Create + Read). Mọi bug ở đây đều là bug
 *   MẤT DỮ LIỆU (xoá nhầm lượng còn lại, xoá 2 lần, gửi số lượng 0).
 *
 * CÁCH TEST:
 *   `@testing-library/react-native` v14 + RN 0.86 -> `render` VÀ `fireEvent`
 *   đều là ASYNC (dùng `test-renderer` mới, không phải `react-test-renderer`
 *   cũ). Bỏ `await` sẽ gây "overlapping act() calls" và assertion chạy trước
 *   lúc state cập nhật -> test FAIL giả.
 *
 *   Component được mock 3 dependency để test độc lập:
 *     - `useServices`  -> service giả, để assert đúng method được gọi
 *     - `useTranslation` -> `t` trả về chính key (dễ assert)
 *     - `useSafeAreaInsets` -> inset cố định
 *     - `helpers` (toast) -> spy để assert thông báo lỗi/thành công
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockService = {
  updateItem: jest.fn(),
  markConsumed: jest.fn(),
  deleteItem: jest.fn(),
};

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('../../../../data/ServiceProvider', () => ({
  useServices: () => ({ fridgeService: mockService }),
}));

jest.mock('../../../utils/helpers', () => ({
  showSuccess: (...args) => mockShowSuccess(...args),
  showError: (...args) => mockShowError(...args),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'vi' } }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const { FridgeItemActions } = require('../FridgeItemActions');

// Timeout mặc định của Jest là 5s. Lần render ĐẦU file phải nạp
// `lucide-react-native` + `react-native-svg` (rất nặng trong môi trường Node)
// -> có thể vượt 5s dù test logic chỉ mất vài chục ms.
jest.setTimeout(30000);

const ITEM = {
  id: 'item-1',
  name: 'Cà chua',
  quantity: 5,
  unit: 'quả',
  status: 'fresh',
};

/** Render sheet với các callback mặc định (không quan tâm trong test này). */
const renderSheet = (props = {}) =>
  render(
    <FridgeItemActions item={ITEM} visible onClose={() => {}} onChanged={() => {}} {...props} />
  );

/**
 * Đợi hết microtask + 1 macrotask.
 *
 * ⚠️ VÌ SAO CẦN:
 *   RTL v14 `fireEvent` gọi `act(() => { returnValue = handler(...data); })`.
 *   Vì callback có block body nên `act` trả về `undefined` -> scope của act
 *   đóng ở microtask kế tiếp. Nếu gọi `fireEvent` lần 2 TRONG cùng tick thì
 *   act scope lần 1 chưa đóng -> React báo "overlapping act() calls".
 *   `setTimeout(0)` đảm bảo mọi microtask đã drain.
 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Bấm 1 phần tử.
 *
 * ⚠️ `fireEvent` v14 là async, và handler trong component cũng async
 * (`await fridgeService.updateItem(...)` -> `setState` ở `finally`).
 *
 * ⚠️ VÌ SAO `await fireEvent.press(...)` CHỜ CẢ handler:
 *   RTL gọi `act(() => { returnValue = handler(...data); })` rồi `return
 *   returnValue`. Promise của `act` được resolve BẰNG promise của handler ->
 *   theo quy tắc adopt-thenable của ECMAScript, `await fireEvent.press(...)`
 *   sẽ chờ tới khi handler xong hẳn (kể cả phần `finally` -> `setSaving`).
 *   Hệ quả: KHÔNG được `await` khi ta cố ý để request "đang bay" (xem test
 *   double submit) -> sẽ treo vô hạn.
 *
 * ⚠️ VÌ SAO cần flush thêm sau khi bấm:
 *   Phần `await updateItem(...)` rồi `setSaving(false)` có thể chạy ở
 *   microtask SAU scope act -> React báo "An update to FridgeItemActions inside
 *   a test was not wrapped in act(...)". `setTimeout(0)` đẩy hết microtask
 *   queue vào trong scope act.
 */
const press = async (element) => {
  await fireEvent.press(element);
  await act(async () => {
    await flush();
  });
};

/** Nhập text vào ô (fireEvent v14 là async -> phải await). */
const type = (element, text) => fireEvent.changeText(element, text);

/**
 * `Alert.alert` trong test: nắm lấy danh sách button để test bấm "xác nhận"
 * hoặc "hủy" như user thật (RN không tự render dialog trong test).
 */
const captureAlert = () => jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const clickAlertButton = async (spy, label) => {
  const buttons = spy.mock.calls[0][2] || [];
  const button = buttons.find((b) => b.text === label);
  expect(button).toBeDefined();
  // `onPress` được gọi TRỰC TIẾP (không qua fireEvent) -> phải bọc `act`
  // để các `setState` bên trong (vd `setBusy(null)` khi bấm "Hủy") nằm
  // trong scope act của React.
  await act(async () => {
    await button.onPress?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockService.updateItem.mockResolvedValue({});
  mockService.markConsumed.mockResolvedValue({});
  mockService.deleteItem.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('FridgeItemActions: hiển thị', () => {
  it('item = null -> không render gì cả', async () => {
    const view = await render(
      <FridgeItemActions item={null} visible onClose={() => {}} onChanged={() => {}} />
    );

    expect(view.queryByTestId('fridge-actions-save')).toBeNull();
    expect(view.toJSON()).toBeNull();
  });

  it('hiện tên nguyên liệu + số lượng + đơn vị ban đầu', async () => {
    const view = await renderSheet();

    expect(view.getByText('Cà chua')).toBeTruthy();
    expect(view.getByTestId('fridge-actions-qty-input').props.value).toBe('5');
    expect(view.getByTestId('fridge-actions-unit-quả')).toBeTruthy();
  });

  it('item KHÔNG có quantity -> mặc định 1; không có unit -> mặc định kg', async () => {
    const view = await render(
      <FridgeItemActions
        item={{ id: 'x', name: 'Gia vị' }}
        visible
        onClose={() => {}}
        onChanged={() => {}}
      />
    );

    expect(view.getByTestId('fridge-actions-qty-input').props.value).toBe('1');
    expect(view.getByTestId('fridge-actions-unit-kg')).toBeTruthy();
  });

  it('đổi sang item KHÁC -> số lượng/đơn vị về giá trị của item mới', async () => {
    // Không được dùng lại draft của item cũ (số lượng 5, đơn vị "quả").
    const view = await render(
      <FridgeItemActions item={ITEM} visible onClose={() => {}} onChanged={() => {}} />
    );

    await type(view.getByTestId('fridge-actions-qty-input'), '9');
    expect(view.getByTestId('fridge-actions-qty-input').props.value).toBe('9');

    await view.rerender(
      <FridgeItemActions
        item={{ id: 'item-2', name: 'Sữa tươi', quantity: 2, unit: 'hộp' }}
        visible
        onClose={() => {}}
        onChanged={() => {}}
      />
    );

    expect(view.getByTestId('fridge-actions-qty-input').props.value).toBe('2');
    expect(view.getByTestId('fridge-actions-unit-hộp')).toBeTruthy();
  });

  it('đơn vị lạ (không có trong bảng 15) -> vẫn render được pill của đơn vị đó', async () => {
    const view = await render(
      <FridgeItemActions
        item={{ id: 'x', name: 'Mật ong', quantity: 1, unit: 'chai-thuong' }}
        visible
        onClose={() => {}}
        onChanged={() => {}}
      />
    );

    expect(view.getByTestId('fridge-actions-unit-chai-thuong')).toBeTruthy();
    expect(view.getByTestId('fridge-actions-unit-kg')).toBeTruthy();
  });
});

describe('FridgeItemActions: stepper số lượng', () => {
  it('bấm + với đơn vị đếm được -> tăng 1', async () => {
    const view = await renderSheet();

    await press(view.getByTestId('fridge-actions-qty-plus'));

    expect(view.getByTestId('fridge-actions-qty-input').props.value).toBe('6');
  });

  it('bấm + với đơn vị nhỏ (g/gram/ml) -> tăng 50', async () => {
    const view = await render(
      <FridgeItemActions
        item={{ id: 'x', name: 'Thịt heo', quantity: 300, unit: 'g' }}
        visible
        onClose={() => {}}
        onChanged={() => {}}
      />
    );

    await press(view.getByTestId('fridge-actions-qty-plus'));

    expect(view.getByTestId('fridge-actions-qty-input').props.value).toBe('350');
  });

  it('bấm - khi số lượng nhỏ hơn bước -> KHÔNG xuống âm', async () => {
    const view = await render(
      <FridgeItemActions
        item={{ id: 'x', name: 'Sữa', quantity: 1, unit: 'kg' }}
        visible
        onClose={() => {}}
        onChanged={() => {}}
      />
    );

    await press(view.getByTestId('fridge-actions-qty-minus'));

    expect(view.getByTestId('fridge-actions-qty-input').props.value).toBe('0');
  });

  it('ô nhập rỗng rồi bấm + -> coi như 0, không sinh NaN', async () => {
    const view = await renderSheet();

    await type(view.getByTestId('fridge-actions-qty-input'), '');
    await press(view.getByTestId('fridge-actions-qty-plus'));

    expect(view.getByTestId('fridge-actions-qty-input').props.value).toBe('1');
  });
});

describe('FridgeItemActions: lưu thay đổi', () => {
  it('bấm Lưu -> gọi updateItem với { quantity, unit }', async () => {
    const view = await renderSheet();

    await type(view.getByTestId('fridge-actions-qty-input'), '7');
    await press(view.getByTestId('fridge-actions-save'));

    expect(mockService.updateItem).toHaveBeenCalledTimes(1);
    expect(mockService.updateItem).toHaveBeenCalledWith('item-1', {
      quantity: 7,
      unit: 'quả',
    });
  });

  it('đổi đơn vị rồi Lưu -> gửi đơn vị mới', async () => {
    const view = await renderSheet();

    await press(view.getByTestId('fridge-actions-unit-kg'));
    await press(view.getByTestId('fridge-actions-save'));

    expect(mockService.updateItem).toHaveBeenCalledWith('item-1', {
      quantity: 5,
      unit: 'kg',
    });
  });

  it('nhập "1,5" (dấu phẩy kiểu VN) -> gửi 1.5', async () => {
    const view = await renderSheet();

    await type(view.getByTestId('fridge-actions-qty-input'), '1,5');
    await press(view.getByTestId('fridge-actions-save'));

    expect(mockService.updateItem).toHaveBeenCalledWith('item-1', {
      quantity: 1.5,
      unit: 'quả',
    });
  });

  it('ô nhập rỗng -> KHÔNG gọi API, hiện lỗi (không âm thầm gửi quantity = 0)', async () => {
    const view = await renderSheet();

    await type(view.getByTestId('fridge-actions-qty-input'), '');
    await press(view.getByTestId('fridge-actions-save'));

    expect(mockService.updateItem).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalledWith('fridge.invalidQuantity');
  });

  it('ô nhập sai định dạng ("abc") -> KHÔNG gọi API', async () => {
    const view = await renderSheet();

    await type(view.getByTestId('fridge-actions-qty-input'), 'abc');
    await press(view.getByTestId('fridge-actions-save'));

    expect(mockService.updateItem).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalledWith('fridge.invalidQuantity');
  });

  it('Lưu thành công -> báo thành công + gọi onChanged + đóng sheet', async () => {
    const onChanged = jest.fn();
    const onClose = jest.fn();
    const view = await renderSheet({ onChanged, onClose });

    await press(view.getByTestId('fridge-actions-save'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockShowSuccess).toHaveBeenCalledWith('fridge.updated');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('API lỗi -> hiện lỗi THẬT (message của BE), KHÔNG đóng sheet', async () => {
    mockService.updateItem.mockRejectedValue(new Error('Số lượng không hợp lệ'));
    const onChanged = jest.fn();
    const onClose = jest.fn();
    const view = await renderSheet({ onChanged, onClose });

    await press(view.getByTestId('fridge-actions-save'));

    await waitFor(() => expect(mockShowError).toHaveBeenCalled());
    expect(mockShowError).toHaveBeenCalledWith('Số lượng không hợp lệ');
    expect(onChanged).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('API lỗi KHÔNG có message -> dùng key i18n dự phòng', async () => {
    mockService.updateItem.mockRejectedValue(new Error(''));
    const view = await renderSheet();

    await press(view.getByTestId('fridge-actions-save'));

    await waitFor(() => expect(mockShowError).toHaveBeenCalled());
    expect(mockShowError).toHaveBeenCalledWith('fridge.updateFailed');
  });

  it('bấm Lưu 2 lần liên tiếp -> chỉ gọi API 1 lần (chống double submit)', async () => {
    let resolveFn;
    mockService.updateItem.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFn = resolve;
        })
    );

    const view = await renderSheet();

    const saveBtn = view.getByTestId('fridge-actions-save');

    // ⚠️ KHÔNG `await fireEvent.press(...)` ở đây:
    //   RTL trả về promise của HANDLER -> await là chờ request "đang bay"
    //   -> treo vô hạn (mock không resolve). Ta chỉ cần handler được gọi
    //   (điều này xảy ra ĐỒNG BỘ trong `fireEvent`), nên giữ promise lại rồi
    //   resolve ở cuối test.
    const first = fireEvent.press(saveBtn);
    // Request đang bay -> nhưng khoá ref đã chặn lần bấm thứ 2.
    expect(mockService.updateItem).toHaveBeenCalledTimes(1);

    // Tách 2 lần bấm bằng 1 macrotask để act scope của lần 1 đã đóng
    // -> không bị React cảnh báo "overlapping act() calls".
    await flush();

    const second = fireEvent.press(saveBtn);
    expect(mockService.updateItem).toHaveBeenCalledTimes(1);

    await flush();

    // Resolve trong `act` để `setSaving(false)` ở `finally` không bị React
    // báo "update not wrapped in act(...)".
    await act(async () => {
      resolveFn?.({});
      await Promise.all([first, second]);
    });
  });
});

describe('FridgeItemActions: đánh dấu đã dùng hết', () => {
  it('bấm -> hiện dialog xác nhận, CHƯA gọi API', async () => {
    const alertSpy = captureAlert();
    const view = await renderSheet();

    await press(view.getByTestId('fridge-actions-consume'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe('fridge.usedAll');
    expect(mockService.markConsumed).not.toHaveBeenCalled();
  });

  it('bấm "Hủy" -> KHÔNG gọi API', async () => {
    const alertSpy = captureAlert();
    const view = await renderSheet();

    await press(view.getByTestId('fridge-actions-consume'));
    await clickAlertButton(alertSpy, 'common.cancel');

    expect(mockService.markConsumed).not.toHaveBeenCalled();
  });

  it('bấm "Đã dùng hết" trong dialog -> gọi markConsumed + đóng sheet', async () => {
    const alertSpy = captureAlert();
    const onChanged = jest.fn();
    const onClose = jest.fn();
    const view = await renderSheet({ onChanged, onClose });

    await press(view.getByTestId('fridge-actions-consume'));
    await clickAlertButton(alertSpy, 'fridge.usedAll');

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockService.markConsumed).toHaveBeenCalledTimes(1);
    expect(mockService.markConsumed).toHaveBeenCalledWith('item-1');
    expect(mockShowSuccess).toHaveBeenCalledWith('fridge.consumed');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('API lỗi -> hiện lỗi thật, KHÔNG đóng sheet', async () => {
    mockService.markConsumed.mockRejectedValue(new Error('Không tìm thấy món'));
    const alertSpy = captureAlert();
    const onClose = jest.fn();
    const view = await renderSheet({ onClose });

    await press(view.getByTestId('fridge-actions-consume'));
    await clickAlertButton(alertSpy, 'fridge.usedAll');

    await waitFor(() => expect(mockShowError).toHaveBeenCalled());
    expect(mockShowError).toHaveBeenCalledWith('Không tìm thấy món');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('FridgeItemActions: xóa khỏi tủ', () => {
  it('bấm -> hiện dialog xác nhận, CHƯA gọi API', async () => {
    const alertSpy = captureAlert();
    const view = await renderSheet();

    await press(view.getByTestId('fridge-actions-delete'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(mockService.deleteItem).not.toHaveBeenCalled();
  });

  it('bấm "Hủy" -> KHÔNG gọi API', async () => {
    const alertSpy = captureAlert();
    const view = await renderSheet();

    await press(view.getByTestId('fridge-actions-delete'));
    await clickAlertButton(alertSpy, 'common.cancel');

    expect(mockService.deleteItem).not.toHaveBeenCalled();
  });

  it('bấm "Xóa khỏi tủ" -> gọi deleteItem + đóng sheet', async () => {
    const alertSpy = captureAlert();
    const onChanged = jest.fn();
    const onClose = jest.fn();
    const view = await renderSheet({ onChanged, onClose });

    await press(view.getByTestId('fridge-actions-delete'));
    await clickAlertButton(alertSpy, 'fridge.deleteFromFridge');

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockService.deleteItem).toHaveBeenCalledTimes(1);
    expect(mockService.deleteItem).toHaveBeenCalledWith('item-1');
    expect(mockShowSuccess).toHaveBeenCalledWith('fridge.deleted');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('API lỗi -> hiện lỗi thật, KHÔNG đóng sheet', async () => {
    mockService.deleteItem.mockRejectedValue(new Error('Quyền bị từ chối'));
    const alertSpy = captureAlert();
    const onClose = jest.fn();
    const view = await renderSheet({ onClose });

    await press(view.getByTestId('fridge-actions-delete'));
    await clickAlertButton(alertSpy, 'fridge.deleteFromFridge');

    await waitFor(() => expect(mockShowError).toHaveBeenCalled());
    expect(mockShowError).toHaveBeenCalledWith('Quyền bị từ chối');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('FridgeItemActions: đóng sheet', () => {
  it('bấm backdrop -> gọi onClose', async () => {
    const onClose = jest.fn();
    const view = await renderSheet({ onClose });

    await press(view.getByTestId('fridge-actions-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('bấm trong vùng sheet (nút +) -> KHÔNG đóng sheet', async () => {
    const onClose = jest.fn();
    const view = await renderSheet({ onClose });

    await press(view.getByTestId('fridge-actions-qty-plus'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('đóng sheet rồi mở lại -> số lượng về giá trị GỐC của item (không giữ draft)', async () => {
    // Nếu giữ draft, user sửa 5 -> 9 rồi đóng sheet -> mở lại thấy 9 ->
    // tưởng số lượng trong tủ đã đổi dù chưa bấm "Lưu".
    const onClose = jest.fn();
    const view = await renderSheet({ onClose });

    await type(view.getByTestId('fridge-actions-qty-input'), '9');
    expect(view.getByTestId('fridge-actions-qty-input').props.value).toBe('9');

    await press(view.getByTestId('fridge-actions-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('FridgeItemActions: ô nhập số lượng', () => {
  it('ô nhập là TextInput thật, nhận được text từ bàn phím', async () => {
    const view = await renderSheet();

    const input = view.getByTestId('fridge-actions-qty-input');
    expect(input.props.keyboardType).toBe('decimal-pad');

    await type(input, '12');
    expect(view.getByTestId('fridge-actions-qty-input').props.value).toBe('12');
  });
});
