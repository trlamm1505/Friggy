import axiosClient from '../utils/axios';
import { API_BASE_URL, EXTRA_HEADERS } from '../utils/constants';

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
 * Đọc một luồng SSE từ Response.body (ReadableStream) và gọi onMessage
 * cho từng event đã parse.
 *
 * Vì sao không dùng EventSource:
 *   EventSource (browser API) KHÔNG cho gắn custom header. Mà header
 *   `ngrok-skip-browser-warning` là bắt buộc để ngrok bỏ qua trang cảnh báo.
 *   -> Dùng `fetch` + đọc stream để gắn được header.
 *
 * @param {Response} response - response từ fetch (response.body là ReadableStream)
 * @param {function} onMessage - callback nhận từng event { data }
 * @param {AbortSignal} signal - để hủy stream
 */
const readSseStream = async (response, onMessage, signal) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatch = (rawEvent) => {
    // Một SSE event gồm nhiều dòng "field: value", ngăn cách bằng dòng trống.
    const dataLines = rawEvent
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart());

    if (dataLines.length === 0) return;

    const raw = dataLines.join('\n');
    if (!raw || raw === '[DONE]') return;

    try {
      onMessage(JSON.parse(raw));
    } catch {
      // Ignore JSON parse errors
    }
  };

  try {
    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Tách theo dòng trống (kết thúc 1 SSE event)
      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        dispatch(rawEvent);
        separatorIndex = buffer.indexOf('\n\n');
      }
    }

    // Phần dưa lại cuối buffer (server đóng stream giữa chừng)
    if (buffer.trim()) dispatch(buffer);
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
};

/**
 * Lắng nghe SSE Stream token-by-token
 * GET /api/v1/public-chat/stream?key=...
 *
 * @param {string} streamKey - key nhận được từ sendPublicChatMessageApi
 * @param {function} onToken - callback nhận từng đoạn chữ (token)
 * @param {function} onDone - callback khi AI trả lời xong
 * @param {function} onError - callback khi gặp lỗi
 * @returns {{close: function}} handle để có thể close thủ công
 */
export const subscribePublicChatStream = (streamKey, { onToken, onDone, onError }) => {
  const url = `${API_BASE_URL}/public-chat/stream?key=${encodeURIComponent(streamKey)}`;
  const controller = new AbortController();

  let isCompleted = false;

  const handle = {
    close: () => {
      controller.abort();
    },
  };

  (async () => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          // Bỏ qua trang cảnh báo của ngrok (nếu API chạy qua ngrok).
          ...EXTRA_HEADERS,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      await readSseStream(
        response,
        (payload) => {
          const { event: evtType, data } = payload || {};

          if (evtType === 'chunk' || evtType === 'token') {
            if (onToken) onToken(data || '');
          } else if (evtType === 'ping') {
            // Keep-alive ping từ server — bỏ qua không render vào UI
          } else if (evtType === 'done') {
            isCompleted = true;
            controller.abort();
            if (onDone) onDone();
          } else if (evtType === 'error') {
            isCompleted = true;
            controller.abort();
            if (onError) onError(new Error(data || 'Streaming error'));
          }
        },
        controller.signal
      );

      // Stream kết thúc mà không có event "done" -> coi như lỗi gián đoạn
      if (!isCompleted) {
        isCompleted = true;
        if (onError) onError(new Error('Stream closed unexpectedly'));
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      isCompleted = true;
      if (onError) onError(err);
    }
  })();

  return handle;
};
