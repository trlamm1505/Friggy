/**
 * SseClient - đọc chuỗi SSE (Server-Sent Events) trong React Native
 *
 * Sprint B4 - dùng chung cho AI Chat streaming và Meal Planning progress.
 *
 * ⚠️ TẠI SAO KHÔNG DÙNG `EventSource`:
 *   `EventSource` native của RN không cho set header tùy chỉnh -> không gắn
 *   được `Authorization: Bearer ...`. BE (`JwtAuthGuard` global) chặn 401.
 *   => Dùng `fetch` streaming, cho phép set header tuỳ ý.
 *
 * ⚠️ TẠI SAO `expo/fetch` CHỨ KHÔNG `globalThis.fetch`:
 *   RN's built-in fetch (whatwg-fetch polyfill) KHÔNG hỗ trợ
 *   `response.body` là ReadableStream -> không đọc được chunk theo thời gian thực.
 *   `expo/fetch` (Expo SDK 57) dùng native module `ExpoFetchModule`, có
 *   `response.body` là ReadableStream thật -> đọc chunk tới khi server đóng.
 *   Đã kiểm tra trong `node_modules/expo/src/winter/fetch/FetchResponse.ts`:
 *   sự kiện `didReceiveResponseData` đẩy từng chunk vào stream.
 *
 * ⚠️ `expo/fetch` chỉ có trên native (apple/android). Trên web dùng
 *   `globalThis.fetch` (bản web của expo/fetch chính là `globalThis.fetch`).
 *   => Chọn implementation theo `Platform.OS`.
 *
 * Quy tắc tuân thủ:
 *   R3 - lỗi mạng / lỗi server phải phân biệt rõ (ApiException)
 *   R4 - file này là tầng API, KHÔNG import service khác
 *   R5 - token chỉ đọc qua TokenStorage
 *   R7 - comment tiếng Việt
 */

import { Platform } from 'react-native';
import { TokenStorage } from '../storage/TokenStorage';
import { ApiException } from './ApiException';
import { appConfig } from '../../shared/config/appConfig';

/**
 * Đọc `response.body` (ReadableStream) và yield từng chunk `Uint8Array`.
 *
 * ⚠️ `TextDecoder` là global của Hermes từ RN 0.74+ nhưng để chắc chắn,
 * dùng `TextDecoder` nếu có, fallback sang decode thủ công byte-by-byte UTF-8.
 *
 * @param {ReadableStream|null} body
 * @returns {AsyncGenerator<string>} từng đoạn text (đã decode UTF-8)
 */
async function* readChunks(body) {
  if (!body) return;

  const reader = body.getReader();
  const decoder = createDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      const text = decoder.decode(value, { stream: true });
      if (text) yield text;
    }

    // Flush phần còn lại trong buffer của decoder (thiếu byte cuối).
    const tail = decoder.decode();
    if (tail) yield tail;
  } finally {
    // Đóng reader để không rò rỉ kết nối khi component unmount.
    try {
      reader.releaseLock();
    } catch (_e) {
      // Reader đã bị release -> bỏ qua.
    }
  }
}

/**
 * Tạo decoder UTF-8.
 *
 * Hermes có `TextDecoder` global từ RN 0.74. Nếu không có (môi trường cũ,
 * hoặc test jest không polyfill), fallback sang decoder thủ công.
 *
 * @returns {{decode:(chunk:Uint8Array, opts?:{stream?:boolean}) => string}}
 */
function createDecoder() {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8');
  }

  // Fallback: decode từng byte, giữ byte chưa hoàn chỉnh ở cuối.
  let pending = [];

  return {
    decode(chunk, opts) {
      const bytes = Array.from(chunk);
      const buffer = pending.concat(bytes);
      const isStream = Boolean(opts?.stream);
      // Nếu đang stream -> giữ lại tối đa 3 byte cuối (UTF-8 tối đa 4 byte)
      // vì có thể mới đến 1 nửa ký tự đa byte.
      const cut = isStream ? Math.max(0, buffer.length - 3) : 0;
      const usable = buffer.slice(0, cut);
      pending = buffer.slice(cut);

      let out = '';
      for (let i = 0; i < usable.length;) {
        const byte = usable[i];
        let codePoint;
        let size;

        if (byte < 0x80) {
          codePoint = byte;
          size = 1;
        } else if ((byte & 0xe0) === 0xc0) {
          codePoint = byte & 0x1f;
          size = 2;
        } else if ((byte & 0xf0) === 0xe0) {
          codePoint = byte & 0x0f;
          size = 3;
        } else if ((byte & 0xf8) === 0xf0) {
          codePoint = byte & 0x07;
          size = 4;
        } else {
          // Byte không hợp lệ -> bỏ qua.
          i += 1;
          continue;
        }

        if (i + size > usable.length) break;

        for (let k = 1; k < size; k += 1) {
          codePoint = (codePoint << 6) | (usable[i + k] & 0x3f);
        }

        out += String.fromCodePoint(codePoint);
        i += size;
      }

      return out;
    },
  };
}

