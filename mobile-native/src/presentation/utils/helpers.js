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
