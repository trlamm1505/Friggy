/** Test cho useScanFlow (đồng bộ với render async của RNTL v14). */

import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useScanFlow } from '../useScanFlow';

const mockStartScan = jest.fn();
const mockPollScanResult = jest.fn();

jest.mock('../../../data/ServiceProvider', () => ({
  useServices: () => ({
    fridgeService: {
      scanImage: (...args) => mockStartScan(...args),
      scanReceipt: (...args) => mockStartScan(...args),
      scanBarcode: (...args) => mockStartScan(...args),
      pollScanResult: (...args) => mockPollScanResult(...args),
    },
  }),
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
        onPress={() => startScan(scanType, uri).then(setResult).catch(() => {})}
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

    fireEvent.press(view.getByTestId('start'));

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
  });

  it('poll lỗi thì phase=error và lưu error', async () => {
    mockStartScan.mockResolvedValue({ scanId: 's2', status: 'pending' });
    mockPollScanResult.mockRejectedValue(new Error('AI quá tải'));

    const view = await render(<Harness />);

    fireEvent.press(view.getByTestId('start'));

    await waitFor(() => {
      expect(view.getByTestId('phase').props.children).toBe('error');
    });
    expect(view.getByTestId('error').props.children).toBe('AI quá tải');
    expect(view.getByTestId('result').props.children).toBe('');
  });
});