/**
 * Fetch implementation tương thích streaming.
 *
 * - Native: `expo/fetch` -> `response.body` là ReadableStream thật.
 * - Web: `globalThis.fetch` -> browser fetch cũng có ReadableStream.
 *
 * @param {string} url
 * @param {object} init
 * @returns {Promise<Response>}
 */
async function streamingFetch(url, init) {
  if (Platform.OS === 'web') {
    return globalThis.fetch(url, init);
  }

  // Import động để web bundle không kéo theo native module.
  const { fetch: expoFetch } = require('expo/fetch');
  return expoFetch(url, init);
}

/**
 * Parse 1 khối SSE thành event.
 *
 * ⚠️ BE dùng 2 kiểu format KHÁC NHAU:
 *
 * 1. AI Chat (`@Sse()` của NestJS) -> chỉ có dòng `data: {...}`, KHÔNG có
 *    dòng `event:`. NestJS tự đóng gói thành `data: {"type":"message","data":"..."}`.
 *    Payload bên trong lại là `{ event: 'chunk'|'done'|'error', data: ... }`.
 *
 * 2. Meal Planning (viết tay bằng `res.write`) -> có cả dòng `event: <name>`
 *    và dòng `data: {...}`.
 *
 * => Parser phải giữ cả 2: đọc `event:` (nếu có) + `data:` (gộp nhiều dòng).
 *
 * @param {string} block - khối text hoàn chỉnh giữa 2 lần `\n\n`
 * @returns {{event:string|null, data:string}|null}
 */
export function parseSseBlock(block) {
  if (!block) return null;

  const lines = block.split('\n');
  let event = null;
  const dataLines = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (!line) continue;
    // Comment (heartbeat) -> bỏ qua.
    if (line.startsWith(':')) continue;

    const colonIndex = line.indexOf(':');
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
    let value = colonIndex === -1 ? '' : line.slice(colonIndex + 1);
    // Một space sau `:` là tuỳ chọn theo chuẩn SSE.
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'event') {
      event = value;
    } else if (field === 'data') {
      dataLines.push(value);
    }
    // `id` và `retry` -> bỏ qua, không dùng.
  }

  if (dataLines.length === 0 && !event) return null;

  return { event, data: dataLines.join('\n') };
}

/**
 * Unwrap payload SSE lồng nhau.
 *
 * ⚠️ NestJS `@Sse()` bọc mỗi event thành:
 *   `{ type: 'message', data: '<json string>' }`
 * Và `ResponseSuccessInterceptor` có thể bọc thêm `{ statusCode, message, data }`.
 *
 * Mục tiêu: trả về object có `event` + `data` đã chuẩn hoá, giống hệt logic
 * `_normalizeSsePayload` của Flutter (`Mobile/lib/data/services/ai_chat_service.dart:117`).
 *
 * @param {any} parsed - JSON đã parse
 * @returns {{event:string, data:any}}
 */
export function normalizeSsePayload(parsed) {
  if (parsed === null || parsed === undefined) {
    return { event: 'unknown', data: null };
  }

  if (typeof parsed === 'string') {
    const trimmed = parsed.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        return normalizeSsePayload(JSON.parse(trimmed));
      } catch (_e) {
        // Không parse được -> coi như chunk text thô.
      }
    }
    return { event: 'chunk', data: parsed };
  }

  if (typeof parsed !== 'object') {
    return { event: 'chunk', data: parsed };
  }

  // NestJS @Sse(): { type: 'message', data: '<json>' }
  if (parsed.type === 'message' && typeof parsed.data === 'string') {
    try {
      return normalizeSsePayload(JSON.parse(parsed.data));
    } catch (_e) {
      return { event: 'chunk', data: parsed.data };
    }
  }

  // NestJS interceptor wrapper: { statusCode, message, data }
  if (
    'data' in parsed &&
    ('statusCode' in parsed || 'message' in parsed || 'success' in parsed) &&
    !('event' in parsed)
  ) {
    return normalizeSsePayload(parsed.data);
  }

  // Payload chuẩn đã có `event`.
  //
  // ⚠️ BE dùng 2 kiểu payload KHÁC NHAU sau khi bỏ envelope:
  //   1. AI Chat: `{ event: 'chunk', data: 'text' }`  -> có key `data`
  //   2. Meal Planning (đổi món slot): `{ event: 'done', slotId, suggestions, message }`
  //      -> KHÔNG có key `data`, mọi field nằm ngang hàng với `event`.
  //   => Khi không có key `data`, giữ NGUYÊN payload làm `data` (không trả null),
  //      nếu không sẽ mất `suggestions`.
  if ('event' in parsed) {
    return {
      event: String(parsed.event),
      data: 'data' in parsed ? parsed.data : parsed,
    };
  }

  // { data: ... } lồng thêm 1 cấp.
  if ('data' in parsed) {
    return normalizeSsePayload(parsed.data);
  }

  return { event: 'chunk', data: parsed };
}

