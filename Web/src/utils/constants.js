export const APP_NAME = 'FRIGGY Web App';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Header để bỏ qua trang cảnh báo của ngrok.
 *
 * Khi truy cập `https://xxx.ngrok-free.dev/...` từ trình duyệt, ngrok chèn
 * một trang HTML cảnh báo trước khi trả response thật. Gửi header này
 * kèm request -> ngrok BỎ QUA trang cảnh báo đó.
 *
 * Gửi header này tới host khác (VD production) là vô hại - server bỏ qua
 * header lạ. Vì vậy ta gửi LUÔN, không phân nhánh theo tên miền.
 */
export const NGROK_SKIP_BROWSER_WARNING = 'ngrok-skip-browser-warning';

/** Header dùng chung cho MỌI request (REST + SSE). */
export const EXTRA_HEADERS = {
  [NGROK_SKIP_BROWSER_WARNING]: 'true',
};
