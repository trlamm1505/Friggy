/** Test cho useScanFlow (đồng bộ với render async của RNTL v14). */

import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useScanFlow } from '../useScanFlow';

const mockStartScan = jest.fn();
const mockPollScanResult = jest.fn();

// ⚠️ Phải trả CÙNG một object cho mọi lần render. Nếu tạo object mới mỗi
// lần, `startScan` (useCallback deps [services]) đổi identity mỗi render.
const mockServices = {
  fridgeService: {
    scanImage: (...args) => mockStartScan(...args),
    scanReceipt: (...args) => mockStartScan(...args),
    scanBarcode: (...args) => mockStartScan(...args),
    pollScanResult: (...args) => mockPollScanResult(...args),
  },
};

jest.mock('../../../data/ServiceProvider', () => ({
  useServices: () => mockServices,
}));

const Harness = ({ scanType = 'image', uri = 'file:///photo.jpg' }) => {
  const { phase, error, startScan } = useScanFlow();
  const [result, setResult] = React.useState(null);
  return (
    <>
      <Text testID="phase">{phase}</Text>
      <Text testID="error">{error ? error.message : ''}</Text>
      <Text testID="result">{result ? JSON.stringify(result) : ''}</Text>
      <Pressable
        testID="start"
        onPress={() =>
          startScan(scanType, uri)
            .then(setResult)
            .catch(() => {})
        }
      />
    </>
  );
};

describe('useScanFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('upload xong rồi poll, trả items đã chuẩn hoá', async () => {
    mockStartScan.mockResolvedValue({ scanId: 's1', status: 'pending' });
    mockPollScanResult.mockResolvedValue({
      scanId: 's1',
      scanType: 'image',
      status: 'success',
      items: [{ name: 'Cà chua', quantity: 2, unit: 'quả', confidence: 0.9 }],
    });

    const view = await render(<Harness />);

    // `fireEvent.press` của RTL v14 đã wrap trong act() và trả promise ->
    // phải await để tránh cập nhật state ngoài act().
    await fireEvent.press(view.getByTestId('start'));

    await waitFor(() => {
      expect(view.getByTestId('result').props.children).not.toBe('');
    });
    expect(view.getByTestId('phase').props.children).toBe('idle');

    expect(mockStartScan).toHaveBeenCalledWith('file:///photo.jpg');
    const parsed = JSON.parse(view.getByTestId('result').props.children);
    expect(parsed.scanId).toBe('s1');
    expect(parsed.items[0]).toMatchObject({
      name: 'Cà chua',
      quantity: 2,
      unit: 'quả',
      storageLocation: 'fridge',
    });
    expect(parsed.items[0].clientId).toBeTruthy();
    // Timeout 5s của jest quá chặt: test đầu tiên trong 1 file phải chịu
    // chi phí transform/cache của jest-expo (~2-4s). Nới lên 20s để CI chạy
    // nhiều worker vẫn ổn định.
  }, 20000);

  it('poll lỗi thì phase=error và lưu error', async () => {
    mockStartScan.mockResolvedValue({ scanId: 's2', status: 'pending' });
    mockPollScanResult.mockRejectedValue(new Error('AI quá tải'));

    const view = await render(<Harness />);

    await fireEvent.press(view.getByTestId('start'));

    await waitFor(() => {
      expect(view.getByTestId('phase').props.children).toBe('error');
    });
    expect(view.getByTestId('error').props.children).toBe('AI quá tải');
    expect(view.getByTestId('result').props.children).toBe('');
  });
});
