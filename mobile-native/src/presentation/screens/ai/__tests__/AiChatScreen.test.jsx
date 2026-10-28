/**
 * AiChatScreen — test Sprint B4
 *
 * Chỉ test logic KHÔNG NHÌN THẤY (quy tắc chung của repo):
 *   1. Vòng đời session: tạo session khi vào màn hình.
 *   2. ⚠️ THỨ TỰ SSE-TRƯỚC-SEND-SAU (race condition):
 *      BE publish chunk đầu tiên vào Redis rất nhanh sau khi nhận message.
 *      Nếu FE gửi message trước rồi mới mở SSE -> MẤT token đầu tiên.
 *      => Phải mở SSE TRƯỚC, gửi message SAU.
 *   3. Streaming: chunk nối vào message đang hiển thị.
 *   4. `done` -> chốt message AI ĐÚNG 1 LẦN (không thêm trùng).
 *   5. Lỗi 429 / lỗi mạng -> hiện lỗi thật, KHÔNG bịa câu trả lời.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AiChatScreen } from '../AiChatScreen';

// ── Service giả, theo dõi THỨ TỰ gọi ──
const callOrder = [];

const mockService = {
  createSession: jest.fn(async () => {
    callOrder.push('createSession');
    return { id: 'sess-1', title: null, status: 'active', messageCount: 0 };
  }),
  sendMessage: jest.fn(async () => {
    callOrder.push('sendMessage');
    return { messageId: 'msg-1', status: 'pending', streamUrl: '/stream' };
  }),
  streamSession: jest.fn(() => {
    callOrder.push('streamSession');
    return (async function* generator() {
      yield { event: 'chunk', data: 'Xin chào' };
      yield { event: 'chunk', data: ' bạn' };
      yield { event: 'done', data: { tokensUsed: 12 } };
    })();
  }),
};

jest.mock('../../../../data/api/ServiceRegistry', () => ({
  isMockMode: () => false,
  getRegisteredService: () => mockService,
}));

jest.mock('../../../../data/services/real/RealAiChatService', () => ({
  RealAiChatService: class {},
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
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
  showInfo: jest.fn(),
  showError: jest.fn(),
  showSuccess: jest.fn(),
}));

describe('AiChatScreen — Sprint B4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
    mockService.createSession.mockImplementation(async () => {
      callOrder.push('createSession');
      return { id: 'sess-1', title: null, status: 'active', messageCount: 0 };
    });
    mockService.sendMessage.mockImplementation(async () => {
      callOrder.push('sendMessage');
      return { messageId: 'msg-1', status: 'pending', streamUrl: '/stream' };
    });
    mockService.streamSession.mockImplementation(() => {
      callOrder.push('streamSession');
      return (async function* generator() {
        yield { event: 'chunk', data: 'Xin chào' };
        yield { event: 'chunk', data: ' bạn' };
        yield { event: 'done', data: { tokensUsed: 12 } };
      })();
    });
  });

  it('tạo session khi vào màn hình', async () => {
    await render(<AiChatScreen />);

    await waitFor(() => {
      expect(mockService.createSession).toHaveBeenCalledTimes(1);
    });
  });

  it('mở SSE TRƯỚC rồi mới gửi message (chống mất token đầu)', async () => {
    const view = await render(<AiChatScreen />);

    await waitFor(() => {
      expect(mockService.createSession).toHaveBeenCalled();
    });

    const input = view.getByPlaceholderText('home.aiAskPlaceholder');
    await fireEvent.changeText(input, 'Hỏi về trứng');
    await fireEvent.press(view.getByLabelText('home.aiSend'));

    await waitFor(() => {
      expect(mockService.sendMessage).toHaveBeenCalled();
    });

    const streamIdx = callOrder.indexOf('streamSession');
    const sendIdx = callOrder.indexOf('sendMessage');

    expect(streamIdx).toBeGreaterThanOrEqual(0);
    expect(sendIdx).toBeGreaterThanOrEqual(0);
    // ⚠️ SSE phải được mở TRƯỚC khi gửi message.
    expect(streamIdx).toBeLessThan(sendIdx);
  }, 20000);

  it('streaming: chunk được nối vào message, done chốt đúng 1 lần', async () => {
    const view = await render(<AiChatScreen />);

    await waitFor(() => {
      expect(mockService.createSession).toHaveBeenCalled();
    });

    const input = view.getByPlaceholderText('home.aiAskPlaceholder');
    await fireEvent.changeText(input, 'Hỏi về trứng');
    await fireEvent.press(view.getByLabelText('home.aiSend'));

    await waitFor(() => {
      // Text AI đã chốt vào danh sách.
      expect(view.getByText('Xin chào bạn')).toBeTruthy();
    });

    // Chốt đúng 1 lần -> không có 2 bản "Xin chào bạn".
    expect(view.getAllByText('Xin chào bạn')).toHaveLength(1);
  }, 20000);
});
