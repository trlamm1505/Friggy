/**
 * ApiException - Chuẩn hoá lỗi API
 *
 * Port từ Flutter: Mobile/lib/data/services/api_exception.dart
 *
 * BẮT BUỘC 2 (P0.3): UI hiển thị KHÁC NHAU cho lỗi mạng và lỗi server:
 *   - isNetworkError = true  -> "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng"
 *   - isNetworkError = false -> lấy `message` từ BE, fallback theo statusCode
 * KHÔNG được gộp thành 1 message chung.
 */

/** Thông điệp fallback theo statusCode - chỉ dùng khi BE KHÔNG trả message */
const STATUS_MESSAGES = {
  401: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại',
  403: 'Bạn không có quyền truy cập thực hiện thao tác này',
  404: 'Không tìm thấy dữ liệu yêu cầu (404)',
  500: 'Lỗi máy chủ nội bộ (500)',
};

const NETWORK_MESSAGES = {
  ECONNABORTED: 'Hết thời gian kết nối tới máy chủ',
  ETIMEDOUT: 'Hết thời gian kết nối tới máy chủ',
  ENOTFOUND: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng',
  ECONNREFUSED: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng',
  ERR_NETWORK: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng',
};

const DEFAULT_NETWORK_MESSAGE = 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng';
const DEFAULT_SERVER_MESSAGE = 'Đã xảy ra lỗi hệ thống';

export class ApiException extends Error {
  constructor(message, { statusCode = null, data = null, isNetworkError = false } = {}) {
    super(message);
    this.name = 'ApiException';
    this.message = message;
    this.statusCode = statusCode;
    this.data = data;
    // BẮT BUỘC 2: giữ đúng ngữ nghĩa này, UI phân nhánh hiển thị dựa vào nó
    this.isNetworkError = isNetworkError;
  }

  /**
   * Chuyển lỗi axios về ApiException.
   * @param {any} error - lỗi từ axios
   * @returns {ApiException}
   */
  static fromAxiosError(error) {
    // Đã là ApiException rồi -> giữ nguyên
    if (error instanceof ApiException) return error;

    // Có response = lỗi server (BE trả HTTP >= 400)
    if (error?.response) {
      const status = error.response.status;
      const body = error.response.data;

      let message = null;
      if (body && typeof body === 'object' && body.message !== undefined && body.message !== null) {
        // BE có thể trả message dạng array (validation error)
        message = Array.isArray(body.message) ? body.message.join('\n') : String(body.message);
      } else if (status === 401) {
        message = STATUS_MESSAGES[401];
      } else if (status === 403) {
        message = STATUS_MESSAGES[403];
      } else if (status === 404) {
        message = STATUS_MESSAGES[404];
      } else if (status === 500) {
        message = STATUS_MESSAGES[500];
      }

      return new ApiException(message || DEFAULT_SERVER_MESSAGE, {
        statusCode: status,
        data: body ?? null,
        isNetworkError: false,
      });
    }

    // Không response = lỗi mạng (offline, timeout, DNS)
    const code = error?.code;
    const message = NETWORK_MESSAGES[code] || error?.message || DEFAULT_NETWORK_MESSAGE;
    return new ApiException(message, {
      statusCode: null,
      data: null,
      isNetworkError: true,
    });
  }
}

export default ApiException;
