import axiosClient from '../utils/axios';
import { API_BASE_URL } from '../utils/constants';

/**
 * Lấy lịch sử chat của session hiện tại
 * GET /api/v1/public-chat/history?sessionId=...
 */
export const getPublicChatHistoryApi = async (sessionId) => {
  if (!sessionId) return { messages: [], expired: true };
  return await axiosClient.get('/public-chat/history', {
    params: { sessionId },
  });
};

/**
 * Gửi tin nhắn chatbot công khai -> Nhận streamKey & sessionId
 * POST /api/v1/public-chat/messages
 */
export const sendPublicChatMessageApi = async (message, sessionId = null) => {
  return await axiosClient.post('/public-chat/messages', {
    message,
    sessionId: sessionId || undefined,
  });
};

/**
 * Lắng nghe SSE Stream token-by-token bằng EventSource
 * GET /api/v1/public-chat/stream?key=...
 *
 * @param {string} streamKey - key nhận được từ sendPublicChatMessageApi
 * @param {function} onToken - callback nhận từng đoạn chữ (token)
 * @param {function} onDone - callback khi AI trả lời xong
 * @param {function} onError - callback khi gặp lỗi
 * @returns {EventSource} eventSource object để có thể close thủ công
 */
export const subscribePublicChatStream = (streamKey, { onToken, onDone, onError }) => {
  const url = `${API_BASE_URL}/public-chat/stream?key=${encodeURIComponent(streamKey)}`;
  const eventSource = new EventSource(url);

  let isCompleted = false;

  eventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      const { event: evtType, data } = payload || {};

      if (evtType === 'chunk' || evtType === 'token') {
        if (onToken) onToken(data || '');
      } else if (evtType === 'ping') {
        // Keep-alive ping từ server — bỏ qua không render vào UI
      } else if (evtType === 'done') {
        isCompleted = true;
        eventSource.close();
        if (onDone) onDone();
      } else if (evtType === 'error') {
        isCompleted = true;
        eventSource.close();
        if (onError) onError(new Error(data || 'Streaming error'));
      }
    } catch {
      // Ignore JSON parse errors
    }
  };

  eventSource.onerror = (err) => {
    eventSource.close();
    if (!isCompleted && onError) {
      onError(err);
    }
  };

  return eventSource;
};
