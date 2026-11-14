// UI helpers - snackbar/toast helpers (mapping từ utils/helpers.dart)
import Toast from 'react-native-toast-message';

export const showToast = (message, type = 'info') => {
  Toast.show({
    type,
    text1: message,
    position: 'bottom',
    visibilityTime: 2500,
  });
};

export const showSuccess = (message) => showToast(message, 'success');
export const showError = (message) => showToast(message, 'error');
export const showInfo = (message) => showToast(message, 'info');

/**
 * Hiện toast cho 1 lỗi, nhưng phân biệt "đã lưu offline" với lỗi thật.
 *
 * ⚠️ VÌ SAO CẦN:
 *   Khi offline, `SafeService` ném `OfflineQueuedError` (cờ
 *   `isOfflineQueued === true`) cho các thao tác GHI đã được lưu vào hàng đợi.
 *   Đây KHÔNG phải lỗi - thao tác đã thành công theo nghĩa "đã lưu trên máy".
 *   Nếu hiện toast đỏ "Lỗi" thì user tưởng thao tác thất bại và bấm lại
 *   -> tạo bản ghi trùng.
 *
 * @param {any} e - error object
 * @param {string} fallbackMessage - message khi lỗi không có message riêng
 * @param {object} [options]
 * @param {string} [options.offlineMessage] - message khi đã lưu offline
 * @returns {boolean} true nếu đây là lỗi "đã lưu offline"
 */
export const showMutationError = (e, fallbackMessage, options = {}) => {
  if (e?.isOfflineQueued === true) {
    showInfo(options.offlineMessage || 'Đã lưu offline, sẽ đồng bộ khi có mạng');
    return true;
  }
  showError(e?.message || fallbackMessage);
  return false;
};