/**
 * Tách stream thành các event SSE đã chuẩn hoá.
 *
 * @param {AsyncGenerator<string>} chunks
 * @returns {AsyncGenerator<{event:string, data:any}>}
 */
async function* parseStream(chunks) {
  let buffer = '';

  for await (const chunk of chunks) {
    buffer += chunk;

    // SSE tách event bằng `\n\n`. Cần giữ phần chưa đủ trong buffer.
    let sepIndex;
    while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);

      const parsedBlock = parseSseBlock(block);
      if (!parsedBlock) continue;

      let payload;
      try {
        payload = JSON.parse(parsedBlock.data);
      } catch (_e) {
        // Không phải JSON -> coi như chunk text thô.
        payload = parsedBlock.data;
      }

      const normalized = normalizeSsePayload(payload);

      // Event có tên riêng (Meal Planning) -> ưu tiên tên đó.
      if (parsedBlock.event) {
        yield { event: parsedBlock.event, data: normalized.data ?? normalized };
      } else {
        yield normalized;
      }
    }
  }

  // Cuối stream có thể còn dòng không kết thúc bằng `\n\n`.
  const last = parseSseBlock(buffer);
  if (last) {
    let payload;
    try {
      payload = JSON.parse(last.data);
    } catch (_e) {
      payload = last.data;
    }
    const normalized = normalizeSsePayload(payload);
    yield last.event ? { event: last.event, data: normalized.data ?? normalized } : normalized;
  }
}

/**
 * Mở một luồng SSE và yield từng event đã chuẩn hoá.
 *
 * @param {string} path - path API (vd: '/ai-chat/sessions/{id}/stream'), BỎ base URL
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - để hủy stream khi unmount
 * @param {object} [options.headers] - header bổ sung
 * @returns {AsyncGenerator<{event:string, data:any}>}
 */
export async function* streamSse(path, options = {}) {
  const { signal, headers = {} } = options;

  const url = path.startsWith('http') ? path : `${appConfig.API_BASE_URL}${path}`;

  const requestHeaders = {
    Accept: 'text/event-stream',
    'Cache-Control': 'no-cache',
    ...headers,
  };

  // R5: token chỉ đọc qua TokenStorage.
  const token = TokenStorage.getAccessToken();
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await streamingFetch(url, {
      method: 'GET',
      headers: requestHeaders,
      signal,
    });
  } catch (e) {
    // R3: lỗi mạng -> isNetworkError=true để UI hiển thị khác lỗi server.
    throw new ApiException(e?.message || 'Không thể kết nối máy chủ', {
      statusCode: null,
      data: null,
      isNetworkError: true,
    });
  }

  if (!response?.ok) {
    const status = response?.status ?? null;
    let message = 'Không thể mở luồng dữ liệu từ máy chủ';
    try {
      const body = await response.text();
      const parsed = JSON.parse(body);
      if (parsed?.message) {
        message = Array.isArray(parsed.message)
          ? parsed.message.join('\n')
          : String(parsed.message);
      }
    } catch (_e) {
      // Body không phải JSON -> giữ message mặc định.
    }

    throw new ApiException(message, {
      statusCode: status,
      data: null,
      isNetworkError: false,
    });
  }

  for await (const event of parseStream(readChunks(response.body))) {
    yield event;
  }
}

/**
 * Mở luồng SSE và trả về một object dễ dùng cho React.
 *
 * ⚠️ Vì generator là lazy, mọi lỗi trong lúc đọc stream CHỈ ném ra khi
 * `next()` được gọi. `openSse` bọc lại thành callback-style để UI bắt lỗi
 * qua `onError` mà không cần `try/catch` quanh `for await`.
 *
 * @param {string} path
 * @param {object} callbacks
 * @param {(event:{event:string,data:any}) => void} callbacks.onEvent
 * @param {(e:Error) => void} [callbacks.onError]
 * @param {() => void} [callbacks.onClose]
 * @param {AbortSignal} [callbacks.signal]
 * @returns {{abort:() => void, done:Promise<void>}}
 */
export function openSse(path, callbacks = {}) {
  const { onEvent, onError, onClose, signal } = callbacks;

  const controller = new AbortController();
  // Cho phép caller hủy qua cả signal ngoài lẫn `abort()`.
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onExternalAbort);
  }

  const done = (async () => {
    try {
      for await (const event of streamSse(path, { signal: controller.signal })) {
        onEvent?.(event);
      }
    } catch (e) {
      // Abort là hành động chủ động (unmount) -> KHÔNG báo lỗi ra UI.
      if (controller.signal.aborted) return;
      onError?.(e);
    } finally {
      if (signal) signal.removeEventListener('abort', onExternalAbort);
      onClose?.();
    }
  })();

  return {
    abort: () => controller.abort(),
    done,
  };
}

export default { streamSse, openSse, parseSseBlock, normalizeSsePayload };
