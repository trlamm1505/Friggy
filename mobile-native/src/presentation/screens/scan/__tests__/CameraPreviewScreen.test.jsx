/** Test cho CameraPreviewScreen (ScanResultReview) — nhánh confirmScan thật. */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CameraPreviewScreen } from '../CameraPreviewScreen';

const mockConfirmScan = jest.fn();
const mockPopToTop = jest.fn();
const mockGoBack = jest.fn();

jest.mock('../../../../data/ServiceProvider', () => ({
  useServices: () => ({ fridgeService: { confirmScan: (...args) => mockConfirmScan(...args) } }),
}));

const mockParams = { value: {} };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ popToTop: mockPopToTop, goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams.value }),
}));

jest.mock('../../../utils/helpers', () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showInfo: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts?.count ?? key,
    i18n: { language: 'vi' },
  }),
}));

describe('CameraPreviewScreen confirmScan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.value = {
      scanId: 'scan-1',
      scanType: 'image',
      items: [
        {
          clientId: 'scan-1-0',
          ingredientId: 5,
          name: 'Cà chua',
          quantity: 2,
          unit: 'quả',
          confidence: 0.9,
          needsConfirm: false,
          allergyWarning: true,
          storageLocation: 'fridge',
        },
      ],
    };
  });

  it('bấm Lưu -> xác nhận -> gọi confirmScan với payload chuẩn BE', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
      buttons[1].onPress();
    });
    mockConfirmScan.mockResolvedValue([{ id: 'item-1' }]);

    const view = await render(<CameraPreviewScreen />);

    const saveBtn = view.getByText('home.scanAddToFridge');
    fireEvent.press(saveBtn);
    await saveBtn.props.onPress?.();

    await waitFor(() => {
      expect(mockConfirmScan).toHaveBeenCalledWith('scan-1', [
        { name: 'Cà chua', quantity: 2, unit: 'quả', storageLocation: 'fridge', ingredientId: 5 },
      ]);
    });
    expect(mockPopToTop).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('không có scanId -> không gọi BE, hiện cảnh báo quét lại', async () => {
    mockParams.value = { items: [{ name: 'Sữa' }] };
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const view = await render(<CameraPreviewScreen />);

    const saveBtn = view.getByText('home.scanAddToFridge');
    fireEvent.press(saveBtn);
    await saveBtn.props.onPress?.();

    expect(mockConfirmScan).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
